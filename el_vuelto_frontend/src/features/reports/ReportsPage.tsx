import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts'
import { useGetSummaryQuery, useGetVentasPorHoraQuery, useGetTopProductosQuery, useGetSalesDetailQuery } from './reportsApi'
import type { VentasPorHoraItem } from './reportsApi'
import { useAppSelector } from '@/app/hooks'
import { formatCOP } from '@/utils/formatCOP'
import Spinner from '@/components/ui/Spinner'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import elVueltoLogoUrl from '../../../assets/icons/El Vuelto - El_Vuelto_favicon_BG .png'

function HourTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: VentasPorHoraItem }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  if (d.total === 0) return null
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--outline-variant)',
      borderRadius: 'var(--radius-lg)', padding: '0.875rem 1rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '180px',
    }}>
      <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
        {d.hora}:00 — {d.hora + 1}:00
      </p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>
        {formatCOP(d.total)}
      </p>
      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: d.top_productos?.length > 0 ? '0.625rem' : 0 }}>
        {d.transacciones} {d.transacciones === 1 ? 'transacción' : 'transacciones'}
      </p>
      {d.top_productos?.length > 0 && (
        <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {d.top_productos.map((p) => (
            <div key={p.nombre} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--on-surface)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                {p.nombre}
              </span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--on-surface-variant)', flexShrink: 0 }}>
                {p.unidades} u.
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportBtnRef = useRef<HTMLDivElement>(null)

  const user = useAppSelector((s) => s.auth.user)

  const { data: summary,        isFetching: s1 } = useGetSummaryQuery({ fecha })
  const { data: ventasPorHora,  isFetching: s2 } = useGetVentasPorHoraQuery({ fecha })
  const { data: topProductos,   isFetching: s3 } = useGetTopProductosQuery({ fecha, limit: 10 })
  const { data: salesDetail }                     = useGetSalesDetailQuery({ fecha }, { skip: !exportMenuOpen && !exporting })

  const loading  = s1 || s2 || s3
  const maxUnits = Math.max(...(topProductos?.map((p) => p.unidades) ?? [1]), 1)

  const metodoLabel =
    (summary?.porcentaje_efectivo ?? 0) >= (summary?.porcentaje_nequi ?? 0)
      ? 'Efectivo'
      : 'Nequi'

  useEffect(() => {
    if (!exportMenuOpen) return
    function onDown(e: MouseEvent) {
      if (exportBtnRef.current && !exportBtnRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [exportMenuOpen])

  function exportExcel() {
    if (!salesDetail) return
    setExporting(true)
    try {
      const cop = (v: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

      const resumenData = [
        ['Reporte de ventas — ' + salesDetail.fecha],
        ['Negocio', salesDetail.tenant_nombre],
        ['Generado', new Date().toLocaleString('es-CO')],
        [],
        ['RESUMEN'],
        ['Total ventas', cop(salesDetail.total_ventas)],
        ['Número de transacciones', salesDetail.num_transacciones],
      ]

      const ventasHeaders = ['Código', 'Hora', 'Cajero', 'Método de pago', 'Monto recibido', 'Cambio', 'Total']
      const ventasRows = salesDetail.sales.map((s) => [
        s.codigo, s.hora, s.cajero, s.metodo_pago,
        s.monto_recibido ?? '—', s.cambio ?? '—', s.total,
      ])

      const itemsHeaders = ['Código venta', 'Hora', 'Cajero', 'Producto', 'Precio unitario', 'Cantidad', 'Subtotal']
      const itemsRows = salesDetail.sales.flatMap((s) =>
        s.items.map((item) => [
          s.codigo, s.hora, s.cajero,
          item.producto, item.precio_unitario, item.cantidad, item.subtotal,
        ])
      )

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenData), 'Resumen')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([ventasHeaders, ...ventasRows]), 'Ventas')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([itemsHeaders, ...itemsRows]), 'Productos vendidos')
      XLSX.writeFile(wb, `ElVuelto_Ventas_${salesDetail.fecha}.xlsx`)
    } finally {
      setExporting(false)
      setExportMenuOpen(false)
    }
  }

  async function exportHTML() {
    if (!salesDetail || !summary || !ventasPorHora || !topProductos) return
    setExporting(true)

    let elVueltoBase64 = ''
    try {
      const resp = await fetch(elVueltoLogoUrl)
      const blob = await resp.blob()
      elVueltoBase64 = await new Promise<string>((res) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result as string)
        reader.readAsDataURL(blob)
      })
    } catch { elVueltoBase64 = elVueltoLogoUrl }

    const tenantLogoHtml = salesDetail.tenant_logo_url
      ? `<img src="${salesDetail.tenant_logo_url}" alt="Logo" style="height:48px;object-fit:contain;" />`
      : `<span style="font-family:'Georgia',serif;font-size:1.5rem;font-weight:700;color:#6a2600;">${salesDetail.tenant_nombre}</span>`

    const cop = (v: number) =>
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

    const W = 800, H = 180, PAD = { t: 10, r: 20, b: 30, l: 55 }
    const chartW = W - PAD.l - PAD.r
    const chartH = H - PAD.t - PAD.b
    const maxVal = Math.max(...ventasPorHora.map(v => v.total), 1)
    const pts = ventasPorHora.map((v, i) => ({
      x: PAD.l + (i / 23) * chartW,
      y: PAD.t + chartH - (v.total / maxVal) * chartH,
      ...v,
    }))
    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const dots = pts.filter(p => p.total > 0).map(p =>
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#6a2600" stroke="white" stroke-width="2">
        <title>${p.hora}:00 — ${cop(p.total)} | ${p.transacciones} transacciones</title>
      </circle>`
    ).join('')
    const xLabels = [0, 3, 6, 9, 12, 15, 18, 21, 23].map(h => {
      const x = PAD.l + (h / 23) * chartW
      return `<text x="${x.toFixed(1)}" y="${(H - 6).toFixed(1)}" text-anchor="middle" font-size="9" fill="#888" font-family="monospace">${h}h</text>`
    }).join('')
    const ySteps = [0, 0.25, 0.5, 0.75, 1].map(f => {
      const y = PAD.t + chartH - f * chartH
      const val = f * maxVal
      return `<text x="${(PAD.l - 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#888" font-family="monospace">$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(0)}</text>
<line x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${(W - PAD.r).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e8ddd0" stroke-width="1" stroke-dasharray="4,4" />`
    }).join('')

    const salesTableRows = salesDetail.sales.map((s, i) => `
      <tr onclick="toggleItems('items-${i}')" style="cursor:pointer;">
        <td><span style="font-family:monospace;font-size:0.8rem;color:#888;">#${s.codigo}</span></td>
        <td>${s.hora}</td>
        <td>${s.cajero}</td>
        <td><span class="chip chip-${s.metodo_pago === 'Efectivo' ? 'ef' : 'nq'}">${s.metodo_pago}</span></td>
        <td style="text-align:right;font-family:monospace;font-weight:700;color:#6a2600;">${cop(s.total)}</td>
        <td style="text-align:right;font-family:monospace;color:#888;">${s.cambio !== null ? cop(s.cambio) : '—'}</td>
        <td style="text-align:center;font-size:0.75rem;color:#aaa;">▼</td>
      </tr>
      <tr id="items-${i}" style="display:none;background:#faf3e8;">
        <td colspan="7" style="padding:0.5rem 1rem 1rem 2rem;">
          <table style="width:100%;border-collapse:collapse;font-size:0.8125rem;">
            <thead><tr style="color:#888;">
              <th style="text-align:left;padding:0.25rem 0.5rem;">Producto</th>
              <th style="text-align:right;padding:0.25rem 0.5rem;">Precio unit.</th>
              <th style="text-align:center;padding:0.25rem 0.5rem;">Cant.</th>
              <th style="text-align:right;padding:0.25rem 0.5rem;">Subtotal</th>
            </tr></thead>
            <tbody>
              ${s.items.map(item => `
                <tr>
                  <td style="padding:0.25rem 0.5rem;">${item.producto}</td>
                  <td style="text-align:right;padding:0.25rem 0.5rem;font-family:monospace;">${cop(item.precio_unitario)}</td>
                  <td style="text-align:center;padding:0.25rem 0.5rem;font-family:monospace;">${item.cantidad}</td>
                  <td style="text-align:right;padding:0.25rem 0.5rem;font-family:monospace;color:#6a2600;">${cop(item.subtotal)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </td>
      </tr>`).join('')

    const topProductosRows = topProductos.map((p, i) => `
      <tr>
        <td style="font-family:monospace;font-weight:700;color:#888;">${i + 1}</td>
        <td style="font-weight:600;">${p.nombre}</td>
        <td style="text-align:center;font-family:monospace;">${p.unidades}</td>
        <td style="text-align:right;font-family:monospace;font-weight:700;color:#6a2600;">${cop(p.total)}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reporte de ventas — ${salesDetail.fecha} — ${salesDetail.tenant_nombre}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background: #fff8f0; color: #1c1b1f; }
  .page { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
  header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 1.5rem; border-bottom: 2px solid #e8ddd0; margin-bottom: 2rem; }
  .brand { display: flex; align-items: center; gap: 1rem; }
  .meta { text-align: right; }
  .meta h1 { font-size: 1.5rem; font-weight: 700; color: #6a2600; font-family: Georgia, serif; }
  .meta p { font-size: 0.8125rem; color: #888; margin-top: 0.25rem; }
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
  .kpi { background: white; border-radius: 12px; padding: 1.25rem 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .kpi-label { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 0.5rem; }
  .kpi-value { font-family: monospace; font-size: 1.75rem; font-weight: 700; color: #6a2600; }
  .kpi-sub { font-size: 0.8125rem; color: #aaa; margin-top: 0.25rem; }
  .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 1.5rem; }
  .card-title { font-family: Georgia, serif; font-size: 1.125rem; color: #6a2600; font-weight: 700; margin-bottom: 1rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9375rem; }
  th { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 0.75rem 1rem; text-align: left; background: #f4ede2; color: #555; }
  td { padding: 0.75rem 1rem; border-bottom: 1px solid #f4ede2; }
  tr:hover > td { background: #fffaf5; }
  .chip { display: inline-block; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; }
  .chip-ef { background: #d4edda; color: #155724; }
  .chip-nq { background: #cce5ff; color: #004085; }
  .search-wrap { margin-bottom: 1rem; }
  .search-wrap input { width: 100%; max-width: 24rem; padding: 0.5rem 0.875rem; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9375rem; background: #faf3e8; }
  tfoot td { background: #6a2600; color: white; font-weight: 700; font-family: monospace; }
  .powered { text-align: center; margin-top: 3rem; font-size: 0.75rem; color: #bbb; }
  .powered img { height: 24px; opacity: 0.5; vertical-align: middle; margin-left: 0.5rem; }
</style>
</head>
<body>
<div class="page">
  <header>
    <div class="brand">${tenantLogoHtml}</div>
    <div class="meta">
      <h1>Reporte de ventas</h1>
      <p>${salesDetail.fecha} · Generado ${new Date().toLocaleString('es-CO')}</p>
    </div>
  </header>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-label">Total ventas</div>
      <div class="kpi-value">${cop(salesDetail.total_ventas)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Transacciones</div>
      <div class="kpi-value">${salesDetail.num_transacciones}</div>
      <div class="kpi-sub">${salesDetail.num_transacciones > 0 ? cop(salesDetail.total_ventas / salesDetail.num_transacciones) + ' promedio' : '—'}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Método predominante</div>
      <div class="kpi-value" style="font-family:Georgia,serif;font-size:1.375rem;">${(summary.porcentaje_efectivo ?? 0) >= (summary.porcentaje_nequi ?? 0) ? 'Efectivo' : 'Nequi'}</div>
      <div class="kpi-sub">${Math.max(summary.porcentaje_efectivo ?? 0, summary.porcentaje_nequi ?? 0)}% de transacciones</div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Ventas por hora</div>
    <svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      ${ySteps}
      <path d="${pathD}" fill="none" stroke="#6a2600" stroke-width="2.5" />
      ${dots}
      ${xLabels}
    </svg>
  </div>

  <div class="card">
    <div class="card-title">Top productos</div>
    <table>
      <thead><tr><th>#</th><th>Producto</th><th style="text-align:center;">Unidades</th><th style="text-align:right;">Total</th></tr></thead>
      <tbody>${topProductosRows}</tbody>
      <tfoot><tr>
        <td colspan="3" style="padding:0.75rem 1rem;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;">Total</td>
        <td style="text-align:right;padding:0.75rem 1rem;">${cop(salesDetail.total_ventas)}</td>
      </tr></tfoot>
    </table>
  </div>

  <div class="card">
    <div class="card-title">Detalle de ventas</div>
    <div class="search-wrap">
      <input type="text" id="search" placeholder="Buscar por cajero, código o método..." oninput="filterTable(this.value)" />
    </div>
    <table id="sales-table">
      <thead><tr>
        <th onclick="sortTable(0)" style="cursor:pointer;">Código</th>
        <th onclick="sortTable(1)" style="cursor:pointer;">Hora</th>
        <th onclick="sortTable(2)" style="cursor:pointer;">Cajero</th>
        <th>Método</th>
        <th style="text-align:right;cursor:pointer;" onclick="sortTable(4)">Total</th>
        <th style="text-align:right;">Cambio</th>
        <th></th>
      </tr></thead>
      <tbody id="sales-tbody">${salesTableRows}</tbody>
    </table>
  </div>

  <div class="powered">
    Generado con El Vuelto POS
    <img src="${elVueltoBase64}" alt="El Vuelto" />
  </div>
</div>
<script>
function toggleItems(id) {
  const row = document.getElementById(id);
  row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
}
function filterTable(q) {
  const rows = document.querySelectorAll('#sales-tbody > tr:not([id^="items-"])');
  rows.forEach((row, i) => {
    const itemRow = document.getElementById('items-' + i);
    const text = row.textContent.toLowerCase();
    const show = q === '' || text.includes(q.toLowerCase());
    row.style.display = show ? '' : 'none';
    if (itemRow) itemRow.style.display = 'none';
  });
}
let sortDir = {};
function sortTable(col) {
  const tbody = document.getElementById('sales-tbody');
  const dataRows = [];
  let i = 0;
  while (i < tbody.rows.length) {
    const row = tbody.rows[i];
    if (!row.id.startsWith('items-')) {
      const itemRow = tbody.rows[i + 1];
      dataRows.push({ main: row, item: itemRow });
      i += 2;
    } else { i++; }
  }
  sortDir[col] = !sortDir[col];
  dataRows.sort((a, b) => {
    const va = a.main.cells[col]?.textContent.trim() ?? '';
    const vb = b.main.cells[col]?.textContent.trim() ?? '';
    const n = parseFloat(va.replace(/[^0-9.-]/g, '')) - parseFloat(vb.replace(/[^0-9.-]/g, ''));
    const cmp = isNaN(n) ? va.localeCompare(vb) : n;
    return sortDir[col] ? cmp : -cmp;
  });
  dataRows.forEach(({ main, item }) => { tbody.appendChild(main); if (item) tbody.appendChild(item); });
}
</script>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ElVuelto_Reporte_${salesDetail.fecha}.html`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
    setExportMenuOpen(false)
  }

  // suppress unused var warning — user is available for future use
  void user

  return (
    <div className="ta-page">
      {/* ── Hero ── */}
      <div className="ta-page-hero">
        <div>
          <h1 className="ta-page-title">Análisis de ventas</h1>
          <p className="ta-page-sub">Visualiza el rendimiento de tu negocio.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="date"
            className="ta-input"
            style={{ borderRadius: 'var(--radius-lg)', paddingLeft: '1rem', width: '10rem' }}
            value={fecha}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setFecha(e.target.value)}
          />
          <div ref={exportBtnRef} style={{ position: 'relative' }}>
            <button
              className="ta-btn ta-btn-secondary"
              onClick={() => setExportMenuOpen((o) => !o)}
              disabled={exporting}
            >
              <DownloadOutlinedIcon style={{ fontSize: '1.125rem' }} />
              {exporting ? 'Generando...' : 'Exportar'}
            </button>
            {exportMenuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                background: 'var(--surface)', border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                minWidth: '200px', zIndex: 50, overflow: 'hidden',
              }}>
                <button
                  onClick={exportExcel}
                  style={{ width: '100%', padding: '0.875rem 1.25rem', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-container)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <DownloadOutlinedIcon style={{ fontSize: '1.125rem', color: 'var(--primary)' }} />
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--on-surface)' }}>Excel (.xlsx)</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Ventas, items, resumen</p>
                  </div>
                </button>
                <div style={{ height: '1px', background: 'var(--outline-variant)' }} />
                <button
                  onClick={exportHTML}
                  style={{ width: '100%', padding: '0.875rem 1.25rem', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-container)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <DownloadOutlinedIcon style={{ fontSize: '1.125rem', color: 'var(--tertiary)' }} />
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--on-surface)' }}>Página interactiva (.html)</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Gráficas + tabla filtrable</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Spinner />
        </div>
      )}

      {!loading && (
        <>
          {/* ── KPI cards ── */}
          <div className="ta-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="ta-kpi-card ta-kpi-card--accent">
              <p className="ta-kpi-label" style={{ marginBottom: '1rem' }}>Venta total</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span className="ta-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>$</span>
                <span className="ta-mono ta-mono--primary" style={{ fontSize: '2rem' }}>
                  {(summary?.total_ventas ?? 0).toLocaleString('es-CO')}
                </span>
              </div>
              <div className="ta-kpi-meta ta-kpi-meta--up">
                <TrendingUpIcon style={{ fontSize: '1rem' }} />
                <span>Actualizado</span>
              </div>
            </div>

            <div className="ta-kpi-card ta-kpi-card--accent">
              <p className="ta-kpi-label" style={{ marginBottom: '1rem' }}>Ticket promedio</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span className="ta-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>$</span>
                <span className="ta-mono ta-mono--primary" style={{ fontSize: '2rem' }}>
                  {summary?.num_transacciones
                    ? Math.round((summary.total_ventas ?? 0) / summary.num_transacciones).toLocaleString('es-CO')
                    : '0'}
                </span>
              </div>
              <div className="ta-kpi-meta ta-kpi-meta--flat">
                <HorizontalRuleIcon style={{ fontSize: '1rem' }} />
                <span>{summary?.num_transacciones ?? 0} transacciones</span>
              </div>
            </div>

            <div className="ta-kpi-card ta-kpi-card--accent">
              <p className="ta-kpi-label" style={{ marginBottom: '1rem' }}>Método predominante</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '3rem', height: '3rem', borderRadius: '50%',
                  background: 'var(--secondary-container)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AccountBalanceWalletOutlinedIcon style={{ color: 'var(--on-secondary-container)' }} />
                </div>
                <div>
                  <span className="ta-serif" style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--primary)', display: 'block' }}>
                    {metodoLabel}
                  </span>
                  <span className="ta-mono ta-mono--muted" style={{ fontSize: '0.75rem' }}>
                    {Math.max(summary?.porcentaje_efectivo ?? 0, summary?.porcentaje_nequi ?? 0)}% de transacciones
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Charts grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            {/* Line chart */}
            <div className="ta-card-low">
              <div className="ta-card-header">
                <h3 className="ta-card-title">Ventas por hora</h3>
                <span style={{
                  fontSize: '0.6875rem', fontWeight: 700,
                  background: 'var(--surface-container-lowest)',
                  padding: '0.25rem 0.75rem', borderRadius: '9999px',
                  color: 'var(--on-surface-variant)',
                }}>En vivo</span>
              </div>
              {(() => {
                const hasSales = ventasPorHora?.some(v => v.total > 0) ?? false
                return hasSales ? (
                  <div style={{ width: '100%', height: '12rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ventasPorHora} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--outline-variant)" strokeDasharray="4 4" />
                        <XAxis
                          dataKey="hora"
                          tickFormatter={(h: number) => `${h}h`}
                          tick={{ fontSize: 10, fill: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}
                          axisLine={false} tickLine={false} interval={1}
                        />
                        <YAxis
                          tickFormatter={(v: number) => v === 0 ? '' : `$${(v / 1000).toFixed(0)}k`}
                          tick={{ fontSize: 10, fill: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}
                          axisLine={false} tickLine={false} width={40}
                        />
                        <Tooltip content={<HourTooltip />} cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Line
                          type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2.5}
                          dot={(props) => {
                            const { cx, cy, payload } = props as { cx: number; cy: number; payload: VentasPorHoraItem }
                            if (payload.total === 0) return <g key={`dot-${payload.hora}`} />
                            return <circle key={`dot-${payload.hora}`} cx={cx} cy={cy} r={4} fill="var(--primary)" stroke="var(--surface)" strokeWidth={2} />
                          }}
                          activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--surface)', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ height: '12rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>Sin ventas para la fecha seleccionada</p>
                  </div>
                )
              })()}
            </div>

            {/* Payment method breakdown */}
            <div className="ta-card-low">
              <h3 className="ta-card-title" style={{ marginBottom: '1.5rem' }}>Ventas por método</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Efectivo</span>
                    <span className="ta-mono" style={{ fontSize: '0.8125rem' }}>{summary?.porcentaje_efectivo ?? 0}%</span>
                  </div>
                  <div className="ta-progress-wrap">
                    <div className="ta-progress-fill" style={{ width: `${summary?.porcentaje_efectivo ?? 0}%` }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Nequi</span>
                    <span className="ta-mono" style={{ fontSize: '0.8125rem' }}>{summary?.porcentaje_nequi ?? 0}%</span>
                  </div>
                  <div className="ta-progress-wrap">
                    <div className="ta-progress-fill" style={{ width: `${summary?.porcentaje_nequi ?? 0}%`, background: 'var(--tertiary-container)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom grid: top products ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
            <div className="ta-card-low">
              <h3 className="ta-card-title" style={{ marginBottom: '1.5rem' }}>Top 5 productos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {(topProductos ?? []).slice(0, 5).map((p) => (
                  <div key={p.product_id} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{p.nombre}</span>
                      <span className="ta-mono ta-mono--muted" style={{ fontSize: '0.75rem' }}>{p.unidades} u.</span>
                    </div>
                    <div className="ta-progress-wrap">
                      <div className="ta-progress-fill" style={{ width: `${(p.unidades / maxUnits) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ta-card">
              <div className="ta-card-header">
                <h3 className="ta-card-title">Detalle de productos</h3>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button className="ta-btn-icon" title="Filtrar">
                    <FilterListOutlinedIcon style={{ fontSize: '1.125rem' }} />
                  </button>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="ta-table">
                  <thead className="ta-thead">
                    <tr>
                      <th className="ta-th">#</th>
                      <th className="ta-th">Producto</th>
                      <th className="ta-th" style={{ textAlign: 'center' }}>Unidades</th>
                      <th className="ta-th" style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(topProductos ?? []).map((p, i) => (
                      <tr key={p.product_id} className="ta-tr">
                        <td className="ta-td ta-mono ta-mono--muted" style={{ width: '2rem' }}>{i + 1}</td>
                        <td className="ta-td" style={{ fontWeight: 600 }}>{p.nombre}</td>
                        <td className="ta-td ta-mono" style={{ textAlign: 'center' }}>{p.unidades}</td>
                        <td className="ta-td ta-mono ta-mono--primary" style={{ textAlign: 'right', fontWeight: 700 }}>
                          {formatCOP(p.total)}
                        </td>
                      </tr>
                    ))}
                    {(!topProductos || topProductos.length === 0) && (
                      <tr>
                        <td colSpan={4} className="ta-empty">Sin datos para la fecha seleccionada</td>
                      </tr>
                    )}
                  </tbody>
                  {topProductos && topProductos.length > 0 && (
                    <tfoot>
                      <tr style={{ background: 'var(--primary)', color: 'white' }}>
                        <td className="ta-td" colSpan={3} style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                          Total
                        </td>
                        <td className="ta-td ta-mono" style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.125rem' }}>
                          {formatCOP(summary?.total_ventas ?? 0)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
