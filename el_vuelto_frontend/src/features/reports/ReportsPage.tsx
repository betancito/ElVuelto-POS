import { useState, useRef, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts'
import {
  useGetSummaryQuery,
  useGetVentasPorHoraQuery,
  useGetVentasPorDiaQuery,
  useGetTopProductosQuery,
  useGetSalesDetailQuery,
} from './reportsApi'
import type { VentasPorHoraItem, VentasPorDiaItem } from './reportsApi'
import { useAppSelector } from '@/app/hooks'
import { formatCOP } from '@/utils/formatCOP'
import { getServerErrorMessage } from '@/utils/applyServerErrors'
import Spinner from '@/components/ui/Spinner'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import elVueltoLogoUrl from '../../../assets/icons/El Vuelto - El_Vuelto_favicon_BG .png'

function todayBogota() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

function currentISOWeek() {
  const d = new Date()
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const dow = jan4.getDay() || 7
  const w1Mon = new Date(jan4)
  w1Mon.setDate(jan4.getDate() - dow + 1)
  const weekNum = Math.floor((d.getTime() - w1Mon.getTime()) / 86400000 / 7) + 1
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function weekToRange(weekStr: string): { inicio: string; fin: string } {
  const [yearStr, wStr] = weekStr.split('-W')
  const year = Number(yearStr), week = Number(wStr)
  const jan4 = new Date(year, 0, 4)
  const dow = jan4.getDay() || 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    inicio: monday.toLocaleDateString('en-CA'),
    fin: sunday.toLocaleDateString('en-CA'),
  }
}

function monthToRange(monthStr: string): { inicio: string; fin: string } {
  const [y, m] = monthStr.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return {
    inicio: `${y}-${String(m).padStart(2, '0')}-01`,
    fin: `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

function dateToISOWeek(d: Date): string {
  const thursday = new Date(d)
  thursday.setDate(d.getDate() - (d.getDay() || 7) + 4)
  const year = thursday.getFullYear()
  const jan1 = new Date(year, 0, 1)
  const weekNum = Math.ceil(((thursday.getTime() - jan1.getTime()) / 86400000 + 1) / 7)
  return `${year}-W${String(weekNum).padStart(2, '0')}`
}

function periodoLabel(periodo: 'diario' | 'semanal' | 'mensual' | 'personalizado', inicio: string, fin: string) {
  if (inicio === fin) {
    return new Date(inicio + 'T12:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  }
  if (periodo === 'mensual') {
    return new Date(inicio + 'T12:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  }
  const d0 = new Date(inicio + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
  const d1 = new Date(fin + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
  return `${d0} — ${d1}`
}

function DayTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: VentasPorDiaItem }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  if (d.total === 0) return null
  const label = new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'short', day: '2-digit', month: 'short',
  })
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--outline-variant)',
      borderRadius: 'var(--radius-lg)', padding: '0.875rem 1rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    }}>
      <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
        {label}
      </p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>
        {formatCOP(d.total)}
      </p>
      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
        {d.transacciones} {d.transacciones === 1 ? 'transacción' : 'transacciones'}
      </p>
    </div>
  )
}

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

const MONTH_NAMES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MONTH_NAMES_SHORT_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DOW_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const POPOVER_STYLE: React.CSSProperties = {
  position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0, zIndex: 100,
  background: 'var(--surface)', border: '1px solid var(--outline-variant)',
  borderRadius: '16px', boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
  padding: '1rem', minWidth: '280px', userSelect: 'none',
}

function calendarNavHeader(label: string, onPrev: () => void, onNext: () => void) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
      <button type="button" onClick={onPrev}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', borderRadius: '50%', display: 'flex', color: 'var(--on-surface-variant)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-container)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
        <ChevronLeftIcon style={{ fontSize: '1.25rem' }} />
      </button>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--on-surface)', textTransform: 'capitalize' }}>
        {label}
      </p>
      <button type="button" onClick={onNext}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', borderRadius: '50%', display: 'flex', color: 'var(--on-surface-variant)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-container)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
        <ChevronRightIcon style={{ fontSize: '1.25rem' }} />
      </button>
    </div>
  )
}

function dowHeader() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.25rem' }}>
      {DOW_LETTERS.map((d, i) => (
        <div key={i} style={{ textAlign: 'center', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)', padding: '0.25rem 0' }}>{d}</div>
      ))}
    </div>
  )
}

function buildMonthGrid(viewYear: number, viewMonth: number): Array<{ date: Date; inMonth: boolean }> {
  const first = new Date(viewYear, viewMonth, 1)
  const firstDow = first.getDay() || 7
  const start = new Date(first)
  start.setDate(first.getDate() - (firstDow - 1))
  const cells: Array<{ date: Date; inMonth: boolean }> = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push({ date: d, inMonth: d.getMonth() === viewMonth })
  }
  return cells
}

function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

interface WeekCalendarProps {
  value: string
  onChange: (w: string) => void
  onClose: () => void
}

function WeekCalendar({ value, onChange, onClose }: WeekCalendarProps) {
  const initialRange = weekToRange(value)
  const initial = new Date(initialRange.inicio + 'T12:00:00')
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  const { inicio, fin } = weekToRange(value)
  const startDate = new Date(inicio + 'T00:00:00')
  const endDate = new Date(fin + 'T00:00:00')
  const today = new Date()

  function prev() {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) } else setViewMonth(viewMonth - 1)
  }
  function next() {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) } else setViewMonth(viewMonth + 1)
  }

  const cells = buildMonthGrid(viewYear, viewMonth)

  return (
    <div style={POPOVER_STYLE}>
      {calendarNavHeader(`${MONTH_NAMES_ES[viewMonth]} ${viewYear}`, prev, next)}
      {dowHeader()}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((c, i) => {
          const inRange = c.date >= startDate && c.date <= endDate
          const isStart = isSameDate(c.date, startDate)
          const isEnd = isSameDate(c.date, endDate)
          const isToday = isSameDate(c.date, today)
          let bg = 'transparent'
          let color = c.inMonth ? 'var(--on-surface)' : 'var(--on-surface-variant)'
          let borderRadius = '8px'
          if (inRange) {
            bg = 'var(--primary-fixed)'
            color = 'var(--on-primary-container)'
            borderRadius = '0'
            if (isStart) { bg = 'var(--primary)'; color = 'var(--on-primary)'; borderRadius = '50% 0 0 50%' }
            if (isEnd)   { bg = 'var(--primary)'; color = 'var(--on-primary)'; borderRadius = '0 50% 50% 0' }
          }
          return (
            <button
              key={i} type="button"
              onClick={() => { onChange(dateToISOWeek(c.date)); onClose() }}
              style={{
                width: '36px', height: '36px', border: 'none', cursor: 'pointer',
                background: bg, color, borderRadius, opacity: c.inMonth ? 1 : 0.3,
                fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: isStart || isEnd ? 700 : 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                margin: '0 auto', padding: 0,
              }}
            >
              {c.date.getDate()}
              {isToday && !inRange && (
                <span style={{ position: 'absolute', bottom: '4px', width: '3px', height: '3px', borderRadius: '50%', background: 'var(--primary)' }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface MonthCalendarProps {
  value: string
  onChange: (m: string) => void
  onClose: () => void
}

function MonthCalendar({ value, onChange, onClose }: MonthCalendarProps) {
  const [vYear, setMYear] = useState(() => {
    const parsed = parseInt(value.split('-')[0])
    return Number.isNaN(parsed) ? new Date().getFullYear() : parsed
  })
  const selectedYear = parseInt(value.split('-')[0])
  const selectedMonth = parseInt(value.split('-')[1]) - 1

  return (
    <div style={POPOVER_STYLE}>
      {calendarNavHeader(String(vYear), () => setMYear(vYear - 1), () => setMYear(vYear + 1))}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
        {MONTH_NAMES_SHORT_ES.map((name, i) => {
          const isSelected = vYear === selectedYear && i === selectedMonth
          return (
            <button
              key={i} type="button"
              onClick={() => { onChange(`${vYear}-${String(i + 1).padStart(2, '0')}`); onClose() }}
              style={{
                padding: '0.625rem 0', border: 'none', cursor: 'pointer',
                background: isSelected ? 'var(--primary)' : 'transparent',
                color: isSelected ? 'var(--on-primary)' : 'var(--on-surface)',
                borderRadius: '8px', fontWeight: isSelected ? 700 : 500,
                fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-container)' }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface DateRangeCalendarProps {
  startDate: string
  endDate: string
  onChange: (start: string, end: string) => void
  onClose: () => void
}

function DateRangeCalendar({ startDate, endDate, onChange, onClose }: DateRangeCalendarProps) {
  const initial = new Date(startDate + 'T12:00:00')
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())
  const [phase, setPhase] = useState<'start' | 'end'>('start')
  const [tempStart, setTempStart] = useState<string | null>(null)
  const [hoverDate, setHoverDate] = useState<string | null>(null)

  function prev() {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) } else setViewMonth(viewMonth - 1)
  }
  function next() {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) } else setViewMonth(viewMonth + 1)
  }

  const cells = buildMonthGrid(viewYear, viewMonth)
  const today = new Date()

  const existingStart = new Date(startDate + 'T00:00:00')
  const existingEnd = new Date(endDate + 'T00:00:00')

  function isoOf(d: Date): string {
    return d.toLocaleDateString('en-CA')
  }

  function handleClick(d: Date) {
    const iso = isoOf(d)
    if (phase === 'start') {
      setTempStart(iso)
      setPhase('end')
      setHoverDate(null)
      return
    }
    let s = tempStart!
    let e = iso
    if (e < s) { const tmp = s; s = e; e = tmp }
    const days = (new Date(e + 'T12:00:00').getTime() - new Date(s + 'T12:00:00').getTime()) / 86400000
    if (days < 2) {
      e = new Date(new Date(s + 'T12:00:00').getTime() + 2 * 86400000).toLocaleDateString('en-CA')
    }
    if (days > 365) {
      e = new Date(new Date(s + 'T12:00:00').getTime() + 365 * 86400000).toLocaleDateString('en-CA')
    }
    onChange(s, e)
    onClose()
  }

  let rangeStart: Date | null = null
  let rangeEnd: Date | null = null
  if (phase === 'end' && tempStart) {
    const a = new Date(tempStart + 'T00:00:00')
    const b = hoverDate ? new Date(hoverDate + 'T00:00:00') : a
    rangeStart = a <= b ? a : b
    rangeEnd = a <= b ? b : a
  } else if (phase === 'start') {
    rangeStart = existingStart
    rangeEnd = existingEnd
  }

  const instruction = phase === 'start' ? 'Selecciona fecha de inicio' : 'Selecciona hasta qué fecha'

  return (
    <div style={{ ...POPOVER_STYLE, minWidth: '300px' }}>
      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.5rem', textAlign: 'center' }}>
        {instruction}
      </p>
      {phase === 'end' && tempStart && (
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary)', textAlign: 'center', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Inicio: {new Date(tempStart + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      )}
      {calendarNavHeader(`${MONTH_NAMES_ES[viewMonth]} ${viewYear}`, prev, next)}
      {dowHeader()}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((c, i) => {
          const inRange = !!(rangeStart && rangeEnd && c.date >= rangeStart && c.date <= rangeEnd)
          const isStart = !!(rangeStart && isSameDate(c.date, rangeStart))
          const isEnd = !!(rangeEnd && isSameDate(c.date, rangeEnd))
          const isToday = isSameDate(c.date, today)
          let bg = 'transparent'
          let color = c.inMonth ? 'var(--on-surface)' : 'var(--on-surface-variant)'
          let borderRadius = '8px'
          if (inRange) {
            bg = 'var(--primary-fixed)'
            color = 'var(--on-primary-container)'
            borderRadius = '0'
            if (isStart && isEnd) { bg = 'var(--primary)'; color = 'var(--on-primary)'; borderRadius = '50%' }
            else if (isStart) { bg = 'var(--primary)'; color = 'var(--on-primary)'; borderRadius = '50% 0 0 50%' }
            else if (isEnd) { bg = 'var(--primary)'; color = 'var(--on-primary)'; borderRadius = '0 50% 50% 0' }
          }
          return (
            <button
              key={i} type="button"
              onClick={() => handleClick(c.date)}
              onMouseEnter={() => { if (phase === 'end') setHoverDate(isoOf(c.date)) }}
              style={{
                width: '36px', height: '36px', border: 'none', cursor: 'pointer',
                background: bg, color, borderRadius, opacity: c.inMonth ? 1 : 0.3,
                fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: isStart || isEnd ? 700 : 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                margin: '0 auto', padding: 0,
              }}
            >
              {c.date.getDate()}
              {isToday && !inRange && (
                <span style={{ position: 'absolute', bottom: '4px', width: '3px', height: '3px', borderRadius: '50%', background: 'var(--primary)' }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type Periodo = 'diario' | 'semanal' | 'mensual' | 'personalizado'

/**
 * The reports endpoints key their 400 by the query param that failed
 * (`fecha_inicio`, `fecha_fin`, `fecha`, `limit`), and `getServerErrorMessage`
 * only knows the sales-endpoint keys (`items`, `monto_recibido`,
 * `non_field_errors`, `detail`), so on its own it would fall through to the
 * generic fallback and hide the real explanation. Read the param keys first,
 * then delegate to the shared helper for everything else.
 */
const PARAM_ERROR_FIELDS = ['fecha_inicio', 'fecha_fin', 'fecha', 'limit'] as const

function reportErrorMessage(error: unknown, fallback: string): string {
  const status = (error as { status?: unknown } | null)?.status
  const data = (error as { data?: unknown } | null)?.data
  if (status === 400 && data && typeof data === 'object') {
    for (const key of PARAM_ERROR_FIELDS) {
      const value = (data as Record<string, unknown>)[key]
      if (typeof value === 'string' && value) return value
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
    }
  }
  return getServerErrorMessage(error, fallback)
}

export default function ReportsPage() {
  const [periodo, setPeriodo] = useState<Periodo>('diario')
  const [selectedDate, setDate] = useState(todayBogota())
  const [selectedWeek, setWeek] = useState(currentISOWeek)
  const [selectedMonth, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [customStart, setCustomStart] = useState(todayBogota())
  const [customEnd, setCustomEnd] = useState(todayBogota())
  const [calOpen, setCalOpen] = useState(false)
  const calRef = useRef<HTMLDivElement>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportBtnRef = useRef<HTMLDivElement>(null)

  const user = useAppSelector((s) => s.auth.user)

  const { fechaInicio, fechaFin } = useMemo(() => {
    if (periodo === 'diario') return { fechaInicio: selectedDate, fechaFin: selectedDate }
    if (periodo === 'semanal') { const r = weekToRange(selectedWeek); return { fechaInicio: r.inicio, fechaFin: r.fin } }
    if (periodo === 'mensual') { const r = monthToRange(selectedMonth); return { fechaInicio: r.inicio, fechaFin: r.fin } }
    return { fechaInicio: customStart, fechaFin: customEnd }
  }, [periodo, selectedDate, selectedWeek, selectedMonth, customStart, customEnd])

  useEffect(() => { setCalOpen(false) }, [periodo])

  useEffect(() => {
    if (!calOpen) return
    function onDown(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [calOpen])

  const { data: summary,       isFetching: s1, error: e1 } = useGetSummaryQuery({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
  const { data: topProductos,  isFetching: s3, error: e3 } = useGetTopProductosQuery({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: 10 })
  const { data: ventasPorHora, isFetching: s2, error: e2 } = useGetVentasPorHoraQuery({ fecha: fechaInicio }, { skip: periodo !== 'diario' })
  const { data: ventasPorDia,                  error: e4 } = useGetVentasPorDiaQuery({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }, { skip: periodo === 'diario' })
  const { data: salesDetail,                   error: e5 } = useGetSalesDetailQuery({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }, { skip: !exportMenuOpen && !exporting })

  // A 400 from the date-param hardening (range > 366 days, inverted range) is
  // reachable with the "personalizado" picker. Without this the user just sees
  // empty charts and no explanation. The backend's message is already in
  // Spanish and specific — show it verbatim, don't replace it with a generic.
  const queryError = useMemo(() => {
    const first = [e1, e2, e3, e4, e5].find(Boolean)
    if (!first) return null
    return reportErrorMessage(
      first,
      'No se pudo cargar el reporte. Revisa el rango de fechas e intenta de nuevo.',
    )
  }, [e1, e2, e3, e4, e5])

  const loading = s1 || s2 || s3
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
        ['Reporte de ventas — ' + (salesDetail.label ?? salesDetail.fecha)],
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
      XLSX.writeFile(wb, `ElVuelto_Ventas_${fechaInicio}_${fechaFin}.xlsx`)
    } finally {
      setExporting(false)
      setExportMenuOpen(false)
    }
  }

  async function exportHTML() {
    if (!salesDetail || !summary || !topProductos) return
    if (periodo === 'diario' && !ventasPorHora) return
    if (periodo !== 'diario' && !ventasPorDia) return
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

    type ChartPoint = { x: number; y: number; total: number; tooltip: string; xLabel: string }
    let chartTitle = 'Ventas por hora'
    let chartPoints: ChartPoint[] = []
    let chartMaxVal = 1
    let xLabelIndices: number[] = []

    if (periodo === 'diario' && ventasPorHora) {
      chartTitle = 'Ventas por hora'
      chartMaxVal = Math.max(...ventasPorHora.map(v => v.total), 1)
      chartPoints = ventasPorHora.map((v, i) => ({
        x: PAD.l + (i / 23) * chartW,
        y: PAD.t + chartH - (v.total / chartMaxVal) * chartH,
        total: v.total,
        tooltip: `${v.hora}:00 — ${cop(v.total)} | ${v.transacciones} transacciones`,
        xLabel: `${v.hora}h`,
      }))
      xLabelIndices = [0, 3, 6, 9, 12, 15, 18, 21, 23]
    } else if (ventasPorDia && ventasPorDia.length > 0) {
      chartTitle = periodo === 'semanal' ? 'Ventas por día — semana'
        : periodo === 'mensual' ? 'Ventas por día — mes'
        : 'Ventas por día — período'
      chartMaxVal = Math.max(...ventasPorDia.map(v => v.total), 1)
      const n = ventasPorDia.length
      chartPoints = ventasPorDia.map((v, i) => ({
        x: PAD.l + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2),
        y: PAD.t + chartH - (v.total / chartMaxVal) * chartH,
        total: v.total,
        tooltip: `${v.fecha} — ${cop(v.total)} | ${v.transacciones} transacciones`,
        xLabel: new Date(v.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
      }))
      const step = Math.max(1, Math.ceil(n / 10))
      xLabelIndices = chartPoints.map((_, i) => i).filter(i => i % step === 0 || i === n - 1)
    }

    const pathD = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const dots = chartPoints.filter(p => p.total > 0).map(p =>
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#6a2600" stroke="white" stroke-width="2">
        <title>${p.tooltip}</title>
      </circle>`
    ).join('')
    const xLabels = xLabelIndices.map(i => {
      const p = chartPoints[i]
      if (!p) return ''
      return `<text x="${p.x.toFixed(1)}" y="${(H - 6).toFixed(1)}" text-anchor="middle" font-size="9" fill="#888" font-family="monospace">${p.xLabel}</text>`
    }).join('')
    const ySteps = [0, 0.25, 0.5, 0.75, 1].map(f => {
      const y = PAD.t + chartH - f * chartH
      const val = f * chartMaxVal
      return `<text x="${(PAD.l - 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#888" font-family="monospace">$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(0)}</text>
<line x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${(W - PAD.r).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e8ddd0" stroke-width="1" stroke-dasharray="4,4" />`
    }).join('')

    const salesTableRows = periodo === 'diario'
      ? salesDetail.sales.map((s, i) => `
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
      : ''

    const C = 2 * Math.PI * 60
    const pctEf = summary?.porcentaje_efectivo ?? 0
    const pctNq = summary?.porcentaje_nequi ?? 0
    const efLen = (pctEf / 100) * C
    const nqLen = (pctNq / 100) * C
    const donutSvg = `<svg width="200" height="200" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="60" fill="none" stroke="#f4ede2" stroke-width="22"/>
      <circle cx="80" cy="80" r="60" fill="none" stroke="#6a2600" stroke-width="22"
        stroke-dasharray="${efLen.toFixed(2)} ${C.toFixed(2)}"
        transform="rotate(-90 80 80)"/>
      <circle cx="80" cy="80" r="60" fill="none" stroke="#8bba8a" stroke-width="22"
        stroke-dasharray="${nqLen.toFixed(2)} ${C.toFixed(2)}"
        stroke-dashoffset="${(-efLen).toFixed(2)}"
        transform="rotate(-90 80 80)"/>
      <text x="80" y="76" text-anchor="middle" font-size="20" font-weight="700" fill="#6a2600">${pctEf}%</text>
      <text x="80" y="95" text-anchor="middle" font-size="11" fill="#888">Efectivo</text>
    </svg>`

    const bottomCard = periodo === 'diario'
      ? `<div class="card">
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
  </div>`
      : `<div class="card">
    <div class="card-title">Distribución de métodos de pago</div>
    <div style="display:flex;align-items:center;gap:2rem;justify-content:center;flex-wrap:wrap;">
      ${donutSvg}
      <div style="display:flex;flex-direction:column;gap:0.75rem;font-size:0.9375rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:#6a2600;"></span>
          <span><strong>Efectivo:</strong> ${pctEf}%</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:#8bba8a;"></span>
          <span><strong>Nequi:</strong> ${pctNq}%</span>
        </div>
        <div style="font-size:0.8125rem;color:#888;margin-top:0.5rem;">${salesDetail.num_transacciones} transacciones en total</div>
      </div>
    </div>
  </div>`

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
<title>Reporte de ventas — ${salesDetail.label ?? salesDetail.fecha} — ${salesDetail.tenant_nombre}</title>
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
      <p>${salesDetail.label ?? salesDetail.fecha} · Generado ${new Date().toLocaleString('es-CO')}</p>
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
    <div class="card-title">${chartTitle}</div>
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

  ${bottomCard}

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
    a.download = `ElVuelto_Reporte_${fechaInicio}_${fechaFin}.html`
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
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0', background: 'var(--surface-container)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--outline-variant)' }}>
            {(['diario', 'semanal', 'mensual', 'personalizado'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodo(p)}
                style={{
                  padding: '0.5rem 1rem', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.8125rem',
                  background: periodo === p ? 'var(--primary)' : 'transparent',
                  color: periodo === p ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                  textTransform: 'capitalize', transition: 'background 0.15s',
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          {periodo === 'diario' && (
            <input
              type="date"
              className="ta-input"
              style={{ borderRadius: 'var(--radius-lg)', paddingLeft: '1rem', width: '10rem' }}
              value={selectedDate}
              max={todayBogota()}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
          {periodo === 'semanal' && (
            <div ref={calRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="ta-btn ta-btn-secondary"
                onClick={() => setCalOpen((o) => !o)}
                style={{ minWidth: '180px', justifyContent: 'flex-start' }}
              >
                <CalendarTodayOutlinedIcon style={{ fontSize: '1rem' }} />
                {periodoLabel('semanal', fechaInicio, fechaFin)}
              </button>
              {calOpen && (
                <WeekCalendar
                  value={selectedWeek}
                  onChange={(w) => { setWeek(w); setCalOpen(false) }}
                  onClose={() => setCalOpen(false)}
                />
              )}
            </div>
          )}
          {periodo === 'mensual' && (
            <div ref={calRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="ta-btn ta-btn-secondary"
                onClick={() => setCalOpen((o) => !o)}
                style={{ minWidth: '160px', justifyContent: 'flex-start' }}
              >
                <CalendarTodayOutlinedIcon style={{ fontSize: '1rem' }} />
                {periodoLabel('mensual', fechaInicio, fechaFin)}
              </button>
              {calOpen && (
                <MonthCalendar
                  value={selectedMonth}
                  onChange={(m) => { setMonth(m); setCalOpen(false) }}
                  onClose={() => setCalOpen(false)}
                />
              )}
            </div>
          )}
          {periodo === 'personalizado' && (
            <div ref={calRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="ta-btn ta-btn-secondary"
                onClick={() => setCalOpen((o) => !o)}
                style={{ minWidth: '220px', justifyContent: 'flex-start' }}
              >
                <CalendarTodayOutlinedIcon style={{ fontSize: '1rem' }} />
                {customStart === customEnd
                  ? new Date(customStart + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                  : `${new Date(customStart + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} — ${new Date(customEnd + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}`}
              </button>
              {calOpen && (
                <DateRangeCalendar
                  startDate={customStart}
                  endDate={customEnd}
                  onChange={(s, e) => { setCustomStart(s); setCustomEnd(e); setCalOpen(false) }}
                  onClose={() => setCalOpen(false)}
                />
              )}
            </div>
          )}
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

      <p className="ta-page-sub" style={{ marginTop: '-0.5rem' }}>
        {periodoLabel(periodo, fechaInicio, fechaFin)}
      </p>

      {queryError && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            background: 'var(--error-container)',
            color: 'var(--on-error-container)',
          }}
        >
          {queryError}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Spinner />
        </div>
      )}

      {!loading && (
        <>
          {/* ── KPI cards ── */}
          <div className="ta-kpi-grid">
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Period chart */}
            <div className="ta-card-low">
              <div className="ta-card-header">
                <h3 className="ta-card-title">
                  {periodo === 'diario' ? 'Ventas por hora'
                    : periodo === 'semanal' ? 'Ventas por día — semana'
                    : periodo === 'mensual' ? 'Ventas por día — mes'
                    : 'Ventas por día — período'}
                </h3>
                {periodo === 'diario' && (
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700,
                    background: 'var(--surface-container-lowest)',
                    padding: '0.25rem 0.75rem', borderRadius: '9999px',
                    color: 'var(--on-surface-variant)',
                  }}>En vivo</span>
                )}
              </div>
              {(() => {
                const hasSalesHora = ventasPorHora?.some(v => v.total > 0) ?? false
                const hasSalesDia = ventasPorDia?.some(v => v.total > 0) ?? false
                const hasSales = periodo === 'diario' ? hasSalesHora : hasSalesDia

                if (!hasSales) {
                  return (
                    <div style={{ height: '12rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>Sin ventas para el período seleccionado</p>
                    </div>
                  )
                }

                if (periodo === 'diario') {
                  return (
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
                  )
                }

                if (periodo === 'semanal') {
                  return (
                    <div style={{ width: '100%', height: '12rem' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ventasPorDia} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke="var(--outline-variant)" strokeDasharray="4 4" />
                          <XAxis
                            dataKey="fecha"
                            tickFormatter={(fecha: string) => new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short' })}
                            tick={{ fontSize: 10, fill: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}
                            axisLine={false} tickLine={false}
                          />
                          <YAxis
                            tickFormatter={(v: number) => v === 0 ? '' : `$${(v / 1000).toFixed(0)}k`}
                            tick={{ fontSize: 10, fill: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}
                            axisLine={false} tickLine={false} width={40}
                          />
                          <Tooltip content={<DayTooltip />} cursor={{ fill: 'var(--surface-container)' }} />
                          <Bar dataKey="total" fill="var(--primary-container)" stroke="var(--primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )
                }

                return (
                  <div style={{ width: '100%', height: '12rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ventasPorDia} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--outline-variant)" strokeDasharray="4 4" />
                        <XAxis
                          dataKey="fecha"
                          tickFormatter={(fecha: string) => new Date(fecha + 'T12:00:00').getDate().toString()}
                          tick={{ fontSize: 10, fill: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}
                          axisLine={false} tickLine={false} interval={1}
                        />
                        <YAxis
                          tickFormatter={(v: number) => v === 0 ? '' : `$${(v / 1000).toFixed(0)}k`}
                          tick={{ fontSize: 10, fill: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}
                          axisLine={false} tickLine={false} width={40}
                        />
                        <Tooltip content={<DayTooltip />} cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Line
                          type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2.5}
                          dot={(props) => {
                            const { cx, cy, payload } = props as { cx: number; cy: number; payload: VentasPorDiaItem }
                            if (payload.total === 0) return <g key={`dot-${payload.fecha}`} />
                            return <circle key={`dot-${payload.fecha}`} cx={cx} cy={cy} r={4} fill="var(--primary)" stroke="var(--surface)" strokeWidth={2} />
                          }}
                          activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--surface)', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
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
