import React, { useState, useEffect, useCallback } from 'react'
import { Radio, RefreshCw, ChevronRight, Loader2 } from 'lucide-react'
import { getLiveGames, getLiveGame } from '../utils/api'
import LiveGameCard from '../components/LiveGameCard'
import PitchLog from '../components/PitchLog'
import VeloSparkline from '../components/VeloSparkline'

const PITCH_COLORS = {
  FF: '#f87171', SI: '#fb923c', FC: '#fbbf24',
  SL: '#22d3ee', ST: '#38bdf8', CU: '#60a5fa',
  KC: '#818cf8', CH: '#34d399', FS: '#2dd4bf',
}

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
      <div className="flex gap-1">
        {[0,1,2,3].map(i => (
          <span key={i} className={`w-3 h-3 rounded-full border ${i < balls ? 'bg-good-400 border-good-400' : 'border-surface-500'}`} />
        ))}
        <span className="text-ink-600 mx-1">·</span>
        {[0,1,2].map(i => (
          <span key={i} className={`w-3 h-3 rounded-full border ${i < strikes ? 'bg-bad-400 border-bad-400' : 'border-surface-500'}`} />
        ))}
      </div>
      <span className="font-mono font-bold text-sm text-ink-200">{balls}-{strikes}</span>
    </div>
  )
}

function PitchTypeLegend({ counts }) {
  const total = Object.values(counts).reduce((s, v) => s + v, 0)
  if (!total) return null
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {sorted.map(([pt, n]) => (
        <div key={pt} className="flex items-center gap-1.5 card-xs py-1 px-2">
          <span className="w-2 h-2 rounded-full" style={{ background: PITCH_COLORS[pt] || '#6e66f8' }} />
          <span className="font-mono font-bold text-xs" style={{ color: PITCH_COLORS[pt] || '#6e66f8' }}>{pt}</span>
          <span className="text-ink-500 text-[10px]">{n} ({(n/total*100).toFixed(0)}%)</span>
        </div>
      ))}
    </div>
  )
}

function PreviewPanel({ game }) {
  return (
    <div className="text-center py-10">
      <div className="text-4xl mb-3">⚾</div>
      <div className="font-display text-xl font-bold text-ink-100 mb-1">
        {game?.away_abbr} @ {game?.home_abbr}
      </div>
      <div className="text-ink-500 text-sm mb-4">
        {game?.away_probable && game?.home_probable
          ? `${game.away_probable} vs ${game.home_probable}`
          : 'Probable pitchers TBD'}
      </div>
      <div className="inline-flex items-center gap-2 badge badge-brand">
        <span>Game hasn't started yet</span>
      </div>
    </div>
  )
}

function FinalPanel({ detail, game }) {
  return (
    <div className="text-center py-8">
      <div className="text-[10px] font-bold uppercase tracking-widest text-ink-600 mb-3">Final Score</div>
      <div className="flex items-center justify-center gap-6">
        <div className="text-center">
          <div className="font-display font-bold text-2xl text-ink-300">{detail.away_abbr || game?.away_abbr}</div>
          <div className="font-display font-bold text-5xl text-ink-50">{detail.away_score}</div>
        </div>
        <div className="text-ink-600 font-bold text-2xl">—</div>
        <div className="text-center">
          <div className="font-display font-bold text-2xl text-ink-300">{detail.home_abbr || game?.home_abbr}</div>
          <div className="font-display font-bold text-5xl text-ink-50">{detail.home_score}</div>
        </div>
      </div>
      {detail.current_pitcher?.name && (
        <div className="mt-4 text-ink-500 text-sm">
          Last pitcher: {detail.current_pitcher.name}
        </div>
      )}
    </div>
  )
}

function LiveDetailPanel({ detail, loading, game }) {
  const cp = detail.current_pitcher || {}
  const ptCounts = detail.pitch_type_counts || {}

  return (
    <div className="space-y-5">
      {/* Pitcher header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="dot-live" />
            <h2 className="font-display text-2xl font-bold text-ink-50">{cp.name || 'Unknown Pitcher'}</h2>
            <span className="badge badge-brand text-[10px] ml-1">{cp.side === 'home' ? game?.home_abbr : game?.away_abbr}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-500 flex-wrap">
            <span>vs. <span className="text-ink-300 font-medium">{cp.current_batter || '—'}</span></span>
            <span className="text-surface-600">·</span>
            <CountDisplay balls={cp.count_balls ?? 0} strikes={cp.count_strikes ?? 0} />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-600">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />}
          <span>
            {detail.inning_half === 'Top' ? '▲' : '▼'}{detail.inning}
            {detail.outs != null ? ` · ${detail.outs} out${detail.outs !== 1 ? 's' : ''}` : ''}
          </span>
          <span className="text-surface-600">·</span>
          <span className="font-display font-bold text-ink-200">
            {detail.away_score} – {detail.home_score}
          </span>
        </div>
      </div>

      <div className="divider" />

      {/* Stats + velo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Stat grid */}
        <div>
          <p className="section-title mb-3">Today's Line</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <StatItem label="ERA Today" value={cp.era_today} />
            <StatItem label="K–BB" value={cp.k_minus_bb != null ? (cp.k_minus_bb > 0 ? `+${cp.k_minus_bb}` : `${cp.k_minus_bb}`) : null} highlight={cp.k_minus_bb > 0} />
            <StatItem label="IP" value={cp.ip_str} />
            <StatItem label="Pitches" value={cp.pitch_count} sub={`${cp.strikeouts}K · ${cp.walks}BB`} />
            <StatItem label="Whiff%" value={detail.whiff_pct != null ? `${detail.whiff_pct}%` : null} />
            <StatItem label="GB%" value={detail.gb_pct != null ? `${detail.gb_pct}%` : null} />
          </div>
          <PitchTypeLegend counts={ptCounts} />
        </div>

        {/* Velocity sparkline */}
        <div>
          <p className="section-title mb-2">Velocity Trend</p>
          <VeloSparkline veloTrend={detail.velo_trend || []} pitchTypeCounts={ptCounts} height={120} />
        </div>
      </div>

      <div className="divider" />

      {/* Pitch log */}
      <div>
        <p className="section-title mb-2">Pitch Log — {detail.pitch_log?.length || 0} pitches</p>
        <PitchLog pitches={detail.pitch_log || []} />
      </div>
    </div>
  )
}

export default function LivePage() {
  const [games, setGames]             = useState([])
  const [selectedPk, setSelectedPk]   = useState(null)
  const [gameDetail, setGameDetail]    = useState(null)
  const [loadingGames, setLoadingGames]   = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [lastUpdated, setLastUpdated]  = useState(null)
  const [error, setError]              = useState(null)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const fetchGames = useCallback(async () => {
    setLoadingGames(true)
    try {
      const res = await getLiveGames()
      setGames(res.data || [])
    } catch {
      setError('Could not load today\'s schedule — is the backend running?')
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
      // Keep stale data — don't flash an error on transient poll failure
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  // Load schedule once on mount
  useEffect(() => { fetchGames() }, [fetchGames])

  // Poll detail every 30s when a game is selected
  useEffect(() => {
    if (!selectedPk) return
    setGameDetail(null)
    fetchDetail(selectedPk)
    const timer = setInterval(() => fetchDetail(selectedPk), 30_000)
    return () => clearInterval(timer)
  }, [selectedPk, fetchDetail])

  const selectedGame = games.find(g => g.game_pk === selectedPk)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-50 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c77ff 0%, #5649e8 60%, #3a2fc8 100%)' }}>
              <Radio className="w-[18px] h-[18px] text-white" />
            </span>
            Live Game Day
          </h1>
          <p className="panel-sub mt-1">{today} · Auto-refreshes every 30s</p>
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
        <div className="bg-bad-500/10 border border-bad-500/25 rounded-xl px-4 py-3 text-sm text-bad-300">
          {error}
        </div>
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

      {/* Selected game hint */}
      {!selectedPk && games.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-ink-600">
          <ChevronRight className="w-4 h-4" />
          Click a game to see live pitch-by-pitch details
        </div>
      )}

      {/* Detail panel */}
      {selectedPk && (
        <div className="card">
          {!gameDetail ? (
            <div className="flex items-center justify-center py-16 gap-3 text-ink-500">
              <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
              <span className="text-sm">Loading game data…</span>
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
