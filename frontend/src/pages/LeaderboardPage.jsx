import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown, Flame } from 'lucide-react'
import { getLeaderboard, getTeams } from '../utils/api'
import PlayerPhoto from '../components/PlayerPhoto'
import StatTooltip from '../components/StatTooltip'

const COLS = [
  { key: 'Name',  label: 'Player', align: 'left', sortable: false, tip: null },
  { key: 'Team',  label: 'Team',   align: 'left', sortable: false, tip: null },
  { key: 'IP',    label: 'IP',     sortable: true, tip: null,    fmt: v => v?.toFixed(1) },
  { key: 'ERA',   label: 'ERA',    sortable: true, tip: 'ERA',   fmt: v => v?.toFixed(2) },
  { key: 'FIP',   label: 'FIP',    sortable: true, tip: 'FIP',   fmt: v => v?.toFixed(2) },
  { key: 'K%',    label: 'K%',     sortable: true, tip: 'K%',    fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'BB%',   label: 'BB%',    sortable: true, tip: 'BB%',   fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'WHIP',  label: 'WHIP',   sortable: true, tip: 'WHIP',  fmt: v => v?.toFixed(2) },
  { key: 'BABIP', label: 'BABIP',  sortable: true, tip: 'BABIP', fmt: v => v?.toFixed(3) },
]

// Color relative to league median (2024 approximate values)
const LG = { ERA: 4.01, FIP: 4.02, K_pct: 0.224, BB_pct: 0.082, WHIP: 1.27, BABIP: 0.296 }

const statColor = (key, val) => {
  if (val == null) return ''
  // ERA, FIP: lower = better
  if (key === 'ERA' || key === 'FIP') {
    const lg = key === 'ERA' ? LG.ERA : LG.FIP
    if (val < lg - 0.75) return 'text-emerald-400 font-semibold'
    if (val < lg - 0.25) return 'text-blue-400'
    if (val > lg + 0.75) return 'text-red-400'
    return 'text-slate-300'
  }
  if (key === 'K%') { const v = val * 100; return v > 27 ? 'text-emerald-400 font-semibold' : v > 24 ? 'text-blue-400' : v < 18 ? 'text-red-400' : 'text-slate-300' }
  if (key === 'BB%') { const v = val * 100; return v < 7 ? 'text-emerald-400 font-semibold' : v < 8.5 ? 'text-blue-400' : v > 11 ? 'text-red-400' : 'text-slate-300' }
  if (key === 'WHIP') return val < 1.1 ? 'text-emerald-400 font-semibold' : val < 1.25 ? 'text-blue-400' : val > 1.4 ? 'text-red-400' : 'text-slate-300'
  if (key === 'BABIP') return val < 0.270 ? 'text-emerald-400' : val > 0.330 ? 'text-red-400' : 'text-slate-300'
  return 'text-slate-300'
}

// Breakout: ERA > FIP by 0.5+ (likely to regress positively) + decent IP
const isBreakout = row => row.FIP != null && row.ERA != null && (row.ERA - row.FIP) > 0.5 && row.IP >= 15

export default function LeaderboardPage() {
  const [data, setData] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [season, setSeason] = useState(2025)
  const [minIp, setMinIp] = useState(20)
  const [role, setRole] = useState('all')
  const [sortKey, setSortKey] = useState('ERA')
  const [sortAsc, setSortAsc] = useState(true)
  const [breakoutOnly, setBreakoutOnly] = useState(false)
  const [teamFilter, setTeamFilter] = useState('')
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const [lb, tm] = await Promise.all([
        getLeaderboard(season, minIp, role),
        teams.length ? Promise.resolve({ data: teams }) : getTeams(),
      ])
      setData(lb.data)
      if (!teams.length) setTeams(tm.data)
    } catch { setError('Failed to load leaderboard') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [season, minIp, role])

  let sorted = [...data]
  if (breakoutOnly) sorted = sorted.filter(isBreakout)
  if (teamFilter) sorted = sorted.filter(r => (r.Team || '').toLowerCase().includes(teamFilter.toLowerCase()))
  sorted = sorted.sort((a, b) => {
    const av = a[sortKey] ?? (sortAsc ? Infinity : -Infinity)
    const bv = b[sortKey] ?? (sortAsc ? Infinity : -Infinity)
    return sortAsc ? av - bv : bv - av
  })

  const toggleSort = key => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  const SortIcon = ({ col }) => {
    if (!col.sortable) return null
    if (sortKey !== col.key) return <ArrowUpDown className="w-3 h-3 opacity-30" />
    return sortAsc ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />
  }

  const goToPlayer = row => {
    const id = row.mlbam_id || row.playerid
    if (id) navigate(`/player/${id}?season=${season}&name=${encodeURIComponent(row.Name)}`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pitching Leaderboard</h1>
        <div className="text-xs text-slate-500">Source: MLB Stats API · FIP computed from peripherals</div>
      </div>

      {/* Filters row 1 */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <div className="flex gap-1 bg-surface-700 rounded-lg p-1">
          {[2026, 2025, 2024, 2023, 2022].map(s => (
            <button key={s} onClick={() => setSeason(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${season === s ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {s}
            </button>
          ))}
        </div>
        <select value={minIp} onChange={e => setMinIp(Number(e.target.value))}
          className="bg-surface-700 border border-surface-500 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500">
          <option value={10}>Min 10 IP</option>
          <option value={20}>Min 20 IP</option>
          <option value={50}>Min 50 IP</option>
          <option value={100}>Min 100 IP</option>
        </select>
        <div className="flex gap-1 bg-surface-700 rounded-lg p-1">
          {['all', 'sp', 'rp'].map(r => (
            <button key={r} onClick={() => setRole(r)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${role === r ? 'bg-surface-500 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
              {r === 'all' ? 'All' : r === 'sp' ? 'Starters' : 'Relievers'}
            </button>
          ))}
        </div>
      </div>

      {/* Filters row 2 */}
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        {/* Team filter */}
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
          className="bg-surface-700 border border-surface-500 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500 min-w-40">
          <option value="">All Teams</option>
          {teams.map(t => <option key={t.id} value={t.name}>{t.abbr} — {t.name}</option>)}
        </select>

        {/* Breakout watchlist toggle */}
        <button onClick={() => setBreakoutOnly(b => !b)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${breakoutOnly ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-surface-700 border-surface-500 text-slate-400 hover:text-slate-200'}`}>
          <Flame className="w-3.5 h-3.5" />
          Breakout Watchlist
        </button>

        {!loading && (
          <div className="text-xs text-slate-500 ml-auto">
            {sorted.length} pitchers
            {breakoutOnly && <span className="ml-2 text-orange-400">· ERA &gt; FIP by 0.5+ (likely to improve)</span>}
          </div>
        )}
      </div>

      {/* Team navigation quick links */}
      {!loading && !teamFilter && teams.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-4">
          {teams.slice(0, 10).map(t => (
            <Link key={t.id} to={`/team/${t.id}`}
              className="text-xs px-2 py-1 bg-surface-700 hover:bg-surface-600 text-slate-400 hover:text-slate-200 rounded border border-surface-600 transition-colors">
              {t.abbr}
            </Link>
          ))}
          <span className="text-xs text-slate-600 py-1 px-1">+ more via team filter →</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          <span>Loading pitching data…</span>
        </div>
      )}
      {error && <div className="text-red-400 text-sm py-8 text-center">{error}</div>}

      {!loading && !error && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-600 bg-surface-700/50">
                  <th className="py-3 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-8">#</th>
                  {COLS.map(c => (
                    <th key={c.key} onClick={() => c.sortable && toggleSort(c.key)}
                      className={`py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap select-none ${c.align === 'left' ? 'text-left' : 'text-right'} ${c.sortable ? 'cursor-pointer hover:text-slate-300 transition-colors' : ''}`}>
                      <div className={`flex items-center gap-1 ${c.align !== 'left' ? 'justify-end' : ''}`}>
                        {c.tip ? <StatTooltip stat={c.tip}>{c.label}</StatTooltip> : c.label}
                        <SortIcon col={c} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr key={i}
                    onClick={() => goToPlayer(row)}
                    className={`border-b border-surface-700 transition-colors ${row.mlbam_id || row.playerid ? 'cursor-pointer hover:bg-brand-600/10' : ''} ${breakoutOnly && isBreakout(row) ? 'bg-orange-500/5' : ''}`}>
                    <td className="py-2.5 px-3 text-xs text-slate-600 font-mono">{i + 1}</td>
                    {COLS.map(c => (
                      <td key={c.key} className={`py-2.5 px-3 ${c.align === 'left' ? 'text-left' : 'text-right'}`}>
                        {c.key === 'Name' ? (
                          <div className="flex items-center gap-2.5">
                            <PlayerPhoto playerId={row.mlbam_id} name={row.Name} size="sm" />
                            <div>
                              <span className="font-semibold text-slate-100">{row.Name}</span>
                              {isBreakout(row) && <Flame className="w-3 h-3 text-orange-400 inline ml-1.5" title="Breakout candidate: ERA > FIP" />}
                            </div>
                          </div>
                        ) : c.key === 'Team' ? (
                          <Link to={`/team/${teams.find(t => t.name === row.Team)?.id || 0}`}
                            onClick={e => e.stopPropagation()}
                            className="text-slate-400 hover:text-brand-400 transition-colors text-xs">
                            {row.Team || '—'}
                          </Link>
                        ) : (
                          <span className={`font-mono ${statColor(c.key, row[c.key])}`}>
                            {row[c.key] != null ? (c.fmt ? c.fmt(row[c.key]) : row[c.key]) : '—'}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="text-xs text-slate-600 mt-3 space-y-1">
          <div>Color coding: green = elite · blue = above avg · red = below avg · based on 2024 MLB averages</div>
          <div>🔥 Breakout candidate: ERA &gt; FIP by 0.5+ (pitcher was unlucky — expect improvement)</div>
        </div>
      )}
    </div>
  )
}
