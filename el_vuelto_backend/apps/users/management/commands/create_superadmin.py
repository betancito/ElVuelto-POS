"""
Crea (o actualiza) un usuario SUPERADMIN de la plataforma ElVuelto.

Uso interactivo (primer deploy / a mano):
    python manage.py create_superadmin
    # pregunta correo, nombre y contraseña (oculta, con confirmación)

Uso no interactivo (CI / entrypoint de deploy):
    python manage.py create_superadmin --noinput \
        --correo admin@tuempresa.com --nombre "Admin" --password "***"
    # o vía entorno: SUPERADMIN_CORREO / SUPERADMIN_NOMBRE / SUPERADMIN_PASSWORD

Idempotente: si el correo ya existe no rompe el deploy — informa y sale (usa
--update para sobrescribir password y asegurar el rol SUPERADMIN).
"""
import getpass
import os

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.db import transaction

from apps.users.models import User, UserRole

ENV_CORREO = "SUPERADMIN_CORREO"
ENV_NOMBRE = "SUPERADMIN_NOMBRE"
ENV_PASSWORD = "SUPERADMIN_PASSWORD"


class Command(BaseCommand):
    help = (
        "Crea (o actualiza) un usuario SUPERADMIN. Interactivo por defecto; "
        "para deploy usa --noinput con --correo/--nombre/--password o las variables "
        f"de entorno {ENV_CORREO}/{ENV_NOMBRE}/{ENV_PASSWORD}."
    )

    def add_arguments(self, parser):
        parser.add_argument("--correo", help="Correo (identificador de login).")
        parser.add_argument("--nombre", help="Nombre visible del superadmin.")
        parser.add_argument(
            "--password",
            help="Contraseña. Evítalo en shells con historial; prefiere la variable de entorno.",
        )
        parser.add_argument(
            "--noinput",
            "--no-input",
            action="store_false",
            dest="interactive",
            help="Sin prompts: toma los datos de --correo/--nombre/--password o del entorno.",
        )
        parser.add_argument(
            "--update",
            action="store_true",
            help="Si el correo ya existe, actualiza su contraseña y lo asegura como SUPERADMIN.",
        )

    def handle(self, *args, **options):
        interactive = options["interactive"]

        correo = options.get("correo") or os.environ.get(ENV_CORREO)
        nombre = options.get("nombre") or os.environ.get(ENV_NOMBRE)
        password = options.get("password") or os.environ.get(ENV_PASSWORD)

        if interactive:
            correo = correo or self._pedir("Correo: ")
            nombre = nombre or self._pedir("Nombre: ")
            if not password:
                password = self._pedir_password()

        faltan = [n for n, v in (("correo", correo), ("nombre", nombre), ("password", password)) if not v]
        if faltan:
            raise CommandError(
                "Faltan datos: "
                + ", ".join(faltan)
                + f". Pásalos por --correo/--nombre/--password o {ENV_CORREO}/{ENV_NOMBRE}/{ENV_PASSWORD}."
            )

        try:
            validate_email(correo)
        except ValidationError:
            if interactive:
                self.stdout.write(self.style.WARNING(f"'{correo}' no parece un email válido."))
                if input("¿Continuar de todos modos? [s/N]: ").strip().lower() != "s":
                    raise CommandError("Cancelado por email inválido.")
            else:
                raise CommandError(f"'{correo}' no es un email válido.")

        correo = User.objects.normalize_email(correo)

        with transaction.atomic():
            user = User.objects.select_for_update().filter(correo=correo).first()

            if user is None:
                user = User.objects.create_superuser(correo=correo, password=password, nombre=nombre)
                self.stdout.write(self.style.SUCCESS(f"✓ Superadmin creado: {user.correo}"))
            else:
                autorizado = options["update"] or (
                    interactive
                    and input(
                        f"Ya existe '{correo}'. ¿Actualizar contraseña y asegurar SUPERADMIN? [s/N]: "
                    ).strip().lower()
                    == "s"
                )
                if not autorizado:
                    self.stdout.write(
                        self.style.WARNING(
                            f"El usuario '{correo}' ya existe; no se cambió nada. "
                            "Usa --update para sobrescribir."
                        )
                    )
                    return
                user.set_password(password)
                user.rol = UserRole.SUPERADMIN
                user.is_staff = True
                user.is_superuser = True
                user.activo = True
                user.tenant = None
                if nombre:
                    user.nombre = nombre
                user.save()
                self.stdout.write(self.style.SUCCESS(f"✓ Superadmin actualizado: {user.correo}"))

        self.stdout.write(
            f"  rol=SUPERADMIN  is_superuser=True  tenant=None  id={user.id}\n"
            "  Entra por POST /api/auth/login/ con ese correo + contraseña."
        )

    # ---- helpers de input interactivo ----
    def _pedir(self, prompt):
        val = input(prompt).strip()
        while not val:
            self.stdout.write("  (no puede ir vacío)")
            val = input(prompt).strip()
        return val

    def _pedir_password(self):
        while True:
            p1 = getpass.getpass("Contraseña: ")
            if not p1:
                self.stdout.write("  (no puede ir vacía)")
                continue
            p2 = getpass.getpass("Repite la contraseña: ")
            if p1 != p2:
                self.stdout.write(self.style.ERROR("  Las contraseñas no coinciden, intenta de nuevo."))
                continue
            return p1
