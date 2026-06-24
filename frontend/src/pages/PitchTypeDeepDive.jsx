import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Loader2, ArrowLeft } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getPitchTypeDeepDive } from '../utils/api'

const PITCH_COLORS = {
  FF:'#ef4444',SI:'#f97316',FC:'#f59e0b',SL:'#3b82f6',
  CU:'#8b5cf6',CH:'#10b981',FS:'#06b6d4',KC:'#6366f1',
  ST:'#ec4899',SV:'#84cc16',OTHER:'#94a3b8',
}
const pitchColor = pt => PITCH_COLORS[pt] || PITCH_COLORS.OTHER

const statColor = (key, val) => {
  if (val == null) return 'text-slate-300'
  if (key === 'whiff_pct') return val >= 35 ? 'text-emerald-400 font-bold' : val >= 25 ? 'text-blue-400' : val < 15 ? 'text-red-400' : 'text-slate-300'
  if (key === 'rv_per_100') return val <= -1 ? 'text-emerald-400 font-bold' : val <= 0 ? 'text-blue-400' : val > 1 ? 'text-red-400' : 'text-slate-300'
  if (key === 'xba') return val < 0.22 ? 'text-emerald-400' : val > 0.29 ? 'text-red-400' : 'text-slate-300'
  return 'text-slate-300'
}

// 5×5 zone heatmap
function MiniHeatmap({ heatmap, metric = 'whiff_pct' }) {
  if (!heatmap || Object.keys(heatmap).length === 0) return <div className="text-slate-600 text-xs text-center py-4">No zone data</div>
  const cellColor = v => {
    if (v == null) return 'bg-surface-700 text-slate-600'
    if (v >= 45) return 'bg-emerald-500/50 text-emerald-100'
    if (v >= 30) return 'bg-blue-500/40 text-blue-100'
    if (v >= 15) return 'bg-surface-600 text-slate-300'
    return 'bg-red-500/20 text-red-300'
  }
  return (
    <div className="grid grid-cols-5 gap-1 max-w-xs">
      {[4,3,2,1,0].flatMap(zi => [0,1,2,3,4].map(xi => {
        const cell = heatmap[`${zi}_${xi}`]
        const v = cell?.[metric]
        return (
          <div key={`${zi}_${xi}`} className={`aspect-square flex items-center justify-center text-xs font-mono rounded ${cellColor(v)}`}>
            {v != null ? `${v}%` : '—'}
          </div>
        )
      }))}
    </div>
  )
}

export default function PitchTypeDeepDive() {
  const { playerId, pitchType } = useParams()
  const [searchParams] = useSearchParams()
  const season = Number(searchParams.get('season') || 2025)
  const playerName = searchParams.get('name') || `Player #${playerId}`
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    getPitchTypeDeepDive(playerId, pitchType, season)
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load pitch data'))
      .finally(() => setLoading(false))
  }, [playerId, pitchType, season])

  const color = pitchColor(pitchType?.toUpperCase())

  return (
    <div>
      <Link to={`/player/${playerId}?season=${season}&name=${encodeURIComponent(playerName)}`}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to {playerName}
      </Link>

      {loading && <div className="flex items-center justify-center py-24 gap-3 text-slate-400"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /><span>Loading…</span></div>}
      {error && <div className="text-red-400 text-center py-12">{error}</div>}

      {!loading && data && (
        <>
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-5 h-5 rounded-full" style={{ background: color }} />
            <div>
              <h1 className="text-2xl font-bold text-slate-100">{playerName} — {data.pitch_type}</h1>
              <p className="text-slate-500 text-sm mt-0.5">{season} · {data.stats.pitches} pitches · {data.stats.usage_pct}% of arsenal</p>
            </div>
          </div>

          {/* Core stat grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {[
              { label: 'Avg Velo',    key: 'avg_velo',    fmt: v => `${v} mph` },
              { label: 'Max Velo',    key: 'max_velo',    fmt: v => `${v} mph` },
              { label: 'Spin Rate',   key: 'avg_spin',    fmt: v => `${v?.toLocaleString()} rpm` },
              { label: 'iVB',         key: 'avg_ivb',     fmt: v => `${v}"` },
              { label: 'HB',          key: 'avg_hb',      fmt: v => `${v}"` },
              { label: 'Whiff%',      key: 'whiff_pct',   fmt: v => `${v}%` },
              { label: 'CSW%',        key: 'csw_pct',     fmt: v => `${v}%` },
              { label: 'Put-Away%',   key: 'put_away_pct',fmt: v => `${v}%` },
              { label: 'xBA',         key: 'xba',         fmt: v => v?.toFixed(3) },
              { label: 'RV/100',      key: 'rv_per_100',  fmt: v => v?.toFixed(2) },
              { label: 'Extension',   key: 'avg_extension',fmt: v => `${v} ft` },
            ].filter(s => data.stats[s.key] != null).map(s => (
              <div key={s.key} className="card text-center py-3">
                <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                <div className={`text-lg font-bold font-mono ${statColor(s.key, data.stats[s.key])}`}>{s.fmt(data.stats[s.key])}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Velo trend by month */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Velocity Trend by Month</h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data.velo_trend} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={['auto','auto']} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip formatter={v => `${v} mph`} contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:8, fontSize:11 }} />
                  <Line type="monotone" dataKey="avg_velo" stroke={color} strokeWidth={2.5} dot={{ r: 4, fill: color }} name="Avg Velo" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Platoon splits */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Platoon Splits</h3>
              {Object.keys(data.platoon || {}).length === 0
                ? <div className="text-slate-600 text-xs text-center py-4">No platoon data</div>
                : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-600">
                      <th className="py-2 px-3 text-left text-xs text-slate-500 uppercase">Split</th>
                      <th className="py-2 px-3 text-right text-xs text-slate-500 uppercase">Pitches</th>
                      <th className="py-2 px-3 text-right text-xs text-slate-500 uppercase">Velo</th>
                      <th className="py-2 px-3 text-right text-xs text-slate-500 uppercase">Whiff%</th>
                      <th className="py-2 px-3 text-right text-xs text-slate-500 uppercase">xBA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.platoon).map(([split, s]) => (
                      <tr key={split} className="border-b border-surface-700">
                        <td className="py-2 px-3 font-semibold text-slate-200 text-xs">{split.replace('vs_','vs ')}</td>
                        <td className="py-2 px-3 text-right font-mono text-xs text-slate-400">{s.pitches}</td>
                        <td className="py-2 px-3 text-right font-mono text-xs text-slate-300">{s.avg_velo}</td>
                        <td className={`py-2 px-3 text-right font-mono text-xs ${statColor('whiff_pct', s.whiff_pct)}`}>{s.whiff_pct != null ? `${s.whiff_pct}%` : '—'}</td>
                        <td className={`py-2 px-3 text-right font-mono text-xs ${statColor('xba', s.xba)}`}>{s.xba?.toFixed(3) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Whiff% zone heatmap */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Whiff% by Zone</h3>
              <MiniHeatmap heatmap={data.heatmap} metric="whiff_pct" />
              <div className="text-xs text-slate-600 mt-2">5×5 grid · top row = top of zone · green=elite whiff</div>
            </div>

            {/* Usage% zone heatmap */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Usage% by Zone</h3>
              <MiniHeatmap heatmap={data.heatmap} metric="usage_pct" />
              <div className="text-xs text-slate-600 mt-2">Where does pitcher locate this pitch?</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
