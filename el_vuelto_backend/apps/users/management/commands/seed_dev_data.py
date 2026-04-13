from django.core.management.base import BaseCommand

from apps.tenants.models import Tenant
from apps.users.models import User, UserRole


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
            superuser.set_password("admin123")
            superuser.save()
            self.stdout.write(self.style.SUCCESS("✓ Superuser created: admin@elvuelto.com / admin123"))
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
                "is_staff": True,
                "activo": True,
            },
        )
        if created:
            admin_user.set_password("admin123")
            admin_user.save()
            self.stdout.write(self.style.SUCCESS("✓ Admin user created: juan@laesperanza.com / admin123"))
        else:
            self.stdout.write("  Admin user already exists: juan@laesperanza.com")

        # 4. Cajero user for tenant
        cajero_user, created = User.objects.get_or_create(
            correo="maria@laesperanza.com",
            defaults={
                "nombre": "María López",
                "tenant": tenant,
                "rol": UserRole.CAJERO,
                "activo": True,
            },
        )
        if created:
            cajero_user.set_password("cajero123")
            cajero_user.save()
            self.stdout.write(self.style.SUCCESS("✓ Cajero user created: maria@laesperanza.com / cajero123"))
        else:
            self.stdout.write("  Cajero user already exists: maria@laesperanza.com")

        self.stdout.write(self.style.SUCCESS("\n=== Done! ===\n"))
