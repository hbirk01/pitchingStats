import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Loader2, ArrowLeft, RefreshCw, Star } from 'lucide-react'
import {
  getPitcherDashboard, getBreakoutAnalysis, getRegressionAnalysis
} from '../utils/api'
import StatCard from '../components/StatCard'
import PitchSummaryTable from '../components/PitchSummaryTable'
import MovementChart from '../components/MovementChart'
import VAAChart from '../components/VAAChart'
import TunnelingPanel from '../components/TunnelingPanel'
import BreakoutPanel from '../components/BreakoutPanel'
import RegressionPanel from '../components/RegressionPanel'
import CommandPanel from '../components/CommandPanel'
import PlayerPhoto from '../components/PlayerPhoto'
import StatTooltip from '../components/StatTooltip'
import ZoneHeatmap from '../components/ZoneHeatmap'
import SplitsPanel from '../components/SplitsPanel'
import PitchRunValuePanel from '../components/PitchRunValuePanel'
import TrajectoryCanvas from '../components/TrajectoryCanvas'
import SIERAPanel from '../components/SIERAPanel'
import PitchCompsPanel from '../components/PitchCompsPanel'
import SeasonComparePanel from '../components/SeasonComparePanel'
import SequencingPanel from '../components/SequencingPanel'
import ArsenalGradeCard from '../components/ArsenalGradeCard'
import RecentFormPanel from '../components/RecentFormPanel'
import BattedBallPanel from '../components/BattedBallPanel'
import FatiguePanel from '../components/FatiguePanel'
import { getPitcherSplits, getPitchTrajectories, getPitcherSIERA, getPitchComps, getSeasonCompare, getPitchSequencing, getArsenalGrades, getRecentForm, getBattedBall, getFatigue, getLeverageSplits } from '../utils/api'
import { useWatchlist } from '../hooks/useWatchlist'
import LeverageSplitsPanel from '../components/LeverageSplitsPanel'

const TAB_GROUPS = [
  { label: 'Core',       tabs: ['Overview', 'Pitch Arsenal', 'Arsenal Grades', 'Run Value'] },
  { label: 'Situational',tabs: ['Splits', 'Leverage', 'Sequencing', 'Batted Ball'] },
  { label: 'Mechanics',  tabs: ['Zone Map', 'Trajectory', 'VAA & Spin', 'Tunneling', 'Command', 'Fatigue'] },
  { label: 'Analytics',  tabs: ['Season Compare', 'SIERA & Health', 'Comps', 'Breakout', 'Regression'] },
]
const ALL_TABS = TAB_GROUPS.flatMap(g => g.tabs)
const SEASONS = [2026, 2025, 2024, 2023, 2022, 2021]

export default function PlayerDashboard() {
  const { playerId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const season = Number(searchParams.get('season') || 2025)
  const playerName = searchParams.get('name') || `Player #${playerId}`

  const [dashboard, setDashboard] = useState(null)
  const [breakout, setBreakout] = useState(null)
  const [regression, setRegression] = useState(null)
  const [splits, setSplits] = useState(null)
  const [trajectory, setTrajectory] = useState(null)
  const [siera, setSiera] = useState(null)
  const [comps, setComps] = useState(null)
  const [seasonCompare, setSeasonCompare] = useState(null)
  const [sequencing, setSequencing] = useState(null)
  const [arsenalGrades, setArsenalGrades] = useState(null)
  const [recentForm, setRecentForm] = useState(null)
  const [battedBall, setBattedBall] = useState(null)
  const [fatigue, setFatigue] = useState(null)
  const [leverage, setLeverage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('Overview')
  const [activeGroup, setActiveGroup] = useState('Core')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const safe = (p) => p.then(r => r.data).catch(() => null)
      const [d, b, r, sp, traj, si] = await Promise.all([
        getPitcherDashboard(playerId, season).then(r => r.data).catch(err => {
          // Hard fail only if the server is completely unreachable (network error)
          if (!err.response) throw err
          return null
        }),
        safe(getBreakoutAnalysis(playerId, season)),
        safe(getRegressionAnalysis(playerId, season)),
        safe(getPitcherSplits(playerId, season)),
        safe(getPitchTrajectories(playerId, season)),
        safe(getPitcherSIERA(playerId, season)),
      ])
      setDashboard(d)
      setBreakout(b)
      setRegression(r)
      setSplits(sp)
      setTrajectory(traj)
      setSiera(si)
      // Non-blocking secondary fetches
      safe(getPitchComps(playerId, season)).then(setComps)
      safe(getSeasonCompare(playerId, '2026,2025,2024,2023,2022,2021')).then(setSeasonCompare)
      safe(getPitchSequencing(playerId, season)).then(setSequencing)
      safe(getArsenalGrades(playerId, season)).then(setArsenalGrades)
      safe(getRecentForm(playerId, season)).then(setRecentForm)
      safe(getBattedBall(playerId, season)).then(setBattedBall)
      safe(getFatigue(playerId, season)).then(setFatigue)
      safe(getLeverageSplits(playerId, season)).then(setLeverage)
    } catch (err) {
      setError('Could not reach the backend — make sure the server is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [playerId, season])

  const changeSeason = (s) => setSearchParams({ season: s, name: playerName })

  const { isWatched, toggle } = useWatchlist()
  const watched = isWatched(playerId)

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-brand-400" />
      <div className="text-slate-400 text-sm">Fetching Statcast data from Baseball Savant…</div>
      <div className="text-slate-600 text-xs">This may take 15–30 seconds on first load</div>
    </div>
  )

  if (error) return (
    <div className="max-w-xl mx-auto mt-16">
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <div className="text-red-400 font-semibold mb-2">Connection Error</div>
        <div className="text-slate-400 text-sm mb-4">{error}</div>
        <button onClick={load} className="flex items-center gap-2 mx-auto text-sm text-brand-400 hover:text-brand-300">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    </div>
  )

  if (!dashboard) return (
    <div className="max-w-xl mx-auto mt-16">
      <div className="bg-surface-800 border border-surface-650 rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">⚾</div>
        <div className="font-display text-lg font-bold text-ink-100 mb-2">No data for {playerName} in {season}</div>
        <div className="text-ink-500 text-sm mb-5">This player may not have pitched in {season}, or data isn't available yet.</div>
        <div className="flex gap-3 justify-center flex-wrap">
          {[2026,2025,2024,2023].map(s => (
            <button key={s} onClick={() => changeSeason(s)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${s === season ? 'bg-brand-600 text-white' : 'bg-surface-700 text-ink-300 hover:bg-surface-650'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const trad = dashboard?.traditional || {}
  const pred = dashboard?.predictive || {}
  const statcastAvailable = dashboard?.statcast_available !== false

  const switchGroup = (grp) => {
    setActiveGroup(grp)
    const firstTab = TAB_GROUPS.find(g => g.label === grp)?.tabs[0]
    if (firstTab) setActiveTab(firstTab)
  }

  return (
    <div>
      {/* ── Player Banner ── */}
      <div className="player-banner rounded-2xl p-5 sm:p-6 mb-6 bg-dots">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-300 mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to search
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Left: photo + identity */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-brand-400/40 to-cyan-400/20 blur-sm" />
              <div className="relative">
                <PlayerPhoto playerId={playerId} name={playerName} size="xl" />
              </div>
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink-50 leading-tight tracking-tight">{playerName}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-sm text-ink-500 font-medium">{dashboard?.total_pitches?.toLocaleString()} pitches</span>
                <span className="text-surface-550">·</span>
                <span className="text-sm text-ink-500 font-medium">{dashboard?.games} G</span>
                <span className="text-surface-550">·</span>
                <span className="text-sm text-ink-500 font-medium">{dashboard?.ip} IP</span>
                <Link to={`/player/${playerId}/game-log?season=${season}&name=${encodeURIComponent(playerName)}`}
                  className="badge badge-brand text-[11px] hover:bg-brand-500/25 transition-colors">
                  Game Log →
                </Link>
                <button
                  onClick={() => toggle({ id: playerId, name: playerName, season })}
                  className={`badge transition-colors ${watched
                    ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30 hover:bg-amber-400/20'
                    : 'bg-surface-700 text-ink-500 border border-surface-550 hover:text-amber-300 hover:border-amber-400/30'}`}>
                  <Star className={`w-3 h-3 ${watched ? 'fill-amber-300' : ''}`} />
                  {watched ? 'Watching' : 'Watch'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: season picker */}
          <div className="flex gap-1 flex-wrap">
            {SEASONS.map(s => (
              <button key={s} onClick={() => changeSeason(s)}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all duration-150 ${
                  s === season
                    ? 'text-white shadow-glow-xs'
                    : 'bg-surface-750/60 text-ink-500 hover:text-ink-200 hover:bg-surface-700 border border-surface-650/60'
                }`}
                style={s === season ? { background: 'linear-gradient(135deg, #7c77ff, #5649e8)' } : {}}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Stat bar */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-5 pt-4 border-t border-surface-650/50">
          {[
            { label: 'ERA',   val: trad.era ?? '—',                  tip: 'ERA' },
            { label: 'xERA',  val: pred.xera ?? '—',                 tip: 'XERA' },
            { label: 'K%',    val: trad.k_pct ? `${trad.k_pct}%`:'—', tip: 'K%' },
            { label: 'BB%',   val: trad.bb_pct ? `${trad.bb_pct}%`:'—', tip: 'BB%' },
            { label: 'xBA',   val: pred.xba ?? '—',                  tip: 'XBA' },
            { label: 'xwOBA', val: pred.xwoba ?? '—',                tip: 'XWOBA' },
          ].map(({ label, val, tip }) => (
            <div key={label} className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-600 font-display mb-1">
                <StatTooltip stat={tip}>{label}</StatTooltip>
              </div>
              <div className="font-display text-2xl font-bold text-ink-50 count-up">{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── No Statcast banner ── */}
      {!statcastAvailable && (
        <div className="mb-5 flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 text-sm text-amber-300">
          <span className="text-lg leading-none mt-0.5">⚠</span>
          <div>
            <span className="font-semibold">Statcast data unavailable for {season}.</span>
            <span className="text-amber-400/70 ml-2">Traditional stats are shown where available. Pitch-level analytics require Statcast data — try an earlier season or check back once more games are tracked.</span>
          </div>
        </div>
      )}

      {/* ── Tab navigation: group level ── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="tab-group-bar">
          {TAB_GROUPS.map(g => (
            <button key={g.label} onClick={() => switchGroup(g.label)}
              className={activeGroup === g.label ? 'tab-group-active' : 'tab-group-inactive'}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab level */}
      <div className="sub-tab-bar mb-6">
        {TAB_GROUPS.find(g => g.label === activeGroup)?.tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={activeTab === t ? 'sub-tab-active' : 'sub-tab-inactive'}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
          <RecentFormPanel data={recentForm} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 mb-4">Movement Profile</h3>
              <MovementChart data={dashboard?.movement_profile} />
            </div>
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 mb-4">Breakout Score</h3>
              <BreakoutPanel analysis={breakout} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Pitch Arsenal' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-4">Pitch Arsenal — Full Metrics</h3>
          <PitchSummaryTable pitches={breakout?.pitch_grades || dashboard?.pitch_summary} />
        </div>
      )}

      {activeTab === 'Arsenal Grades' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-100">Arsenal Grade Card</h3>
            <p className="text-xs text-slate-500 mt-1">Letter grades A+–F based on league percentile rank vs all pitchers throwing the same pitch type.</p>
          </div>
          <ArsenalGradeCard grades={arsenalGrades} />
        </div>
      )}

      {activeTab === 'Run Value' && (
        <div className="card">
          <PitchRunValuePanel
            pitchRunValue={dashboard?.pitch_run_value}
            releaseConsistency={dashboard?.release_consistency}
          />
        </div>
      )}

      {activeTab === 'Splits' && (
        <SplitsPanel splits={splits} />
      )}

      {activeTab === 'Zone Map' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-1">Strike Zone Heatmap</h3>
          <p className="text-xs text-slate-600 mb-4">
            5×5 grid from batter's POV. Toggle metric and pitch type. Hover cells for full detail.
          </p>
          <ZoneHeatmap heatmap={splits?.heatmap} />
        </div>
      )}

      {activeTab === 'Trajectory' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-1">Pitch Trajectory Animation</h3>
          <p className="text-xs text-slate-600 mb-4">
            3D kinematics from Statcast: pos(t) = pos₀ + v₀t + ½at². Sample of {trajectory?.pitches?.length ?? 0} pitches. Toggle pitch types, scrub timeline.
          </p>
          <TrajectoryCanvas data={trajectory} />
        </div>
      )}

      {activeTab === 'SIERA & Health' && (
        <div className="card">
          <SIERAPanel data={siera} />
        </div>
      )}

      {activeTab === 'Comps' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-100">Pitch Comps</h3>
            <p className="text-xs text-slate-500 mt-1">
              Most similar pitches league-wide by cosine similarity on velocity, induced VB, HB, and VAA. Click any player to view their dashboard.
            </p>
          </div>
          <PitchCompsPanel comps={comps} season={season} playerName={playerName} />
        </div>
      )}

      {activeTab === 'Season Compare' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-100">Season Over Season</h3>
            <p className="text-xs text-slate-500 mt-1">
              Key metrics compared across 2021–2026. Δ column = change from earliest to most recent season.
            </p>
          </div>
          <SeasonComparePanel data={seasonCompare} playerName={playerName} />
        </div>
      )}

      {activeTab === 'Sequencing' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-100">Pitch Sequencing</h3>
            <p className="text-xs text-slate-500 mt-1">Transition matrix shows what pitch follows what. Count and situation views reveal tendencies hitters can exploit.</p>
          </div>
          <SequencingPanel data={sequencing} />
        </div>
      )}

      {activeTab === 'Batted Ball' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-100">Batted Ball Profile</h3>
            <p className="text-xs text-slate-500 mt-1">GB/LD/FB rates by pitch type, spray direction, exit velocity, and called strike probability by zone.</p>
          </div>
          <BattedBallPanel data={battedBall} />
        </div>
      )}

      {activeTab === 'Fatigue' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-100">Fatigue Model</h3>
            <p className="text-xs text-slate-500 mt-1">Velocity, spin, and command degradation as pitch count increases within games. Useful for identifying bullpen usage thresholds.</p>
          </div>
          <FatiguePanel data={fatigue} />
        </div>
      )}

      {activeTab === 'Leverage' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-100">Leverage & Situation Splits</h3>
            <p className="text-xs text-slate-500 mt-1">How does this pitcher perform when the pressure is on? Runners on base, RISP, late innings.</p>
          </div>
          <LeverageSplitsPanel data={leverage} />
        </div>
      )}

      {activeTab === 'VAA & Spin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 mb-1">Vertical Approach Angle by Zone</h3>
            <p className="text-xs text-slate-600 mb-4">
              Elite threshold: −3.5° at top of zone (per Harig analysis). Lower (less negative) = flatter = harder to elevate.
            </p>
            <VAAChart zoneVAA={dashboard?.zone_vaa} />
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 mb-4">Per-Pitch VAA Grades</h3>
            <div className="space-y-3">
              {Object.entries(dashboard?.zone_vaa || {}).map(([pt, zones]) => (
                <div key={pt} className="bg-surface-700 rounded-lg p-3 border border-surface-600">
                  <div className="font-semibold text-slate-200 mb-2">{pt}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {['top', 'middle', 'bottom'].map((z) => (
                      <div key={z}>
                        <div className="text-slate-500 capitalize">{z} zone</div>
                        <div className={`font-mono font-bold mt-0.5 ${
                          zones[z] >= -3.5 ? 'text-emerald-400' :
                          zones[z] >= -4.0 ? 'text-blue-400' : 'text-slate-300'
                        }`}>
                          {zones[z] != null ? `${zones[z]}°` : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Tunneling' && (
        <div className="card max-w-2xl">
          <h3 className="text-sm font-semibold text-slate-400 mb-1">Pitch Tunneling</h3>
          <p className="text-xs text-slate-600 mb-4">
            How long two pitches share the same flight path. Distance measured at 23 ft from home plate (~0.15 sec of decision time remaining).
          </p>
          <TunnelingPanel tunneling={dashboard?.tunneling} />
        </div>
      )}

      {activeTab === 'Command' && (
        <div className="card max-w-2xl">
          <h3 className="text-sm font-semibold text-slate-400 mb-1">Command Quantification</h3>
          <p className="text-xs text-slate-600 mb-4">
            Average miss distance from median intended location per pitch type. Approximates "what was the miss from target?"
          </p>
          <CommandPanel command={dashboard?.command} />
        </div>
      )}

      {activeTab === 'Breakout' && (
        <div className="card max-w-2xl">
          <h3 className="text-sm font-semibold text-slate-400 mb-4">Breakout Candidate Analysis</h3>
          <BreakoutPanel analysis={breakout} />
        </div>
      )}

      {activeTab === 'Regression' && (
        <div className="card max-w-2xl">
          <h3 className="text-sm font-semibold text-slate-400 mb-1">ERA Regression Model</h3>
          <p className="text-xs text-slate-600 mb-4">
            Predicted ERA from peripheral metrics (xERA, K%, BB%, Stuff+, VAA, Spin Efficiency). Gap = luck vs. skill decomposition.
          </p>
          <RegressionPanel regression={regression} />
        </div>
      )}
    </div>
  )
}
