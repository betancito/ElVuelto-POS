"""Shared parsing/validation of query params (dates and bounded ints).

**Why a helper instead of a try/except per view.** The `ValueError` raised by
`int()` / `date.fromisoformat()` and the `django.core.exceptions.ValidationError`
raised when a garbage string reaches a date lookup are **not** mapped by DRF's
`exception_handler` — it returns `None` for them and Django turns them into a
**500**. Only `rest_framework.serializers.ValidationError` becomes a **400** with
a per-field body, which is the shape the frontend's `applyServerErrors` consumes.
So every query param that ends up in a queryset must be parsed through here.

Contract enforced by `parse_date_range`:

* format is strictly ``YYYY-MM-DD`` (a lone `date.fromisoformat` would also accept
  other ISO spellings such as ``20260804``);
* ``fecha_inicio > fecha_fin`` is a 400 — it used to return an empty list in silence;
* the range width is capped at ``MAX_RANGE_DAYS`` — without it, a caller could ask
  for 50 years and `VentasPorDiaView` would build ~18.000 dicts in memory.
"""

from datetime import date, datetime

from rest_framework import serializers

# One leap year: enough for "the whole year" reports, small enough that the
# per-day series in VentasPorDiaView can never blow up memory.
MAX_RANGE_DAYS = 366


def parse_date_param(value, field_name):
    """``None``/``""`` → ``None``; a valid ``YYYY-MM-DD`` → ``date``; anything else → 400."""
    if value in (None, ""):
        return None
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError:
        raise serializers.ValidationError(
            {field_name: f"Fecha inválida: '{value}'. El formato debe ser YYYY-MM-DD."}
        )


def parse_date_range(
    params,
    max_days=MAX_RANGE_DAYS,
    inicio_field="fecha_inicio",
    fin_field="fecha_fin",
):
    """Return ``(inicio, fin)`` as ``date | None``, validated and coherent.

    Half a range is **not** an error: each bound is optional and each caller
    documents what it does with a missing one (an open-ended filter in the list
    endpoints, a documented default in the report endpoints). Order and width are
    only checkable when both bounds are present.
    """
    inicio = parse_date_param(params.get(inicio_field), inicio_field)
    fin = parse_date_param(params.get(fin_field), fin_field)

    if inicio and fin:
        if inicio > fin:
            raise serializers.ValidationError(
                {
                    inicio_field: (
                        f"La fecha de inicio ({inicio.isoformat()}) no puede ser "
                        f"posterior a la fecha final ({fin.isoformat()})."
                    )
                }
            )
        if max_days is not None:
            dias = (fin - inicio).days + 1  # inclusive on both ends
            if dias > max_days:
                raise serializers.ValidationError(
                    {fin_field: f"El rango no puede superar {max_days} días (pediste {dias})."}
                )
    return inicio, fin


def parse_positive_int(value, field_name, default, maximum):
    """``None``/``""`` → ``default``; ``<= 0`` or non-numeric → 400; above ``maximum`` → clamped.

    Clamping (rather than 400) keeps the previous behaviour of `?limit=1000`,
    which the frontend may rely on; what changes is that `?limit=abc` no longer
    500s and `?limit=-5` no longer reaches the queryset as a negative slice.
    """
    if value in (None, ""):
        return default
    try:
        parsed = int(str(value))
    except ValueError:
        raise serializers.ValidationError(
            {field_name: f"Valor inválido: '{value}'. Debe ser un número entero."}
        )
    if parsed < 1:
        raise serializers.ValidationError({field_name: "Debe ser un número entero mayor que cero."})
    return min(parsed, maximum)
