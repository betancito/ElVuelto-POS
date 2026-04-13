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
  const rest = Array.from({ length: 8 }, () => randomChar(ALL))
  return [...required, ...rest]
    .sort(() => Math.random() - 0.5)
    .join('')
}

export function generatePin(): string {
  return Array.from({ length: 4 }, () => String(Math.floor(Math.random() * 10))).join('')
}

export function generateWorkerPassword(): string {
  return generatePin()
}
