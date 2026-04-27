import type { Sale } from '@/features/sales/salesApi'

export function generateReceiptHTML(sale: Sale, tenantNombre: string): string {
  function fmt(n: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(n)
  }

  const COL = 32
  const SEP = '─'.repeat(COL)

  function pad(left: string, right: string): string {
    const gap = COL - left.length - right.length
    return left + ' '.repeat(Math.max(1, gap)) + right
  }

  function center(text: string): string {
    const padLen = Math.max(0, Math.floor((COL - text.length) / 2))
    return ' '.repeat(padLen) + text
  }

  const d = new Date(sale.created_at)
  const dateStr =
    d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  const metodoPagoLabel =
    sale.metodo_pago === 'EFECTIVO' ? 'Efectivo' : 'Nequi/Transferencia'

  const itemLines: string[] = []
  for (const item of sale.items) {
    const maxNameLen = item.cantidad > 1 ? 16 : 20
    const name =
      item.product_nombre.length > maxNameLen
        ? item.product_nombre.slice(0, maxNameLen - 1) + '…'
        : item.product_nombre
    const subtotal = fmt(parseFloat(item.subtotal))
    if (item.cantidad > 1) {
      itemLines.push(pad(`${item.cantidad}x ${name}`, subtotal))
      itemLines.push(`   ${fmt(parseFloat(item.precio_unitario))} c/u`)
    } else {
      itemLines.push(pad(name, subtotal))
    }
  }

  const total = parseFloat(sale.total)
  const montoRecibido = parseFloat(sale.monto_recibido ?? '0')
  const cambio = sale.cambio ? parseFloat(sale.cambio) : 0

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const itemsHTML = itemLines.map((l) => `<pre>${esc(l)}</pre>`).join('\n')

  const totalsHTML = [
    `<pre style="font-weight:bold">${esc(pad('TOTAL', fmt(total)))}</pre>`,
    `<pre>${esc(pad(`Pagado (${metodoPagoLabel})`, fmt(montoRecibido)))}</pre>`,
    ...(sale.metodo_pago === 'EFECTIVO' && cambio > 0
      ? [`<pre style="font-weight:bold">${esc(pad('Cambio', fmt(cambio)))}</pre>`]
      : []),
  ].join('\n')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Recibo #${esc(sale.codigo)}</title>
<style>
  @page { size: 80mm auto; margin: 2mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    width: 76mm;
    color: #000;
    line-height: 1.5;
    padding: 4px 2px;
  }
  pre {
    font-family: inherit;
    font-size: inherit;
    white-space: pre-wrap;
    margin: 0;
    line-height: 1.5;
  }
  .center { text-align: center; }
  .small { font-size: 10px; color: #444; }
  .bold { font-weight: bold; }
  .sep { margin: 3px 0; }
  @media print {
    body { margin: 0; padding: 0; }
  }
</style>
</head>
<body>

<div class="center bold" style="font-size:16px;letter-spacing:0.04em;margin-bottom:2px">${esc(tenantNombre.toUpperCase())}</div>
<div class="center small">${esc(dateStr)}</div>
<div class="center small">Recibo #${esc(sale.codigo)}</div>
<div class="center small">Cajero: ${esc(sale.user_nombre)}</div>

<pre class="sep">${SEP}</pre>

${itemsHTML}

<pre class="sep">${SEP}</pre>

${totalsHTML}

<pre class="sep">${SEP}</pre>

<div class="center small" style="font-style:italic;margin-top:4px">* Gracias por su compra! *</div>
<div class="center" style="font-size:10px;color:#777;margin-top:2px">El Vuelto POS</div>

<div style="page-break-after:always"></div>
</body>
</html>`
}
