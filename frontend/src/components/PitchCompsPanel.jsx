import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPitchColor } from '../utils/grades'
import PlayerPhoto from './PlayerPhoto'

const PITCH_LABELS = {
  FF: '4-Seam FB', SI: 'Sinker', FC: 'Cutter', SL: 'Slider',
  CU: 'Curveball', CH: 'Changeup', FS: 'Splitter', ST: 'Sweeper',
  SV: 'Slurve', KC: 'Knuckle-Curve',
}

function SimBar({ sim }) {
  const pct = Math.round((sim ?? 0) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-600 rounded-full overflow-hidden">
        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-400 w-8">{pct}%</span>
    </div>
  )
}

function CompRow({ comp, season }) {
  const navigate = useNavigate()
  const goTo = () => {
    if (comp.player_id) navigate(`/player/${comp.player_id}?season=${season}&name=${encodeURIComponent(comp.name || '')}`)
  }
  return (
    <div className={`flex items-center gap-3 py-3 border-b border-surface-700 last:border-b-0 ${comp.player_id ? 'cursor-pointer hover:bg-surface-700/50 transition-colors rounded-lg px-2 -mx-2' : ''}`}
      onClick={goTo}>
      <PlayerPhoto playerId={comp.player_id} name={comp.name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-200 truncate">{comp.name || 'Unknown'}</div>
        <SimBar sim={comp.similarity} />
      </div>
      <div className="grid grid-cols-4 gap-3 text-xs font-mono text-center">
        <div>
          <div className="text-slate-500">mph</div>
          <div className="text-slate-200">{comp.mph?.toFixed(1) ?? '—'}</div>
        </div>
        <div>
          <div className="text-slate-500">Whiff%</div>
          <div className={`${(comp.whiff_pct ?? 0) > 30 ? 'text-emerald-400' : (comp.whiff_pct ?? 0) < 18 ? 'text-red-400' : 'text-slate-200'}`}>
            {comp.whiff_pct?.toFixed(1) ?? '—'}%
          </div>
        </div>
        <div>
          <div className="text-slate-500">K%</div>
          <div className="text-slate-200">{comp.k_percent?.toFixed(1) ?? '—'}%</div>
        </div>
        <div>
          <div className="text-slate-500">RV/100</div>
          <div className={comp.run_value_per_100 < 0 ? 'text-emerald-400' : comp.run_value_per_100 > 0 ? 'text-red-400' : 'text-slate-200'}>
            {comp.run_value_per_100 != null ? (comp.run_value_per_100 > 0 ? '+' : '') + comp.run_value_per_100.toFixed(2) : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PitchCompsPanel({ comps, season, playerName }) {
  const [activePt, setActivePt] = useState(null)

  if (!comps || Object.keys(comps).length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        <div className="mb-2">No comparable pitchers found.</div>
        <div className="text-xs text-slate-600">Requires Baseball Savant pitch arsenal data — may not be available for all pitchers or seasons.</div>
      </div>
    )
  }

  const pitchTypes = Object.keys(comps)
  const active = activePt || pitchTypes[0]
  const ptData = comps[active]

  return (
    <div>
      {/* Pitch type tabs */}
      <div className="flex gap-1 mb-5 flex-wrap">
        {pitchTypes.map(pt => (
          <button key={pt}
            onClick={() => setActivePt(pt)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active === pt ? 'text-white' : 'text-slate-400 hover:text-slate-200 bg-surface-700'}`}
            style={active === pt ? { background: getPitchColor(pt) + 'cc', border: `1px solid ${getPitchColor(pt)}` } : {}}>
            <span className="w-2 h-2 rounded-full" style={{ background: getPitchColor(pt) }} />
            {PITCH_LABELS[pt] || pt}
          </button>
        ))}
      </div>

      {ptData && (
        <div className="space-y-4">
          {/* Target stats */}
          <div className="bg-surface-700 rounded-xl p-4 border border-surface-600">
            <div className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wider">
              {playerName || 'Player'} — {PITCH_LABELS[active] || active}
            </div>
            <div className="grid grid-cols-4 gap-4 text-center text-xs font-mono">
              {[
                { label: 'Velocity', value: ptData.target.mph?.toFixed(1), unit: 'mph' },
                { label: 'Whiff%', value: ptData.target.whiff_pct?.toFixed(1), unit: '%' },
                { label: 'K%', value: ptData.target.k_percent?.toFixed(1), unit: '%' },
                { label: 'xBA', value: ptData.target.xba?.toFixed(3), unit: '' },
              ].map(({ label, value, unit }) => (
                <div key={label}>
                  <div className="text-slate-500 mb-1">{label}</div>
                  <div className="text-lg font-bold text-brand-400">{value ?? '—'}{value ? unit : ''}</div>
                </div>
              ))}
            </div>
            {ptData.target.run_value_per_100 != null && (
              <div className="mt-3 text-center text-xs">
                <span className="text-slate-500">Run Value/100: </span>
                <span className={`font-mono font-bold ${ptData.target.run_value_per_100 < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {ptData.target.run_value_per_100 > 0 ? '+' : ''}{ptData.target.run_value_per_100?.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Comps list */}
          <div className="card">
            <div className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wider">
              Most Similar Pitchers — {PITCH_LABELS[active] || active}
            </div>
            <div className="text-[10px] text-slate-600 mb-3">
              Cosine similarity on velocity, whiff%, K%, put_away, xBA, RV/100 · Click a player to view their dashboard
            </div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-1 pb-2 border-b border-surface-600">
              <div className="w-8" />
              <div className="flex-1 text-[10px] text-slate-600 font-semibold uppercase">Player · Match %</div>
              <div className="grid grid-cols-4 gap-3 text-[10px] text-slate-600 font-semibold uppercase text-center w-48">
                <div>mph</div><div>Whiff%</div><div>K%</div><div>RV/100</div>
              </div>
            </div>
            {ptData.comps.map((comp, i) => (
              <CompRow key={i} comp={comp} season={season} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
