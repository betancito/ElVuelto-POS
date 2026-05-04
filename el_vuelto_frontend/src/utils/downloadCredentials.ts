import { jsPDF } from 'jspdf'

export interface CredentialCardData {
  tenantNombre: string
  adminNombre: string
  adminCorreo: string
  password: string
}

const BANNER_URL = '/logos/El%20Vuelto%20-%20El_Vuelto_banner_v1_NO_BG.png'

// ── Brand palette (RGB) ──────────────────────────────────────────────
const BRAND     = [139,  58, 15] as const   // #8B3A0F
const CREAM     = [251, 247, 242] as const  // #FBF7F2
const STONE_200 = [231, 229, 228] as const  // #e7e5e4
const STONE_500 = [120, 113, 108] as const  // #78716c
const STONE_900 = [ 28,  25,  23] as const  // #1c1917
const WHITE     = [255, 255, 255] as const
const AMBER_50  = [255, 251, 235] as const
const AMBER_200 = [253, 230, 138] as const
const AMBER_700 = [180,  83,   9] as const

interface LoadedImage { dataUrl: string; w: number; h: number }

function loadImageAsDataURL(src: string): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight })
    }
    img.onerror = reject
    img.src = src
  })
}

// Scales an image to fit within maxW × maxH while preserving aspect ratio.
function fitImage(img: LoadedImage, maxW: number, maxH: number): { w: number; h: number } {
  const aspect = img.w / img.h
  let h = maxH
  let w = h * aspect
  if (w > maxW) { w = maxW; h = w / aspect }
  return { w, h }
}

// ── Shared header renderer ───────────────────────────────────────────
// Draws the two-column header used by both credential PDFs.
// Left column: El Vuelto banner + subtitle text
// Right column: right-side logo image OR fallback text
// Returns the y position where body content should begin.
function drawPdfHeader(
  doc: jsPDF,
  PW: number,
  PAD: number,
  subtitle: string,
  evLogo: LoadedImage | null,
  rightLogo: LoadedImage | null,
  rightFallbackTitle: string,
  rightFallbackLabel: string,
): number {
  const HDR       = 32   // total header height (mm)
  const TOP_STRIP = 3    // terracotta accent at top
  const MID_X     = PW / 2

  // Cream header background
  doc.setFillColor(...CREAM)
  doc.rect(0, 0, PW, HDR, 'F')

  // Terracotta top-strip
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, PW, TOP_STRIP, 'F')

  // Bottom separator
  doc.setDrawColor(...STONE_200)
  doc.setLineWidth(0.4)
  doc.line(0, HDR, PW, HDR)

  // Vertical divider between halves
  doc.setDrawColor(...STONE_200)
  doc.setLineWidth(0.3)
  doc.line(MID_X, TOP_STRIP + 3, MID_X, HDR - 3)

  // ── Left half: El Vuelto banner ──────────────────────────────────
  const leftMaxW  = MID_X - PAD - 4
  const logoMaxH  = HDR - TOP_STRIP - 10  // 19 mm available height for logo

  if (evLogo) {
    const { w: lw, h: lh } = fitImage(evLogo, leftMaxW, logoMaxH)
    const lx = PAD
    const ly = TOP_STRIP + (HDR - TOP_STRIP - lh) / 2 - 2  // vertically centred, slight upward nudge
    doc.addImage(evLogo.dataUrl, 'PNG', lx, ly, lw, lh)
  }

  // Subtitle below logo
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...STONE_500)
  doc.text(subtitle, PAD, HDR - 3.5)

  // ── Right half: tenant logo or fallback text ─────────────────────
  const rightInner = PW - PAD - MID_X      // available width inside right col (with right pad)
  const centerX    = MID_X + rightInner / 2

  if (rightLogo) {
    const { w: rw, h: rh } = fitImage(rightLogo, rightInner - 8, logoMaxH)
    const rx = centerX - rw / 2
    const ry = TOP_STRIP + (HDR - TOP_STRIP - rh) / 2
    doc.addImage(rightLogo.dataUrl, 'PNG', rx, ry, rw, rh)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...BRAND)
    doc.text(rightFallbackTitle, centerX, HDR / 2 + 1.5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...STONE_500)
    doc.text(rightFallbackLabel, centerX, HDR / 2 + 6.5, { align: 'center' })
  }

  return HDR
}

// ─── Tenant admin credential card (super-admin creates a new tenant) ──────────

export async function downloadCredentialCard(data: CredentialCardData): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' })
  const PW  = doc.internal.pageSize.getWidth()   // 210 mm
  const PH  = doc.internal.pageSize.getHeight()  // 148 mm
  const PAD = 12

  // Cream page background
  doc.setFillColor(...CREAM)
  doc.rect(0, 0, PW, PH, 'F')

  const evLogo = await loadImageAsDataURL(BANNER_URL).catch(() => null)

  const HDR = drawPdfHeader(
    doc,
    PW, PAD,
    'Credenciales de acceso — Documento confidencial',
    evLogo,
    null,
    data.tenantNombre,
    'Negocio',
  )

  // ── Body ─────────────────────────────────────────────────────────────
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
  doc.text('ADMINISTRADOR', PAD, y)

  y += 5
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...STONE_900)
  doc.text(data.adminNombre, PAD, y)

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
    'Esta contraseña se muestra una sola vez. Entrégala al administrador de manera segura y luego elimina este archivo.',
    PAD + 4, y + 12,
  )

  const date = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.setFontSize(6)
  doc.setTextColor(...STONE_500)
  doc.text(`Generado el ${date}  ·  El Vuelto POS`, PAD, PH - 5)

  const slug = data.tenantNombre.toLowerCase().replace(/\s+/g, '-')
  doc.save(`credenciales-${slug}.pdf`)
}

// ─── User credential card (tenant admin creates/resets a user) ────────────────

export interface UserCredentialCardData {
  tenantNombre: string
  tenantLogoUrl?: string | null
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

  const [evLogo, tenantLogo] = await Promise.all([
    loadImageAsDataURL(BANNER_URL).catch(() => null),
    data.tenantLogoUrl ? loadImageAsDataURL(data.tenantLogoUrl).catch(() => null) : Promise.resolve(null),
  ])

  const HDR = drawPdfHeader(
    doc,
    PW, PAD,
    `Credenciales del ${isCajero ? 'colaborador' : 'administrador'} — Documento confidencial`,
    evLogo,
    tenantLogo,
    data.tenantNombre,
    'Negocio',
  )

  // ── Body ─────────────────────────────────────────────────────────────
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
