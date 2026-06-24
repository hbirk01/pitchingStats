import React, { useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, ReferenceLine,
} from 'recharts'

const SEASON_COLORS = { 2026: '#a78bfa', 2025: '#fb923c', 2024: '#60a5fa', 2023: '#34d399', 2022: '#f472b6', 2021: '#fbbf24' }

const METRICS = [
  { key: 'k_pct',       label: 'K%',          fmt: v => `${v?.toFixed(1)}%`,  good: 'high' },
  { key: 'bb_pct',      label: 'BB%',          fmt: v => `${v?.toFixed(1)}%`,  good: 'low'  },
  { key: 'whiff_pct',   label: 'Whiff%',       fmt: v => `${v?.toFixed(1)}%`,  good: 'high' },
  { key: 'avg_velo',    label: 'Avg Velo',     fmt: v => `${v?.toFixed(1)} mph`, good: 'high' },
  { key: 'avg_vaa',     label: 'VAA°',         fmt: v => v?.toFixed(2),         good: 'neutral' },
  { key: 'avg_spin_eff',label: 'Spin Eff%',    fmt: v => `${v?.toFixed(1)}%`,   good: 'high' },
  { key: 'xba',         label: 'xBA',          fmt: v => v?.toFixed(3),          good: 'low'  },
  { key: 'xwoba',       label: 'xwOBA',        fmt: v => v?.toFixed(3),          good: 'low'  },
  { key: 'rv_per_100',  label: 'RV/100',       fmt: v => v?.toFixed(2),          good: 'low'  },
]

const TREND_METRICS = [
  { key: 'avg_velo',  label: 'Avg Velo (mph)', stroke: '#60a5fa' },
  { key: 'k_pct',    label: 'K%',              stroke: '#34d399' },
  { key: 'whiff_pct',label: 'Whiff%',           stroke: '#f472b6' },
  { key: 'rv_per_100',label: 'RV/100',          stroke: '#fbbf24' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-800 border border-surface-500 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-1 font-semibold">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-slate-200 font-mono">{p.value?.toFixed?.(2) ?? p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function SeasonComparePanel({ data, playerName }) {
  const [view, setView] = useState('table')

  if (!data || Object.keys(data).length === 0) {
    return <div className="text-slate-600 text-sm text-center py-8">No multi-season data available.</div>
  }

  const seasons = Object.keys(data).sort((a, b) => Number(b) - Number(a))

  // Grouped bar data — one entry per metric
  const barData = METRICS.map(m => {
    const entry = { metric: m.label }
    seasons.forEach(s => { entry[s] = data[s]?.[m.key] })
    return entry
  })

  // Trend data — one entry per season (sorted asc for line chart)
  const trendData = [...seasons].reverse().map(s => ({ season: s, ...data[s] }))

  // Summary table delta helpers
  const base = data[seasons[seasons.length - 1]]  // oldest as base
  const curr = data[seasons[0]]  // newest

  return (
    <div>
      {/* View toggle */}
      <div className="flex gap-1 mb-5 bg-surface-700 rounded-lg p-1 w-fit">
        {[['table', 'Summary Table'], ['trend', 'Trend Lines'], ['bar', 'Bar Compare'], ['velo', 'Velo by Pitch']].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === k ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {l}
          </button>
        ))}
      </div>

      {view === 'table' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-600">
                  <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Metric</th>
                  {seasons.map(s => (
                    <th key={s} className="py-2 px-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: SEASON_COLORS[Number(s)] || '#94a3b8' }}>{s}</th>
                  ))}
                  {seasons.length >= 2 && <th className="py-2 px-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Δ {seasons[0]}v{seasons[seasons.length-1]}</th>}
                </tr>
              </thead>
              <tbody>
                {METRICS.map(m => {
                  const delta = curr?.[m.key] != null && base?.[m.key] != null ? curr[m.key] - base[m.key] : null
                  const deltaGood = m.good === 'high' ? delta > 0 : m.good === 'low' ? delta < 0 : null
                  return (
                    <tr key={m.key} className="border-b border-surface-700">
                      <td className="py-2.5 px-3 text-slate-400 font-medium">{m.label}</td>
                      {seasons.map(s => (
                        <td key={s} className="py-2.5 px-3 text-right font-mono text-slate-200">
                          {data[s]?.[m.key] != null ? m.fmt(data[s][m.key]) : '—'}
                        </td>
                      ))}
                      {seasons.length >= 2 && (
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {delta != null ? (
                            <span className={deltaGood === true ? 'text-emerald-400' : deltaGood === false ? 'text-red-400' : 'text-slate-400'}>
                              {delta > 0 ? '+' : ''}{m.fmt(delta)}
                            </span>
                          ) : '—'}
                        </td>
                      )}
                    </tr>
                  )
                })}
                <tr className="border-b border-surface-700 bg-surface-700/30">
                  <td className="py-2.5 px-3 text-slate-500 text-xs">IP</td>
                  {seasons.map(s => <td key={s} className="py-2.5 px-3 text-right font-mono text-slate-500 text-xs">{data[s]?.ip ?? '—'}</td>)}
                  {seasons.length >= 2 && <td />}
                </tr>
                <tr className="border-b border-surface-700 bg-surface-700/30">
                  <td className="py-2.5 px-3 text-slate-500 text-xs">Pitches</td>
                  {seasons.map(s => <td key={s} className="py-2.5 px-3 text-right font-mono text-slate-500 text-xs">{data[s]?.total_pitches?.toLocaleString() ?? '—'}</td>)}
                  {seasons.length >= 2 && <td />}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'trend' && (
        <div className="space-y-4">
          {TREND_METRICS.map(m => (
            <div key={m.key} className="card">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">{m.label} by Season</h3>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={trendData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                  <XAxis dataKey="season" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey={m.key} name={m.label} stroke={m.stroke} strokeWidth={2.5} dot={{ r: 5, fill: m.stroke }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {view === 'bar' && (
        <div className="space-y-4">
          {[
            { metrics: ['k_pct', 'bb_pct', 'whiff_pct'], title: 'Rate Stats by Season' },
            { metrics: ['xba', 'xwoba'], title: 'Expected Stats by Season' },
            { metrics: ['avg_velo', 'avg_spin_eff'], title: 'Stuff by Season' },
          ].map(group => (
            <div key={group.title} className="card">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">{group.title}</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={group.metrics.map(mk => {
                    const m = METRICS.find(x => x.key === mk)
                    const entry = { metric: m?.label || mk }
                    seasons.forEach(s => { entry[s] = data[s]?.[mk] })
                    return entry
                  })}
                  margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                >
                  <XAxis dataKey="metric" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {seasons.map(s => (
                    <Bar key={s} dataKey={s} name={s} fill={SEASON_COLORS[Number(s)] || '#94a3b8'} radius={[3, 3, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {view === 'velo' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-4">Velocity by Pitch Type — Season Over Season</h3>
          {(() => {
            // Collect all pitch types across all seasons
            const allTypes = [...new Set(seasons.flatMap(s => Object.keys(data[s]?.velo_by_type || {})))]
            const chartData = allTypes.map(pt => {
              const row = { pitch_type: pt }
              seasons.forEach(s => { row[s] = data[s]?.velo_by_type?.[pt] })
              return row
            })
            return (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <XAxis dataKey="pitch_type" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} formatter={(v) => `${v?.toFixed(1)} mph`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {seasons.map(s => (
                    <Bar key={s} dataKey={s} name={s} fill={SEASON_COLORS[Number(s)] || '#94a3b8'} radius={[3, 3, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )
          })()}
        </div>
      )}
    </div>
  )
}
