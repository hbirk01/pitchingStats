import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Loader2, ArrowLeft, Home, PlaneTakeoff } from 'lucide-react'
import { getGameLog } from '../utils/api'

const eraColor = era => {
  if (era == null) return 'text-slate-400'
  if (era < 2.0) return 'text-emerald-400 font-bold'
  if (era < 3.5) return 'text-blue-400'
  if (era < 5.0) return 'text-slate-300'
  return 'text-red-400'
}

const fipColor = (fip, era) => {
  if (fip == null || era == null) return 'text-slate-400'
  const diff = era - fip
  if (diff > 1) return 'text-emerald-400'
  if (diff < -1) return 'text-red-400'
  return 'text-slate-300'
}

export default function GameLogPage() {
  const { playerId } = useParams()
  const [searchParams] = useSearchParams()
  const playerName = searchParams.get('name') || `Player #${playerId}`
  const [season, setSeason] = useState(Number(searchParams.get('season') || 2025))
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await getGameLog(playerId, season)
      setGames(res.data)
    } catch { setError('Failed to load game log') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [playerId, season])

  // Running ERA across season
  let cumEr = 0, cumOuts = 0
  const gamesWithRunning = [...games].reverse().map(g => {
    cumEr += g.er || 0
    cumOuts += Math.round((g.ip || 0) * 3)
    return { ...g, running_era: cumOuts > 0 ? round2(cumEr / cumOuts * 27) : null }
  }).reverse()

  function round2(v) { return Math.round(v * 100) / 100 }

  const totals = games.reduce((acc, g) => ({
    ip: acc.ip + (g.ip || 0),
    k: acc.k + (g.k || 0),
    bb: acc.bb + (g.bb || 0),
    hr: acc.hr + (g.hr || 0),
    er: acc.er + (g.er || 0),
    h: acc.h + (g.h || 0),
  }), { ip: 0, k: 0, bb: 0, hr: 0, er: 0, h: 0 })

  const seasonERA = totals.ip > 0 ? round2(totals.er / totals.ip * 9) : null
  const seasonWHIP = totals.ip > 0 ? round2((totals.bb + totals.h) / totals.ip) : null

  return (
    <div>
      <Link to={`/player/${playerId}?season=${season}&name=${encodeURIComponent(playerName)}`}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{playerName}</h1>
          <p className="text-slate-500 text-sm mt-1">{season} Game Log</p>
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

      {/* Season summary row */}
      {!loading && games.length > 0 && (
        <div className="grid grid-cols-6 gap-3 mb-6">
          {[
            { label: 'G', value: games.length },
            { label: 'IP', value: totals.ip.toFixed(1) },
            { label: 'ERA', value: seasonERA?.toFixed(2) },
            { label: 'WHIP', value: seasonWHIP?.toFixed(2) },
            { label: 'K', value: totals.k },
            { label: 'BB', value: totals.bb },
          ].map(c => (
            <div key={c.label} className="card text-center py-3">
              <div className="text-xs text-slate-500 mb-1">{c.label}</div>
              <div className="text-xl font-bold font-mono text-slate-100">{c.value ?? '—'}</div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          <span>Loading game log…</span>
        </div>
      )}
      {error && <div className="text-red-400 text-center py-12">{error}</div>}

      {!loading && !error && games.length === 0 && (
        <div className="text-slate-600 text-center py-12">No game log data for {season}.</div>
      )}

      {!loading && !error && games.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-600 bg-surface-700/50">
                  {['Date','Opp','','IP','H','ER','K','BB','HR','ERA','FIP','K%'].map(h => (
                    <th key={h} className={`py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${h === 'Date' || h === 'Opp' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gamesWithRunning.map((g, i) => (
                  <tr key={i} className="border-b border-surface-700 hover:bg-surface-700/30 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 text-xs whitespace-nowrap">{g.date}</td>
                    <td className="py-2.5 px-3 text-slate-300 text-xs whitespace-nowrap">{g.opponent}</td>
                    <td className="py-2.5 px-2">
                      {g.home
                        ? <Home className="w-3 h-3 text-slate-600" />
                        : <PlaneTakeoff className="w-3 h-3 text-slate-600" />}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-300">{g.ip?.toFixed(1)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-400">{g.h}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-400">{g.er}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-emerald-400 font-semibold">{g.k}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-400">{g.bb}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-400">{g.hr}</td>
                    <td className={`py-2.5 px-3 text-right font-mono text-xs ${eraColor(g.era)}`}>{g.era?.toFixed(2) ?? '—'}</td>
                    <td className={`py-2.5 px-3 text-right font-mono text-xs ${fipColor(g.fip, g.era)}`}>{g.fip?.toFixed(2) ?? '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-400">{g.k_pct != null ? `${g.k_pct}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="text-xs text-slate-600 mt-3">ERA/FIP per game · FIP color: green = ERA &gt; FIP (unlucky) · Source: MLB Stats API</div>
    </div>
  )
}
