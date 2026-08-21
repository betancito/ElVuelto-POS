---
tags: [adr, decision, tenancy, frontend, ux]
status: aceptada
module: tenancy
updated: 2026-08-15
---

# ADR-TENANCY-20260815-pegar-logo-portapapeles — pegar el logo con ⌘V / Ctrl+V en los modales de negocio

**Fecha:** 2026-08-15 · **Estado:** ✅ aceptada e implementada · **Pedido directo del owner** en el chat,
con modo plan aprobado ([[GOBERNANZA]] §10) · **Corrida:** [[RUN-20260815-pegar-logo-portapapeles]]
**Antecede:** [[ADR-TENANCY-20260812-logo-tenant-modales-crear-editar]] (no lo supersede — lo extiende:
agrega un segundo camino de entrada al mismo `LogoDraft`)

## Contexto
El logo de un negocio solo se podía poner **eligiendo un archivo**. El caso real del owner es tomar un
pantallazo o copiar un logo de una web y pegarlo, sin pasar por "guardar como" + explorador.

El repo **ya tenía el gesto** en `el_vuelto_frontend/src/features/products/ProductsPage.tsx`
(`handlePaste`, producto y categoría), así que la decisión no fue *si* hacerlo sino *si copiar esa
implementación*. Se decidió que **no**, por dos huecos suyos:

1. **No valida.** El file-picker corre `validateImageFile`; su paste no. Una imagen de 30 MB viaja al
   servidor para volver como 400.
2. **`onPaste` está en el `<form>`.** Un evento `paste` apunta al elemento con foco, así que un handler
   en el form no dispara hasta que algo adentro ya tiene foco. Recién abierto el modal el foco está en
   `body` y el ⌘V no llega: el gesto natural — abrir y pegar — no funciona.

## Decisión

1. **El listener va en `document`, no en el `<form>`**, activo solo mientras ese modal está abierto y no
   está enviando. Es la misma forma del escáner de códigos de barras del POS/Inventario: listener
   global + regla explícita de cuándo ignorarlo. Es lo único que hace que ⌘V funcione sin haber
   clickeado antes.

2. **Regla imagen-vs-texto** (la única decisión de diseño real): se consume el paste como logo si el
   portapapeles trae un ítem `image/*` **y** (el foco **no** está en un campo de texto **o** el
   portapapeles **no** trae `text/plain`). `preventDefault()` **solo** cuando se consume, así un paste
   de texto nunca se altera.

   | Portapapeles | Foco | Resultado |
   |---|---|---|
   | pantallazo (solo imagen) | en `body` o en el avatar | → logo |
   | pantallazo (solo imagen) | escribiendo en un campo | → logo (no hay texto que pegar) |
   | fragmento de web (imagen + texto) | escribiendo en un campo | → **texto**, el campo gana |

3. **Los dos caminos comparten `draftFromFile`** — valida y arma el draft. El picker y el pegado no
   pueden divergir.

4. **Un pegado consumido se anuncia** (`toast.success`). Ver más abajo: no es cosmético, salió de la
   revisión adversarial.

5. **Cero cambios de backend y cero cambios en la subida diferida.** El pegado entrega un `LogoDraft`
   por las mismas `changeCreateLogo`/`changeEditLogo`, que ya revocan el object URL anterior. Las dos
   invariantes de fallo parcial de [[ADR-TENANCY-20260812-logo-tenant-modales-crear-editar]] (el modal
   de credenciales se abre pase lo que pase; datos primero, logo después) quedan intactas.

6. **También en el modal de editar**, no solo en el de crear: es el mismo componente y dejar uno sin el
   gesto sería incoherente.

## Por qué el `toast.success` no es adorno
La revisión adversarial (19 agentes, 14 hallazgos, 11 refutados) dejó **3 sobrevivientes, los 3 en baja,
y los 3 con la misma raíz: un pegado exitoso era silencioso.** El camino de éxito era
`preventDefault()` + `onPick(draft)` y nada más. Consecuencias demostradas contra el código:

- El pegado **se come la tecla**. Quien apuntaba a pegar un NIT en su campo no ve *nada* aparecer ahí y
  puede no mirar el avatar de 4rem que está arriba — y terminar guardando un pantallazo como logo
  público del negocio (`logo_url` lo sirve `TenantBySlugView` **sin autenticación** y se pinta en la
  pantalla de login de los cajeros).
- Un usuario de lector de pantalla **no se entera de nada**: el `<span>` del hint que cambia debajo no
  tiene `aria-live`, y el único feedback del hook era el `toast.error` del camino de falla.

`react-toastify` 11.1.0 renderiza con `role="alert"` (verificado en el paquete instalado), así que **un
solo `toast.success` cierra los dos**. Es todo el arreglo.

## Alternativas descartadas
- **Copiar `onPaste` en el `<form>` como ProductsPage** — el gesto natural no funciona (§Contexto 2).
- **Consumir siempre que haya imagen, sin mirar el foco** — le roba el ⌘V a quien está escribiendo
  cuando el portapapeles trae imagen + texto (copiar un fragmento de una web es común).
- **Nunca consumir si el foco está en un campo** — mata el caso más frecuente: pantallazo en el
  portapapeles mientras se llena el formulario.
- **Un `aria-live` propio en vez del toast** — sería el primer `aria-live` del repo; el toast ya existe,
  ya se usa para el error y ya viene con `role="alert"`.

## Consecuencias
- Dos caminos de entrada al logo, una sola validación y un solo tipo `LogoDraft`.
- Queda **deuda registrada** en `ProductsPage.tsx`, que sigue con sus dos huecos:
  [[FRONT-20260815-productspage-paste-sin-validar-y-en-form]].
- El nombre accesible del control en el modal de crear dice *"Seleccionar logo de el negocio"*
  (preexistente, la prop `nombre` nunca se pasó ahí): [[FRONT-20260815-logo-field-nombre-accesible]].
