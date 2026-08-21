import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import AddShoppingCartOutlinedIcon from '@mui/icons-material/AddShoppingCartOutlined'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { formatCOP } from '@/utils/formatCOP'
import { printReceipt } from '@/utils/printReceipt'
import { useAppSelector } from '@/app/hooks'
import { ReceiptPreview } from './ReceiptPreview'
import type { Sale } from '@/features/sales/salesApi'

interface Props {
  sale: Sale
  tenantNombre: string
  onNewSale: () => void
  onClose: () => void
}

export default function SuccessModal({ sale, tenantNombre, onNewSale, onClose }: Props) {
  const cambio = sale.cambio ? parseFloat(sale.cambio) : 0
  const showVuelto = sale.metodo_pago === 'EFECTIVO' && cambio > 0

  const user = useAppSelector((state) => state.auth.user)

  const tenant = {
    nombre: tenantNombre,
    logoUrl: user?.tenantLogoUrl,
    email: user?.tenantEmail,
    supportPhone: user?.tenantSupportPhone,
  }

  function handleWhatsApp() {
    const message = `Recibo #${sale.codigo}\n${tenantNombre}\nTotal: ${formatCOP(parseFloat(sale.total))}\nGracias por su compra!`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--surface-container-low)',
          borderRadius: '1.5rem',
          boxShadow: '0 32px 64px rgba(30,27,21,0.12)',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          maxWidth: '28rem',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* ── Section 1: Icon + Title ── */}
        <div style={{ marginBottom: showVuelto ? '1.5rem' : '2.5rem' }}>
          <div
            style={{
              width: '5rem',
              height: '5rem',
              borderRadius: '50%',
              background: 'rgba(106,38,0,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <CheckCircleOutlinedIcon style={{ fontSize: '3rem', color: 'var(--primary)' }} />
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-display), serif',
              fontSize: '2.5rem',
              fontWeight: 700,
              color: 'var(--on-surface)',
              lineHeight: 1.1,
            }}
          >
            ¡Venta Exitosa!
          </h3>
        </div>

        {/* ── Section 2: Vuelto hero ── */}
        {showVuelto && (
          <div style={{ marginBottom: '2rem' }}>
            <p
              style={{
                fontSize: '0.6875rem',
                letterSpacing: '0.12em',
                color: 'var(--on-surface-variant)',
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: '0.375rem',
              }}
            >
              Vuelto
            </p>
            <p
              style={{
                fontFamily: 'var(--font-mono), monospace',
                fontSize: '3.5rem',
                fontWeight: 700,
                color: 'var(--tertiary)',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              {formatCOP(cambio)}
            </p>
          </div>
        )}

        {/* ── Negative stock notice ──
            The sale went through even though there was not enough registered
            stock (that is the point — the till must never block). This is the
            only moment the cashier learns an ENTRADA is owed, so it says which
            product and how deep. It informs; it never asks for anything. */}
        {sale.stock_negativo && sale.stock_negativo.length > 0 && (
          <div
            role="status"
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
              padding: '0.875rem 1rem',
              marginBottom: '2rem',
              background: 'var(--error-container)',
              color: 'var(--on-error-container)',
              borderRadius: '10px',
            }}
          >
            <WarningAmberOutlinedIcon style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: '0.0625rem' }} />
            <div style={{ minWidth: 0 }}>
              {/* Capped at three: this block sits above "Nueva Venta", and a
                  cart with ten negatives would push the primary action off a
                  90vh modal — in the middle of the rush this feature exists to
                  unblock. The full list lives in Inventario. */}
              {sale.stock_negativo.slice(0, 3).map((p) => (
                <p key={p.id} style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>
                  {p.nombre} quedó en{' '}
                  <span style={{ fontFamily: 'var(--font-mono), monospace' }}>{p.stock_actual} u.</span>
                </p>
              ))}
              {sale.stock_negativo.length > 3 && (
                <p style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>
                  y {sale.stock_negativo.length - 3} producto
                  {sale.stock_negativo.length - 3 === 1 ? '' : 's'} más.
                </p>
              )}
              <p style={{ fontSize: '0.8125rem', margin: '0.25rem 0 0', opacity: 0.85 }}>
                Falta registrar la entrada en inventario.
              </p>
            </div>
          </div>
        )}

        {/* ── Section 3: Receipt preview ── */}
        <div style={{ marginBottom: '2rem' }}>
          <ReceiptPreview sale={sale} tenantNombre={tenantNombre} />
        </div>

        {/* ── Section 4: Actions ── */}
        <button
          onClick={onNewSale}
          style={{
            width: '100%',
            padding: '1.25rem',
            borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, #6a2600 0%, #8b3a0f 100%)',
            color: 'white',
            fontWeight: 700,
            fontSize: '1.0625rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.625rem',
            boxShadow: '0 4px 16px rgba(106,38,0,0.28)',
            marginBottom: '0.875rem',
          }}
        >
          <AddShoppingCartOutlinedIcon style={{ fontSize: '1.25rem' }} />
          Nueva Venta
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            onClick={() => printReceipt(sale, tenant)}
            style={{
              padding: '0.875rem',
              borderRadius: '0.75rem',
              background: 'var(--surface-container-high)',
              color: 'var(--primary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <PrintOutlinedIcon style={{ fontSize: '1.125rem' }} />
            Imprimir Recibo
          </button>

          <button
            onClick={handleWhatsApp}
            style={{
              padding: '0.875rem',
              borderRadius: '0.75rem',
              background: 'transparent',
              color: 'var(--on-surface-variant)',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <ShareOutlinedIcon style={{ fontSize: '1.125rem' }} />
            Enviar WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
