---
tags: [modulo, formularios, auditoria]
status: vivo
module: products
updated: 2026-08-02
---

# Products — Auditoría de formularios

Dos formularios en `features/products/ProductsPage.tsx`: **Producto** (crear/editar) y **Categoría** (crear/editar). Ambos en modales dentro de la misma página dual-tab. Ver mapa en [[mapa-products]], back en [[contratos-products]] / [[datos-products]].

---

## Formulario Producto — pestaña "Productos"

- **Componente:** `ProductsPage.tsx:105` (`ProductsTab`), modal `:384-536`. **Modo:** crear y editar (`editing: Product | null`).
- **Schema Zod:** `productSchema` `ProductsPage.tsx:35-43`, **estático**. `zodResolver` en `:125`. `defaultValues:{tipo:'SIN_CODIGO'}`. Sin `mode`/`reValidateMode` explícito (default `onSubmit`).
- **defaultValues / reset:** `openCreate` (`:130-138`) hace `reset({tipo,nombre:'',precio_venta:'',precio_costo:''})`. `openEdit` (`:140-156`) hace `reset(...)` con los datos del producto (`precio_costo/barcode/proveedor` con `?? ''`). El `reset` es explícito por acción → no queda stale.
- **Estructura dinámica:** `watch('tipo')` (`:128`) gobierna un toggle (`:470-480`) que, cuando `CON_CODIGO`, MUESTRA los campos `barcode` (`BarcodeField`) y `proveedor` (`:507-521`). `precio_costo` siempre visible pero rotulado "(opcional)" solo en `SIN_CODIGO`. `category` se maneja con `CategorySelect` custom + `setValue`. `precio_venta`/`precio_costo` con `PriceInput` custom + `setValue`.
- **Submit:** `onSubmit` (`:170-209`) → arma `ProductPayload` (`:177-185`): si editar `updateProduct` (PATCH) si no `createProduct` (POST) → luego, si hay `imageFile`, `uploadProductImage` (FormData). Transformaciones: `precio_costo: data.precio_costo || null`; barcode/proveedor forzados a `null` cuando `SIN_CODIGO`. Dinero: strings de dígitos (sin puntos). Éxito: `setShowModal(false)` + `reset()`. Tags `Product` se invalidan por la mutation.
- **Imagen:** regla front-only "obligatoria al crear" (`:171-174`, valida `imageFile`), NO existe en el back. Máx 2 MB solo en texto (no se valida tamaño).
- **Errores del servidor:** ❌ **NO se mapean.** `catch (err) { console.error(err) }` (`:204-206`). Un 400 (CON_CODIGO incompleto, barcode duplicado, categoría de otro tenant) se traga: no hay `setError`, ni toast, ni banner. El modal queda abierto sin feedback. → [[errores-400-swallowed-en-forms]].

### Matriz de paridad — Producto

| campo | Zod (regla) | RHF (control) | tipo TS | serializer DRF | modelo Django | constraint BD | ⚠️ divergencia |
|---|---|---|---|---|---|---|---|
| `nombre` | `string.min(2)` req | `register` | `string?` (payload) | writable req | CharField(200) NOT NULL | — | Zod min2; modelo max200 no validado en front |
| `category` | `string.min(1)` **req** | `CategorySelect`+`setValue` | `string\|null` | writable, opcional | FK null/blank | — | ⚠️ **front OBLIGA, back permite null**. Producto sin categoría es válido en BD |
| `tipo` | `enum` req | toggle+`setValue` | `'SIN_CODIGO'\|'CON_CODIGO'` | writable req | choices, sin default | — | ✅ enums sincronizados |
| `precio_venta` | `string.min(1)` req | `PriceInput` | `string` | writable req | DecimalField(10,2) NOT NULL | — | ⚠️ Zod NO valida numérico ni >0; solo min(1) carácter. Dinero como string (correcto p/ precisión) pero sin sanitizar no-dígitos en el valor crudo |
| `precio_costo` | `.optional()` | `PriceInput` | `string\|null` | **req si CON_CODIGO** (`:49`) | null/blank | — | ⚠️ **front opcional, back lo exige en CON_CODIGO**. 400 tragado |
| `barcode` | `.optional()` | `BarcodeField` | `string\|null` | **req si CON_CODIGO** (`:47`) | null/blank | `unique_tenant_barcode` | ⚠️ front opcional; back exige y además unicidad solo en BD ⇒ duplicado = 400/500 tragado |
| `proveedor` | `.optional()` | `register` | `string\|null` | **req si CON_CODIGO** (`:51`) | null/blank | — | ⚠️ front opcional, back lo exige |
| `stock_actual` | ausente | — | `number` (solo lectura) | writable (default 0) | IntegerField default 0 | — | Form NO lo envía; lo mueve [[inventory]] |
| `stock_minimo` | ausente | — | **ausente en TS** | writable (default 0) | IntegerField default 0 | — | ⚠️ ni el form ni el tipo `Product` lo exponen |
| `activo` | ausente | — | `boolean` | writable (default True) | BooleanField default True | — | ⚠️ **no editable desde UI** → no hay forma de (des)activar producto |
| `imagen` | front-only req al crear | `ImageUploadField` | `imagen_url:string\|null` | `imagen_url` read_only (sube por acción aparte) | URLField null/blank | — | Flujo en 2 pasos (create → upload_image). "Obligatoria" solo en front |

---

## Formulario Categoría — pestaña "Categorías"

- **Componente:** `ProductsPage.tsx:542` (`CategoriesTab`), modal `:718-763`. **Modo:** crear y editar.
- **Schema Zod:** `categorySchema` `:46-48`, estático, solo `{nombre: string.min(2)}`. `zodResolver` en `:560`. **Sin `defaultValues`** en el `useForm`; `openCreate` (`:568-575`) hace `reset({nombre:''})`, `openEdit` (`:577-584`) `reset({nombre:c.nombre})`.
- **Submit:** `onSubmit` (`:598-627`): create/update categoría → si hay imagen, `uploadCategoryImage` (FormData). Éxito: cierra modal + `reset()`. Imagen obligatoria al crear (front-only, `:599-602`).
- **Errores del servidor:** ❌ igual que producto — `catch { console.error(err) }` (`:622-624`). Nombre duplicado (`unique_together (tenant,nombre)`) → error tragado, sin feedback. → [[errores-400-swallowed-en-forms]].

### Matriz de paridad — Categoría

| campo | Zod | RHF | tipo TS | serializer DRF | modelo Django | constraint BD | ⚠️ divergencia |
|---|---|---|---|---|---|---|---|
| `nombre` | `string.min(2)` req | `register` | `string` (payload) | writable req | CharField(100) NOT NULL | `unique_together (tenant,nombre)` | ⚠️ unicidad SOLO en BD; el front no la anticipa y traga el 400/500. max100 no validado en front |
| `imagen` | front-only req al crear | `ImageUploadField` | `imagen_url:string\|null` | `imagen_url` read_only | URLField null/blank | — | Sube por `upload_image` en 2º paso |

---

## ⚠️ Divergencias detectadas (priorizadas)

1. **[ALTO] CON_CODIGO — front no exige lo que el back sí.** Zod deja `barcode/precio_costo/proveedor` `.optional()` (`ProductsPage.tsx:40-42`) pero `ProductSerializer.validate` los exige (`serializers.py:47-52`). El usuario puede enviar CON_CODIGO incompleto → 400 → tragado por `console.error` (`:204`). Doble falla: validación divergida + error invisible. → [[validacion-con-codigo-solo-serializer]] + [[errores-400-swallowed-en-forms]].
2. **[ALTO] 400 del servidor invisibles** en ambos forms (`:204-206`, `:622-624`). Unicidad de `nombre`/`barcode` y categoría cross-tenant no se muestran nunca.
3. **[MEDIO] `category` obligatoria en front, opcional en back** (`ProductsPage.tsx:37` vs `models.py:32-38`). Inconsistencia de contrato; productos sin categoría existen (SET_NULL al borrar categoría).
4. **[MEDIO] `activo` no editable en UI.** El modelo y serializer lo permiten, pero el form nunca lo envía y el `deleteProduct` (hard delete) está inalcanzable → no hay forma de desactivar ni borrar productos desde la pantalla. → [[delete-inalcanzable-en-ui]].
5. **[BAJO] `stock_minimo` ausente en el tipo TS `Product`** (`productsApi.ts:9-22`) aunque el serializer lo devuelve. Se gestiona en [[inventory]].
6. **[BAJO] `precio_venta` sin validación numérica/positiva en Zod** (solo `min(1)` carácter). El `PriceInput` limpia dígitos al mostrar pero el valor crudo de RHF podría conservar no-dígitos si se pegan.

## ❓ Por confirmar
- ¿El backend responde 400 limpio o 500 IntegrityError ante `nombre`/`barcode` duplicado (unique_together con `tenant` read_only)? → [[preguntas-products]] P-3.
- ¿Es intencional que no exista (des)activación ni borrado de productos desde la UI, o es feature a medio hacer? → [[preguntas-products]] P-2.
