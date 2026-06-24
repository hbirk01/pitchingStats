import React, { useState } from 'react'

const ROWS = [
  { key: 'pitches',   label: 'Pitches',  fmt: v => v?.toLocaleString() },
  { key: 'k_pct',    label: 'K%',       fmt: v => v != null ? `${v}%` : '—' },
  { key: 'bb_pct',   label: 'BB%',      fmt: v => v != null ? `${v}%` : '—' },
  { key: 'whiff_pct',label: 'Whiff%',   fmt: v => v != null ? `${v}%` : '—' },
  { key: 'xba',      label: 'xBA',      fmt: v => v?.toFixed(3) },
  { key: 'rv_per_100',label: 'RV/100',  fmt: v => v?.toFixed(2) },
]

function SplitTable({ left, right, leftLabel, rightLabel, highlight }) {
  if (!left && !right) return <div className="text-slate-600 text-xs text-center py-4">No data</div>
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-surface-600">
          <th className="py-2 px-3 text-left text-xs text-slate-500 font-semibold uppercase">Metric</th>
          <th className="py-2 px-3 text-right text-xs text-slate-500 font-semibold uppercase">{leftLabel}</th>
          <th className="py-2 px-3 text-right text-xs text-slate-500 font-semibold uppercase">{rightLabel}</th>
          <th className="py-2 px-3 text-right text-xs text-slate-500 font-semibold uppercase">Diff</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map(row => {
          const lv = left?.[row.key]
          const rv = right?.[row.key]
          const diff = lv != null && rv != null ? rv - lv : null
          // For K%/whiff%, higher right is better; for BB%/xba/rv_per_100, lower right is better
          const goodDir = ['k_pct','whiff_pct'].includes(row.key) ? 'high' : ['bb_pct','xba','rv_per_100'].includes(row.key) ? 'low' : null
          const diffColor = diff == null ? '' : goodDir === 'high' ? (diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-500') : goodDir === 'low' ? (diff < 0 ? 'text-emerald-400' : diff > 0 ? 'text-red-400' : 'text-slate-500') : 'text-slate-500'
          return (
            <tr key={row.key} className="border-b border-surface-700">
              <td className="py-2 px-3 text-slate-400 text-xs font-medium">{row.label}</td>
              <td className="py-2 px-3 text-right font-mono text-xs text-slate-300">{lv != null ? row.fmt(lv) : '—'}</td>
              <td className={`py-2 px-3 text-right font-mono text-xs font-semibold ${highlight}`}>{rv != null ? row.fmt(rv) : '—'}</td>
              <td className={`py-2 px-3 text-right font-mono text-xs font-bold ${diffColor}`}>
                {diff != null ? `${diff > 0 ? '+' : ''}${typeof diff === 'number' && !Number.isInteger(diff) ? diff.toFixed(2) : diff}` : '—'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default function LeverageSplitsPanel({ data }) {
  const [view, setView] = useState('runners')

  if (!data) return <div className="text-slate-600 text-sm text-center py-8">Loading situation splits…</div>

  const fps = data.first_pitch_strike_pct

  return (
    <div className="space-y-4">
      {/* First-pitch strike summary */}
      {fps != null && (
        <div className="card flex items-center gap-4">
          <div>
            <div className={`text-3xl font-black font-mono ${fps >= 60 ? 'text-emerald-400' : fps >= 55 ? 'text-blue-400' : fps < 50 ? 'text-red-400' : 'text-slate-300'}`}>
              {fps}%
            </div>
            <div className="text-xs text-slate-500 mt-0.5">First-Pitch Strike%</div>
          </div>
          <div className="text-xs text-slate-500 leading-relaxed max-w-xs">
            MLB avg ~59%. Getting ahead in the count is the #1 predictor of pitcher success — correlates strongly with K% and low walk rates.
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-surface-700 rounded-lg p-1 w-fit">
        {[['runners','Runners On/Off'],['risp','RISP'],['innings','By Inning']].map(([k,l]) => (
          <button key={k} onClick={() => setView(k)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === k ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {l}
          </button>
        ))}
      </div>

      {view === 'runners' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Bases Empty vs Runners On</h3>
          <SplitTable
            left={data.runners?.bases_empty} right={data.runners?.runners_on}
            leftLabel="Bases Empty" rightLabel="Runners On"
            highlight="text-amber-400"
          />
        </div>
      )}

      {view === 'risp' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">No RISP vs Runners in Scoring Position</h3>
          <SplitTable
            left={data.risp?.no_risp} right={data.risp?.risp}
            leftLabel="No RISP" rightLabel="RISP"
            highlight="text-orange-400"
          />
        </div>
      )}

      {view === 'innings' && (
        <div className="space-y-3">
          {Object.entries(data.innings || {}).length === 0
            ? <div className="text-slate-600 text-xs text-center py-4 card">Inning data requires game_date + inning column from Statcast.</div>
            : (
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Performance by Inning Group</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-600">
                    <th className="py-2 px-3 text-left text-xs text-slate-500 font-semibold uppercase">Inning</th>
                    {ROWS.filter(r => r.key !== 'pitches').map(r => (
                      <th key={r.key} className="py-2 px-3 text-right text-xs text-slate-500 font-semibold uppercase">{r.label}</th>
                    ))}
                    <th className="py-2 px-3 text-right text-xs text-slate-500 font-semibold uppercase">Pitches</th>
                  </tr>
                </thead>
                <tbody>
                  {['1-3','4-6','7+'].filter(g => data.innings?.[g]).map(grp => {
                    const d = data.innings[grp]
                    return (
                      <tr key={grp} className="border-b border-surface-700">
                        <td className="py-2 px-3 font-bold text-slate-300">Inn {grp}</td>
                        {ROWS.filter(r => r.key !== 'pitches').map(r => (
                          <td key={r.key} className="py-2 px-3 text-right font-mono text-xs text-slate-300">
                            {d[r.key] != null ? r.fmt(d[r.key]) : '—'}
                          </td>
                        ))}
                        <td className="py-2 px-3 text-right font-mono text-xs text-slate-500">{d.pitches}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
