import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts'
import { getPitchColor } from '../utils/grades'

const ELITE_THRESHOLD = -3.5
const GOOD_THRESHOLD = -4.0

export default function VAAChart({ zoneVAA }) {
  if (!zoneVAA) return null

  const data = Object.entries(zoneVAA).map(([pt, zones]) => ({
    pitch: pt,
    top: zones.top,
    overall: zones.overall,
  })).filter((d) => d.top != null)

  if (!data.length) return null

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-emerald-400" style={{ borderStyle: 'dashed' }} />
          <span>Elite threshold (−3.5°)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-blue-400" style={{ borderStyle: 'dashed' }} />
          <span>Very good (−4.0°)</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="#1c2540" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="pitch" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis
            domain={[-9, 0]}
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickFormatter={(v) => `${v}°`}
          />
          <Tooltip
            contentStyle={{ background: '#0f1523', border: '1px solid #1c2540', borderRadius: 8, fontSize: 12 }}
            formatter={(v, name) => [`${v?.toFixed(2)}°`, name === 'top' ? 'Top Zone VAA' : 'Overall VAA']}
          />
          <ReferenceLine y={ELITE_THRESHOLD} stroke="#10b981" strokeDasharray="4 2" strokeWidth={1.5} />
          <ReferenceLine y={GOOD_THRESHOLD} stroke="#3b82f6" strokeDasharray="4 2" strokeWidth={1.5} />
          <Bar dataKey="top" name="Top Zone VAA" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell
                key={d.pitch}
                fill={d.top <= ELITE_THRESHOLD ? '#10b981' : d.top <= GOOD_THRESHOLD ? '#3b82f6' : getPitchColor(d.pitch)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
