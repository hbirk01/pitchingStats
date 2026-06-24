import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { getPitchColor } from '../utils/grades'

const commandGrade = (miss) => {
  if (miss <= 3) return { label: 'Elite', color: '#10b981' }
  if (miss <= 5) return { label: 'Plus', color: '#3b82f6' }
  if (miss <= 7) return { label: 'Average', color: '#f59e0b' }
  return { label: 'Below Avg', color: '#ef4444' }
}

export default function CommandPanel({ command }) {
  if (!command?.length) return (
    <div className="text-slate-500 text-sm py-4 text-center">No command data available</div>
  )

  const sorted = [...command].sort((a, b) => a.avg_miss_dist_in - b.avg_miss_dist_in)

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500 mb-2">
        Miss distance = average displacement from median target location per pitch type (inches).
        Lower = tighter command.
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={sorted} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="#1c2540" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="pitch_type" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickFormatter={(v) => `${v}"`}
            label={{ value: 'Miss (in)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: '#0f1523', border: '1px solid #1c2540', borderRadius: 8, fontSize: 12 }}
            formatter={(v, name) => [`${v?.toFixed(2)}"`, 'Avg Miss']}
          />
          <Bar dataKey="avg_miss_dist_in" radius={[4, 4, 0, 0]}>
            {sorted.map((d) => (
              <Cell key={d.pitch_type} fill={commandGrade(d.avg_miss_dist_in).color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-2">
        {sorted.map((d) => {
          const g = commandGrade(d.avg_miss_dist_in)
          return (
            <div key={d.pitch_type} className="bg-surface-700 rounded-lg p-3 border border-surface-600">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm" style={{ color: getPitchColor(d.pitch_type) }}>
                  {d.pitch_type}
                </span>
                <span className="text-xs font-bold" style={{ color: g.color }}>{g.label}</span>
              </div>
              <div className="font-mono text-lg font-bold" style={{ color: g.color }}>
                {d.avg_miss_dist_in?.toFixed(2)}"
              </div>
              <div className="text-xs text-slate-500 mt-1">
                H: {d.miss_x_avg?.toFixed(1)}" · V: {d.miss_z_avg?.toFixed(1)}"
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
