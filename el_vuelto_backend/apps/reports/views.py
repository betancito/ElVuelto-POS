from datetime import datetime, timedelta
from itertools import groupby as _groupby
from zoneinfo import ZoneInfo

from django.db.models import Count, Sum
from django.db.models.functions import ExtractHour, TruncDate
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sales.models import PaymentMethod, Sale, SaleItem
from apps.tenants.date_params import parse_date_param, parse_date_range, parse_positive_int
from apps.tenants.utils import require_tenant
from apps.users.permissions import IsAdmin

BOGOTA_TZ = ZoneInfo("America/Bogota")


class SummaryReportView(APIView):
    """GET /api/reports/summary/?fecha=YYYY-MM-DD"""

    permission_classes = [IsAdmin]

    def get(self, request):
        # Tenant first: no tenant is a 403, before any param parsing.
        tenant = require_tenant(request)
        fecha = parse_date_param(request.query_params.get("fecha"), "fecha")
        fecha_inicio, fecha_fin = parse_date_range(request.query_params)

        sales_qs = Sale.objects.filter(tenant=tenant)
        items_qs = SaleItem.objects.filter(sale__tenant=tenant)

        if fecha:
            sales_qs = sales_qs.filter(created_at__date=fecha)
            items_qs = items_qs.filter(sale__created_at__date=fecha)
        elif fecha_inicio and fecha_fin:
            sales_qs = sales_qs.filter(created_at__date__gte=fecha_inicio, created_at__date__lte=fecha_fin)
            items_qs = items_qs.filter(sale__created_at__date__gte=fecha_inicio, sale__created_at__date__lte=fecha_fin)

        agg = sales_qs.aggregate(
            total_ventas=Sum("total"),
            num_transacciones=Count("id"),
        )

        total_unidades = items_qs.aggregate(total=Sum("cantidad"))["total"] or 0
        total_ventas = float(agg["total_ventas"] or 0)
        num_transacciones = agg["num_transacciones"] or 0

        efectivo_count = sales_qs.filter(metodo_pago=PaymentMethod.EFECTIVO).aggregate(c=Count("id"))["c"] or 0
        nequi_count = sales_qs.filter(metodo_pago=PaymentMethod.NEQUI_TRANSFERENCIA).aggregate(c=Count("id"))["c"] or 0
        pct_efectivo = round((efectivo_count / num_transacciones) * 100) if num_transacciones else 0
        pct_nequi = round((nequi_count / num_transacciones) * 100) if num_transacciones else 0

        return Response(
            {
                "total_ventas": total_ventas,
                "num_transacciones": num_transacciones,
                "unidades_vendidas": total_unidades,
                "porcentaje_efectivo": pct_efectivo,
                "porcentaje_nequi": pct_nequi,
            }
        )


class VentasPorHoraView(APIView):
    """GET /api/reports/ventas-por-hora/?fecha=YYYY-MM-DD"""

    permission_classes = [IsAdmin]

    def get(self, request):
        tenant = require_tenant(request)
        # Documented default: no `fecha` ⇒ today in America/Bogota.
        fecha = parse_date_param(request.query_params.get("fecha"), "fecha")
        if not fecha:
            fecha = datetime.now(BOGOTA_TZ).date()

        qs = (
            Sale.objects.filter(tenant=tenant, created_at__date=fecha)
            .annotate(hour=ExtractHour("created_at", tzinfo=BOGOTA_TZ))
            .values("hour")
            .annotate(total=Sum("total"), count=Count("id"))
            .order_by("hour")
        )

        by_hour = {row["hour"]: row for row in qs}

        items_by_hour_qs = (
            SaleItem.objects.filter(
                sale__tenant=tenant,
                sale__created_at__date=fecha,
            )
            .annotate(hour=ExtractHour("sale__created_at", tzinfo=BOGOTA_TZ))
            .values("hour", "product_nombre")
            .annotate(unidades=Sum("cantidad"))
            .order_by("hour", "-unidades")
        )

        products_by_hour: dict[int, list[dict]] = {}
        for hour, items in _groupby(items_by_hour_qs, key=lambda x: x["hour"]):
            products_by_hour[int(hour)] = [
                {"nombre": i["product_nombre"], "unidades": i["unidades"]}
                for i in list(items)[:3]
            ]

        result = [
            {
                "hora": h,
                "total": float(by_hour[h]["total"]) if h in by_hour else 0.0,
                "transacciones": by_hour[h]["count"] if h in by_hour else 0,
                "top_productos": products_by_hour.get(h, []),
            }
            for h in range(24)
        ]

        return Response(result)


class SalesDetailExportView(APIView):
    """GET /api/reports/sales-detail/?fecha=YYYY-MM-DD"""

    permission_classes = [IsAdmin]

    def get(self, request):
        tenant = require_tenant(request)
        fecha = parse_date_param(request.query_params.get("fecha"), "fecha")
        fecha_inicio, fecha_fin = parse_date_range(request.query_params)

        if fecha:
            label = fecha.isoformat()
            sales_qs = Sale.objects.filter(tenant=tenant, created_at__date=fecha)
        elif fecha_inicio and fecha_fin:
            label = f"{fecha_inicio.isoformat()} al {fecha_fin.isoformat()}"
            sales_qs = Sale.objects.filter(
                tenant=tenant,
                created_at__date__gte=fecha_inicio,
                created_at__date__lte=fecha_fin,
            )
        else:
            # Documented default (unchanged): neither a single date nor a full
            # range ⇒ today. Half a range falls here too.
            fecha = datetime.now(BOGOTA_TZ).date()
            label = fecha.isoformat()
            sales_qs = Sale.objects.filter(tenant=tenant, created_at__date=fecha)

        sales_qs = (
            sales_qs
            .prefetch_related("items")
            .select_related("user")
            .order_by("created_at")
        )

        data = []
        for sale in sales_qs:
            data.append({
                "id": str(sale.id),
                "codigo": sale.codigo,
                "cajero": sale.user.nombre,
                "metodo_pago": sale.get_metodo_pago_display(),
                "total": float(sale.total),
                "monto_recibido": float(sale.monto_recibido) if sale.monto_recibido is not None else None,
                "cambio": float(sale.cambio) if sale.cambio is not None else None,
                "hora": sale.created_at.astimezone(BOGOTA_TZ).strftime("%H:%M:%S"),
                "items": [
                    {
                        "producto": item.product_nombre,
                        "precio_unitario": float(item.precio_unitario),
                        "cantidad": item.cantidad,
                        "subtotal": float(item.subtotal),
                    }
                    for item in sale.items.all()
                ],
            })

        return Response({
            # Same JSON as before: an explicit isoformat string, not a date object.
            "fecha": (fecha or fecha_inicio).isoformat(),
            "label": label,
            "tenant_nombre": tenant.nombre,
            "tenant_logo_url": (
                tenant.documents.filter(document_type="logo")
                .values_list("cloudinary_url", flat=True)
                .first()
            ),
            "total_ventas": sum(s["total"] for s in data),
            "num_transacciones": len(data),
            "sales": data,
        })


class TopProductosView(APIView):
    """GET /api/reports/top-productos/?fecha=YYYY-MM-DD&limit=10"""

    permission_classes = [IsAdmin]

    def get(self, request):
        tenant = require_tenant(request)
        fecha = parse_date_param(request.query_params.get("fecha"), "fecha")
        fecha_inicio, fecha_fin = parse_date_range(request.query_params)
        limit = parse_positive_int(
            request.query_params.get("limit"), "limit", default=10, maximum=100
        )

        qs = SaleItem.objects.filter(sale__tenant=tenant)

        if fecha:
            qs = qs.filter(sale__created_at__date=fecha)
        elif fecha_inicio and fecha_fin:
            qs = qs.filter(sale__created_at__date__gte=fecha_inicio, sale__created_at__date__lte=fecha_fin)

        top = (
            qs.values("product_id", "product_nombre")
            .annotate(
                unidades=Sum("cantidad"),
                total=Sum("subtotal"),
            )
            .order_by("-unidades")[:limit]
        )

        data = [
            {
                "product_id": str(row["product_id"]),
                "nombre": row["product_nombre"],
                "unidades": row["unidades"],
                "total": float(row["total"]),
            }
            for row in top
        ]

        return Response(data)


class VentasPorDiaView(APIView):
    """GET /api/reports/ventas-por-dia/?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD"""

    permission_classes = [IsAdmin]

    def get(self, request):
        tenant = require_tenant(request)
        # This view builds one dict per day, so it needs a CLOSED range: the
        # width cap in parse_date_range is what keeps that loop bounded.
        # Documented default (unchanged): missing either bound ⇒ the last 7 days.
        fecha_inicio, fecha_fin = parse_date_range(request.query_params)
        if not fecha_inicio or not fecha_fin:
            today = datetime.now(BOGOTA_TZ).date()
            fecha_fin = today
            fecha_inicio = today - timedelta(days=6)

        qs = (
            Sale.objects.filter(
                tenant=tenant,
                created_at__date__gte=fecha_inicio,
                created_at__date__lte=fecha_fin,
            )
            .annotate(day=TruncDate("created_at", tzinfo=BOGOTA_TZ))
            .values("day")
            .annotate(total=Sum("total"), count=Count("id"))
            .order_by("day")
        )
        by_day = {row["day"].isoformat(): row for row in qs}

        result = []
        current = fecha_inicio
        end = fecha_fin
        while current <= end:
            key = current.isoformat()
            result.append({
                "fecha": key,
                "total": float(by_day[key]["total"]) if key in by_day else 0.0,
                "transacciones": by_day[key]["count"] if key in by_day else 0,
            })
            current += timedelta(days=1)
        return Response(result)
