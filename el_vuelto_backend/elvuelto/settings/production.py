from decouple import config
from .base import *  # noqa: F401, F403

DEBUG = False
ALLOWED_HOSTS = [
    host.strip()
    for host in config("ALLOWED_HOSTS", default="").split(",")
    if host.strip()
]

# ── HTTPS ────────────────────────────────────────────────────────────────────
# Se prende con SECURE_SSL=1 y viene APAGADO por defecto, a propósito: este
# mismo settings module se usa para correr el stack de prod en la LAN por HTTP
# (`manage-docker.sh up prod`), y ahí un SECURE_SSL_REDIRECT dejaría la app
# inalcanzable. En un deploy público con dominio y TLS, prenderlo.
#
# Cierra BACKEND-20260811-falta-https-enforcement-produccion, que estaba
# bloqueado por una pregunta de infraestructura: "¿dónde termina TLS?". La
# respuesta del deploy de Azure es: en el borde (Caddy), que le habla a nginx
# por HTTP dentro de la red privada.
SECURE_SSL = config("SECURE_SSL", default=False, cast=bool)

if SECURE_SSL:
    # Django NO ve el https: el borde termina TLS y le habla por http a nginx,
    # que reenvía este header. Sin esto, request.is_secure() es False y el
    # SECURE_SSL_REDIRECT de abajo entra en un bucle infinito de redirecciones.
    # nginx preserva el valor del borde vía $forwarded_proto — ver
    # docker/nginx/proxy_common.conf, donde está explicada la trampa.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # HSTS: arranca en 0 y se sube a mano DESPUÉS de confirmar que el dominio
    # sirve bien por https. Un valor alto puesto antes de tiempo deja el
    # dominio inaccesible en los navegadores que ya lo cachearon, y no se puede
    # deshacer del lado del servidor.
    SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=0, cast=int)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = config(
        "SECURE_HSTS_INCLUDE_SUBDOMAINS", default=False, cast=bool
    )
    SECURE_HSTS_PRELOAD = config("SECURE_HSTS_PRELOAD", default=False, cast=bool)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}
