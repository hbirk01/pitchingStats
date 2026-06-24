import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'

const PITCH_COLORS = {
  FF: '#ef4444', SI: '#f97316', FC: '#f59e0b', SL: '#3b82f6',
  CU: '#8b5cf6', CH: '#10b981', FS: '#06b6d4', KC: '#6366f1',
  ST: '#ec4899', SV: '#84cc16', CS: '#14b8a6', OTHER: '#94a3b8',
}
const pitchColor = pt => PITCH_COLORS[pt] || PITCH_COLORS.OTHER

const COUNT_ORDER = ['0-0','0-1','0-2','1-0','1-1','1-2','2-0','2-1','2-2','3-0','3-1','3-2']

export default function SequencingPanel({ data }) {
  const [view, setView] = useState('matrix')
  const [selected, setSelected] = useState(null)

  if (!data) return <div className="text-slate-600 text-sm text-center py-8">Loading sequencing data…</div>

  const { matrix, counts, situations } = data
  const pitchTypes = Object.keys(matrix || {}).sort()
  const allTypes = [...new Set([...pitchTypes, ...pitchTypes.flatMap(p => Object.keys(matrix[p] || {}))])].sort()

  // Count bar chart data
  const countData = COUNT_ORDER.filter(c => counts?.[c]).map(c => {
    const entry = { count: c, n: counts[c].n }
    Object.entries(counts[c].mix || {}).forEach(([pt, pct]) => { entry[pt] = pct })
    return entry
  })

  const pitchTypesInCounts = [...new Set(countData.flatMap(d => Object.keys(d).filter(k => k !== 'count' && k !== 'n')))]

  return (
    <div>
      <div className="flex gap-1 mb-5 bg-surface-700 rounded-lg p-1 w-fit">
        {[['matrix','Transition Matrix'],['counts','By Count'],['situations','By Situation']].map(([k,l]) => (
          <button key={k} onClick={() => setView(k)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === k ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {l}
          </button>
        ))}
      </div>

      {view === 'matrix' && (
        <div className="card">
          <div className="text-xs text-slate-500 mb-3">Row = pitch thrown, Column = next pitch. Values = % of transitions.</div>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr>
                  <th className="py-2 px-3 text-left text-slate-500 font-semibold">→ Next</th>
                  {allTypes.map(pt => (
                    <th key={pt} className="py-2 px-2 text-center font-semibold" style={{ color: pitchColor(pt) }}>{pt}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pitchTypes.map(prev => (
                  <tr key={prev} className="border-t border-surface-700">
                    <td className="py-2 px-3 font-bold" style={{ color: pitchColor(prev) }}>{prev}</td>
                    {allTypes.map(nxt => {
                      const val = matrix[prev]?.[nxt]
                      return (
                        <td key={nxt} className="py-2 px-2 text-center font-mono"
                          style={{ background: val ? `rgba(96,165,250,${Math.min(val/50, 0.5)})` : 'transparent',
                                   color: val ? '#e2e8f0' : '#334155' }}>
                          {val ? `${val}%` : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selected && (
            <div className="mt-3 text-xs text-slate-400 bg-surface-700 rounded-lg p-2">
              After <span className="font-bold text-slate-200">{selected}</span>:&nbsp;
              {Object.entries(matrix[selected] || {}).map(([nxt, pct]) => (
                <span key={nxt} className="mr-3" style={{ color: pitchColor(nxt) }}>{nxt} {pct}%</span>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'counts' && (
        <div className="card">
          <div className="text-xs text-slate-500 mb-4">Pitch mix at each count. Hover bars for exact %.</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={countData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <XAxis dataKey="count" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip formatter={(v, name) => [`${v}%`, name]} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {pitchTypesInCounts.map(pt => (
                <Bar key={pt} dataKey={pt} stackId="a" fill={pitchColor(pt)} />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {COUNT_ORDER.filter(c => counts?.[c]).map(c => (
              <div key={c} className={`bg-surface-700 rounded-lg p-2 border ${['0-2','1-2','2-2','3-2'].includes(c) ? 'border-blue-500/30' : 'border-surface-600'}`}>
                <div className="text-xs font-bold text-slate-300 mb-1">{c} <span className="text-slate-600 font-normal">({counts[c].n})</span></div>
                {Object.entries(counts[c].mix || {}).slice(0,3).map(([pt, pct]) => (
                  <div key={pt} className="flex justify-between text-xs">
                    <span style={{ color: pitchColor(pt) }}>{pt}</span>
                    <span className="text-slate-400 font-mono">{pct}%</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'situations' && (
        <div className="grid grid-cols-3 gap-4">
          {[['pitcher_ahead','Pitcher Ahead (2-strike)','text-emerald-400'],
            ['even','Even Count','text-blue-400'],
            ['pitcher_behind','Pitcher Behind (2-ball)','text-red-400']].map(([sit, label, cls]) => (
            <div key={sit} className="card">
              <h3 className={`text-sm font-bold mb-3 ${cls}`}>{label}</h3>
              {situations?.[sit] ? Object.entries(situations[sit]).map(([pt, pct]) => (
                <div key={pt} className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold w-8" style={{ color: pitchColor(pt) }}>{pt}</span>
                  <div className="flex-1 bg-surface-600 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: pitchColor(pt) }} />
                  </div>
                  <span className="text-xs text-slate-400 font-mono w-10 text-right">{pct}%</span>
                </div>
              )) : <div className="text-slate-600 text-xs">No data</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
