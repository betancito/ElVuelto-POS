/**
 * Mirrors the backend password policy — the source of truth is
 * `apps/users/password_policy.py` (PIN_LENGTH, ADMIN_PASSWORD_LENGTH,
 * ADMIN_SYMBOLS). The policy is deliberately **per role**, not flat: the
 * CAJERO's 4-digit PIN is intentional (POS touch screen, no keyboard) while an
 * ADMIN gets 12 chars with symbols. Keep both sides in sync — the backend
 * rejects anything shorter than its own minimum with a 400 on `password`.
 */
export const PIN_LENGTH = 4 // CAJERO
export const ADMIN_PASSWORD_LENGTH = 12 // ADMIN / SUPERADMIN

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%&*'
const ALL = UPPER + LOWER + DIGITS + SYMBOLS

function randomChar(chars: string): string {
  return chars[Math.floor(Math.random() * chars.length)]
}

export function generateAdminPassword(): string {
  const required = [
    randomChar(UPPER),
    randomChar(LOWER),
    randomChar(DIGITS),
    randomChar(SYMBOLS),
  ]
  const rest = Array.from({ length: ADMIN_PASSWORD_LENGTH - required.length }, () =>
    randomChar(ALL),
  )
  return [...required, ...rest]
    .sort(() => Math.random() - 0.5)
    .join('')
}

export function generatePin(): string {
  return Array.from({ length: PIN_LENGTH }, () => String(Math.floor(Math.random() * 10))).join('')
}

export function generateWorkerPassword(): string {
  return generatePin()
}
