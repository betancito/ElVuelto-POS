from zoneinfo import ZoneInfo

from django.db.models import Count, Sum
from django.db.models.functions import ExtractHour
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sales.models import PaymentMethod, Sale, SaleItem
from apps.users.permissions import IsAdmin

BOGOTA_TZ = ZoneInfo("America/Bogota")


class SummaryReportView(APIView):
    """GET /api/reports/summary/?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD"""

    permission_classes = [IsAdmin]

    def get(self, request):
        fecha_inicio = request.query_params.get("fecha_inicio")
        fecha_fin = request.query_params.get("fecha_fin")

        sales_qs = Sale.objects.filter(tenant=request.tenant)
        items_qs = SaleItem.objects.filter(sale__tenant=request.tenant)

        if fecha_inicio:
            sales_qs = sales_qs.filter(created_at__date__gte=fecha_inicio)
            items_qs = items_qs.filter(sale__created_at__date__gte=fecha_inicio)
        if fecha_fin:
            sales_qs = sales_qs.filter(created_at__date__lte=fecha_fin)
            items_qs = items_qs.filter(sale__created_at__date__lte=fecha_fin)

        agg = sales_qs.aggregate(
            total_ventas=Sum("total"),
            num_transacciones=Count("id"),
        )

        total_unidades = items_qs.aggregate(total=Sum("cantidad"))["total"] or 0

        total_ventas = agg["total_ventas"] or 0
        num_transacciones = agg["num_transacciones"] or 0
        ticket_promedio = (
            (total_ventas / num_transacciones) if num_transacciones > 0 else 0
        )

        por_metodo = {}
        for metodo in [PaymentMethod.EFECTIVO, PaymentMethod.NEQUI_TRANSFERENCIA]:
            m_agg = sales_qs.filter(metodo_pago=metodo).aggregate(
                count=Count("id"),
                total=Sum("total"),
            )
            por_metodo[metodo] = {
                "count": m_agg["count"] or 0,
                "total": f"{m_agg['total'] or 0:.2f}",
            }

        return Response(
            {
                "total_ventas": f"{total_ventas:.2f}",
                "num_transacciones": num_transacciones,
                "total_unidades": total_unidades,
                "ticket_promedio": f"{ticket_promedio:.2f}",
                "por_metodo": por_metodo,
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

        result = {str(h): {"total": "0.00", "count": 0} for h in range(24)}
        for row in qs:
            result[str(row["hour"])] = {
                "total": f"{row['total']:.2f}",
                "count": row["count"],
            }

        return Response(result)


class TopProductosView(APIView):
    """GET /api/reports/top-productos/?fecha_inicio=&fecha_fin=&limit=10"""

    permission_classes = [IsAdmin]

    def get(self, request):
        fecha_inicio = request.query_params.get("fecha_inicio")
        fecha_fin = request.query_params.get("fecha_fin")
        limit = min(int(request.query_params.get("limit", 10)), 100)

        qs = SaleItem.objects.filter(sale__tenant=request.tenant)

        if fecha_inicio:
            qs = qs.filter(sale__created_at__date__gte=fecha_inicio)
        if fecha_fin:
            qs = qs.filter(sale__created_at__date__lte=fecha_fin)

        top = (
            qs.values("product_id", "product_nombre", "product__tipo")
            .annotate(
                total_unidades=Sum("cantidad"),
                total_revenue=Sum("subtotal"),
            )
            .order_by("-total_unidades")[:limit]
        )

        data = [
            {
                "product_id": str(row["product_id"]),
                "nombre": row["product_nombre"],
                "tipo": row["product__tipo"],
                "total_unidades": row["total_unidades"],
                "total_revenue": f"{row['total_revenue']:.2f}",
            }
            for row in top
        ]

        return Response(data)
