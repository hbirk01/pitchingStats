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

const TABS = ['Overview', 'Pitch Arsenal', 'Arsenal Grades', 'Run Value', 'Splits', 'Zone Map', 'Trajectory', 'SIERA & Health', 'Comps', 'Season Compare', 'Sequencing', 'Batted Ball', 'Fatigue', 'Leverage', 'VAA & Spin', 'Tunneling', 'Command', 'Breakout', 'Regression']
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

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [d, b, r, sp, traj, si] = await Promise.all([
        getPitcherDashboard(playerId, season),
        getBreakoutAnalysis(playerId, season),
        getRegressionAnalysis(playerId, season),
        getPitcherSplits(playerId, season),
        getPitchTrajectories(playerId, season),
        getPitcherSIERA(playerId, season),
      ])
      setDashboard(d.data)
      setBreakout(b.data)
      setRegression(r.data)
      setSplits(sp.data)
      setTrajectory(traj.data)
      setSiera(si.data)
      // Non-blocking secondary fetches
      getPitchComps(playerId, season).then(c => setComps(c.data)).catch(() => setComps({}))
      getSeasonCompare(playerId, '2026,2025,2024,2023,2022,2021').then(c => setSeasonCompare(c.data)).catch(() => setSeasonCompare({}))
      getPitchSequencing(playerId, season).then(r => setSequencing(r.data)).catch(() => setSequencing(null))
      getArsenalGrades(playerId, season).then(r => setArsenalGrades(r.data)).catch(() => setArsenalGrades({}))
      getRecentForm(playerId, season).then(r => setRecentForm(r.data)).catch(() => setRecentForm(null))
      getBattedBall(playerId, season).then(r => setBattedBall(r.data)).catch(() => setBattedBall(null))
      getFatigue(playerId, season).then(r => setFatigue(r.data)).catch(() => setFatigue(null))
      getLeverageSplits(playerId, season).then(r => setLeverage(r.data)).catch(() => setLeverage(null))
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load data — make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [playerId, season])

  const changeSeason = (s) => setSearchParams({ season: s, name: playerName })

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
        <div className="text-red-400 font-semibold mb-2">Data Load Error</div>
        <div className="text-slate-400 text-sm mb-4">{error}</div>
        <button onClick={load} className="flex items-center gap-2 mx-auto text-sm text-brand-400 hover:text-brand-300">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    </div>
  )

  const { isWatched, toggle } = useWatchlist()
  const watched = isWatched(playerId)

  const trad = dashboard?.traditional || {}
  const pred = dashboard?.predictive || {}

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <PlayerPhoto playerId={playerId} name={playerName} size="lg" />
          <div>
            <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to search
            </Link>
            <h1 className="text-2xl font-bold text-slate-100">{playerName}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-slate-500 text-sm">{dashboard?.total_pitches?.toLocaleString()} pitches · {dashboard?.games} games · {dashboard?.ip} IP</span>
              <Link to={`/player/${playerId}/game-log?season=${season}&name=${encodeURIComponent(playerName)}`}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors border border-brand-500/30 rounded px-2 py-0.5">
                Game Log →
              </Link>
              <button
                onClick={() => toggle({ id: playerId, name: playerName, season })}
                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors ${watched ? 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10' : 'text-slate-500 border-surface-500 hover:text-yellow-400'}`}
                title={watched ? 'Remove from watchlist' : 'Add to watchlist'}>
                <Star className={`w-3 h-3 ${watched ? 'fill-yellow-400' : ''}`} />
                {watched ? 'Watching' : 'Watch'}
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {SEASONS.map((s) => (
            <button
              key={s}
              onClick={() => changeSeason(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                s === season ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label={<StatTooltip stat="ERA">ERA</StatTooltip>} value={trad.era ?? '—'} highlight />
        <StatCard label={<StatTooltip stat="XERA">xERA</StatTooltip>} value={pred.xera ?? '—'} />
        <StatCard label={<StatTooltip stat="K%">K%</StatTooltip>} value={trad.k_pct ? `${trad.k_pct}%` : '—'} />
        <StatCard label={<StatTooltip stat="BB%">BB%</StatTooltip>} value={trad.bb_pct ? `${trad.bb_pct}%` : '—'} />
        <StatCard label={<StatTooltip stat="XBA">xBA</StatTooltip>} value={pred.xba ?? '—'} />
        <StatCard label={<StatTooltip stat="XWOBA">xwOBA</StatTooltip>} value={pred.xwoba ?? '—'} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t
                ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-700'
            }`}
          >
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
