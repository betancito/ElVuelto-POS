---
tags: [tarea, backend, tenancy, robustez]
status: 🔴
prioridad: media
updated: 2026-08-16
---

# BACKEND-20260816-borrar-tenant-con-ventas-da-500 — `DELETE /api/tenants/{id}/` revienta si el negocio vendió algo

**Tipo:** robustez · **Encontrado en:** limpiando los datos de prueba de
[[RUN-20260816-stock-negativo-permitido]] — **no lo causó ese cambio**, es preexistente ·
**Relacionado:** [[BACKEND-20260812-borrar-tenant-deja-asset-cloudinary]]

## El problema
`DELETE /api/tenants/{id}/` responde **500** en cuanto el negocio tiene una sola venta. Reproducido el
2026-08-16 contra el servidor real; la causa, capturada desde el ORM:

```
ProtectedError: Cannot delete some instances of model 'Tenant' because they are referenced
through protected foreign keys: 'User.tenant', 'Product.tenant'.
```

El cascade del tenant intenta borrar `User` y `Product`, y ahí chocan los `on_delete=PROTECT` de
`Sale.user`, `SaleItem.product` e `InventoryMovement.product`/`.user`. Django levanta `ProtectedError`,
que **DRF no mapea**, así que sale como 500 en HTML en vez de un 4xx con mensaje.

Los `PROTECT` están bien puestos: existen para que un producto o un cajero no se borren y dejen el
historial de ventas sin referencia. El defecto es que la operación de borrar el negocio **no los
contempla**.

## Por qué no se había visto
Los negocios de prueba que se borraron en features anteriores no tenían ventas, así que el `DELETE`
respondía 204 y parecía sano. El primero con ventas lo destapó.

## Criterio de aceptación
Borrar un negocio con ventas **no** devuelve 500. Cualquiera de estas tres, según lo que decida el owner:
1. **Borrado en cascada explícito** dentro de una transacción (items → ventas → movimientos → productos →
   categorías → usuarios → tenant), que es lo que hubo que hacer a mano.
2. **Rechazar con 409/400** y un mensaje claro (*"no se puede borrar un negocio con ventas
   registradas"*), dejando el desactivar (`activo=False`) como la vía real.
3. **Soft delete** del tenant.

> [!question] Pregunta para el owner, antes de codear
> ¿Un negocio con historial de ventas **debería** poder borrarse? La opción 2 es la más conservadora y
> probablemente la correcta para un SaaS con contabilidad: desactivar, no borrar. Pero eso es decisión de
> negocio, no técnica.

## Notas para el Dev
- Si se toma la opción 1, ojo con [[BACKEND-20260812-borrar-tenant-deja-asset-cloudinary]]: hay que
  destruir el asset de Cloudinary **antes** de borrar la fila, o queda huérfano.
- El 500 es de mapeo: aunque se elija la opción 1, vale envolver el `destroy` para que un
  `ProtectedError` inesperado salga como 4xx y no como HTML de error.
