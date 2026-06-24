import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Activity, BarChart2, Home, GitCompareArrows } from 'lucide-react'

const navLinks = [
  { to: '/', label: 'Search', icon: Home },
  { to: '/leaderboard', label: 'Leaderboard', icon: BarChart2 },
  { to: '/compare', label: 'Compare', icon: GitCompareArrows },
]

export default function Layout({ children }) {
  const loc = useLocation()

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100 font-sans">
      {/* Nav */}
      <nav className="border-b border-surface-600 bg-surface-800/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Pitch<span className="text-brand-400">IQ</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  loc.pathname === to
                    ? 'bg-brand-600/20 text-brand-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
