import { jsPDF } from 'jspdf'

export interface CredentialCardData {
  tenantNombre: string
  adminNombre: string
  adminCorreo: string
  password: string
}

const LOGO_URL = '/icons/El%20Vuelto%20-%20El_Vuelto_favicon_NO_BG.png'

// ── Brand palette (RGB) ──────────────────────────────────────────────
const BRAND     = [139,  58, 15] as const   // #8B3A0F
const BRAND_MID = [194,  97, 30] as const   // #C2611E
const CREAM     = [251, 247, 242] as const  // #FBF7F2
const STONE_100 = [245, 245, 244] as const  // #f5f5f4
const STONE_200 = [231, 229, 228] as const  // #e7e5e4
const STONE_500 = [120, 113, 108] as const  // #78716c
const STONE_900 = [ 28,  25,  23] as const  // #1c1917
const WHITE     = [255, 255, 255] as const
const AMBER_50  = [255, 251, 235] as const
const AMBER_200 = [253, 230, 138] as const
const AMBER_700 = [180,  83,   9] as const

function loadImageAsDataURL(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = src
  })
}

export async function downloadCredentialCard(data: CredentialCardData): Promise<void> {
  // A5 landscape — compact, printable
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' })
  const PW  = doc.internal.pageSize.getWidth()   // 210 mm
  const PH  = doc.internal.pageSize.getHeight()  // 148 mm
  const PAD = 12

  // ── Cream background ────────────────────────────────────────────────
  doc.setFillColor(...CREAM)
  doc.rect(0, 0, PW, PH, 'F')

  // ── Header bar ─────────────────────────────────────────────────────
  const HDR = 28
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, PW, HDR, 'F')
  doc.setFillColor(...BRAND_MID)
  doc.rect(PW / 2, 0, PW / 2, HDR, 'F')
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, PW / 2, HDR, 'F')

  // ── Logo ─────────────────────────────────────────────────────────────
  try {
    const logoData = await loadImageAsDataURL(LOGO_URL)
    doc.addImage(logoData, 'PNG', PAD, 4, 18, 18)
  } catch { /* skip */ }

  // ── Header text ──────────────────────────────────────────────────────
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('El Vuelto', PAD + 22, 13)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 237, 213)
  doc.text('Credenciales de acceso — Documento confidencial', PAD + 22, 20)

  // ── Negocio ───────────────────────────────────────────────────────────
  let y = HDR + 9

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...STONE_500)
  doc.text('NEGOCIO', PAD, y)

  y += 5
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...STONE_900)
  doc.text(data.tenantNombre, PAD, y)

  y += 3
  doc.setDrawColor(...STONE_200)
  doc.setLineWidth(0.3)
  doc.line(PAD, y, PW - PAD, y)

  // ── Administrador ─────────────────────────────────────────────────────
  y += 6
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...STONE_500)
  doc.text('ADMINISTRADOR', PAD, y)

  y += 5
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...STONE_900)
  doc.text(data.adminNombre, PAD, y)

  // ── Credential cards ─────────────────────────────────────────────────
  y += 8
  const cardH  = 22
  const cardW  = (PW - PAD * 2 - 6) / 2
  const card2X = PAD + cardW + 6

  // Correo card
  doc.setFillColor(...WHITE)
  doc.setDrawColor(...STONE_200)
  doc.setLineWidth(0.4)
  doc.roundedRect(PAD, y, cardW, cardH, 2, 2, 'FD')

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...STONE_500)
  doc.text('CORREO DE ACCESO', PAD + 4, y + 7)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...STONE_900)
  doc.text(data.adminCorreo, PAD + 4, y + 15)

  // Password card
  doc.setFillColor(255, 248, 245)
  doc.setDrawColor(...BRAND)
  doc.setLineWidth(0.6)
  doc.roundedRect(card2X, y, cardW, cardH, 2, 2, 'FD')

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND)
  doc.text('CONTRASEÑA INICIAL', card2X + 4, y + 7)

  doc.setFontSize(11)
  doc.setFont('courier', 'bold')
  doc.setTextColor(...STONE_900)
  doc.text(data.password, card2X + 4, y + 16)

  // ── Warning banner ────────────────────────────────────────────────────
  y += cardH + 8
  const warnH = 16
  doc.setFillColor(...AMBER_50)
  doc.setDrawColor(...AMBER_200)
  doc.setLineWidth(0.3)
  doc.roundedRect(PAD, y, PW - PAD * 2, warnH, 2, 2, 'FD')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...AMBER_700)
  doc.text('⚠  Documento confidencial — uso interno exclusivo', PAD + 4, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...STONE_100)
  doc.setTextColor(...STONE_500)
  doc.text(
    'Esta contraseña se muestra una sola vez. Entrégala al administrador de manera segura y luego elimina este archivo.',
    PAD + 4, y + 12,
  )

  // ── Footer ────────────────────────────────────────────────────────────
  const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.setFontSize(6)
  doc.setTextColor(...STONE_500)
  doc.text(`Generado el ${date}  ·  El Vuelto POS`, PAD, PH - 5)

  // ── Save ──────────────────────────────────────────────────────────────
  const slug = data.tenantNombre.toLowerCase().replace(/\s+/g, '-')
  doc.save(`credenciales-${slug}.pdf`)
}

// ─── User credential card ─────────────────────────────────────────────────────

export interface UserCredentialCardData {
  tenantNombre: string
  userName: string
  rol: 'ADMIN' | 'CAJERO'
  loginIdentifier: string
  password: string
}

export async function downloadUserCredentialCard(data: UserCredentialCardData): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' })
  const PW  = doc.internal.pageSize.getWidth()
  const PH  = doc.internal.pageSize.getHeight()
  const PAD = 12

  const isCajero = data.rol === 'CAJERO'

  doc.setFillColor(...CREAM)
  doc.rect(0, 0, PW, PH, 'F')

  const HDR = 28
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, PW, HDR, 'F')
  doc.setFillColor(...BRAND_MID)
  doc.rect(PW / 2, 0, PW / 2, HDR, 'F')
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, PW / 2, HDR, 'F')

  try {
    const logoData = await loadImageAsDataURL(LOGO_URL)
    doc.addImage(logoData, 'PNG', PAD, 4, 18, 18)
  } catch { /* skip */ }

  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('El Vuelto', PAD + 22, 13)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 237, 213)
  doc.text(
    `Credenciales del ${isCajero ? 'colaborador' : 'administrador'} — Documento confidencial`,
    PAD + 22, 20,
  )

  let y = HDR + 9

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...STONE_500)
  doc.text('NEGOCIO', PAD, y)

  y += 5
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...STONE_900)
  doc.text(data.tenantNombre, PAD, y)

  y += 3
  doc.setDrawColor(...STONE_200)
  doc.setLineWidth(0.3)
  doc.line(PAD, y, PW - PAD, y)

  y += 6
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...STONE_500)
  doc.text(isCajero ? 'COLABORADOR' : 'ADMINISTRADOR', PAD, y)

  y += 5
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...STONE_900)
  doc.text(data.userName, PAD, y)

  y += 8
  const cardH  = 22
  const cardW  = (PW - PAD * 2 - 6) / 2
  const card2X = PAD + cardW + 6

  // Login identifier card
  doc.setFillColor(...WHITE)
  doc.setDrawColor(...STONE_200)
  doc.setLineWidth(0.4)
  doc.roundedRect(PAD, y, cardW, cardH, 2, 2, 'FD')

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...STONE_500)
  doc.text(isCajero ? 'CÉDULA DE ACCESO' : 'CORREO DE ACCESO', PAD + 4, y + 7)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...STONE_900)
  doc.text(data.loginIdentifier, PAD + 4, y + 15)

  // Password card
  doc.setFillColor(255, 248, 245)
  doc.setDrawColor(...BRAND)
  doc.setLineWidth(0.6)
  doc.roundedRect(card2X, y, cardW, cardH, 2, 2, 'FD')

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND)
  doc.text(isCajero ? 'PIN DE ACCESO' : 'CONTRASEÑA INICIAL', card2X + 4, y + 7)

  doc.setFontSize(11)
  doc.setFont('courier', 'bold')
  doc.setTextColor(...STONE_900)
  doc.text(data.password, card2X + 4, y + 16)

  y += cardH + 8
  const warnH = 16
  doc.setFillColor(...AMBER_50)
  doc.setDrawColor(...AMBER_200)
  doc.setLineWidth(0.3)
  doc.roundedRect(PAD, y, PW - PAD * 2, warnH, 2, 2, 'FD')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...AMBER_700)
  doc.text('⚠  Documento confidencial — uso interno exclusivo', PAD + 4, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...STONE_500)
  doc.text(
    `Este ${isCajero ? 'PIN' : 'contraseña'} se muestra una sola vez. Entrégalo de forma segura antes de eliminar este archivo.`,
    PAD + 4, y + 12,
  )

  const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.setFontSize(6)
  doc.setTextColor(...STONE_500)
  doc.text(`Generado el ${date}  ·  El Vuelto POS`, PAD, PH - 5)

  const slug = data.tenantNombre.toLowerCase().replace(/\s+/g, '-')
  doc.save(`credenciales-${data.userName.toLowerCase().replace(/\s+/g, '-')}-${slug}.pdf`)
}
