---
tags: [tarea, pos, sales, ux, preexistente]
status: 🔴
prioridad: media
updated: 2026-08-27
---

# POS-20260827-escaner-activo-con-modales — El lector de códigos sigue leyendo con un modal abierto

> [!info] Preexistente, no lo introdujo el trabajo del 2026-08-27
> Salió al construir el modal de confirmación de vaciado
> ([[RUN-20260827-caja-adulto-mayor-y-recibo]]). Se anota y **no se tocó**: arreglarlo cambia el
> comportamiento del escáner en pantallas que el owner no pidió revisar, y él estaba durmiendo.

## Qué pasa
El listener global del lector de códigos de barras vive en `PosPage.tsx` (`document`, `keydown`,
buffer con timer de 300 ms) y **solo se inhibe si el foco está en un `INPUT`, `TEXTAREA` o `SELECT`**.
No sabe nada de modales.

Consecuencia: con cualquier modal abierto —efectivo, venta exitosa, o el nuevo de vaciar carrito— un
escaneo **agrega un producto al carrito** por detrás del modal.

## Por qué importa poco hoy y podría importar mañana
- En el modal **de vaciado** el daño está acotado: `items` llega por props desde el selector de Redux,
  así que la lista se actualiza en vivo y el cajero vería aparecer la fila nueva. Confuso, no silencioso.
- En el **SuccessModal** es más raro: la venta ya se cerró y el carrito se vació, así que el producto
  escaneado arranca una venta nueva invisible detrás del modal.
- En el **CashInputModal** el cajero está contando plata; un escaneo accidental altera el total que
  está a punto de cobrar **sin que lo vea**. Este es el caso feo.

## Arreglo propuesto
Un flag de "hay un modal abierto" en `PosPage` leído por el listener a través de un ref:

```ts
const modalAbiertoRef = useRef(false)
useEffect(() => {
  modalAbiertoRef.current = showCashModal || showSuccessModal || showClearConfirm
}, [showCashModal, showSuccessModal, showClearConfirm])
// y en onKeyDown, salir temprano si modalAbiertoRef.current
```

⚠️ **Antes de hacerlo hay que preguntarle al owner** si alguien usa el escaneo sobre el `SuccessModal`
para encadenar ventas rápido. Hoy eso "funciona" por accidente y podría ser un hábito de caja.

## Anclas
- `el_vuelto_frontend/src/features/sales/PosPage.tsx` — el listener y su única guarda (foco en input).
- `el_vuelto_frontend/src/features/sales/components/CashInputModal.tsx` — el caso de mayor daño.

## Enlaces
[[ADR-POS-20260827-caja-para-adulto-mayor-en-1366x768]] · [[RUN-20260827-caja-adulto-mayor-y-recibo]]
