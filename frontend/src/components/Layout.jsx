import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Activity, BarChart2, Home, GitCompareArrows, Menu, X } from 'lucide-react'

const navLinks = [
  { to: '/',            label: 'Home',        icon: Home },
  { to: '/leaderboard', label: 'Leaderboard', icon: BarChart2 },
  { to: '/compare',     label: 'Compare',     icon: GitCompareArrows },
]

export default function Layout({ children }) {
  const loc = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setMobileOpen(false), [loc.pathname])

  return (
    <div className="min-h-screen bg-surface-900 font-sans">
      {/* ── Nav ── */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-surface-900/95 backdrop-blur-2xl shadow-[0_1px_0_0_rgba(39,43,72,0.9)]'
          : 'bg-surface-900/75 backdrop-blur-xl'
      }`}>
        {/* Gradient accent line */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-brand-500/70 to-transparent" />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[62px] flex items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-[11px] flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-all duration-300 group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #7c77ff 0%, #5649e8 60%, #3a2fc8 100%)' }}>
              <Activity className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-[19px] font-bold tracking-tight">
              <span className="text-ink-50">Pitch</span>
              <span style={{ background: 'linear-gradient(135deg, #8b85ff, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>IQ</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-0.5 flex-1">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const active = to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to)
              return (
                <Link key={to} to={to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-brand-600/15 text-brand-300 shadow-[inset_0_0_0_1px_rgba(110,102,248,0.32)]'
                      : 'text-ink-500 hover:text-ink-200 hover:bg-surface-750'
                  }`}>
                  <Icon className="w-[15px] h-[15px]" strokeWidth={active ? 2.5 : 2} />
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Live badge */}
          <div className="hidden sm:flex items-center gap-2 shrink-0 bg-surface-800 border border-surface-650/70 rounded-full px-3 py-1.5">
            <span className="dot-live" />
            <span className="text-[11px] font-semibold text-ink-500 font-display">2025 Season</span>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(v => !v)}
            className="sm:hidden btn-icon">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-40 flex" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative ml-auto w-64 h-full bg-surface-850 border-l border-surface-700 p-5 animate-slide-down shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <span className="font-display font-bold text-ink-100 text-base">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="btn-icon">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="space-y-1">
              {navLinks.map(({ to, label, icon: Icon }) => {
                const active = to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to)
                return (
                  <Link key={to} to={to}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                      active ? 'bg-brand-600/20 text-brand-300' : 'text-ink-400 hover:text-ink-200 hover:bg-surface-750'
                    }`}>
                    <Icon className="w-4 h-4" /> {label}
                  </Link>
                )
              })}
            </nav>
            <div className="mt-6 pt-5 border-t border-surface-700">
              <div className="flex items-center gap-2">
                <span className="dot-live" />
                <span className="text-xs text-ink-500 font-semibold">2025 Season Live</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-8 animate-fade-in">
        {children}
      </main>
    </div>
  )
}
