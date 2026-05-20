import random
from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.core.management.base import BaseCommand

from apps.products.models import Product, ProductType
from apps.sales.models import PaymentMethod, Sale, SaleItem
from apps.tenants.models import Tenant
from apps.users.models import User

BOGOTA_TZ = ZoneInfo("America/Bogota")
TENANT_ID = "1dbae3f2-bfe9-4970-b266-b495e2655289"

HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]


class Command(BaseCommand):
    help = "Seeds test sales data for today across business hours for a specific tenant."

    def handle(self, *args, **options):
        try:
            tenant = Tenant.objects.get(id=TENANT_ID)
        except Tenant.DoesNotExist:
            self.stderr.write(f"Tenant {TENANT_ID} not found.")
            return

        user = User.objects.filter(tenant=tenant, activo=True).first()
        if not user:
            self.stderr.write(f"No active user found for tenant {TENANT_ID}.")
            return

        products = list(Product.objects.filter(tenant=tenant, activo=True))
        if not products:
            seed_products = [
                ("Producto Prueba A", Decimal("5000")),
                ("Producto Prueba B", Decimal("12000")),
                ("Producto Prueba C", Decimal("8500")),
            ]
            for nombre, precio in seed_products:
                p = Product.objects.create(
                    tenant=tenant,
                    nombre=nombre,
                    tipo=ProductType.SIN_CODIGO,
                    precio_venta=precio,
                )
                products.append(p)
            self.stdout.write(f"Created {len(products)} seed products.")

        today = datetime.now(BOGOTA_TZ).date()
        total_sales = 0
        total_cop = Decimal("0.00")

        for hour in HOURS:
            num_sales = random.randint(1, 3)
            for _ in range(num_sales):
                metodo_pago = random.choice([PaymentMethod.EFECTIVO, PaymentMethod.NEQUI_TRANSFERENCIA])
                sale = Sale(
                    tenant=tenant,
                    user=user,
                    total=Decimal("0.00"),
                    metodo_pago=metodo_pago,
                )
                sale.save()

                chosen = random.sample(products, k=min(random.randint(1, 3), len(products)))
                sale_total = Decimal("0.00")
                for product in chosen:
                    cantidad = random.randint(1, 4)
                    subtotal = product.precio_venta * cantidad
                    SaleItem.objects.create(
                        sale=sale,
                        product=product,
                        product_nombre=product.nombre,
                        precio_unitario=product.precio_venta,
                        cantidad=cantidad,
                        subtotal=subtotal,
                    )
                    sale_total += subtotal

                sale.total = sale_total
                if metodo_pago == PaymentMethod.EFECTIVO:
                    monto = (int(sale_total) // 1000 + 1) * 1000
                    sale.monto_recibido = Decimal(monto)
                    sale.cambio = sale.monto_recibido - sale_total
                sale.save(update_fields=["total", "monto_recibido", "cambio"])

                sale_dt = datetime(
                    today.year, today.month, today.day,
                    hour, random.randint(0, 59), random.randint(0, 59),
                    tzinfo=BOGOTA_TZ,
                )
                Sale.objects.filter(id=sale.id).update(created_at=sale_dt)

                self.stdout.write(
                    f"  {hour:02d}h  ${sale_total:>10,.0f} COP  {metodo_pago}"
                )
                total_sales += 1
                total_cop += sale_total

        self.stdout.write(self.style.SUCCESS(
            f"\nResumen: {total_sales} ventas creadas | "
            f"Horas {HOURS[0]}–{HOURS[-1]} | "
            f"Total acumulado: ${total_cop:,.0f} COP"
        ))
