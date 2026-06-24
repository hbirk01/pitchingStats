import React from 'react'
import { getPitchColor } from '../utils/grades'

const gradeColor = (dist) => {
  if (dist <= 2) return 'text-emerald-400'
  if (dist <= 4) return 'text-blue-400'
  if (dist <= 6) return 'text-cyan-400'
  if (dist <= 8) return 'text-yellow-400'
  return 'text-red-400'
}

const gradeLabel = (dist) => {
  if (dist <= 2) return 'Elite'
  if (dist <= 4) return 'Plus'
  if (dist <= 6) return 'Above Avg'
  if (dist <= 8) return 'Average'
  return 'Below Avg'
}

export default function TunnelingPanel({ tunneling }) {
  if (!tunneling?.length) return (
    <div className="text-slate-500 text-sm py-4 text-center">No tunneling data available</div>
  )

  return (
    <div className="space-y-3">
      {tunneling.map((t) => (
        <div key={t.pair} className="bg-surface-700 border border-surface-500 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getPitchColor(t.pitch_a) }}
              />
              <span className="font-semibold text-slate-200">{t.pitch_a}</span>
              <span className="text-slate-500 text-xs">vs</span>
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getPitchColor(t.pitch_b) }}
              />
              <span className="font-semibold text-slate-200">{t.pitch_b}</span>
            </div>
            <span className={`text-sm font-bold ${gradeColor(t.avg_tunnel_dist_in)}`}>
              {gradeLabel(t.avg_tunnel_dist_in)}
            </span>
          </div>

          <div className="flex items-end gap-1 mb-2">
            <span className={`text-3xl font-bold font-mono ${gradeColor(t.avg_tunnel_dist_in)}`}>
              {t.avg_tunnel_dist_in?.toFixed(2)}
            </span>
            <span className="text-slate-500 text-sm mb-1">inches at 23 ft</span>
          </div>

          {/* Visual bar */}
          <div className="mt-2">
            <div className="h-2 bg-surface-600 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (t.avg_tunnel_dist_in / 12) * 100)}%`,
                  backgroundColor: t.avg_tunnel_dist_in <= 2 ? '#10b981' :
                    t.avg_tunnel_dist_in <= 4 ? '#3b82f6' :
                    t.avg_tunnel_dist_in <= 6 ? '#06b6d4' :
                    t.avg_tunnel_dist_in <= 8 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>Elite (0")</span>
              <span>Below (12")</span>
            </div>
          </div>
        </div>
      ))}

      <div className="text-xs text-slate-600 mt-1">
        Tunnel distance measured at 23 ft from plate — distance between two pitch paths at that point.
        Shorter = harder for hitter to differentiate pitches.
      </div>
    </div>
  )
}
