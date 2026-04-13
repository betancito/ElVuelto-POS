from rest_framework.permissions import BasePermission

from .models import UserRole


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.rol == UserRole.SUPERADMIN
        )


class IsAdmin(BasePermission):
    """Allows ADMIN and SUPERADMIN."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.rol in (UserRole.ADMIN, UserRole.SUPERADMIN)
        )


class IsCajero(BasePermission):
    """Allows CAJERO, ADMIN, and SUPERADMIN."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.rol in (UserRole.CAJERO, UserRole.ADMIN, UserRole.SUPERADMIN)
        )
