import { createContext, useContext, useEffect, useState } from 'react'

const COLLAPSE_AT = 1450

interface LayoutContextValue {
  /** Desktop: sidebar shows icons + labels (false) or icons only (true) */
  collapsed: boolean
  /** Effective collapsed state — always false when mobile drawer is open */
  isCollapsed: boolean
  /** Mobile: sidebar drawer is visible */
  mobileOpen: boolean
  toggleCollapsed: () => void
  toggleMobile: () => void
  closeMobile: () => void
}

const LayoutContext = createContext<LayoutContextValue | null>(null)

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < COLLAPSE_AT)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${COLLAPSE_AT - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setCollapsed(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <LayoutContext.Provider
      value={{
        collapsed,
        isCollapsed: mobileOpen ? false : collapsed,
        mobileOpen,
        toggleCollapsed: () => setCollapsed((c) => !c),
        toggleMobile: () => setMobileOpen((o) => !o),
        closeMobile: () => setMobileOpen(false),
      }}
    >
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayout() {
  const ctx = useContext(LayoutContext)
  if (!ctx) throw new Error('useLayout must be used inside LayoutProvider')
  return ctx
}
