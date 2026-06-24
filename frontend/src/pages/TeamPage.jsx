import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Loader2, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import axios from 'axios'
import PlayerPhoto from '../components/PlayerPhoto'
import StatTooltip from '../components/StatTooltip'

const api = axios.create({ baseURL: '/api', timeout: 30000 })

const COLS = [
  { key: 'Name',  label: 'Player', align: 'left',  sortable: false, tip: null },
  { key: 'IP',    label: 'IP',     sortable: true,  tip: null, fmt: v => v?.toFixed(1) },
  { key: 'ERA',   label: 'ERA',    sortable: true,  tip: 'ERA', fmt: v => v?.toFixed(2) },
  { key: 'FIP',   label: 'FIP',    sortable: true,  tip: 'FIP', fmt: v => v?.toFixed(2) },
  { key: 'K%',    label: 'K%',     sortable: true,  tip: 'K%', fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'BB%',   label: 'BB%',    sortable: true,  tip: 'BB%', fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'WHIP',  label: 'WHIP',   sortable: true,  tip: 'WHIP', fmt: v => v?.toFixed(2) },
  { key: 'BABIP', label: 'BABIP',  sortable: true,  tip: 'BABIP', fmt: v => v?.toFixed(3) },
]

const eraColor = era => {
  if (era == null) return ''
  if (era < 2.5) return 'text-emerald-400 font-bold'
  if (era < 3.5) return 'text-blue-400'
  if (era < 4.5) return 'text-slate-300'
  return 'text-red-400'
}

const fipColor = (fip, era) => {
  if (fip == null || era == null) return ''
  const diff = era - fip
  if (diff > 0.7) return 'text-emerald-400'  // ERA > FIP, pitcher got unlucky
  if (diff < -0.7) return 'text-red-400'      // ERA < FIP, pitcher got lucky
  return 'text-slate-300'
}

export default function TeamPage() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [pitchers, setPitchers] = useState([])
  const [season, setSeason] = useState(2025)
  const [role, setRole] = useState('all')
  const [sortKey, setSortKey] = useState('IP')
  const [sortAsc, setSortAsc] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.get(`/players/team/${teamId}`, { params: { season } })
      setTeam(res.data.team)
      setPitchers(res.data.pitchers)
    } catch { setError('Failed to load team data') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [teamId, season])

  const filtered = pitchers.filter(p => {
    if (role === 'sp') return p.GS >= p.G * 0.5
    if (role === 'rp') return p.GS < p.G * 0.3
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey] ?? (sortAsc ? Infinity : -Infinity)
    const bv = b[sortKey] ?? (sortAsc ? Infinity : -Infinity)
    return sortAsc ? av - bv : bv - av
  })

  const toggleSort = key => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(key === 'ERA' || key === 'FIP' || key === 'WHIP' || key === 'BB%' || key === 'BABIP') }
  }

  const SortIcon = ({ col }) => {
    if (!col.sortable) return null
    if (sortKey !== col.key) return <ArrowUpDown className="w-3 h-3 opacity-30" />
    return sortAsc ? <ArrowUp className="w-3 h-3 text-brand-400" /> : <ArrowDown className="w-3 h-3 text-brand-400" />
  }

  // Staff summary
  const sp = pitchers.filter(p => p.GS >= p.G * 0.5)
  const rp = pitchers.filter(p => p.GS < p.G * 0.3)
  const totalIP = pitchers.reduce((s, p) => s + (p.IP || 0), 0)
  const avgERA = pitchers.length ? (pitchers.reduce((s, p) => s + (p.ERA || 0), 0) / pitchers.length).toFixed(2) : '—'
  const avgFIP = pitchers.filter(p => p.FIP).length ? (pitchers.filter(p => p.FIP).reduce((s, p) => s + p.FIP, 0) / pitchers.filter(p => p.FIP).length).toFixed(2) : '—'

  return (
    <div>
      <Link to="/leaderboard" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Leaderboard
      </Link>

      {loading && (
        <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          <span>Loading team data…</span>
        </div>
      )}

      {error && <div className="text-red-400 text-center py-12">{error}</div>}

      {!loading && !error && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">{team?.name}</h1>
              <p className="text-slate-500 text-sm mt-1">{season} Pitching Staff</p>
            </div>
            <div className="flex gap-1 bg-surface-700 rounded-lg p-1">
              {[2026, 2025, 2024, 2023, 2022].map(s => (
                <button key={s} onClick={() => setSeason(s)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${season === s ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Staff summary cards */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Total Pitchers', value: pitchers.length },
              { label: 'Starters', value: sp.length },
              { label: 'Relievers', value: rp.length },
              { label: 'Staff ERA', value: avgERA },
              { label: 'Staff FIP', value: avgFIP },
            ].map(c => (
              <div key={c.label} className="card text-center">
                <div className="text-xs text-slate-500 mb-1">{c.label}</div>
                <div className="text-2xl font-bold font-mono text-slate-100">{c.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-4 items-center flex-wrap">
            <div className="flex gap-1 bg-surface-700 rounded-lg p-1">
              {['all','sp','rp'].map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${role === r ? 'bg-surface-500 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                  {r === 'all' ? 'All' : r === 'sp' ? 'Starters' : 'Relievers'}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-500 ml-auto">{sorted.length} pitchers</div>
          </div>

          {/* Table */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-600 bg-surface-700/50">
                    <th className="py-3 px-3 text-left text-xs font-semibold text-slate-500 uppercase w-8">#</th>
                    {COLS.map(c => (
                      <th key={c.key} onClick={() => c.sortable && toggleSort(c.key)}
                        className={`py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap select-none ${c.align === 'left' ? 'text-left' : 'text-right'} ${c.sortable ? 'cursor-pointer hover:text-slate-300 transition-colors' : ''}`}>
                        <div className={`flex items-center gap-1 ${c.align !== 'left' ? 'justify-end' : ''}`}>
                          {c.tip ? <StatTooltip stat={c.tip}>{c.label}</StatTooltip> : c.label}
                          <SortIcon col={c} />
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p, i) => (
                    <tr key={p.mlbam_id}
                      onClick={() => navigate(`/player/${p.mlbam_id}?season=${season}&name=${encodeURIComponent(p.Name)}`)}
                      className="border-b border-surface-700 cursor-pointer hover:bg-brand-600/10 transition-colors">
                      <td className="py-2.5 px-3 text-xs text-slate-600 font-mono">{i+1}</td>
                      {COLS.map(c => (
                        <td key={c.key} className={`py-2.5 px-3 ${c.align === 'left' ? 'text-left' : 'text-right'}`}>
                          {c.key === 'Name' ? (
                            <div className="flex items-center gap-2.5">
                              <PlayerPhoto playerId={p.mlbam_id} name={p.Name} size="sm" />
                              <span className="font-semibold text-slate-100">{p.Name}</span>
                            </div>
                          ) : c.key === 'ERA' ? (
                            <span className={`font-mono ${eraColor(p.ERA)}`}>{c.fmt(p.ERA)}</span>
                          ) : c.key === 'FIP' ? (
                            <span className={`font-mono ${fipColor(p.FIP, p.ERA)}`}>{c.fmt?.(p[c.key]) ?? p[c.key] ?? '—'}</span>
                          ) : (
                            <span className="text-slate-300 font-mono">{p[c.key] != null ? (c.fmt ? c.fmt(p[c.key]) : p[c.key]) : '—'}</span>
                          )}
                        </td>
                      ))}
                      <td className="py-2.5 px-3 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.GS >= p.G * 0.5 ? 'bg-blue-500/20 text-blue-400' : 'bg-surface-600 text-slate-400'}`}>
                          {p.GS >= p.G * 0.5 ? 'SP' : 'RP'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="text-xs text-slate-600 mt-3">FIP color: green = ERA &gt; FIP (unlucky) · red = ERA &lt; FIP (lucky) · Click any pitcher for full dashboard</div>
        </>
      )}
    </div>
  )
}
