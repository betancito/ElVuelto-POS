import { toast } from 'react-toastify'
import CircularProgress from '@mui/material/CircularProgress'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'

import { validateImageFile } from '@/utils/imageUpload'

/** What the modal will do with the logo **when the form is submitted**.
 *
 *  The upload is deferred on purpose: in the create modal it has no choice
 *  (there is no tenant id until `POST /tenants/` answers), and the edit modal
 *  matches it so that "Cancelar" cancels everything, logo included. The whole
 *  point of this type is that picking a file changes nothing on the server.
 */
export type LogoDraft =
  /** Leave whatever the business already has. Also the "nothing picked" state
   *  in the create modal, where there is nothing to leave. */
  | { kind: 'keep' }
  /** Upload `file` on submit. `preview` is an object URL — whoever replaces
   *  this draft owns revoking it (see `revokeLogoDraft`). */
  | { kind: 'replace'; file: File; preview: string }
  /** Delete the existing logo on submit. Unreachable in the create modal. */
  | { kind: 'remove' }

/** Release a draft's object URL. Safe on any draft, idempotent.
 *
 *  Called imperatively from the event handlers that replace a draft rather
 *  than from a `useEffect` cleanup: `StrictMode` is on (`main.tsx`), and an
 *  effect keyed on the draft would revoke the URL during the simulated
 *  remount, leaving a broken preview in dev.
 */
export function revokeLogoDraft(draft: LogoDraft) {
  if (draft.kind === 'replace') URL.revokeObjectURL(draft.preview)
}

interface Props {
  draft: LogoDraft
  /** The logo the business has today. `null` in the create modal — the tenant
   *  does not exist yet, so there is never anything to keep or remove. */
  currentUrl?: string | null
  /** Used for the input's accessible name. Empty in the create modal, where
   *  the business has no name yet. */
  nombre?: string
  /** True while the form is submitting. */
  busy?: boolean
  onChange: (next: LogoDraft) => void
}

export default function TenantLogoField({
  draft,
  currentUrl = null,
  nombre = '',
  busy = false,
  onChange,
}: Props) {
  const subject = nombre.trim() || 'el negocio'
  const shownUrl =
    draft.kind === 'replace' ? draft.preview : draft.kind === 'keep' ? currentUrl : null

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Clearing the input lets the same file be picked again after discarding it
    // — otherwise the second pick fires no `change` event.
    e.target.value = ''
    if (!file) return
    const error = validateImageFile(file)
    if (error) {
      toast.error(error)
      return
    }
    onChange({ kind: 'replace', file, preview: URL.createObjectURL(file) })
  }

  // One secondary action, whose meaning follows the state — no ambiguity about
  // whether "Quitar" cancels the pick or deletes the stored logo.
  const secondary =
    draft.kind === 'replace'
      ? { label: 'Descartar', next: { kind: 'keep' } as LogoDraft }
      : draft.kind === 'remove'
        ? { label: 'Deshacer', next: { kind: 'keep' } as LogoDraft }
        : currentUrl
          ? { label: 'Quitar logo', next: { kind: 'remove' } as LogoDraft }
          : null

  const hint =
    draft.kind === 'replace'
      ? `Se subirá al guardar · ${draft.file.name}`
      : draft.kind === 'remove'
        ? 'Se quitará al guardar.'
        : 'PNG o JPG · máx 10 MB'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      {/* Same control as TenantDetailPage's header avatar: the real file input
          covers the whole box (opacity 0) so it keeps native keyboard
          activation and carries the accessible name, and the overlay on top is
          decorative only (`aria-hidden` + `pointer-events:none`). */}
      <div className="ta-avatar-upload" data-uploading={busy}>
        {shownUrl ? (
          <img
            src={shownUrl}
            alt={`Logo de ${subject}`}
            style={{
              width: '4rem',
              height: '4rem',
              objectFit: 'cover',
              border: '1px solid var(--outline-variant)',
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: '4rem',
              height: '4rem',
              background: 'var(--surface-container-highest)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--on-surface-variant)',
            }}
          >
            <StorefrontOutlinedIcon />
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          className="ta-avatar-upload__input"
          aria-label={`Seleccionar logo de ${subject}`}
          disabled={busy}
          onChange={handlePick}
        />
        <span className="ta-avatar-upload__overlay" aria-hidden="true">
          {busy ? (
            <CircularProgress size={18} sx={{ color: '#fff' }} />
          ) : (
            <EditOutlinedIcon fontSize="small" />
          )}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
        <span
          style={{
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'var(--on-surface-variant)',
          }}
        >
          Logo del negocio (opcional)
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--on-surface-variant)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '18rem',
          }}
        >
          {hint}
        </span>
        {secondary && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onChange(secondary.next)}
            style={{
              alignSelf: 'flex-start',
              marginTop: '0.125rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--primary)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: busy ? 'default' : 'pointer',
              textDecoration: 'underline',
            }}
          >
            {secondary.label}
          </button>
        )}
      </div>
    </div>
  )
}
