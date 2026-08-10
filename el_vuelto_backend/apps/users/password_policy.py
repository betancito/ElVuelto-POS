"""Single source of truth for the password policy — per role, not flat.

The CAJERO's 4-digit PIN is **intentional**: the POS runs on a touch screen with
no keyboard. So the policy is not flattened to one minimum; it stays coherent
per role (cajero = 4-digit PIN, admin/superadmin = 12 chars with symbols) and
lives here so validation and generation can never drift apart again.

Anything that validates or generates a password must go through this module:
`UserCreateSerializer.validate` (create/update), `UpdateMeView` (own password)
and `UserViewSet.reset_password` (via `generate_new_password`).

Note: Django's `AUTH_PASSWORD_VALIDATORS` (settings/base.py) is **declared but
never wired** — nothing calls `validate_password()`. Wiring it would reject the
4-digit PIN (MinimumLength + NumericPassword validators), so this module — not
that setting — is the policy in force.
"""

import secrets
import string

from .models import UserRole

PIN_LENGTH = 4  # CAJERO — numeric PIN typed on the POS touch screen
ADMIN_PASSWORD_LENGTH = 12  # ADMIN / SUPERADMIN
ADMIN_SYMBOLS = "!@#$%&*"
ADMIN_ALPHABET = string.ascii_letters + string.digits + ADMIN_SYMBOLS


def min_length_for(rol) -> int:
    """Minimum password length required for `rol`."""
    return PIN_LENGTH if rol == UserRole.CAJERO else ADMIN_PASSWORD_LENGTH


def length_error_for(rol) -> str:
    """Spanish 400 message that goes with `min_length_for`."""
    if rol == UserRole.CAJERO:
        return f"El PIN debe tener {PIN_LENGTH} dígitos."
    return f"Mínimo {ADMIN_PASSWORD_LENGTH} caracteres."


def generate_password(rol) -> str:
    """Generate a password that satisfies the policy for `rol`.

    Uses `secrets` (not `random`): these strings are handed to a human as their
    actual credential, so the generator must not be predictable.
    """
    if rol == UserRole.CAJERO:
        return "".join(secrets.choice(string.digits) for _ in range(PIN_LENGTH))

    # Guarantee one of each class, then fill and shuffle so the guaranteed
    # characters don't always sit in the first four positions.
    required = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice(ADMIN_SYMBOLS),
    ]
    rest = [
        secrets.choice(ADMIN_ALPHABET)
        for _ in range(ADMIN_PASSWORD_LENGTH - len(required))
    ]
    combined = required + rest
    secrets.SystemRandom().shuffle(combined)
    return "".join(combined)
