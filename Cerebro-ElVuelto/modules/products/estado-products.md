---
tags: [modulo, estado]
status: vivo
module: products
updated: 2026-08-02
---

# Products — Estado

**Semáforo:** 🟡 documentado (auditoría inicial completa)
**App back:** `apps/products/` (models 66 LOC · serializers 82 LOC · views 79 LOC) · **Feature front:** `features/products/` (ProductsPage.tsx ~1441 LOC · productsApi.ts 126 LOC) · **Complejidad:** 🟡 (back simple, front pesado por scanner de cámara + lector físico)

## Punteros
- Código: [[mapa-products]] · Endpoints: [[contratos-products]] · Datos: [[datos-products]] · Formularios: [[formularios-products]]
- Preguntas abiertas: [[preguntas-products]]
- Riesgos:
  - [[permisos-viewsets-sin-isadmin]] 🔴 ALTO
  - [[validacion-con-codigo-solo-serializer]] 🟡
  - [[errores-400-swallowed-en-forms]] 🟡
  - [[delete-inalcanzable-en-ui]] 🟡
- Conexiones: `[[products--inventory]]` · `[[products--sales]]` · `[[products--tenants]]` · `[[products--users]]`

## Qué es (3-5 líneas)
Catálogo del POS: `Category` y `Product`, ambos con `TenantMixin` (aislamiento por tenant). Un producto es `SIN_CODIGO` (venta suelta, sin stock) o `CON_CODIGO` (con barcode + stock unitario controlado por [[inventory]]). Expone CRUD REST bajo `/api/products/` + acción `pos/` minimal para cajero. El front es una página dual-tab (Productos / Categorías) con subida de imagen a Cloudinary, lector de código físico y por cámara (zxing / BarcodeDetector).

## Pendientes / drift doc↔código
- 🔴 **Permisos:** los viewsets NO declaran `permission_classes` → cae el default `IsAuthenticated` (base.py:97). El CLAUDE.md del backend afirma `IsAdmin` para create/update/delete. **Mentira documentada** → ver [[permisos-viewsets-sin-isadmin]].
- 🟡 **CON_CODIGO** exige barcode/precio_costo/proveedor SOLO en `serializers.py:38-55`; el modelo los deja `null/blank` y el Zod del front los deja `.optional()` → ver [[validacion-con-codigo-solo-serializer]].
- 🟡 **Delete inalcanzable:** `setDeletingId` nunca se invoca con id → el `ConfirmModal` de borrado es código muerto en ambas pestañas. Tampoco hay toggle de `activo`. Ver [[delete-inalcanzable-en-ui]].
- 🟡 **400 tragados:** los `onSubmit` solo hacen `console.error(err)`; errores por campo y de unicidad no se muestran. Ver [[errores-400-swallowed-en-forms]].
- 🟢 Imports muertos: `EditOutlinedIcon`, `DeleteOutlineIcon` (ProductsPage.tsx:22-23) y `ShoppingBagIcon` (ProductsPage.tsx:1432) no se usan.
- ❓ Unicidad `(tenant, nombre)` con `tenant` read_only en el serializer: ¿400 limpio o 500 IntegrityError? → [[preguntas-products]] P-3.
