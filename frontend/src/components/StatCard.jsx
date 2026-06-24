import React from 'react'
import clsx from 'clsx'

export default function StatCard({ label, value, sub, highlight, className }) {
  return (
    <div className={clsx('card flex flex-col gap-1', className)}>
      <div className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1">{label}</div>
      <div className={clsx('text-2xl font-bold font-mono', highlight ? 'text-brand-400' : 'text-slate-100')}>
        {value ?? '—'}
      </div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  )
}
