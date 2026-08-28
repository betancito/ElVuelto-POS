import { generateReceiptHTML } from './generateReceipt'
import type { ReceiptTenantInfo } from './generateReceipt'
import type { Sale } from '@/features/sales/salesApi'

/** Puente que inyecta la app de escritorio (el_vuelto_desktop). En el
 *  navegador no existe y el flujo sigue siendo exactamente el de siempre. */
interface ElVueltoDesktop {
  printReceipt?: (html: string) => void
}

export function printReceipt(sale: Sale, tenant: ReceiptTenantInfo): void {
  const html = generateReceiptHTML(sale, tenant)

  // Dentro de la app de escritorio el recibo sale directo a la térmica,
  // sin el diálogo de impresión del sistema operativo.
  const desktop = (window as unknown as { elVuelto?: ElVueltoDesktop }).elVuelto
  if (desktop?.printReceipt) {
    desktop.printReceipt(html)
    return
  }

  const win = window.open('', '_blank', 'width=400,height=600')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 300)
}
