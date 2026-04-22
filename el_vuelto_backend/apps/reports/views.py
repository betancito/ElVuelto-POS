from zoneinfo import ZoneInfo

from django.db.models import Count, Sum
from django.db.models.functions import ExtractHour
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sales.models import PaymentMethod, Sale, SaleItem
from apps.users.permissions import IsAdmin

BOGOTA_TZ = ZoneInfo("America/Bogota")


class SummaryReportView(APIView):
    """GET /api/reports/summary/?fecha=YYYY-MM-DD"""

    permission_classes = [IsAdmin]

    def get(self, request):
        fecha = request.query_params.get("fecha")

        sales_qs = Sale.objects.filter(tenant=request.tenant)
        items_qs = SaleItem.objects.filter(sale__tenant=request.tenant)

        if fecha:
            sales_qs = sales_qs.filter(created_at__date=fecha)
            items_qs = items_qs.filter(sale__created_at__date=fecha)

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
        fecha = request.query_params.get("fecha")
        if not fecha:
            return Response({"detail": "El parámetro 'fecha' es requerido."}, status=400)

        qs = (
            Sale.objects.filter(tenant=request.tenant, created_at__date=fecha)
            .annotate(hour=ExtractHour("created_at", tzinfo=BOGOTA_TZ))
            .values("hour")
            .annotate(total=Sum("total"), count=Count("id"))
            .order_by("hour")
        )

        by_hour = {row["hour"]: row for row in qs}
        result = [
            {
                "hora": h,
                "total": float(by_hour[h]["total"]) if h in by_hour else 0.0,
                "transacciones": by_hour[h]["count"] if h in by_hour else 0,
            }
            for h in range(24)
        ]

        return Response(result)


class TopProductosView(APIView):
    """GET /api/reports/top-productos/?fecha=YYYY-MM-DD&limit=10"""

    permission_classes = [IsAdmin]

    def get(self, request):
        fecha = request.query_params.get("fecha")
        limit = min(int(request.query_params.get("limit", 10)), 100)

        qs = SaleItem.objects.filter(sale__tenant=request.tenant)

        if fecha:
            qs = qs.filter(sale__created_at__date=fecha)

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
