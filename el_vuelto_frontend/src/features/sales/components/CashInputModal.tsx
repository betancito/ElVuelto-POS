import { useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import { formatCOP } from '@/utils/formatCOP'

interface Props {
  total: number
  initial: number | null
  onConfirm: (amount: number) => void
  onClose: () => void
}

const BILLS = [
  { value: 2000,   src: '/bills/2000.jpg'   },
  { value: 5000,   src: '/bills/5000.png'   },
  { value: 10000,  src: '/bills/10000.jpg'  },
  { value: 20000,  src: '/bills/20000.jpg'  },
  { value: 50000,  src: '/bills/50000.png'  },
  { value: 100000, src: '/bills/100000.png' },
]

const COINS = [
  { value: 50,   src: '/bills/50.png'   },
  { value: 100,  src: '/bills/100.png'  },
  { value: 200,  src: '/bills/200.png'  },
  { value: 500,  src: '/bills/500.png'  },
  { value: 1000, src: '/bills/1000.png' },
]

const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0']

export default function CashInputModal({ total, initial, onConfirm, onClose }: Props) {
  const [display, setDisplay] = useState(initial !== null ? String(initial) : '')

  const amount = display ? parseInt(display, 10) : 0
  const isEnough = amount >= total

  function appendDigits(d: string) {
    setDisplay((prev) => {
      const next = prev + d
      return parseInt(next, 10) > 9_999_999 ? prev : next
    })
  }

  function addPreset(value: number) {
    setDisplay((prev) => {
      const current = prev ? parseInt(prev, 10) : 0
      const next = current + value
      return next > 9_999_999 ? prev : String(next)
    })
  }

  function handleConfirm() {
    if (amount > 0) {
      onConfirm(amount)
      onClose()
    }
  }

  return (
    <div
      className="pos-cash-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="pos-cash-modal">
        {/* Header */}
        <div className="pos-cash-modal__header">
          <div className="pos-cash-modal__header-left">
            <div className="pos-cash-modal__icon">
              <PaymentsOutlinedIcon style={{ fontSize: '1.375rem' }} />
            </div>
            <div>
              <h3 className="pos-cash-modal__title">Pago en efectivo</h3>
              <p className="pos-cash-modal__subtitle">
                Total:{' '}
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                  {formatCOP(total)}
                </strong>
              </p>
            </div>
          </div>
          <button className="pos-cash-modal__close" onClick={onClose}>
            <CloseIcon style={{ fontSize: '1.25rem' }} />
          </button>
        </div>

        <div className="pos-cash-modal__body">
          {/* Amount display — full width */}
          <div className={`pos-cash-modal__display ${amount > 0 && isEnough ? 'pos-cash-modal__display--enough' : 'pos-cash-modal__display--pending'}`}>
            <span className={`pos-cash-modal__display-label ${amount > 0 && isEnough ? 'pos-cash-modal__display-label--enough' : 'pos-cash-modal__display-label--pending'}`}>
              Recibido
            </span>
            <span className={`pos-cash-modal__display-amount ${amount > 0 && isEnough ? 'pos-cash-modal__display-amount--enough' : 'pos-cash-modal__display-amount--pending'}`}>
              {display ? formatCOP(amount) : '$0'}
            </span>
          </div>

          {/* Two-column: numpad (left) | presets (right) */}
          <div className="pos-cash-modal__two-col">
            {/* Numpad */}
            <div className="pos-cash-modal__numpad">
              {NUMPAD_KEYS.map((k) => (
                <button
                  key={k}
                  className="pos-cash-modal__numpad-key"
                  onClick={() => appendDigits(k)}
                >
                  {k}
                </button>
              ))}
              <button
                className="pos-cash-modal__backspace"
                onClick={() => setDisplay((prev) => prev.slice(0, -1))}
              >
                <BackspaceOutlinedIcon style={{ fontSize: '1.375rem' }} />
              </button>
            </div>

            {/* Presets — bills + coins in one section */}
            <div className="pos-cash-modal__presets-col">
              <p className="pos-cash-modal__section-label">Denominaciones</p>

              {/* Bills — landscape images, 3-col grid */}
              <div className="pos-cash-modal__bills-grid">
                {BILLS.map(({ value, src }) => (
                  <button
                    key={value}
                    className="pos-cash-modal__bill-btn"
                    onClick={() => addPreset(value)}
                    title={formatCOP(value)}
                  >
                    <img
                      src={src}
                      alt={formatCOP(value)}
                      className="pos-cash-modal__bill-img"
                    />
                  </button>
                ))}
              </div>

              {/* Coins — circular images, 5-col grid */}
              <div className="pos-cash-modal__coins-grid">
                {COINS.map(({ value, src }) => (
                  <button
                    key={value}
                    className="pos-cash-modal__coin-btn"
                    onClick={() => addPreset(value)}
                    title={formatCOP(value)}
                  >
                    <img
                      src={src}
                      alt={formatCOP(value)}
                      className="pos-cash-modal__coin-img"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Confirm — full width */}
          <button
            className={`pos-cash-modal__confirm-btn ${amount > 0 ? 'pos-cash-modal__confirm-btn--active' : 'pos-cash-modal__confirm-btn--disabled'}`}
            onClick={handleConfirm}
            disabled={amount <= 0}
          >
            <CheckCircleOutlinedIcon style={{ fontSize: '1.375rem' }} />
            Confirmar — {display ? formatCOP(amount) : '$0'}
          </button>
        </div>
      </div>
    </div>
  )
}
