import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, BarChart, Bar,
} from 'recharts'

const PITCH_COLORS = {
  FF: '#ef4444', SI: '#f97316', FC: '#f59e0b', SL: '#3b82f6',
  CU: '#8b5cf6', CH: '#10b981', FS: '#06b6d4', OTHER: '#94a3b8',
}
const pitchColor = pt => PITCH_COLORS[pt] || PITCH_COLORS.OTHER

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-800 border border-surface-500 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-slate-400 mb-1 font-semibold">Pitch #{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono text-slate-200">{p.value?.toFixed?.(1) ?? p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function FatiguePanel({ data }) {
  if (!data || !data.bins?.length) return <div className="text-slate-600 text-sm text-center py-8">No fatigue data — requires starter with 60+ pitch games.</div>

  const { bins, per_type } = data

  // Check if there's meaningful variance to show
  const velos = bins.map(b => b.avg_velo).filter(Boolean)
  const hasFatigue = velos.length >= 3

  const baseVelo = bins[0]?.avg_velo

  return (
    <div className="space-y-4">
      {/* Overall velo + whiff% across pitch count */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-400 mb-1">Velocity & Whiff% by Pitch Count</h3>
        <p className="text-xs text-slate-600 mb-3">How does stuff change as pitch count increases within games?</p>
        {!hasFatigue ? (
          <div className="text-slate-600 text-xs text-center py-6">Insufficient data — pitcher may primarily be a reliever (fewer than 40 pitch appearances).</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={bins} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <XAxis dataKey="bin" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis yAxisId="velo" domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis yAxisId="whiff" orientation="right" tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="velo" type="monotone" dataKey="avg_velo" name="Velo (mph)" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line yAxisId="whiff" type="monotone" dataKey="whiff_pct" name="Whiff%" stroke="#34d399" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Command degradation */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-400 mb-1">Command (Location σ) by Pitch Count</h3>
        <p className="text-xs text-slate-600 mb-3">Std deviation of plate_x and plate_z — higher = less consistent location.</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={bins} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
            <XAxis dataKey="bin" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="cmd_x_std" name="Horiz σ" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="cmd_z_std" name="Vert σ" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Per-pitch-type velo fade */}
      {Object.keys(per_type || {}).length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Velocity by Pitch Type & Count</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <XAxis dataKey="bin" allowDuplicatedCategory={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {Object.entries(per_type).map(([pt, ptBins]) => (
                <Line key={pt} data={ptBins} type="monotone" dataKey="avg_velo" name={`${pt} Velo`}
                  stroke={pitchColor(pt)} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary table */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Fatigue Summary</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-600">
              {['Pitch #', 'Pitches', 'Velo', 'Δ Velo', 'Spin', 'Whiff%'].map(h => (
                <th key={h} className="py-2 px-3 text-right first:text-left text-xs text-slate-500 font-semibold uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bins.map(b => {
              const delta = baseVelo && b.avg_velo ? b.avg_velo - baseVelo : null
              return (
                <tr key={b.bin} className="border-b border-surface-700">
                  <td className="py-2 px-3 text-slate-400 font-medium text-xs">{b.bin}</td>
                  <td className="py-2 px-3 text-right font-mono text-xs text-slate-500">{b.n}</td>
                  <td className="py-2 px-3 text-right font-mono text-xs text-slate-300">{b.avg_velo ?? '—'}</td>
                  <td className="py-2 px-3 text-right font-mono text-xs font-bold">
                    {delta != null ? (
                      <span className={delta > 0.3 ? 'text-emerald-400' : delta < -0.8 ? 'text-red-400' : 'text-slate-500'}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-xs text-slate-500">{b.avg_spin?.toLocaleString() ?? '—'}</td>
                  <td className="py-2 px-3 text-right font-mono text-xs text-slate-300">{b.whiff_pct != null ? `${b.whiff_pct}%` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {baseVelo && (
          <div className="text-xs text-slate-600 mt-2">
            Δ Velo vs pitches 1–20 ({baseVelo} mph baseline) · Red = &gt;0.8 mph drop
          </div>
        )}
      </div>
    </div>
  )
}
