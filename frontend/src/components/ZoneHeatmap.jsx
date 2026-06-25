import React, { useState } from 'react'

const METRICS = [
  { key: 'whiff_pct', label: 'Whiff%', fmt: (v) => `${v?.toFixed(1)}%`, good: 'high' },
  { key: 'xba', label: 'xBA', fmt: (v) => v?.toFixed(3), good: 'low' },
  { key: 'rv_per_100', label: 'RV/100', fmt: (v) => v?.toFixed(2), good: 'low' },
]

// Color interpolation: green (good) → gray → red (bad)
function cellColor(val, min, max, goodHigh) {
  if (val == null || max === min) return 'rgba(30,33,60,0.85)'
  const t = (val - min) / (max - min) // 0 = min, 1 = max
  const score = goodHigh ? t : 1 - t // 1 = good
  if (score > 0.65) return `rgba(52,211,153,${0.2 + score * 0.5})`   // green
  if (score < 0.35) return `rgba(239,68,68,${0.2 + (1 - score) * 0.5})`  // red
  return 'rgba(100,100,120,0.3)'
}

export default function ZoneHeatmap({ heatmap }) {
  const [metric, setMetric] = useState('whiff_pct')
  const [pitchType, setPitchType] = useState('ALL')

  if (!heatmap || Object.keys(heatmap).length === 0) {
    return <div className="text-slate-600 text-sm">No zone data available.</div>
  }

  const pitchTypes = Object.keys(heatmap)
  const cells = heatmap[pitchType] || heatmap[pitchTypes[0]] || []
  const metricDef = METRICS.find(m => m.key === metric)

  const vals = cells.map(c => c[metric]).filter(v => v != null)
  const min = Math.min(...vals)
  const max = Math.max(...vals)

  // cells are indexed xi=0..4 (left→right), zi=0..4 (bottom→top)
  // render as 5 rows from top (zi=4) to bottom (zi=0)
  const grid = Array.from({ length: 5 }, (_, rowIdx) => {
    const zi = 4 - rowIdx  // top row first
    return Array.from({ length: 5 }, (_, xi) =>
      cells.find(c => c.xi === xi && c.zi === zi) || { xi, zi, n: 0 }
    )
  })

  return (
    <div>
      {/* Controls */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-surface-700 rounded-lg p-1">
          {METRICS.map(m => (
            <button key={m.key} onClick={() => setMetric(m.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${metric === m.key ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-surface-700 rounded-lg p-1 flex-wrap">
          {pitchTypes.map(pt => (
            <button key={pt} onClick={() => setPitchType(pt)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${pitchType === pt ? 'bg-surface-500 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
              {pt}
            </button>
          ))}
        </div>
      </div>

      {/* Strike zone grid */}
      <div className="flex gap-6 items-start">
        <div className="flex-1">
          {/* Zone label */}
          <div className="text-center text-xs text-slate-600 mb-1">← Left Handed Batter POV →</div>
          <div className="relative border-2 border-slate-500 rounded-sm" style={{ maxWidth: 280, margin: '0 auto' }}>
            {/* Strike zone outline inner box — approximate */}
            <div className="absolute inset-[16%] border border-slate-400/40 pointer-events-none rounded-sm z-10" />
            {grid.map((row, rowIdx) => (
              <div key={rowIdx} className="flex">
                {row.map((cell) => {
                  const val = cell[metric]
                  const bg = cellColor(val, min, max, metricDef?.good === 'high')
                  return (
                    <div
                      key={`${cell.xi}-${cell.zi}`}
                      className="flex-1 aspect-square flex flex-col items-center justify-center text-center relative group"
                      style={{ background: bg, minHeight: 44 }}
                    >
                      <div className="text-xs font-bold text-white drop-shadow">
                        {val != null ? metricDef?.fmt(val) : cell.n > 0 ? '—' : ''}
                      </div>
                      <div className="text-[9px] text-slate-400">{cell.n > 0 ? `n=${cell.n}` : ''}</div>
                      {/* Tooltip */}
                      {cell.n > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-surface-800 border border-surface-500 rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none shadow-lg">
                          Whiff: {cell.whiff_pct?.toFixed(1) ?? '—'}% · xBA: {cell.xba?.toFixed(3) ?? '—'} · RV/100: {cell.rv_per_100?.toFixed(2) ?? '—'}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="text-center text-xs text-slate-600 mt-2">Bottom of Zone ↑ Top of Zone</div>
        </div>

        {/* Legend + cell count table */}
        <div className="text-xs text-slate-500 space-y-2 min-w-32">
          <div className="font-semibold text-slate-400 mb-2">{metricDef?.label} Scale</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emerald-400/60 inline-block" /> High (good)</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-slate-500/30 inline-block" /> Average</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-red-400/60 inline-block" /> Low (bad)</div>
          <div className="mt-4 text-slate-600">
            <div>Total pitches: {cells.reduce((s, c) => s + (c.n || 0), 0)}</div>
            <div className="mt-1">Hover a cell for full detail</div>
          </div>
        </div>
      </div>
    </div>
  )
}
