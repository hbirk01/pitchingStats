import React from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { getPitchColor } from '../utils/grades'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-xs">
      <div className="font-semibold text-slate-200 mb-1">{d.pitch_type}</div>
      <div className="text-slate-400">HB: <span className="text-slate-200">{d.pfx_x_in}"</span></div>
      <div className="text-slate-400">iVB: <span className="text-slate-200">{d.pfx_z_in}"</span></div>
      <div className="text-slate-400">Velo: <span className="text-slate-200">{d.velocity} mph</span></div>
    </div>
  )
}

export default function MovementChart({ data }) {
  if (!data?.length) return null

  // Group by pitch type
  const grouped = {}
  data.forEach((d) => {
    if (!grouped[d.pitch_type]) grouped[d.pitch_type] = []
    grouped[d.pitch_type].push(d)
  })

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid stroke="#1c2540" strokeDasharray="3 3" />
        <XAxis
          type="number" dataKey="pfx_x_in"
          name="Horizontal Break"
          label={{ value: 'Horizontal Break (in)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }}
          tickFormatter={(v) => `${v}"`}
          tick={{ fill: '#64748b', fontSize: 11 }}
          domain={[-25, 25]}
        />
        <YAxis
          type="number" dataKey="pfx_z_in"
          name="Induced VB"
          label={{ value: 'Induced VB (in)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
          tickFormatter={(v) => `${v}"`}
          tick={{ fill: '#64748b', fontSize: 11 }}
          domain={[-25, 25]}
        />
        <ReferenceLine x={0} stroke="#334155" />
        <ReferenceLine y={0} stroke="#334155" />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
        {Object.entries(grouped).map(([pt, pts]) => (
          <Scatter
            key={pt}
            name={pt}
            data={pts}
            fill={getPitchColor(pt)}
            opacity={0.85}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  )
}
