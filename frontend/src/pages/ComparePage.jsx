import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Loader2, X, Search } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { getPitcherDashboard, searchPlayers } from '../utils/api'
import PlayerPhoto from '../components/PlayerPhoto'

const SEASONS = [2026, 2025, 2024, 2023, 2022]

const RADAR_METRICS = [
  { key: 'k_pct',    label: 'K%',      scale: v => Math.min(v * 3, 100) },
  { key: 'bb_pct',   label: 'BB%',     scale: v => Math.max(100 - v * 8, 0) },
  { key: 'whiff',    label: 'Whiff%',  scale: v => Math.min(v * 2.5, 100) },
  { key: 'xba_inv',  label: 'xBA',     scale: v => v },
  { key: 'xwoba_inv',label: 'xwOBA',   scale: v => v },
  { key: 'era_inv',  label: 'ERA',     scale: v => v },
]

const COMPARE_COLS = [
  { key: 'era',       label: 'ERA',     fmt: v => v?.toFixed(2), good: 'low' },
  { key: 'k_pct',    label: 'K%',      fmt: v => v != null ? `${v}%` : '—', good: 'high' },
  { key: 'bb_pct',   label: 'BB%',     fmt: v => v != null ? `${v}%` : '—', good: 'low' },
  { key: 'whiff_pct',label: 'Whiff%',  fmt: v => v != null ? `${v}%` : '—', good: 'high' },
  { key: 'xba',      label: 'xBA',     fmt: v => v?.toFixed(3), good: 'low' },
  { key: 'xwoba',    label: 'xwOBA',   fmt: v => v?.toFixed(3), good: 'low' },
  { key: 'babip',    label: 'BABIP',   fmt: v => v?.toFixed(3), good: 'neutral' },
  { key: 'ip',       label: 'IP',      fmt: v => v?.toFixed(1), good: 'high' },
]

const COLORS = ['#60a5fa', '#f472b6']

function PlayerSearchBox({ label, onSelect, selected, onClear }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (q.length < 4 || q.trim().split(' ').length < 2) { setResults([]); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      try { const r = await searchPlayers(q); setResults(r.data.slice(0, 6)) }
      catch { setResults([]) }
      finally { setLoading(false) }
    }, 350)
  }, [q])

  if (selected) return (
    <div className="flex items-center gap-3 bg-surface-700 rounded-xl px-4 py-3 border border-surface-500">
      <PlayerPhoto playerId={selected.id} name={selected.name} size="sm" />
      <span className="font-semibold text-slate-100 flex-1">{selected.name}</span>
      <button onClick={onClear} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
    </div>
  )

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder={label}
          className="w-full bg-surface-700 border border-surface-500 rounded-xl pl-9 pr-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500" />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-brand-400" />}
      </div>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-800 border border-surface-500 rounded-xl shadow-xl z-50">
          {results.map(p => (
            <button key={p.player_id} onClick={() => { onSelect({ id: p.player_id, name: p.name }); setQ(''); setResults([]) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-700 transition-colors first:rounded-t-xl last:rounded-b-xl">
              <PlayerPhoto playerId={p.player_id} name={p.name} size="sm" />
              <span className="text-sm text-slate-200">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function extractStats(dash) {
  const t = dash?.traditional || {}
  const p = dash?.predictive || {}
  return {
    era: t.era, k_pct: t.k_pct, bb_pct: t.bb_pct, babip: t.babip,
    whiff_pct: t.whiff_pct, ip: dash?.ip,
    xba: p.xba, xwoba: p.xwoba,
  }
}

export default function ComparePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [season, setSeason] = useState(Number(searchParams.get('season') || 2025))
  const [p1, setP1] = useState(null)
  const [p2, setP2] = useState(null)
  const [d1, setD1] = useState(null)
  const [d2, setD2] = useState(null)
  const [loading1, setLoading1] = useState(false)
  const [loading2, setLoading2] = useState(false)

  const fetchDash = async (player, setData, setLoad) => {
    if (!player) return
    setLoad(true)
    try { const r = await getPitcherDashboard(player.id, season); setData(r.data) }
    catch { setData(null) }
    finally { setLoad(false) }
  }

  useEffect(() => { fetchDash(p1, setD1, setLoading1) }, [p1, season])
  useEffect(() => { fetchDash(p2, setD2, setLoading2) }, [p2, season])

  const s1 = extractStats(d1)
  const s2 = extractStats(d2)

  // Build radar data — normalise to 0-100 scale
  const radarData = RADAR_METRICS.map(m => {
    const v1 = m.key === 'bb_pct' ? s1.bb_pct : m.key === 'whiff' ? s1.whiff_pct : m.key === 'xba_inv' ? (s1.xba != null ? (1 - s1.xba) * 333 : null) : m.key === 'xwoba_inv' ? (s1.xwoba != null ? (1 - s1.xwoba) * 250 : null) : m.key === 'era_inv' ? (s1.era != null ? Math.max(0, (8 - s1.era) * 12.5) : null) : s1[m.key]
    const v2 = m.key === 'bb_pct' ? s2.bb_pct : m.key === 'whiff' ? s2.whiff_pct : m.key === 'xba_inv' ? (s2.xba != null ? (1 - s2.xba) * 333 : null) : m.key === 'xwoba_inv' ? (s2.xwoba != null ? (1 - s2.xwoba) * 250 : null) : m.key === 'era_inv' ? (s2.era != null ? Math.max(0, (8 - s2.era) * 12.5) : null) : s2[m.key]
    return {
      metric: m.label,
      [p1?.name || 'P1']: v1 != null ? Math.round(m.scale(v1)) : null,
      [p2?.name || 'P2']: v2 != null ? Math.round(m.scale(v2)) : null,
    }
  })

  // Bar chart data — key stats side by side
  const barMetrics = ['k_pct','whiff_pct','bb_pct']
  const barData = barMetrics.map(k => {
    const col = COMPARE_COLS.find(c => c.key === k)
    return { metric: col?.label || k, [p1?.name||'P1']: s1[k], [p2?.name||'P2']: s2[k] }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Compare Pitchers</h1>
        <div className="flex gap-1 bg-surface-700 rounded-lg p-1">
          {SEASONS.map(s => (
            <button key={s} onClick={() => setSeason(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${season === s ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Search row */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <div className="text-xs text-slate-500 mb-1.5 font-medium" style={{ color: COLORS[0] }}>Pitcher 1</div>
          <PlayerSearchBox label="Search first pitcher…" selected={p1} onSelect={setP1} onClear={() => { setP1(null); setD1(null) }} />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1.5 font-medium" style={{ color: COLORS[1] }}>Pitcher 2</div>
          <PlayerSearchBox label="Search second pitcher…" selected={p2} onSelect={setP2} onClear={() => { setP2(null); setD2(null) }} />
        </div>
      </div>

      {(loading1 || loading2) && (
        <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
          <span>Fetching Statcast data…</span>
        </div>
      )}

      {p1 && p2 && d1 && d2 && !loading1 && !loading2 && (
        <div className="space-y-6">
          {/* Player headers */}
          <div className="grid grid-cols-2 gap-4">
            {[{p: p1, d: d1, c: COLORS[0]}, {p: p2, d: d2, c: COLORS[1]}].map(({p, d, c}) => (
              <Link key={p.id} to={`/player/${p.id}?season=${season}&name=${encodeURIComponent(p.name)}`}
                className="card flex items-center gap-3 hover:border-brand-500/30 transition-colors">
                <PlayerPhoto playerId={p.id} name={p.name} size="lg" />
                <div>
                  <div className="font-bold text-slate-100">{p.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{d.total_pitches?.toLocaleString()} pitches · {d.ip} IP</div>
                  <div className="text-xs mt-1" style={{ color: c }}>View full dashboard →</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Side-by-side stat table */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Head to Head — {season}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-600">
                  <th className="py-2 px-3 text-right text-xs font-bold" style={{ color: COLORS[0] }}>{p1.name}</th>
                  <th className="py-2 px-3 text-center text-xs text-slate-500 font-semibold uppercase">Metric</th>
                  <th className="py-2 px-3 text-left text-xs font-bold" style={{ color: COLORS[1] }}>{p2.name}</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_COLS.map(col => {
                  const v1 = s1[col.key], v2 = s2[col.key]
                  const winner = v1 == null || v2 == null ? null : col.good === 'high' ? (v1 > v2 ? 1 : v1 < v2 ? 2 : 0) : col.good === 'low' ? (v1 < v2 ? 1 : v1 > v2 ? 2 : 0) : 0
                  return (
                    <tr key={col.key} className="border-b border-surface-700">
                      <td className={`py-2.5 px-3 text-right font-mono text-sm ${winner === 1 ? 'font-bold' : 'text-slate-400'}`} style={winner === 1 ? { color: COLORS[0] } : {}}>
                        {v1 != null ? col.fmt(v1) : '—'}
                        {winner === 1 && ' ◀'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-xs text-slate-500 font-semibold uppercase">{col.label}</td>
                      <td className={`py-2.5 px-3 text-left font-mono text-sm ${winner === 2 ? 'font-bold' : 'text-slate-400'}`} style={winner === 2 ? { color: COLORS[1] } : {}}>
                        {winner === 2 && '▶ '}
                        {v2 != null ? col.fmt(v2) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Radar overlay */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Radar Comparison (normalized 0–100)</h3>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false} />
                <Radar name={p1.name} dataKey={p1.name} stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.15} strokeWidth={2} />
                <Radar name={p2.name} dataKey={p2.name} stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.15} strokeWidth={2} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* K%/Whiff%/BB% bar comparison */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Rate Stats</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip formatter={(v, n) => [`${v?.toFixed(1)}%`, n]} contentStyle={{ background:'#1e293b', border:'1px solid #334155', borderRadius:8, fontSize:11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={p1.name} fill={COLORS[0]} radius={[3,3,0,0]} />
                <Bar dataKey={p2.name} fill={COLORS[1]} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pitch arsenal comparison */}
          {(d1.movement_profile || d2.movement_profile) && (
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Pitch Arsenal</h3>
              <div className="grid grid-cols-2 gap-6">
                {[{p: p1, d: d1, c: COLORS[0]}, {p: p2, d: d2, c: COLORS[1]}].map(({p, d, c}) => (
                  <div key={p.id}>
                    <div className="text-xs font-semibold mb-2" style={{ color: c }}>{p.name}</div>
                    <div className="space-y-1">
                      {Object.entries(d.movement_profile || {}).map(([pt, vals]) => (
                        <div key={pt} className="flex items-center gap-2 text-xs">
                          <span className="font-bold w-8" style={{ color: c }}>{pt}</span>
                          <span className="text-slate-400 font-mono">{vals.avg_speed?.toFixed(1)} mph</span>
                          <span className="text-slate-600">iVB {vals.avg_ivb?.toFixed(1)}"</span>
                          <span className="text-slate-600">HB {vals.avg_hb?.toFixed(1)}"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(!p1 || !p2) && !loading1 && !loading2 && (
        <div className="text-center py-16 text-slate-600">
          <div className="text-4xl mb-3">⚾</div>
          <div className="text-sm">Search for two pitchers above to compare their stats side by side.</div>
        </div>
      )}
    </div>
  )
}
