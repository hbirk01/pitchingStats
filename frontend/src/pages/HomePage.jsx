import React, { useState } from 'react'
import { Activity, Star, X, GitCompareArrows, TrendingUp, Zap, Target, BarChart3, ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import PlayerSearch from '../components/PlayerSearch'
import PlayerPhoto from '../components/PlayerPhoto'
import { useWatchlist } from '../hooks/useWatchlist'

const FEATURES = [
  { icon: TrendingUp,       label: 'VAA Analysis',    color: 'from-violet-500 to-indigo-600', desc: 'Vertical approach angle by zone — grades vs. the elite −3.5° threshold' },
  { icon: Zap,              label: 'Tunneling',        color: 'from-amber-500 to-orange-500',  desc: 'Pitch pair divergence at 23 ft — the art of deception, quantified' },
  { icon: BarChart3,        label: 'Arsenal Grades',   color: 'from-emerald-500 to-teal-600',  desc: 'A+–F grades per pitch type vs. league percentiles on whiff%, RV/100, velo' },
  { icon: Target,           label: 'Breakout Score',   color: 'from-rose-500 to-pink-600',     desc: 'ERA vs xERA/FIP gap + Stuff+ — spot pitchers about to outperform surface stats' },
  { icon: Activity,         label: 'Fatigue Model',    color: 'from-sky-500 to-blue-600',      desc: 'Velo, spin & command degradation as pitch count climbs — find the danger zone' },
  { icon: GitCompareArrows, label: 'Sequencing',       color: 'from-purple-500 to-violet-600', desc: 'Transition matrix: what follows what, by count and situation' },
]

export default function HomePage() {
  const [season, setSeason] = useState(2025)
  const { watchlist, remove } = useWatchlist()
  const navigate = useNavigate()

  return (
    <div className="hero-bg -mt-8 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-16 pb-20">
      <div className="max-w-2xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-brand-600/15 border border-brand-500/25 rounded-full px-4 py-1.5 text-xs font-semibold text-brand-300 mb-6">
            <span className="dot-live" />
            Live Statcast Data · 2025 Season
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4 leading-[1.1]">
            <span className="text-ink-50">Pitch</span>
            <span className="bg-gradient-to-r from-brand-400 to-violet-400 bg-clip-text text-transparent">IQ</span>
          </h1>
          <p className="text-ink-400 text-lg leading-relaxed max-w-md mx-auto">
            Advanced MLB pitcher analytics — VAA, tunneling, spin efficiency, breakout modeling, and more.
          </p>

          <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
            <Link to="/leaderboard" className="btn-primary">
              View Leaderboard <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/compare" className="btn-outline">
              <GitCompareArrows className="w-4 h-4" /> Compare Pitchers
            </Link>
          </div>
        </div>

        {/* Search card */}
        <div className="card mb-8 border-brand-500/20 shadow-glow-sm">
          <div className="section-title">Find a Pitcher</div>
          <PlayerSearch season={season} onSeasonChange={setSeason} />
        </div>

        {/* Watchlist */}
        {watchlist.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-accent-400 fill-accent-400" />
              <span className="text-sm font-bold text-ink-200">Watchlist</span>
              <span className="text-xs bg-surface-700 text-ink-500 px-2 py-0.5 rounded-full font-semibold">{watchlist.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {watchlist.map(p => (
                <div key={p.id}
                  className="shine flex items-center gap-3 bg-surface-800 border border-surface-600/60 rounded-2xl px-4 py-3 hover:border-brand-500/30 transition-all cursor-pointer group shadow-card"
                  onClick={() => navigate(`/player/${p.id}?season=${p.season || season}&name=${encodeURIComponent(p.name)}`)}>
                  <PlayerPhoto playerId={p.id} name={p.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink-100 text-sm truncate">{p.name}</div>
                    <div className="text-[11px] text-ink-500">{p.season || season} season</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); remove(p.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-ink-600 hover:text-ink-400 hover:bg-surface-700 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature grid */}
        <div>
          <div className="section-title">What's inside</div>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(f => (
              <div key={f.label} className="shine card-sm group hover:border-surface-500/80 transition-all duration-200">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-3 shadow-sm`}>
                  <f.icon className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <div className="text-sm font-bold text-ink-100 mb-1">{f.label}</div>
                <div className="text-[11px] text-ink-500 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
