---
tags: [adr, tenancy, superadmin, ui, cloudinary]
status: activo
updated: 2026-08-12
supersedes: ADR-TENANCY-20260812-logo-tenant-superadmin-ui (punto 1)
---

# ADR-TENANCY-20260812 — Logo del tenant en los modales de crear/editar, y endpoint para quitarlo

> [!warning] Supersede el punto 1 de [[ADR-TENANCY-20260812-logo-tenant-superadmin-ui]]
> Ese ADR decidió, el mismo día y unas horas antes, que la UI del logo viviera **solo** en
> `TenantDetailPage`. El owner pidió después poder hacerlo desde los modales de creación y edición —
> que es donde realmente se da de alta un negocio. **El resto de aquel ADR sigue vigente** (patrón de
> control accesible, validación en cliente, el fix de la clave `"error"` en los helpers de errores).
> El control del detalle **no se tocó**.

**Contexto:** el logo solo se podía subir desde el detalle del negocio. El owner pidió agregarlo,
cambiarlo y **quitarlo** desde los modales de `super-admin/tenants/index.tsx`. Dato de historia
encontrado en la investigación: el control ya vivió en esos modales y se borró en el commit `e6eaac6`;
su CSS muerto (`TenantsPage.module.css:126-191`, 66 líneas) seguía en el repo y se eliminó ahora.

## Decisión

### 1. La subida es DIFERIDA en ambos modales (no inmediata como en el detalle)

Elegir un archivo no sube nada: se guarda un `LogoDraft` (`keep` | `replace{file, preview}` |
`remove`, en `components/TenantLogoField.tsx`) y el submit lo aplica **después** de que la escritura
del tenant tuvo éxito. **Cancelar descarta el logo.**

- En **creación no hay alternativa**: no existe `id` hasta que responde `POST /tenants/`.
- En **edición se igualó a propósito**, elegido por el owner sobre la alternativa "subir al instante":
  así "Cancelar" cancela todo, el modal tiene un solo modelo mental, y es además menos código (un solo
  helper `applyLogoDraft` para los dos flujos).

### 2. El `POST /tenants/` sigue siendo JSON — el logo va en un segundo request

Meter el archivo en el mismo payload obligaría a multipart, y **multipart en este endpoint es un bug
latente**: en DRF 3.15 `BooleanField.default_empty_html = False` (`fields.py:663`) y `Field.get_value`
lo aplica a todo input HTML **no parcial** (`fields.py:415-418`). Un `POST` multipart que omita
`activo` lo escribiría `False` → el negocio nace **inactivo** y su página de login responde
`exists:false` (`views.py:52-56`). Es exactamente la trampa por la que PUT está deshabilitado en todo
el proyecto (`viewsets.py:5-12`).

`PATCH` sí sería inmune (es parcial), pero se mantiene JSON por simetría y para no dejar el patrón
peligroso a mano en el archivo.

### 3. Invariantes de fallo parcial (la escritura del tenant commitea, el logo no)

1. **Creación: el `CredentialsModal` se abre SIEMPRE.** `initial_admin_password` se muestra una sola
   vez y es irrecuperable. `applyLogoDraft` devuelve un string de error y **nunca lanza**, así que un
   logo fallido produce un `toast.error` extra, jamás una contraseña perdida.
2. **Edición: datos primero, logo después.** Al revés, un logo subido sobreviviría a un `PATCH` que el
   servidor rechazó. Si falla el paso del logo, el toast dice explícitamente que los datos **sí** se
   guardaron.

### 4. Endpoint nuevo para quitar el logo

```
DELETE /api/tenants/{id}/logo/   delete_logo   IsSuperAdmin   → 204
```

- **Idempotente:** 204 aunque no haya logo. Un DELETE declara un estado final deseado; un doble click
  o un reintento tras una conexión caída no puede salir como error de una operación que sí funcionó.
- **`destroy_image(public_id)`** nuevo en `elvuelto/cloudinary_uploads.py` — la regla dura del proyecto
  es que ninguna vista llame `cloudinary.uploader.*` directo.
- **Best effort, nunca levanta** (al revés que `upload_optimized_image`, que mapea a 400): si
  Cloudinary falla, la fila se borra igual. Bloquear el borrado por un problema del CDN sería peor, y
  el huérfano está acotado a 1 por tenant y **se auto-sana**: el `public_id` es determinista
  (`tenant_<uuid>_logo`) y las subidas usan `overwrite=True`, así que la próxima lo pisa.
- **Orden: destruir primero, borrar la fila después.** Si se escapara una excepción que el SDK no
  envuelve, queda la fila intacta (logo visible y almacenado) en vez del estado inverso.

## Hallazgo de verificación que vale documentar

`invalidate=True` es una **solicitud**, no una garantía. Verificado en vivo: justo después del 204 la
URL de entrega seguía devolviendo **200** desde el borde del CDN mientras
`cloudinary.api.resource(public_id)` ya respondía `NotFound` — el origen estaba borrado, la copia
cacheada no. No afecta a la app (la fila se borró, ninguna pantalla vuelve a pintar esa URL, y una
subida nueva trae `v<timestamp>` distinto), pero **"pedir la URL vieja" no sirve como prueba de que el
borrado funcionó**: hay que consultar la Admin API. La primera corrida de verificación dio 14/15
justamente por esta aserción mal planteada — el código estaba bien, la prueba estaba mal.

## Alcance — qué NO se tocó

- `TenantDetailPage.tsx` mantiene subida **inmediata** y **no** tiene botón de quitar. Único cambio
  ahí: usa `validateImageFile` compartido en vez de su constante local (evitaba una tercera copia del
  10 MB). Efecto lateral menor: ahora también valida el **tipo** de archivo en cliente, no solo el
  tamaño.
- Productos y categorías siguen sin endpoint de borrado (reemplazar es el único camino).
- No se tocó `TenantsTable.tsx` — ya mostraba el logo.

## Implementación y verificación

[[RUN-20260812-logo-tenant-modales-crear-editar]] — 15/15 casos contra servidor real + revisión
adversarial.
