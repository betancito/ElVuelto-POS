"""Gate for the API docs (Swagger/Redoc/schema): one shared secret from
`.env`, not a user credential — `apps/users` JWTs are untouched by this.
Real endpoints still authenticate with a real Bearer token via the
"Authorize" button drf-spectacular already renders for `JWTAuthentication`
(the extension is registered by importing `drf_spectacular.contrib.
rest_framework_simplejwt` in `settings/base.py`); this key only decides who
gets to look at `/api/schema/`, `/docs/` and `/redoc/` in the first place.

Two ways in, on purpose:

1. **A login form** (`DocsLoginView`, `docs_views.py`, mounted at
   `/docs/login/`) for browser use. Submitting the right key sets a session
   flag (`DOCS_SESSION_KEY`) via Django's existing cookie-backed session
   framework — nothing new to wire, `django.contrib.sessions` is already in
   `INSTALLED_APPS`. The key never has to ride in a URL: the browser sends
   the session cookie automatically on every request to the app, including
   Swagger UI's own JS fetch of `/api/schema/`.
2. **The `X-Docs-Api-Key` header**, for curl/Postman/CI — no browser, no
   session, no form needed.

Earlier version of this gate also accepted `?key=` in the URL, so a plain
browser visit could open both the page and its schema in one go. Dropped:
a key that travels in a URL ends up in server/proxy access logs and in
Django's `DEBUG=True` error pages, which echo `request.GET` unredacted. The
login form removes that whole class of leak for the one path (a human in a
browser) that needed a bootstrap mechanism in the first place.
"""

import hmac

from django.conf import settings
from rest_framework.permissions import BasePermission

DOCS_SESSION_KEY = "docs_authorized"
DOCS_KEY_HEADER = "X-Docs-Api-Key"


def key_matches(provided):
    expected = settings.DOCS_API_KEY
    # Fails closed: no DOCS_API_KEY configured means nobody gets in, never
    # "unset means open".
    if not expected or not provided:
        return False
    return hmac.compare_digest(provided, expected)


class HasDocsApiKey(BasePermission):
    message = f"Iniciá sesión en /docs/login/ o enviá el header {DOCS_KEY_HEADER}."

    def has_permission(self, request, view):
        if request.session.get(DOCS_SESSION_KEY):
            return True
        return key_matches(request.headers.get(DOCS_KEY_HEADER, ""))
