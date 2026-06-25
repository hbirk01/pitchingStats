import React from 'react'
import clsx from 'clsx'

const colorMap = {
  good:    'stat-great',
  elite:   'stat-elite',
  bad:     'stat-bad',
  below:   'stat-below',
  warn:    'stat-below',
  cyan:    'text-cyan-400',
  brand:   'text-brand-400',
  amber:   'text-amber-400',
  default: 'text-ink-50',
}

export default function StatCard({ label, value, sub, highlight, trend, icon: Icon, className, onClick }) {
  const valClass = colorMap[highlight] ?? (highlight ? 'text-brand-400' : 'text-ink-50')

  return (
    <div
      onClick={onClick}
      className={clsx(
        'shine relative flex flex-col rounded-2xl p-4 border transition-all duration-200 shadow-card',
        'bg-gradient-to-b from-surface-800 to-surface-850 border-surface-650/80',
        onClick && 'cursor-pointer hover:border-brand-500/50 hover:shadow-card-hover hover:-translate-y-0.5',
        !onClick && 'hover:border-surface-600',
        className
      )}>

      {/* Label row */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-500 font-display leading-none">{label}</span>
        {Icon && (
          <div className="w-6 h-6 rounded-lg bg-surface-700/80 border border-surface-600/50 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-ink-500" strokeWidth={2} />
          </div>
        )}
      </div>

      {/* Main value */}
      <div className={clsx('font-display text-[30px] font-bold leading-none tracking-tight count-up', valClass)}>
        {value ?? '—'}
      </div>

      {/* Sub / trend row */}
      {(sub || trend != null) && (
        <div className="flex items-center gap-2 mt-2.5">
          {sub && <span className="text-[11px] text-ink-500 leading-none font-medium">{sub}</span>}
          {trend != null && (
            <span className={clsx(
              'ml-auto text-[11px] font-bold font-mono px-1.5 py-0.5 rounded',
              trend > 0 ? 'text-good-400 bg-good-400/10' : trend < 0 ? 'text-bad-400 bg-bad-400/10' : 'text-ink-600'
            )}>
              {trend > 0 ? '▲' : trend < 0 ? '▼' : '—'} {Math.abs(trend)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
