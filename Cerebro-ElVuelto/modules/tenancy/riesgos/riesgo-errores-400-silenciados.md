---
tags: [modulo, riesgo]
status: vivo
module: tenancy
severity: media
updated: 2026-08-02
---

# Riesgo — Errores 400 por campo silenciados en el CRUD de tenants

**Ancla:** `el_vuelto_frontend/src/features/super-admin/tenants/index.tsx:67-69,91-93`

## Qué pasa
Los dos submits (crear y editar negocio) hacen:
```
catch { toast.error('No se pudo crear/actualizar el negocio...') }
```
No inspeccionan el cuerpo del error ni llaman `setError` de RHF por campo.

## Errores que quedan ocultos
El backend devuelve **400 con errores por campo** en varios casos reales:
- `nit` duplicado (UniqueValidator de `unique=True`, `models.py:9`).
- `correo` del negocio duplicado (`models.py:11`).
- `max_length` excedido (nombre>200, nit>20, ciudad>100) — el front no valida `max()` en Zod, así que estos llegan al back.

Todos se colapsan en el mismo toast genérico. El super-admin no sabe **qué** campo falló ni por qué (¿NIT repetido? ¿correo repetido?), y el mensaje sugiere "verifica los datos" sin señalar cuál.

## Peor caso combinado
Con `admin_correo` duplicado el back responde **500** (ver [[riesgo-creacion-tenant-no-atomica]]), que cae en el MISMO catch ⇒ el usuario recibe idéntico mensaje para un 400 recuperable y para un 500 con tenant huérfano.

## Impacto
UX pobre en el flujo de alta de clientes; dificulta el soporte (no hay señal del campo culpable). No hay pérdida de datos, pero sí fricción y reintentos que agravan [[riesgo-creacion-tenant-no-atomica]].

## Recomendación (no aplicar aquí)
Leer `error.data` (RTK Query `FetchBaseQueryError`), mapear claves de campo a `createForm.setError`/`editForm.setError`, y mostrar `non_field_errors` aparte. Ver [[preguntas-tenancy]] P-5.
