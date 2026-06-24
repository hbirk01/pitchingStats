import React, { useState, useRef, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'

const PITCH_COLORS = {
  FF: '#ef4444', SI: '#f97316', FC: '#f59e0b', SL: '#3b82f6',
  CU: '#8b5cf6', CH: '#10b981', FS: '#06b6d4', OTHER: '#94a3b8',
}
const pitchColor = pt => PITCH_COLORS[pt] || PITCH_COLORS.OTHER

const BB_COLORS = { gb_pct: '#34d399', ld_pct: '#60a5fa', fb_pct: '#f472b6', pu_pct: '#94a3b8' }
const BB_LABELS = { gb_pct: 'GB%', ld_pct: 'LD%', fb_pct: 'FB%', pu_pct: 'PU%' }

// Spray field SVG (simplified baseball diamond overlay)
function SprayChart({ points }) {
  const W = 300, H = 300
  // MLB hc_x: 1=left, 254=right. hc_y: 1=top, 254=bottom
  // We map to our SVG coords: center ~(125, 125) in MLB coords → (W/2, H*0.8) in SVG
  const toSVG = (hcx, hcy) => {
    const x = (hcx / 254) * W
    const y = (hcy / 254) * H
    return [x, y]
  }

  const bbTypeColor = t => ({ ground_ball: '#34d399', line_drive: '#60a5fa', fly_ball: '#f472b6', popup: '#94a3b8' })[t] || '#64748b'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto">
      {/* Outfield arc */}
      <path d="M 30 270 Q 150 20 270 270" fill="none" stroke="#1e3a2f" strokeWidth="2" />
      {/* Infield diamond */}
      <polygon points="150,230 190,190 150,150 110,190" fill="none" stroke="#1e3a2f" strokeWidth="1.5" />
      {/* Foul lines */}
      <line x1="150" y1="230" x2="30" y2="60" stroke="#1e3a2f" strokeWidth="1" />
      <line x1="150" y1="230" x2="270" y2="60" stroke="#1e3a2f" strokeWidth="1" />
      {/* Home plate */}
      <circle cx="150" cy="230" r="4" fill="#334155" />
      {/* Data points */}
      {points.map((p, i) => {
        if (!p.x || !p.y) return null
        const [sx, sy] = toSVG(p.x, p.y)
        return (
          <circle key={i} cx={sx} cy={sy} r="3"
            fill={bbTypeColor(p.bb_type)} opacity="0.7" />
        )
      })}
    </svg>
  )
}

// Called strike probability 5x5 grid
function CSWGrid({ grid }) {
  if (!grid || Object.keys(grid).length === 0) return <div className="text-slate-600 text-xs text-center py-4">No called strike data</div>

  const cellColor = (csw) => {
    if (csw == null) return 'bg-surface-700 text-slate-600'
    if (csw >= 40) return 'bg-emerald-500/40 text-emerald-200'
    if (csw >= 25) return 'bg-blue-500/30 text-blue-200'
    if (csw >= 15) return 'bg-surface-600 text-slate-300'
    return 'bg-red-500/20 text-red-300'
  }

  return (
    <div>
      <div className="text-xs text-slate-500 mb-2">Called strike rate by zone (batter's POV) · green = high CSW%</div>
      <div className="grid grid-cols-5 gap-1 max-w-xs mx-auto">
        {/* Render zi=4 (top) down to zi=0 (bottom) */}
        {[4,3,2,1,0].flatMap(zi =>
          [0,1,2,3,4].map(xi => {
            const cell = grid[`${zi}_${xi}`]
            return (
              <div key={`${zi}_${xi}`}
                className={`aspect-square flex items-center justify-center text-xs font-mono rounded ${cellColor(cell?.csw)}`}>
                {cell ? `${cell.csw}%` : '—'}
              </div>
            )
          })
        )}
      </div>
      <div className="flex justify-center gap-2 mt-2 text-xs text-slate-600">
        <span>← Glove side</span>
        <span>Arm side →</span>
      </div>
    </div>
  )
}

export default function BattedBallPanel({ data }) {
  const [view, setView] = useState('profile')

  if (!data) return <div className="text-slate-600 text-sm text-center py-8">Loading batted ball data…</div>

  const { by_pitch_type, spray_points, pull_pct, center_pct, oppo_pct, csw_zone } = data

  // Chart data for GB/LD/FB by pitch type
  const chartData = Object.entries(by_pitch_type || {}).map(([pt, vals]) => ({
    pt,
    'GB%': vals.gb_pct,
    'LD%': vals.ld_pct,
    'FB%': vals.fb_pct,
    'PU%': vals.pu_pct,
    exit_velo: vals.avg_exit_velo,
    launch_angle: vals.avg_launch_angle,
  }))

  return (
    <div>
      <div className="flex gap-1 mb-5 bg-surface-700 rounded-lg p-1 w-fit">
        {[['profile','Batted Ball Profile'],['spray','Spray Chart'],['csw','Called Strike Zone']].map(([k,l]) => (
          <button key={k} onClick={() => setView(k)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === k ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {l}
          </button>
        ))}
      </div>

      {view === 'profile' && (
        <div className="space-y-4">
          {/* Pull/Center/Oppo summary */}
          {pull_pct != null && (
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Spray Direction (all BIP)</h3>
              <div className="flex gap-4 mb-3">
                {[['Pull', pull_pct,'text-red-400'],['Center', center_pct,'text-blue-400'],['Oppo', oppo_pct,'text-emerald-400']].map(([l,v,cls]) => (
                  <div key={l} className="text-center">
                    <div className={`text-2xl font-bold font-mono ${cls}`}>{v?.toFixed(1)}%</div>
                    <div className="text-xs text-slate-500 mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
              <div className="flex h-3 rounded-full overflow-hidden">
                <div style={{ width: `${pull_pct}%` }} className="bg-red-500" />
                <div style={{ width: `${center_pct}%` }} className="bg-blue-500" />
                <div style={{ width: `${oppo_pct}%` }} className="bg-emerald-500" />
              </div>
            </div>
          )}

          {/* GB/LD/FB by pitch type */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Batted Ball Type by Pitch</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <XAxis dataKey="pt" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip formatter={(v, n) => [`${v}%`, n]} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="GB%" stackId="a" fill="#34d399" />
                <Bar dataKey="LD%" stackId="a" fill="#60a5fa" />
                <Bar dataKey="FB%" stackId="a" fill="#f472b6" />
                <Bar dataKey="PU%" stackId="a" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Exit velo + launch angle table */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Contact Quality by Pitch</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-600">
                  <th className="py-2 px-3 text-left text-xs text-slate-500">Pitch</th>
                  <th className="py-2 px-3 text-right text-xs text-slate-500">BIP</th>
                  <th className="py-2 px-3 text-right text-xs text-slate-500">Exit Velo</th>
                  <th className="py-2 px-3 text-right text-xs text-slate-500">Launch Angle</th>
                  <th className="py-2 px-3 text-right text-xs text-slate-500">GB%</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(by_pitch_type || {}).map(([pt, v]) => (
                  <tr key={pt} className="border-b border-surface-700">
                    <td className="py-2 px-3 font-bold text-sm" style={{ color: pitchColor(pt) }}>{pt}</td>
                    <td className="py-2 px-3 text-right text-slate-400 font-mono text-xs">{v.n}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-slate-300">{v.avg_exit_velo ? `${v.avg_exit_velo} mph` : '—'}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-slate-300">{v.avg_launch_angle != null ? `${v.avg_launch_angle}°` : '—'}</td>
                    <td className={`py-2 px-3 text-right font-mono text-xs font-semibold ${v.gb_pct > 50 ? 'text-emerald-400' : v.gb_pct < 35 ? 'text-red-400' : 'text-slate-300'}`}>
                      {v.gb_pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'spray' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-1">Spray Chart (sample of {spray_points?.length} BIP)</h3>
          <div className="flex gap-3 text-xs mb-4">
            {[['Ground Ball','#34d399'],['Line Drive','#60a5fa'],['Fly Ball','#f472b6'],['Popup','#94a3b8']].map(([l,c]) => (
              <div key={l} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                <span className="text-slate-500">{l}</span>
              </div>
            ))}
          </div>
          {spray_points?.length > 0 ? <SprayChart points={spray_points} /> : <div className="text-slate-600 text-xs text-center py-8">No spray data available</div>}
        </div>
      )}

      {view === 'csw' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-400 mb-4">Called Strike + Whiff (CSW%) by Zone</h3>
          <CSWGrid grid={csw_zone} />
        </div>
      )}
    </div>
  )
}
