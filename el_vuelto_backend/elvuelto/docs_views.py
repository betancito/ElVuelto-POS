"""Swagger/Redoc/schema views wired to the `DOCS_API_KEY` gate.

Browser access goes through `DocsLoginView` (`/docs/login/`), a plain HTML
form — `/docs/` and `/redoc/` redirect there when neither the session flag
nor the `X-Docs-Api-Key` header is present. Once the session flag is set,
it rides along automatically on every request to the app, including
Swagger UI's own JS fetch of `/api/schema/` — no URL rewriting needed,
unlike the `?key=` mode this replaced (see `docs_auth.py`).

`SPECTACULAR_SETTINGS["SERVE_PERMISSIONS"]` (`HasDocsApiKey`) still gates
`/api/schema/` directly (plain 403 if unauthorized — that endpoint is
fetched by JS/curl, not typed into an address bar, so a redirect would be
wrong there). `/docs/` and `/redoc/` opt out of that automatic 403
(`permission_classes = []`) and check manually in `get()` so they can
redirect to the login page instead.
"""

from urllib.parse import quote

from django.http import HttpResponse, HttpResponseRedirect
from django.middleware.csrf import get_token
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views import View
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from elvuelto.docs_auth import DOCS_SESSION_KEY, HasDocsApiKey, key_matches

# Registers the OpenApiAuthenticationExtension for JWTAuthentication so the
# Swagger "Authorize" button documents the real Bearer flow. Must NOT live in
# settings/base.py — see the comment there for why that freezes drf-spectacular's
# settings singleton with defaults. This module is only imported once urls.py
# loads, always after settings have fully finished, so it is safe here.
import drf_spectacular.contrib.rest_framework_simplejwt  # noqa: E402,F401


class _NoStoreMixin:
    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store"
        return response


def _login_url(request):
    return f"{reverse('docs-login')}?next={quote(request.get_full_path())}"


class _RedirectsToLoginMixin(_NoStoreMixin):
    # Checked by hand in get() instead, so an unauthorized visit can redirect
    # to the login form rather than DRF's default flat 403.
    permission_classes = []
    authentication_classes = []

    def get(self, request, *args, **kwargs):
        if not HasDocsApiKey().has_permission(request, self):
            return HttpResponseRedirect(_login_url(request))
        return super().get(request, *args, **kwargs)


class DocsSchemaView(_NoStoreMixin, SpectacularAPIView):
    pass


class DocsSwaggerView(_RedirectsToLoginMixin, SpectacularSwaggerView):
    pass


class DocsRedocView(_RedirectsToLoginMixin, SpectacularRedocView):
    pass


_LOGIN_PAGE = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>ElVuelto API Docs</title>
<style>
  body {{ font-family: -apple-system, sans-serif; max-width: 22rem; margin: 4.5rem auto; padding: 0 1rem; color: #222; }}
  h1 {{ font-size: 1.25rem; margin-bottom: .25rem; }}
  p.sub {{ color: #666; font-size: .875rem; margin-top: 0; margin-bottom: 1.5rem; }}
  label {{ display: block; font-size: .8125rem; font-weight: 600; margin-bottom: .375rem; }}
  input[type=password] {{ width: 100%; padding: .625rem; font-size: 1rem; box-sizing: border-box; border: 1px solid #ccc; border-radius: 6px; }}
  button {{ margin-top: 1rem; padding: .625rem 1.25rem; font-size: .9375rem; border: none; border-radius: 6px; background: #222; color: #fff; cursor: pointer; }}
  p.error {{ color: #b00020; font-size: .875rem; }}
</style>
</head>
<body>
<h1>ElVuelto API Docs</h1>
<p class="sub">Acceso interno — pegá la API key configurada en DOCS_API_KEY.</p>
<form method="post">
  <input type="hidden" name="csrfmiddlewaretoken" value="{csrf_token}">
  <input type="hidden" name="next" value="{next_url}">
  <label for="key">API key</label>
  <input type="password" name="key" id="key" autofocus required>
  {error_html}
  <button type="submit">Entrar</button>
</form>
</body>
</html>"""


class DocsLoginView(View):
    """GET renders the form; POST validates the key and, if it matches,
    stamps the session and redirects to `next` (validated against open
    redirect via `url_has_allowed_host_and_scheme`, same helper Django's own
    `LoginView` uses)."""

    def get(self, request):
        if request.session.get(DOCS_SESSION_KEY):
            return HttpResponseRedirect(self._safe_next(request))
        return self._render(request)

    def post(self, request):
        if key_matches(request.POST.get("key", "")):
            request.session[DOCS_SESSION_KEY] = True
            return HttpResponseRedirect(self._safe_next(request))
        return self._render(request, error=True, status=401)

    def _safe_next(self, request):
        next_url = request.POST.get("next") or request.GET.get("next") or reverse("swagger-ui")
        if url_has_allowed_host_and_scheme(
            next_url, allowed_hosts={request.get_host()}, require_https=request.is_secure()
        ):
            return next_url
        return reverse("swagger-ui")

    def _render(self, request, error=False, status=200):
        html = _LOGIN_PAGE.format(
            csrf_token=get_token(request),
            next_url=self._safe_next(request),
            error_html='<p class="error">Key inválida.</p>' if error else "",
        )
        return HttpResponse(html, status=status)
