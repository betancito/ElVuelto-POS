import random
from datetime import date, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.core.management.base import BaseCommand
from django.db.models.functions import TruncDate

from apps.products.models import Product, ProductType
from apps.sales.models import PaymentMethod, Sale, SaleItem
from apps.tenants.models import Tenant
from apps.users.models import User

BOGOTA_TZ = ZoneInfo("America/Bogota")
TENANT_ID = "1dbae3f2-bfe9-4970-b266-b495e2655289"

START_DATE = date(2026, 5, 1)
END_DATE = date(2026, 5, 23)

WEEKDAY_HOURS = list(range(7, 20))
SATURDAY_HOURS = list(range(8, 19))
SUNDAY_HOURS = list(range(9, 15))


def day_plan(weekday: int) -> tuple[list[int], int]:
    if weekday <= 4:
        return WEEKDAY_HOURS, random.randint(25, 40)
    if weekday == 5:
        return SATURDAY_HOURS, random.randint(15, 25)
    return SUNDAY_HOURS, random.randint(5, 12)


def distribute(total: int, slots: int) -> list[int]:
    counts = [1] * slots if total >= slots else [0] * slots
    remaining = total - sum(counts)
    while remaining > 0:
        i = random.randrange(slots)
        if counts[i] < 4:
            counts[i] += 1
            remaining -= 1
    return counts


class Command(BaseCommand):
    help = "Seeds May 2026 sales data (May 1–23) for tenant 1dbae3f2-bfe9-4970-b266-b495e2655289."

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

        existing_days = set(
            Sale.objects.filter(
                tenant=tenant,
                created_at__date__gte=START_DATE,
                created_at__date__lte=END_DATE,
            )
            .annotate(d=TruncDate("created_at", tzinfo=BOGOTA_TZ))
            .values_list("d", flat=True)
            .distinct()
        )

        total_sales = 0
        total_cop = Decimal("0.00")
        per_day: list[tuple[date, int, Decimal]] = []

        current = START_DATE
        while current <= END_DATE:
            if current in existing_days:
                self.stdout.write(f"{current.isoformat()}: SKIP (ya tiene ventas)")
                current += timedelta(days=1)
                continue

            hours, target = day_plan(current.weekday())
            counts = distribute(target, len(hours))

            day_sales = 0
            day_cop = Decimal("0.00")

            for hour, num_sales in zip(hours, counts):
                for _ in range(num_sales):
                    metodo_pago = random.choice([PaymentMethod.EFECTIVO, PaymentMethod.NEQUI_TRANSFERENCIA])
                    sale = Sale(
                        tenant=tenant,
                        user=user,
                        total=Decimal("0.00"),
                        metodo_pago=metodo_pago,
                    )
                    sale.save()

                    chosen = random.sample(products, k=min(random.randint(1, 4), len(products)))
                    sale_total = Decimal("0.00")
                    for product in chosen:
                        cantidad = random.randint(1, 5)
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
                        current.year, current.month, current.day,
                        hour, random.randint(0, 59), random.randint(0, 59),
                        tzinfo=BOGOTA_TZ,
                    )
                    Sale.objects.filter(id=sale.id).update(created_at=sale_dt)

                    day_sales += 1
                    day_cop += sale_total

            per_day.append((current, day_sales, day_cop))
            total_sales += day_sales
            total_cop += day_cop
            self.stdout.write(f"{current.isoformat()}: {day_sales} ventas — ${day_cop:,.0f} COP")
            current += timedelta(days=1)

        self.stdout.write("══════════════════════════")
        self.stdout.write(self.style.SUCCESS(
            f"Total: {total_sales} ventas — ${total_cop:,.0f} COP"
        ))
