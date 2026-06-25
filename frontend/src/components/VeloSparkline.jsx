import React from 'react'
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const PITCH_COLORS = {
  FF: '#f87171', SI: '#fb923c', FC: '#fbbf24',
  SL: '#22d3ee', ST: '#38bdf8', CU: '#60a5fa',
  KC: '#818cf8', CH: '#34d399', FS: '#2dd4bf',
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card-xs text-xs px-2 py-1 shadow-lg">
      <span className="text-ink-500">#{payload[0].payload.i + 1}: </span>
      <span className="text-ink-50 font-bold">{payload[0].value.toFixed(1)} mph</span>
    </div>
  )
}

export default function VeloSparkline({ veloTrend = [], pitchTypeCounts = {}, height = 110 }) {
  if (!veloTrend.length) {
    return <div className="text-ink-600 text-xs text-center py-6">No velocity data yet.</div>
  }

  const data = veloTrend.map((v, i) => ({ i, velo: v }))
  const avg  = data.reduce((s, d) => s + d.velo, 0) / data.length
  const min  = Math.min(...data.map(d => d.velo))
  const max  = Math.max(...data.map(d => d.velo))

  // Top pitch type by count for line color
  const topPitch = Object.entries(pitchTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const lineColor = PITCH_COLORS[topPitch] || '#6e66f8'

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <YAxis domain={[Math.floor(min) - 1, Math.ceil(max) + 1]} hide />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={avg} stroke={lineColor} strokeDasharray="3 3" strokeOpacity={0.35} />
          <Line
            type="monotone"
            dataKey="velo"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-between text-[10px] text-ink-600 mt-1 px-1">
        <span>Avg {avg.toFixed(1)} mph</span>
        <span>{data.length} pitches · {min.toFixed(1)}–{max.toFixed(1)} mph range</span>
      </div>
    </div>
  )
}
