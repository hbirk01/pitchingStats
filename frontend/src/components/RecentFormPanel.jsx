import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const WINDOWS = [
  { key: 'L7',     label: 'Last 7 Days' },
  { key: 'L14',    label: 'Last 14 Days' },
  { key: 'L30',    label: 'Last 30 Days' },
  { key: 'season', label: 'Full Season' },
]

const ROWS = [
  { key: 'games',     label: 'G',        fmt: v => v, good: null },
  { key: 'ip',        label: 'IP',       fmt: v => v?.toFixed(1), good: null },
  { key: 'k_pct',    label: 'K%',       fmt: v => `${v?.toFixed(1)}%`, good: 'high' },
  { key: 'bb_pct',   label: 'BB%',      fmt: v => `${v?.toFixed(1)}%`, good: 'low' },
  { key: 'hr',       label: 'HR',       fmt: v => v, good: 'low' },
  { key: 'whiff_pct',label: 'Whiff%',   fmt: v => `${v?.toFixed(1)}%`, good: 'high' },
  { key: 'avg_velo', label: 'Velo',     fmt: v => `${v?.toFixed(1)}`, good: 'high' },
  { key: 'xba',      label: 'xBA',      fmt: v => v?.toFixed(3), good: 'low' },
]

function trend(recent, season, key, good) {
  if (!recent || !season || recent[key] == null || season[key] == null) return null
  const diff = recent[key] - season[key]
  if (Math.abs(diff) < 0.01) return 'neutral'
  if (good === 'high') return diff > 0 ? 'up' : 'down'
  if (good === 'low')  return diff < 0 ? 'up' : 'down'
  return 'neutral'
}

const TrendIcon = ({ dir }) => {
  if (dir === 'up')   return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
  if (dir === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />
  return <Minus className="w-3.5 h-3.5 text-slate-600" />
}

export default function RecentFormPanel({ data }) {
  if (!data) return <div className="text-slate-600 text-sm text-center py-8">Loading recent form…</div>

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300">Recent Form</h3>
        <span className="text-xs text-slate-600">As of {data.latest_date}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-600">
              <th className="py-2 pr-4 text-left text-xs font-semibold text-slate-500 uppercase">Metric</th>
              {WINDOWS.map(w => (
                <th key={w.key} className={`py-2 px-3 text-right text-xs font-semibold uppercase ${w.key === 'season' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {w.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(row => (
              <tr key={row.key} className="border-b border-surface-700">
                <td className="py-2 pr-4 text-slate-500 text-xs font-medium">{row.label}</td>
                {WINDOWS.map(w => {
                  const val = data[w.key]?.[row.key]
                  const dir = w.key !== 'season' ? trend(data[w.key], data.season, row.key, row.good) : null
                  return (
                    <td key={w.key} className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {dir && <TrendIcon dir={dir} />}
                        <span className={`font-mono text-xs ${
                          dir === 'up' ? 'text-emerald-400' :
                          dir === 'down' ? 'text-red-400' :
                          w.key === 'season' ? 'text-slate-500' : 'text-slate-300'
                        }`}>
                          {val != null ? row.fmt(val) : '—'}
                        </span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-slate-600 mt-2">↑ = trending better vs season avg &nbsp;·&nbsp; ↓ = trending worse</div>
    </div>
  )
}
