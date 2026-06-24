import React from 'react'

const rvColor = (rv100) => {
  if (rv100 == null) return 'text-slate-500'
  if (rv100 < -1.5) return 'text-emerald-400'
  if (rv100 < -0.5) return 'text-blue-400'
  if (rv100 > 1.5) return 'text-red-400'
  if (rv100 > 0.5) return 'text-orange-400'
  return 'text-slate-300'
}

const rvBar = (rv100, absMax) => {
  if (rv100 == null || absMax === 0) return null
  const pct = Math.min(Math.abs(rv100) / absMax, 1) * 100
  const color = rv100 < 0 ? '#34d399' : '#f87171'
  return { pct, color, left: rv100 < 0 }
}

export default function PitchRunValuePanel({ pitchRunValue, releaseConsistency }) {
  if (!pitchRunValue || Object.keys(pitchRunValue).length === 0) {
    return <div className="text-slate-600 text-sm">No run value data available.</div>
  }

  const entries = Object.entries(pitchRunValue).sort((a, b) => (a[1].rv_per_100 ?? 0) - (b[1].rv_per_100 ?? 0))
  const absMax = Math.max(...entries.map(([, d]) => Math.abs(d.rv_per_100 ?? 0)))

  return (
    <div className="space-y-6">
      {/* Run value table */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 mb-1">Pitch Run Value</h3>
        <p className="text-xs text-slate-600 mb-4">
          Run value per 100 pitches vs. average pitcher — negative means the pitch saves runs (good). Source: Statcast <code className="bg-surface-700 px-1 rounded">delta_run_exp</code>.
        </p>
        <div className="space-y-3">
          {entries.map(([pt, d]) => {
            const bar = rvBar(d.rv_per_100, absMax)
            return (
              <div key={pt}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 text-sm w-8">{pt}</span>
                    <span className="text-xs text-slate-500">{d.pitches?.toLocaleString()} pitches</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-slate-500">Total RV: <span className={rvColor(d.total_rv)}>{d.total_rv != null ? (d.total_rv > 0 ? '+' : '') + d.total_rv.toFixed(1) : '—'}</span></span>
                    <span className={`font-bold text-sm ${rvColor(d.rv_per_100)}`}>
                      {d.rv_per_100 != null ? (d.rv_per_100 > 0 ? '+' : '') + d.rv_per_100.toFixed(2) : '—'} RV/100
                    </span>
                  </div>
                </div>
                {/* Bar */}
                <div className="relative h-2 bg-surface-700 rounded-full overflow-hidden">
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-surface-500" />
                  {bar && (
                    <div
                      className="absolute top-0 bottom-0 rounded-full"
                      style={{
                        width: `${bar.pct / 2}%`,
                        background: bar.color,
                        [bar.left ? 'right' : 'left']: '50%',
                      }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-[10px] text-slate-600 mt-2 px-1">
          <span>← Better (saves runs)</span>
          <span>Average</span>
          <span>Worse (allows runs) →</span>
        </div>
      </div>

      {/* Release consistency */}
      {releaseConsistency && Object.keys(releaseConsistency).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-1">Release Point Consistency</h3>
          <p className="text-xs text-slate-600 mb-4">
            Std deviation of release position (ft). Tighter = more deceptive tunneling. Extension = how far toward plate at release.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-600">
                  {['Pitch', 'Horiz σ (ft)', 'Vert σ (ft)', 'Extension (ft)'].map(h => (
                    <th key={h} className="py-2 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(releaseConsistency).map(([pt, d]) => (
                  <tr key={pt} className="border-b border-surface-700">
                    <td className="py-2 px-3 font-semibold text-slate-200">{pt}</td>
                    <td className="py-2 px-3 font-mono">
                      <span className={d.x_std < 0.05 ? 'text-emerald-400' : d.x_std > 0.10 ? 'text-red-400' : 'text-slate-300'}>
                        {d.x_std?.toFixed(3) ?? '—'}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono">
                      <span className={d.z_std < 0.05 ? 'text-emerald-400' : d.z_std > 0.10 ? 'text-red-400' : 'text-slate-300'}>
                        {d.z_std?.toFixed(3) ?? '—'}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-300">{d.extension_avg?.toFixed(2) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-slate-600 mt-2">Green = σ &lt; 0.05 ft (very consistent) · Red = σ &gt; 0.10 ft (inconsistent)</div>
        </div>
      )}
    </div>
  )
}
