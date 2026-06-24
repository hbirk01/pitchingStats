import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const COUNT_ORDER = ['0-0','0-1','0-2','1-0','1-1','1-2','2-0','2-1','2-2','3-0','3-1','3-2']

function MiniStat({ label, value, good, neutral }) {
  const cls = value == null ? 'text-slate-600' :
    good === 'high' ? (value > neutral ? 'text-emerald-400' : value < neutral * 0.85 ? 'text-red-400' : 'text-slate-300') :
    good === 'low'  ? (value < neutral ? 'text-emerald-400' : value > neutral * 1.15 ? 'text-red-400' : 'text-slate-300') :
    'text-slate-300'
  return (
    <div className="text-center">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`font-mono font-bold text-sm mt-0.5 ${cls}`}>{value ?? '—'}</div>
    </div>
  )
}

function PlatoonRow({ label, data }) {
  if (!data) return null
  return (
    <div className="flex items-center gap-4 py-3 border-b border-surface-700 last:border-b-0">
      <div className="w-16 text-sm font-semibold text-slate-300">vs {label}</div>
      <div className="flex-1 grid grid-cols-5 gap-2">
        <MiniStat label="PA" value={data.pa} />
        <MiniStat label="K%" value={data.k_pct != null ? `${data.k_pct.toFixed(1)}%` : null} good="high" neutral={22} />
        <MiniStat label="BB%" value={data.bb_pct != null ? `${data.bb_pct.toFixed(1)}%` : null} good="low" neutral={8} />
        <MiniStat label="Whiff%" value={data.whiff_pct != null ? `${data.whiff_pct.toFixed(1)}%` : null} good="high" neutral={25} />
        <MiniStat label="xBA" value={data.xba != null ? data.xba.toFixed(3) : null} good="low" neutral={0.240} />
      </div>
      <div className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
        data.rv != null && data.rv < 0 ? 'text-emerald-400 bg-emerald-400/10' :
        data.rv != null && data.rv > 0 ? 'text-red-400 bg-red-400/10' : 'text-slate-500'
      }`}>
        RV {data.rv != null ? (data.rv > 0 ? '+' : '') + data.rv.toFixed(2) : '—'}
      </div>
    </div>
  )
}

export default function SplitsPanel({ splits }) {
  const [tab, setTab] = useState('platoon')

  if (!splits) return (
    <div className="text-slate-600 text-sm text-center py-8">Loading splits…</div>
  )

  const { platoon, count_splits, rolling } = splits

  // Difference row for platoon
  const LHB = platoon?.L
  const RHB = platoon?.R

  return (
    <div>
      <div className="flex gap-1 mb-5 bg-surface-700 rounded-lg p-1 w-fit">
        {[['platoon', 'Platoon'], ['counts', 'Count Splits'], ['rolling', 'Rolling Trends']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === k ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'platoon' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-4">Platoon Splits</h3>
          <PlatoonRow label="LHB" data={LHB} />
          <PlatoonRow label="RHB" data={RHB} />
          {LHB && RHB && (
            <div className="mt-4 pt-3 border-t border-surface-600">
              <div className="text-xs text-slate-600 mb-2">Platoon Diff (L − R)</div>
              <div className="grid grid-cols-4 gap-3 text-xs">
                {[
                  { label: 'K% diff', val: LHB.k_pct != null && RHB.k_pct != null ? (LHB.k_pct - RHB.k_pct).toFixed(1) + '%' : '—' },
                  { label: 'BB% diff', val: LHB.bb_pct != null && RHB.bb_pct != null ? (LHB.bb_pct - RHB.bb_pct).toFixed(1) + '%' : '—' },
                  { label: 'Whiff diff', val: LHB.whiff_pct != null && RHB.whiff_pct != null ? (LHB.whiff_pct - RHB.whiff_pct).toFixed(1) + '%' : '—' },
                  { label: 'xBA diff', val: LHB.xba != null && RHB.xba != null ? (LHB.xba - RHB.xba).toFixed(3) : '—' },
                ].map(d => (
                  <div key={d.label} className="bg-surface-700 rounded p-2 text-center">
                    <div className="text-slate-500">{d.label}</div>
                    <div className="font-mono text-slate-200 mt-0.5">{d.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'counts' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-4">Count Splits</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-600">
                  {['Count', 'Pitches', 'K%', 'Whiff%', 'xBA', 'RV'].map(h => (
                    <th key={h} className="py-2 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COUNT_ORDER.filter(c => count_splits?.[c]).map(count => {
                  const d = count_splits[count]
                  const isTwo = count.endsWith('-2')
                  return (
                    <tr key={count} className={`border-b border-surface-700 ${isTwo ? 'bg-brand-600/5' : ''}`}>
                      <td className="py-2 px-3 font-mono font-bold text-slate-200">{count}</td>
                      <td className="py-2 px-3 text-slate-400 font-mono">{d.pitches}</td>
                      <td className="py-2 px-3 font-mono">
                        <span className={d.k_pct > 25 ? 'text-emerald-400' : d.k_pct < 15 ? 'text-red-400' : 'text-slate-300'}>
                          {d.k_pct != null ? `${d.k_pct.toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono">
                        <span className={d.whiff_pct > 30 ? 'text-emerald-400' : d.whiff_pct < 18 ? 'text-red-400' : 'text-slate-300'}>
                          {d.whiff_pct != null ? `${d.whiff_pct.toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono">
                        <span className={d.xba < 0.220 ? 'text-emerald-400' : d.xba > 0.280 ? 'text-red-400' : 'text-slate-300'}>
                          {d.xba != null ? d.xba.toFixed(3) : '—'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono">
                        <span className={d.rv < 0 ? 'text-emerald-400' : d.rv > 0 ? 'text-red-400' : 'text-slate-500'}>
                          {d.rv != null ? (d.rv > 0 ? '+' : '') + d.rv.toFixed(2) : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-slate-600 mt-3">Two-strike counts highlighted · RV = run value (negative = good for pitcher)</div>
        </div>
      )}

      {tab === 'rolling' && rolling?.length > 0 && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 mb-4">Velocity Trend (Rolling Window)</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={rolling} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }} formatter={(v) => [`${v?.toFixed(1)} mph`, 'Avg Velo']} />
                <Line type="monotone" dataKey="avg_velo" stroke="#60a5fa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 mb-4">Whiff% Trend (Rolling Window)</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={rolling} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }} formatter={(v) => [`${v?.toFixed(1)}%`, 'Whiff%']} />
                <ReferenceLine y={25} stroke="#64748b" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="whiff_pct" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 mb-4">Run Value/100 Trend (Rolling)</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={rolling} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }} formatter={(v) => [v?.toFixed(2), 'RV/100']} />
                <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="rv_per_100" stroke="#f472b6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-slate-600">Rolling window = most recent ~450 pitches sampled weekly. Negative RV/100 = good for pitcher.</div>
        </div>
      )}

      {tab === 'rolling' && (!rolling || rolling.length === 0) && (
        <div className="card text-slate-600 text-sm text-center py-8">No rolling data available for this season.</div>
      )}
    </div>
  )
}
