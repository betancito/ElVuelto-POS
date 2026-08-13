from pathlib import Path
from datetime import timedelta
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config("DJANGO_SECRET_KEY")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    # Local apps
    "apps.tenants",
    "apps.users",
    "apps.products",
    "apps.inventory",
    "apps.sales",
    "apps.reports",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.tenants.middleware.TenantMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "elvuelto.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "elvuelto.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="elvuelto"),
        "USER": config("DB_USER", default="postgres"),
        "PASSWORD": config("DB_PASSWORD", default=""),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
    }
}

AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es-co"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # NOTE: no DEFAULT_THROTTLE_CLASSES on purpose. Throttling is opt-in, applied
    # only by the authentication views (apps/users/throttles.py). A global limit
    # would hit the POS, which is by far the busiest screen.
    "DEFAULT_THROTTLE_RATES": {
        # Login attempts, keyed by the identity being tried (cédula+tenant or
        # correo). Shared by /auth/login/ and /auth/login/cashier/ so switching
        # endpoints does not double the budget.
        "login_identity_burst": "10/min",
        "login_identity_daily": "50/day",
        # Ceiling per client IP for those same endpoints: stops one source from
        # fanning out over many identities. Far above a real store, far below the
        # ~540/min a scripted attack reaches.
        "login_ip": "60/min",
        # Access tokens live 8 hours, so refreshes are rare even with several tills.
        "token_refresh_ip": "30/min",
        # Public slug lookup: one call per staff-login page load.
        "tenant_slug_ip": "30/min",
    },
}

# DRF counts throttling in the cache, so this must be explicit — leaving it to
# the default was the silent failure mode: Django falls back to LocMemCache,
# which is **per process**, so with N gunicorn workers every limit above is
# effectively multiplied by N (each worker keeps its own count).
#
# dev: LocMemCache is fine — one process, counts are exact.
# production: set REDIS_URL so every worker shares one counter. The Redis backend
# is built into Django but needs the `redis` package installed; it is deliberately
# NOT in requirements.txt, so the app runs without it and only the operator who
# sets REDIS_URL has to add it.
REDIS_URL = config("REDIS_URL", default="")
CACHES = {
    "default": (
        {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
        }
        if REDIS_URL
        else {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "elvuelto-local",
        }
    )
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    # Changing a password revokes every token issued before the change.
    # `Token.for_user()` stamps a `hash_password` claim (MD5 of the password
    # hash at issue time) and `JWTAuthentication.get_user()` compares it against
    # the current one on every authenticated request → 401 `password_changed`.
    # Without this, `reset_password` only blocked NEW logins: a token stolen
    # before the reset kept creating sales, so the one remediation available
    # against a leaked PIN did not actually end the live session.
    # Cost: no extra query. `get_user()` already loads the User on every request
    # (that is how `is_active` is checked); this adds an in-memory MD5 over an
    # object already in hand. It also propagates through refresh: a refresh
    # token issued before the change carries the old claim forever, and
    # `RefreshToken.access_token` copies every claim (`hash_password` is not in
    # `no_copy_claims`), so the access tokens it mints are rejected too.
    "CHECK_REVOKE_TOKEN": True,
}

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in config("CORS_ALLOWED_ORIGINS", default="http://localhost:5173").split(",")
]

# ── Cloudinary ────────────────────────────────────────────────────────────────
import cloudinary  # noqa: E402

cloudinary.config(
    cloud_name=config("CLOUDINARY_CLOUD_NAME", default=""),
    api_key=config("CLOUDINARY_API_KEY", default=""),
    api_secret=config("CLOUDINARY_API_SECRET", default=""),
    secure=True,
)

# ── API docs (drf-spectacular) ──────────────────────────────────────────────
# NOTE: do not import anything from the `drf_spectacular` package here. Any
# submodule of it reads `django.conf.settings` at import time, and importing
# it from inside a settings module being loaded triggers a reentrant settings
# load — Django hands it a *partial* module (only the names defined above
# this line), so drf-spectacular's global settings singleton freezes with
# defaults (AllowAny permissions, no SERVE_AUTHENTICATION override) forever,
# even though `django.conf.settings.SPECTACULAR_SETTINGS` itself ends up
# correct. Verified by hitting /docs/ with no key and getting 200 instead of
# 403. The JWTAuthentication scheme registration
# (`drf_spectacular.contrib.rest_framework_simplejwt`) lives in
# `elvuelto/docs_views.py` instead, which is only imported once urls.py
# loads — always after settings have fully finished.
from elvuelto.version import APP_VERSION

DOCS_API_KEY = config("DOCS_API_KEY", default="")

SPECTACULAR_SETTINGS = {
    "TITLE": "ElVuelto API",
    "DESCRIPTION": "POS multi-tenant para negocios colombianos.",
    "VERSION": APP_VERSION,
    "SERVE_PERMISSIONS": ["elvuelto.docs_auth.HasDocsApiKey"],
    "SERVE_AUTHENTICATION": [],
    "SCHEMA_PATH_PREFIX": r"/api/",
    # Self-hosted via drf-spectacular-sidecar instead of the library's default
    # (an unpinned "@latest" CDN URL) — /docs/ already embeds DOCS_API_KEY in
    # its JS; no reason to also load unpinned third-party JS onto that page.
    "SWAGGER_UI_DIST": "SIDECAR",
    "SWAGGER_UI_FAVICON_HREF": "SIDECAR",
    "REDOC_DIST": "SIDECAR",
}
