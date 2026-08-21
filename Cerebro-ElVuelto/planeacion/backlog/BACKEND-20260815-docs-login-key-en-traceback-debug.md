---
tags: [tarea, backend, seguridad, docs]
status: 🔴
prioridad: baja
updated: 2026-08-15
---

# BACKEND-20260815-docs-login-key-en-traceback-debug — la `DOCS_API_KEY` no está censurada en la página de error

**Tipo:** seguridad (defensa en profundidad) · **Encontrado en:** PASO 0 del 2026-08-15, **verificando
otro ítem** ([[BACKEND-20260811-manage-py-settings-fallback-inseguro]]) — no se salió a buscarlo ·
**Relacionado:** [[ADR-G-20260811-docs-swagger-key-gate]]

## El problema
`el_vuelto_backend/elvuelto/docs_views.py:113-117` — `DocsLoginView.post` lee la key con
`request.POST.get("key", "")` y **no lleva el decorador `@sensitive_post_parameters`**.

Django solo censura parámetros POST en su página de error cuando ese decorador está presente: el
reporter chequea `request.sensitive_post_parameters` y, si no está, imprime el `POST` completo en claro.
O sea: con `DEBUG=True`, cualquier excepción levantada durante ese POST vuelca la `DOCS_API_KEY` en la
página de error.

## Por qué es baja (y por qué igual va al backlog)
- Requiere `DEBUG=True`, que en un deploy correcto no debería estar. Pero **exactamente eso** es lo que
  puede pasar por [[BACKEND-20260811-manage-py-settings-fallback-inseguro]]: un comando corrido sin
  `DJANGO_SETTINGS_MODULE` exportado arranca en `settings/local.py` con `DEBUG=True`. Los dos ítems se
  encadenan.
- El secreto es un secreto de herramienta (dev/soporte), no una credencial de usuario, y **no da acceso a
  endpoints de negocio** (verificado en su día: `/api/products/pos/` sigue en 401 con sesión de docs
  válida).
- Es el mismo tipo de fuga que el ADR ya cerró cuando eliminó el modo `?key=` en la URL — este es el
  vector que quedó del lado del POST.

## Criterio de aceptación
`DocsLoginView.post` (o la clase) lleva `@sensitive_post_parameters("key")` — o el equivalente
`method_decorator` sobre `dispatch` — y una excepción provocada durante ese POST con `DEBUG=True` muestra
`key` como censurada en vez del valor real. Verificable provocando el error a propósito y mirando la
página.

## Notas para el Dev
- Es un decorador, no un cambio de comportamiento: la key se sigue leyendo igual.
- Doble actualización: la sección de docs de `el_vuelto_backend/CLAUDE.md` menciona la eliminación del
  `?key=` y las dos fugas que cerró; conviene que también mencione esta.
