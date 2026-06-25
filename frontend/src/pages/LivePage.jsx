import React, { useState, useEffect, useCallback } from 'react'
import { Radio, RefreshCw, ChevronRight, Loader2, User } from 'lucide-react'
import { getLiveGames, getLiveGame } from '../utils/api'
import { PITCH_COLORS } from '../utils/pitchColors'
import LiveGameCard from '../components/LiveGameCard'
import PitchLog from '../components/PitchLog'
import VeloSparkline from '../components/VeloSparkline'
import StrikeZonePlot from '../components/StrikeZonePlot'
import Linescore from '../components/Linescore'
import PitchScene from '../components/three/PitchScene'

// ── Small helpers ──────────────────────────────────────────────────────────

function StatItem({ label, value, sub, highlight }) {
  return (
    <div className={`card-xs text-center ${highlight ? 'border-brand-500/30 bg-brand-500/5' : ''}`}>
      <p className="section-title">{label}</p>
      <p className="text-xl font-bold font-display text-ink-50 leading-tight">{value ?? '—'}</p>
      {sub && <p className="text-[10px] text-ink-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function CountDisplay({ balls, strikes }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-widest text-ink-600 font-bold">Count</span>
      <div className="flex gap-1 items-center">
        {[0,1,2,3].map(i => (
          <span key={i} className={`w-2.5 h-2.5 rounded-full border ${i < balls ? 'bg-good-400 border-good-400' : 'border-surface-500'}`} />
        ))}
        <span className="text-ink-700 mx-1 text-[10px]">·</span>
        {[0,1,2].map(i => (
          <span key={i} className={`w-2.5 h-2.5 rounded-full border ${i < strikes ? 'bg-bad-400 border-bad-400' : 'border-surface-500'}`} />
        ))}
      </div>
      <span className="font-mono font-bold text-sm text-ink-200">{balls}-{strikes}</span>
    </div>
  )
}

function RecentPitchStrip({ pitches }) {
  const last5 = pitches.slice(0, 5)
  if (!last5.length) return null
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-widest text-ink-600 font-bold shrink-0">Last 5</span>
      <div className="flex gap-1.5">
        {last5.map((p, i) => {
          const color = PITCH_COLORS[p.pitch_type] || '#8b8fc8'
          const bgClass = {
            whiff:   'ring-2 ring-good-400',
            strike:  'ring-1 ring-good-400/50',
            ball:    'ring-1 ring-blue-400/50',
            foul:    'ring-1 ring-surface-500',
            contact: 'ring-1 ring-amber-400/50',
          }[p.result_class] || 'ring-1 ring-surface-600'
          return (
            <div key={i}
              className={`flex flex-col items-center justify-center w-9 h-9 rounded-lg ${bgClass} ${i === 0 ? 'opacity-100' : 'opacity-70'}`}
              style={{ background: `${color}18` }}
              title={`${p.pitch_name} ${p.velo ? p.velo + ' mph' : ''} — ${p.description}`}
            >
              <span className="font-mono font-bold text-[10px]" style={{ color }}>{p.pitch_type}</span>
              <span className="text-[8px] text-ink-600 leading-none">{p.velo ? p.velo.toFixed(0) : '—'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PitchMixBar({ counts }) {
  const total = Object.values(counts).reduce((s, v) => s + v, 0)
  if (!total) return null
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-2 gap-px">
        {sorted.map(([pt, n]) => (
          <div key={pt} style={{ width: `${(n/total*100).toFixed(1)}%`, background: PITCH_COLORS[pt] || '#6e66f8' }}
            title={`${pt}: ${n} (${(n/total*100).toFixed(0)}%)`} />
        ))}
      </div>
      {/* Labels */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {sorted.map(([pt, n]) => (
          <div key={pt} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: PITCH_COLORS[pt] || '#6e66f8' }} />
            <span className="font-mono font-bold text-[10px]" style={{ color: PITCH_COLORS[pt] || '#6e66f8' }}>{pt}</span>
            <span className="text-ink-600 text-[10px]">{(n/total*100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function VeloTable({ summary, counts }) {
  if (!Object.keys(summary).length) return <div className="text-ink-600 text-xs">No velocity data yet.</div>
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          {['Pitch', 'Avg', 'Max', 'Min', '#'].map(h => (
            <th key={h} className="py-1.5 text-[9px] uppercase tracking-widest text-ink-600 font-bold text-right first:text-left">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map(([pt]) => {
          const v = summary[pt]
          if (!v) return null
          return (
            <tr key={pt} className="border-t border-surface-700/40">
              <td className="py-1.5 font-mono font-bold" style={{ color: PITCH_COLORS[pt] || '#8b8fc8' }}>{pt}</td>
              <td className="py-1.5 text-right font-mono text-ink-200">{v.avg}</td>
              <td className="py-1.5 text-right font-mono text-good-400">{v.max}</td>
              <td className="py-1.5 text-right font-mono text-bad-400">{v.min}</td>
              <td className="py-1.5 text-right text-ink-500">{v.count}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function PitchersUsedTable({ pitchers, awayAbbr, homeAbbr }) {
  if (!pitchers?.length) return null
  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          {['Pitcher', 'Team', 'IP', 'H', 'ER', 'K', 'BB', 'ERA', 'P'].map(h => (
            <th key={h} className="py-1.5 px-2 text-[9px] uppercase tracking-widest text-ink-600 font-bold text-right first:text-left">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {pitchers.map((p, i) => (
          <tr key={i} className={`border-t border-surface-700/40 ${p.is_current ? 'bg-brand-500/5' : ''}`}>
            <td className="py-2 px-2 font-medium text-ink-200">
              <div className="flex items-center gap-1.5">
                {p.is_current && <span className="dot-live scale-75" />}
                <span className={p.is_current ? 'text-ink-50 font-semibold' : ''}>{p.name}</span>
              </div>
            </td>
            <td className="py-2 px-2 text-right font-mono font-bold text-ink-500 text-[10px]">
              {p.side === 'away' ? awayAbbr : homeAbbr}
            </td>
            <td className="py-2 px-2 text-right font-mono text-ink-300">{p.ip}</td>
            <td className="py-2 px-2 text-right font-mono text-ink-400">{p.h}</td>
            <td className="py-2 px-2 text-right font-mono text-ink-400">{p.er}</td>
            <td className="py-2 px-2 text-right font-mono text-good-400">{p.k}</td>
            <td className="py-2 px-2 text-right font-mono text-blue-400">{p.bb}</td>
            <td className="py-2 px-2 text-right font-mono text-ink-300">{p.era_today}</td>
            <td className="py-2 px-2 text-right text-ink-500">{p.pitches}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Sub-panels ─────────────────────────────────────────────────────────────

function PreviewPanel({ game }) {
  const time = game?.game_time_utc
    ? new Date(game.game_time_utc).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
    : null
  return (
    <div className="text-center py-10">
      <div className="text-4xl mb-3">⚾</div>
      <div className="font-display text-xl font-bold text-ink-100 mb-1">
        {game?.away_abbr} @ {game?.home_abbr}
      </div>
      {time && <div className="text-ink-500 text-sm mb-2">First pitch: {time}</div>}
      <div className="text-ink-500 text-sm mb-4">
        {game?.away_probable && game?.home_probable
          ? `${game.away_probable} vs ${game.home_probable}`
          : 'Probable pitchers TBD'}
      </div>
      <div className="inline-flex items-center gap-2 badge badge-brand">Game hasn't started yet</div>
    </div>
  )
}

function FinalPanel({ detail, game }) {
  const away = detail.away_abbr || game?.away_abbr
  const home = detail.home_abbr || game?.home_abbr
  const awayWin = detail.away_score > detail.home_score
  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-ink-600 mb-4">Final</div>
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <div className="font-display font-bold text-xl text-ink-400 mb-1">{away}</div>
            <div className={`font-display font-bold text-6xl ${awayWin ? 'text-ink-50' : 'text-ink-500'}`}>{detail.away_score}</div>
            {awayWin && <div className="text-[10px] text-good-400 font-bold mt-1 uppercase tracking-wider">Win</div>}
          </div>
          <div className="text-ink-700 font-bold text-3xl">—</div>
          <div className="text-center">
            <div className="font-display font-bold text-xl text-ink-400 mb-1">{home}</div>
            <div className={`font-display font-bold text-6xl ${!awayWin ? 'text-ink-50' : 'text-ink-500'}`}>{detail.home_score}</div>
            {!awayWin && <div className="text-[10px] text-good-400 font-bold mt-1 uppercase tracking-wider">Win</div>}
          </div>
        </div>
      </div>
      {detail.linescore_innings?.length > 0 && (
        <>
          <div className="divider" />
          <Linescore
            innings={detail.linescore_innings}
            totals={detail.linescore_totals}
            awayAbbr={away} homeAbbr={home}
          />
        </>
      )}
      {detail.pitchers_used?.length > 0 && (
        <>
          <div className="divider" />
          <p className="section-title">Pitchers Used</p>
          <PitchersUsedTable pitchers={detail.pitchers_used} awayAbbr={away} homeAbbr={home} />
        </>
      )}
    </div>
  )
}

function LiveDetailPanel({ detail, loading, game }) {
  const [activeTab, setActiveTab] = useState('3d')
  const cp       = detail.current_pitcher || {}
  const ptCounts = detail.pitch_type_counts || {}
  const veloSum  = detail.pitch_type_velo_summary || {}
  const away     = detail.away_abbr || game?.away_abbr
  const home     = detail.home_abbr || game?.home_abbr

  return (
    <div className="space-y-5">

      {/* ── Top: linescore + pitcher header ── */}
      <div className="space-y-3">
        <Linescore
          innings={detail.linescore_innings || []}
          totals={detail.linescore_totals || {}}
          awayAbbr={away} homeAbbr={home}
          currentInning={detail.inning}
          inningHalf={detail.inning_half}
        />
      </div>

      <div className="divider" />

      {/* ── Pitcher hero ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="dot-live" />
            <h2 className="font-display text-2xl font-bold text-ink-50">{cp.name || 'Unknown Pitcher'}</h2>
            <span className="badge badge-brand text-[10px]">
              {cp.side === 'home' ? home : away}
            </span>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400 ml-1" />}
          </div>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="text-ink-500">facing</span>
            <span className="flex items-center gap-1.5 text-ink-200 font-medium">
              <User className="w-3.5 h-3.5 text-ink-500" />
              {cp.current_batter || '—'}
            </span>
            <span className="text-surface-600">·</span>
            <CountDisplay balls={cp.count_balls ?? 0} strikes={cp.count_strikes ?? 0} />
            <span className="text-surface-600">·</span>
            <span className="text-ink-500 text-xs">
              {detail.inning_half === 'Top' ? '▲' : '▼'}{detail.inning}
              {detail.outs != null ? `, ${detail.outs} out${detail.outs !== 1 ? 's' : ''}` : ''}
            </span>
          </div>
        </div>
        <RecentPitchStrip pitches={detail.pitch_log || []} />
      </div>

      {/* ── Stat row ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <StatItem label="ERA Today" value={cp.era_today} />
        <StatItem label="K–BB"
          value={cp.k_minus_bb != null ? (cp.k_minus_bb > 0 ? `+${cp.k_minus_bb}` : `${cp.k_minus_bb}`) : null}
          highlight={cp.k_minus_bb > 0} />
        <StatItem label="IP" value={cp.ip_str} />
        <StatItem label="Pitches" value={cp.pitch_count} sub={`${cp.strikeouts}K · ${cp.walks}BB`} />
        <StatItem label="Whiff%" value={detail.whiff_pct != null ? `${detail.whiff_pct}%` : null} />
        <StatItem label="GB%" value={detail.gb_pct != null ? `${detail.gb_pct}%` : null} />
      </div>

      <div className="divider" />

      {/* ── Pitch mix bar ── */}
      <div>
        <p className="section-title mb-2">Pitch Mix</p>
        <PitchMixBar counts={ptCounts} />
      </div>

      <div className="divider" />

      {/* ── Zone / Velo / Log tabs ── */}
      <div>
        <div className="flex gap-1 mb-4 flex-wrap">
          {[
            ['3d',    '3D Field'],
            ['zone',  'Zone Plot'],
            ['velo',  'Velocity'],
            ['log',   'Pitch Log'],
            ['staff', 'Both Staffs'],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setActiveTab(k)}
              className={activeTab === k ? 'sub-tab-active' : 'sub-tab-inactive'}>
              {l}
            </button>
          ))}
        </div>

        {activeTab === '3d' && (
          <div>
            <p className="section-title mb-3">3D Field View · Drag to rotate · Scroll to zoom</p>
            <PitchScene pitches={detail.pitch_log || []} runners={detail.runners || []} />
          </div>
        )}

        {activeTab === 'zone' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            <div>
              <p className="section-title mb-2">Strike Zone · {detail.pitch_log?.length || 0} pitches</p>
              <StrikeZonePlot pitches={detail.pitch_log || []} />
            </div>
            <div>
              <p className="section-title mb-2">Velocity Trend</p>
              <VeloSparkline
                veloTrend={detail.velo_trend || []}
                pitchTypeCounts={ptCounts}
                height={130}
              />
            </div>
          </div>
        )}

        {activeTab === 'velo' && (
          <div>
            <p className="section-title mb-3">Velocity by Pitch Type</p>
            <VeloTable summary={veloSum} counts={ptCounts} />
          </div>
        )}

        {activeTab === 'log' && (
          <div>
            <p className="section-title mb-2">Pitch Log — {detail.pitch_log?.length || 0} pitches · Most recent first</p>
            <PitchLog pitches={detail.pitch_log || []} />
          </div>
        )}

        {activeTab === 'staff' && (
          <div>
            <p className="section-title mb-3">Pitchers Used — Both Teams</p>
            <PitchersUsedTable pitchers={detail.pitchers_used || []} awayAbbr={away} homeAbbr={home} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function LivePage() {
  const [games, setGames]                 = useState([])
  const [selectedPk, setSelectedPk]       = useState(null)
  const [gameDetail, setGameDetail]        = useState(null)
  const [loadingGames, setLoadingGames]   = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [lastUpdated, setLastUpdated]     = useState(null)
  const [error, setError]                 = useState(null)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })

  const fetchGames = useCallback(async () => {
    setLoadingGames(true)
    try {
      const res = await getLiveGames()
      setGames(res.data || [])
    } catch {
      setError("Could not load today's schedule — is the backend running?")
    } finally {
      setLoadingGames(false)
    }
  }, [])

  const fetchDetail = useCallback(async (pk) => {
    setLoadingDetail(true)
    try {
      const res = await getLiveGame(pk)
      setGameDetail(res.data)
      setLastUpdated(new Date())
    } catch {
      // Keep stale data on transient poll failure
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => { fetchGames() }, [fetchGames])

  useEffect(() => {
    if (!selectedPk) return
    setGameDetail(null)
    fetchDetail(selectedPk)
    const timer = setInterval(() => fetchDetail(selectedPk), 30_000)
    return () => clearInterval(timer)
  }, [selectedPk, fetchDetail])

  const selectedGame = games.find(g => g.game_pk === selectedPk)

  const liveCount = games.filter(g => g.status === 'Live').length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-50 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #7c77ff 0%, #5649e8 60%, #3a2fc8 100%)' }}>
              <Radio className="w-[18px] h-[18px] text-white" />
            </span>
            Live Game Day
          </h1>
          <p className="panel-sub mt-1">
            {today}
            {liveCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1.5 text-good-400">
                <span className="dot-live" />
                {liveCount} game{liveCount !== 1 ? 's' : ''} in progress
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-ink-600">Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button onClick={fetchGames} className="btn-secondary text-xs gap-1.5 py-2 px-3">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-bad-500/10 border border-bad-500/25 rounded-xl px-4 py-3 text-sm text-bad-300">{error}</div>
      )}

      {/* Games grid */}
      {loadingGames ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton rounded-2xl h-[120px]" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">🌙</div>
          <p className="font-display text-lg font-semibold text-ink-300">No games today</p>
          <p className="text-ink-600 text-sm mt-1">Check back on a game day</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {games.map(g => (
            <LiveGameCard
              key={g.game_pk}
              game={g}
              isSelected={selectedPk === g.game_pk}
              onClick={() => setSelectedPk(g.game_pk)}
            />
          ))}
        </div>
      )}

      {!selectedPk && games.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-ink-600">
          <ChevronRight className="w-4 h-4" />
          Select a game to see live pitch-by-pitch details
        </div>
      )}

      {/* Detail panel */}
      {selectedPk && (
        <div className="card">
          {!gameDetail ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
              <span className="text-sm text-ink-500">Loading game data…</span>
            </div>
          ) : gameDetail.state === 'preview' ? (
            <PreviewPanel game={selectedGame} />
          ) : gameDetail.state === 'Final' || gameDetail.detailed_status === 'Final' ? (
            <FinalPanel detail={gameDetail} game={selectedGame} />
          ) : (
            <LiveDetailPanel detail={gameDetail} loading={loadingDetail} game={selectedGame} />
          )}
        </div>
      )}
    </div>
  )
}
