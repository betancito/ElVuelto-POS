from django.core.management.base import BaseCommand

from apps.tenants.models import Tenant
from apps.users.models import User, UserRole
from apps.users.password_policy import PIN_LENGTH

# A CAJERO logs into the POS with cédula + PIN (never with correo), so the seeded
# cashier needs both or it simply cannot sign in through the UI.
CAJERO_CEDULA = "12345678"
# Deterministic dev PIN of exactly PIN_LENGTH digits ("1234" today). Derived from
# the policy constant so it stays valid if the PIN length ever changes.
CAJERO_PIN = "".join(str((i + 1) % 10) for i in range(PIN_LENGTH))

# NOTE — the seeded ADMIN/superuser keep `admin123` (8 chars) on purpose, even
# though password_policy.ADMIN_PASSWORD_LENGTH is 12. This is dev-only data
# written through the model manager, and no login path enforces a minimum: the
# policy governs what the API accepts when creating or changing a password. A
# deliberate, documented exception — not drift.
ADMIN_PASSWORD = "admin123"


class Command(BaseCommand):
    help = "Seeds the database with a superuser and a sample tenant for local development."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== Seeding development data ===\n"))

        # 1. Superuser
        superuser, created = User.objects.get_or_create(
            correo="admin@elvuelto.com",
            defaults={
                "nombre": "Super Admin",
                "rol": UserRole.SUPERADMIN,
                "is_staff": True,
                "is_superuser": True,
                "activo": True,
            },
        )
        if created:
            superuser.set_password(ADMIN_PASSWORD)
            superuser.save()
            self.stdout.write(
                self.style.SUCCESS(f"✓ Superuser created: admin@elvuelto.com / {ADMIN_PASSWORD}")
            )
        else:
            self.stdout.write("  Superuser already exists: admin@elvuelto.com")

        # 2. Sample tenant
        tenant, created = Tenant.objects.get_or_create(
            nit="900123456",
            defaults={
                "nombre": "Panadería La Esperanza",
                "ciudad": "Medellín",
                "correo": "contacto@laesperanza.com",
                "activo": True,
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS("✓ Tenant created: Panadería La Esperanza (NIT 900123456)"))
        else:
            self.stdout.write("  Tenant already exists: Panadería La Esperanza")

        # 3. Admin user for tenant
        admin_user, created = User.objects.get_or_create(
            correo="juan@laesperanza.com",
            defaults={
                "nombre": "Juan García",
                "tenant": tenant,
                "rol": UserRole.ADMIN,
                # No is_staff: a tenant admin is not platform staff and must not
                # reach /admin/, which bypasses every API rule.
                "activo": True,
            },
        )
        if created:
            admin_user.set_password(ADMIN_PASSWORD)
            admin_user.save()
            self.stdout.write(
                self.style.SUCCESS(f"✓ Admin user created: juan@laesperanza.com / {ADMIN_PASSWORD}")
            )
        else:
            self.stdout.write("  Admin user already exists: juan@laesperanza.com")

        # 4. Cajero user for tenant
        cajero_user, created = User.objects.get_or_create(
            correo="maria@laesperanza.com",
            defaults={
                "nombre": "María López",
                "tenant": tenant,
                "rol": UserRole.CAJERO,
                "cedula": CAJERO_CEDULA,
                "activo": True,
            },
        )
        cajero_label = f"cedula={CAJERO_CEDULA} / PIN {CAJERO_PIN}"
        if created:
            cajero_user.set_password(CAJERO_PIN)
            cajero_user.save()
            self.stdout.write(self.style.SUCCESS(f"✓ Cajero user created: {cajero_label}"))
        elif not cajero_user.cedula:
            # Rows seeded before the cédula rule existed cannot log into the POS.
            # Backfill them instead of leaving a cashier nobody can use. Running
            # this again is a no-op, so the command stays idempotent.
            clash = (
                User.objects.filter(tenant=cajero_user.tenant, cedula=CAJERO_CEDULA)
                .exclude(pk=cajero_user.pk)
                .exists()
            )
            if clash:
                self.stdout.write(
                    self.style.WARNING(
                        f"! Cajero user has no cedula and {CAJERO_CEDULA} is already taken "
                        f"in this tenant — assign one by hand (unique(tenant, cedula))."
                    )
                )
            else:
                cajero_user.cedula = CAJERO_CEDULA
                cajero_user.set_password(CAJERO_PIN)
                cajero_user.save(update_fields=["cedula", "password"])
                self.stdout.write(self.style.SUCCESS(f"✓ Cajero user repaired: {cajero_label}"))
        else:
            self.stdout.write(f"  Cajero user already exists: cedula={cajero_user.cedula}")

        self.stdout.write(self.style.SUCCESS("\n=== Done! ===\n"))
