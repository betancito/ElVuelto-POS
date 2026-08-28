import type { Sale } from '@/features/sales/salesApi'

export interface ReceiptTenantInfo {
  nombre: string
  email?: string | null
  supportPhone?: string | null
}

/**
 * Recibo de 80mm para impresora térmica.
 *
 * Reescrito el 2026-08-27 porque en una térmica real solo se leía bien la línea
 * TOTAL. Tres causas, las tres corregidas acá:
 *
 * 1. GRISES. `.small` era `#444` y el pie `#777`. Un cabezal térmico no tiene
 *    medios tonos: simula el gris salteando puntos, así que un texto gris sale
 *    moteado y pálido. Ahora TODO es `#000`.
 * 2. PESO. Solo TOTAL y Cambio eran bold — justo las dos líneas que el dueño
 *    reportó como legibles. Ahora todo el recibo va en bold.
 * 3. LA FUENTE. Courier New tiene trazos finos y a 12px el cabezal apenas los
 *    marca. Se usaba por una sola razón: `pad()` alineaba las columnas rellenando
 *    con espacios, y eso exige monospace. Al pasar a filas flex el alineado es
 *    geométrico y la restricción desaparece, así que ahora se usa **Arial bold**,
 *    que deposita bastante más tinta con el mismo cabezal.
 *
 * Efecto colateral bueno: `pad()` truncaba los nombres a 16-20 caracteres
 * ("Gaseosa Postobó…"). Con flex, el nombre envuelve y se lee completo.
 *
 * Para ajustar el tamaño hay una sola perilla: BASE_PX.
 */

/**
 * Ancho del PAPEL (el rollo entero), y ancho REAL que el cabezal marca.
 *
 * Una térmica de 80mm no imprime 80mm: casi todas marcan 70-72mm y dejan 4-5mm
 * muertos a cada lado, donde el cabezal físicamente no llega. El contenido va
 * de 70mm y CENTRADO en la página de 80, o sea de 5mm a 75mm: así queda una
 * banda de seguridad de 5mm a CADA lado y sobrevive aunque el driver reporte
 * una zona muerta un poco más ancha. Arrancar pegado al borde izquierdo (que
 * es lo que pasa sin el centrado) hace que el cabezal se coma la primera
 * columna, y márgenes de @page encima corren todo a la derecha y se come la
 * última: las dos formas de que el recibo salga recortado.
 */
const ROLLO_MM = 80
const PAPER_MM = 70

/**
 * Tamaño base del recibo. Subir esto agranda todo de forma proporcional; el
 * layout es flex, así que nada se desalinea al cambiarlo.
 * Si algún día el papel es de 58mm, bajar PAPER_MM a 48 y BASE_PX a ~13.
 */
const BASE_PX = 15

const px = (n: number) => `${Math.round(n)}px`

export function generateReceiptHTML(sale: Sale, tenant: ReceiptTenantInfo): string {
  function fmt(n: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(n)
  }

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  /** Fila de dos columnas: etiqueta a la izquierda, monto a la derecha. */
  function row(left: string, right: string, opts: { size?: number; cls?: string } = {}): string {
    const style = opts.size ? ` style="font-size:${px(opts.size)}"` : ''
    const cls = opts.cls ? `row ${opts.cls}` : 'row'
    return `<div class="${cls}"${style}><span class="l">${esc(left)}</span><span class="r">${esc(right)}</span></div>`
  }

  const d = new Date(sale.created_at)
  const dateStr =
    d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  const metodoPagoLabel = sale.metodo_pago === 'EFECTIVO' ? 'Efectivo' : 'Nequi/Transferencia'

  // Los ítems ya no se truncan: la columna izquierda envuelve.
  const itemsHTML = sale.items
    .map((item) => {
      const subtotal = fmt(parseFloat(item.subtotal))
      const cantidad = item.cantidad
      const nombre = cantidad > 1 ? `${cantidad}x ${item.product_nombre}` : item.product_nombre
      const principal = row(nombre, subtotal, { cls: 'item' })
      if (cantidad > 1) {
        return `${principal}<div class="unit">${esc(fmt(parseFloat(item.precio_unitario)))} c/u</div>`
      }
      return principal
    })
    .join('\n')

  const total = parseFloat(sale.total)
  const montoRecibido = parseFloat(sale.monto_recibido ?? '0')
  const cambio = sale.cambio ? parseFloat(sale.cambio) : 0

  const totalsHTML = [
    row('TOTAL', fmt(total), { size: BASE_PX * 1.35, cls: 'total' }),
    row(`Pagado (${metodoPagoLabel})`, fmt(montoRecibido)),
    ...(sale.metodo_pago === 'EFECTIVO' && cambio > 0
      ? [row('Cambio', fmt(cambio), { size: BASE_PX * 1.2, cls: 'cambio' })]
      : []),
  ].join('\n')

  // El logo del tenant se quitó a propósito (2026-08-27): a 203 dpi salía como
  // una mancha gris ilegible y se comía papel. El nombre en texto se lee siempre.
  const headerHTML = `<div class="center negocio">${esc(tenant.nombre.toUpperCase())}</div>`

  const hasFactura = tenant.email || tenant.supportPhone
  const facturaHTML = hasFactura
    ? `<div class="rule"></div>
<div class="factura">
  <div style="margin-bottom:2px">&#191;Requiere factura electr&#243;nica?</div>
  ${tenant.email ? `<div>&#9993; ${esc(tenant.email)}</div>` : ''}
  ${tenant.supportPhone ? `<div>&#9742; ${esc(tenant.supportPhone)}</div>` : ''}
</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Recibo #${esc(sale.codigo)}</title>
<style>
  /* MÁRGENES: cero acá, a propósito.
     El wrapper ya imprime con marginType 'none' (main.js). Si además el @page
     trae los suyos, los dos se SUMAN: el contenido se corre
     hacia abajo y hacia la derecha, y sobre un papel que encima tiene su propia
     zona muerta el resultado es exactamente lo que reportó el dueño — un blanco
     grande arriba, y la derecha y el fondo recortados. El respiro se da con
     padding DENTRO del body, que sí controlamos al milímetro. */
  @page { size: ${ROLLO_MM}mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    /* Sans-serif pesada en vez de Courier: el cabezal térmico marca mucho
       mejor un trazo grueso. Ya no hace falta monospace porque el alineado
       es flex, no relleno con espacios. */
    font-family: Arial, Helvetica, sans-serif;
    font-size: ${px(BASE_PX)};
    font-weight: 700;
    /* Negro puro en todo. Cualquier gris se imprime moteado. */
    color: #000;
    width: ${PAPER_MM}mm;
    /* Centrado en el rollo: los ~4mm muertos de cada lado quedan afuera del
       contenido en vez de comerse la columna de la derecha. */
    margin: 0 auto;
    /* Arriba poquito (antes eran 5mm de @page y se veía un blancazo); abajo
       más, para que el corte no se lleve la última línea. Con box-sizing
       border-box esto deja ~70mm de texto útil. */
    padding: 2mm 1mm 6mm;
    line-height: 1.35;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px;
    /* Sin esto una palabra larga empuja el monto fuera del papel. */
    min-width: 0;
  }
  .row .l { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .row .r {
    white-space: nowrap;
    /* Alinea las cifras en columna aunque la fuente no sea monospace. */
    font-variant-numeric: tabular-nums;
  }

  .item { margin-bottom: 2px; }
  .unit { font-size: ${px(BASE_PX * 0.85)}; padding-left: 10px; margin-bottom: 3px; }

  .negocio {
    font-size: ${px(BASE_PX * 1.4)};
    letter-spacing: 0.04em;
    margin-bottom: 3px;
  }

  .meta { font-size: ${px(BASE_PX * 0.93)}; }
  .center { text-align: center; }

  /* Una línea negra sólida en lugar de una fila de "─": el guion largo es un
     trazo de 1px a media altura y salía entrecortado. */
  .rule { border-top: 2px solid #000; margin: 5px 0; }

  .total { margin-top: 2px; }
  .cambio { margin-top: 2px; }
  .factura { font-size: ${px(BASE_PX * 0.93)}; line-height: 1.5; }
  .gracias { margin-top: 5px; }
  .marca { font-size: ${px(BASE_PX * 0.8)}; margin-top: 2px; }

  @media print {
    body { margin: 0; padding: 0; }
    /* Obliga al motor a no "ahorrar" tinta convirtiendo negros en gris. */
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

${headerHTML}
<div class="center meta">${esc(dateStr)}</div>
<div class="center meta">Recibo #${esc(sale.codigo)}</div>
<div class="center meta">Cajero: ${esc(sale.user_nombre)}</div>

<div class="rule"></div>

${itemsHTML}

<div class="rule"></div>

${totalsHTML}

${facturaHTML}

<div class="rule"></div>

<div class="center gracias">* Gracias por su compra! *</div>
<div class="center marca">El Vuelto POS</div>

<div style="page-break-after:always"></div>
</body>
</html>`
}
