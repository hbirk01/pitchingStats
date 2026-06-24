import React, { useState } from 'react'
import { Activity, Star, X, GitCompareArrows } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import PlayerSearch from '../components/PlayerSearch'
import PlayerPhoto from '../components/PlayerPhoto'
import { useWatchlist } from '../hooks/useWatchlist'

export default function HomePage() {
  const [season, setSeason] = useState(2025)
  const { watchlist, remove } = useWatchlist()
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto mt-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-brand-600/20 border border-brand-500/30 rounded-2xl flex items-center justify-center">
            <Activity className="w-8 h-8 text-brand-400" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-3">
          Pitch<span className="text-brand-400">IQ</span>
        </h1>
        <p className="text-slate-400 text-lg">
          Advanced MLB pitcher analytics — VAA, tunneling, spin efficiency, breakout modeling
        </p>
        <div className="flex justify-center gap-3 mt-4">
          <Link to="/leaderboard" className="text-xs text-brand-400 border border-brand-500/30 rounded-lg px-3 py-1.5 hover:bg-brand-600/10 transition-colors">
            View Leaderboard →
          </Link>
          <Link to="/compare" className="flex items-center gap-1.5 text-xs text-slate-400 border border-surface-500 rounded-lg px-3 py-1.5 hover:bg-surface-700 transition-colors">
            <GitCompareArrows className="w-3.5 h-3.5" /> Compare Pitchers
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <PlayerSearch season={season} onSeasonChange={setSeason} />
      </div>

      {/* Watchlist */}
      {watchlist.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <h2 className="text-sm font-semibold text-slate-300">Watchlist</h2>
            <span className="text-xs text-slate-600">{watchlist.length} pitchers</span>
          </div>
          <div className="space-y-2">
            {watchlist.map(p => (
              <div key={p.id}
                className="flex items-center gap-3 bg-surface-700 border border-surface-600 rounded-xl px-4 py-2.5 hover:border-brand-500/30 transition-colors group">
                <PlayerPhoto playerId={p.id} name={p.name} size="sm" />
                <button
                  className="flex-1 text-left"
                  onClick={() => navigate(`/player/${p.id}?season=${p.season || season}&name=${encodeURIComponent(p.name)}`)}>
                  <div className="font-semibold text-slate-100 text-sm">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.season || season} season</div>
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-slate-400 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature callouts */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'VAA Analysis', desc: 'Vertical approach angle by zone — grades per the -3.5° elite threshold at top of zone' },
          { label: 'Tunneling', desc: 'Quantify how long pitch pairs share the same path before diverging (inches at 23 ft)' },
          { label: 'Spin Efficiency', desc: 'Active spin % from spin axis — how much generates Magnus force vs. wasted gyro spin' },
          { label: 'Arsenal Grades', desc: 'A+–F grades per pitch type vs league percentiles on whiff%, RV/100, velocity, K%' },
          { label: 'Sequencing', desc: 'Transition matrix: what pitch follows what by count and situation' },
          { label: 'Fatigue Model', desc: 'Velocity, spin, and command degradation as pitch count increases within games' },
        ].map((f) => (
          <div key={f.label} className="card border-surface-600">
            <div className="text-sm font-semibold text-brand-400 mb-1">{f.label}</div>
            <div className="text-xs text-slate-500">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
