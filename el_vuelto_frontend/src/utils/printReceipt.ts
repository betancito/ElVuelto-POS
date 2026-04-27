import { generateReceiptHTML } from './generateReceipt'
import type { Sale } from '@/features/sales/salesApi'

export function printReceipt(sale: Sale, tenantNombre: string): void {
  const html = generateReceiptHTML(sale, tenantNombre)
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
