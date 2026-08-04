import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { toast } from 'react-toastify'

/**
 * Shape of a DRF 400 body. Field errors are `{ campo: "msg" }` or `{ campo: ["msg", ...] }`.
 * Object-level errors arrive under `non_field_errors`; auth-style errors under `detail`.
 */
type ServerErrorBody = Record<string, string | string[] | undefined>

function firstMessage(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

/**
 * Maps a DRF 400 error (from an RTK Query `.unwrap()` rejection) onto a
 * react-hook-form. This is the single place forms should route their submit
 * `catch` through, so server-side validation (uniqueness of correo/cedula/nit,
 * role-specific requirements, etc.) surfaces on the right field instead of a
 * silent `catch {}` or a generic banner.
 *
 * - Each `{ campo: "msg" }` becomes a field-level error via `setError(campo, ...)`.
 *   Field names must match the RHF `name` (backend uses Spanish snake_case:
 *   `correo`, `cedula`, `nit`, `admin_correo`, ...).
 * - `non_field_errors` / `detail` (object-level) become a `toast.error`.
 * - Anything that is not a mappable 400 (network error, 500, empty body) shows
 *   `fallbackMessage` as a toast, so nothing is ever swallowed silently.
 *
 * @returns true if at least one field/object error was surfaced from a 400.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fallbackMessage = 'Ocurrió un error. Revisa los datos e intenta de nuevo.',
): boolean {
  const status = (error as { status?: unknown } | null)?.status
  const data = (error as { data?: unknown } | null)?.data

  if (status !== 400 || !data || typeof data !== 'object') {
    toast.error(fallbackMessage)
    return false
  }

  let surfaced = false
  for (const [field, value] of Object.entries(data as ServerErrorBody)) {
    const message = firstMessage(value)
    if (!message) continue
    if (field === 'non_field_errors' || field === 'detail') {
      toast.error(message)
    } else {
      setError(field as Path<T>, { type: 'server', message })
    }
    surfaced = true
  }

  if (!surfaced) toast.error(fallbackMessage)
  return surfaced
}
