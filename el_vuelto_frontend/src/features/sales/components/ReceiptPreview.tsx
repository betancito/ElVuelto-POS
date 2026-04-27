import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import { formatCOP } from '@/utils/formatCOP'
import type { Sale } from '@/features/sales/salesApi'

interface Props {
  sale: Sale
  tenantNombre: string
}

function formatReceiptDate(isoString: string): string {
  const d = new Date(isoString)
  return (
    d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  )
}

function metodoPagoLabel(metodo: string): string {
  return metodo === 'EFECTIVO' ? 'Efectivo' : 'Nequi/Transferencia'
}

export function ReceiptPreview({ sale, tenantNombre }: Props) {
  const total = parseFloat(sale.total)
  const montoRecibido = parseFloat(sale.monto_recibido ?? '0')

  return (
    <div
      style={{
        background: 'var(--surface-container-lowest)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        textAlign: 'left',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        borderBottom: '2px dashed var(--outline-variant)',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <p
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--on-surface)',
              marginBottom: '0.25rem',
            }}
          >
            {tenantNombre}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
            Recibo #{sale.codigo} &bull; {formatReceiptDate(sale.created_at)}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.125rem' }}>
            Cajero: {sale.user_nombre}
          </p>
        </div>
        <ReceiptLongOutlinedIcon style={{ color: 'var(--on-surface-variant)', fontSize: '1.5rem', flexShrink: 0 }} />
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {sale.items.map((item) => (
          <div
            key={item.product}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span style={{ fontSize: '0.875rem', color: 'var(--on-surface)' }}>
              {item.cantidad}x {item.product_nombre}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                color: 'var(--on-surface)',
              }}
            >
              {formatCOP(parseFloat(item.subtotal))}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ borderTop: '1px solid var(--surface-variant)', paddingTop: '1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.375rem',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--on-surface)' }}>
            Total
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '1.0625rem',
              color: 'var(--on-surface)',
            }}
          >
            {formatCOP(total)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
            Pagado ({metodoPagoLabel(sale.metodo_pago)})
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem',
              color: 'var(--on-surface-variant)',
            }}
          >
            {formatCOP(montoRecibido)}
          </span>
        </div>
      </div>
    </div>
  )
}
