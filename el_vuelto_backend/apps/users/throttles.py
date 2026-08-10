"""Rate limits for the authentication endpoints.

Why these exist: `TenantBySlugView` is public and hands out the tenant UUID, a
cédula is not a secret, and the cashier PIN is 4 digits by design (touch screen).
That is 10.000 combinations with no other barrier — an audit walked ~9 req/s and
would have covered the whole space in ~18 minutes. The PIN is not the thing to
change; the missing piece was a limit on attempts.

**Two layers, on purpose.**

* **Per identity** (the cédula+tenant or correo being tried) — tight. This is the
  credential actually under attack, and keying on it means a colleague who
  fumbles their PIN does not lock out the whole store, which is exactly what a
  pure per-IP limit would do behind the shared NAT of a single shop.
* **Per IP** — a generous ceiling. On its own the identity limit would let one
  attacker fan out across many identities from the same machine without ever
  hitting a wall; this catches that, while sitting far above any real store's
  traffic.

Both login endpoints share the same identity scope on purpose: the cédula branch
exists on `/auth/login/` too, so separate counters would just mean "switch
endpoint, double your budget".

Trade-off worth knowing: an identity-keyed limit lets an attacker burn a specific
cashier's quota and keep them out for a while. That is why the limit is a
recovering *rate* and not a lockout, and why the loose IP layer sits underneath.

Note these counters live in the cache — see the `CACHES` block in settings/base.py.
"""

from rest_framework.throttling import SimpleRateThrottle


class IdentityScopedThrottle(SimpleRateThrottle):
    """Throttle keyed by the identity in the request body, not by IP.

    Returns `None` (no throttling by this class) when the request carries none of
    the identity fields — a body with nothing to key on is still covered by the
    IP-scoped throttle applied alongside it.
    """

    identity_fields: tuple[str, ...] = ()

    def get_cache_key(self, request, view):
        parts = [str(request.data.get(field, "") or "").strip().lower() for field in self.identity_fields]
        if not any(parts):
            return None
        return self.cache_format % {"scope": self.scope, "ident": ":".join(parts)}


class IPScopedThrottle(SimpleRateThrottle):
    """Throttle keyed by client IP under an explicit scope.

    `ScopedRateThrottle` cannot be used here: it reads a single `throttle_scope`
    off the view, so it cannot be combined with a second scoped throttle on the
    same endpoint.
    """

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class LoginIdentityBurstThrottle(IdentityScopedThrottle):
    """Short window: a cashier mistypes a PIN two or three times, not ten."""

    scope = "login_identity_burst"
    identity_fields = ("correo", "cedula", "tenant_id")


class LoginIdentityDailyThrottle(IdentityScopedThrottle):
    """Long window — this is the one that actually kills the brute force.

    It caps a single credential's attempts per day, so the 10.000-PIN space stops
    being minutes of work and becomes months.
    """

    scope = "login_identity_daily"
    identity_fields = ("correo", "cedula", "tenant_id")


class LoginIPThrottle(IPScopedThrottle):
    """Anti fan-out ceiling: one source trying many identities."""

    scope = "login_ip"


class TokenRefreshIPThrottle(IPScopedThrottle):
    """Access tokens live 8 hours, so a real client refreshes rarely."""

    scope = "token_refresh_ip"


class TenantSlugIPThrottle(IPScopedThrottle):
    """Public endpoint: the staff login page resolves one slug per page load."""

    scope = "tenant_slug_ip"
