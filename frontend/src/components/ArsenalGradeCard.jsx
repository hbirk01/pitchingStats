import React from 'react'

const PITCH_COLORS = {
  FF: '#ef4444', SI: '#f97316', FC: '#f59e0b', SL: '#3b82f6',
  CU: '#8b5cf6', CH: '#10b981', FS: '#06b6d4', KC: '#6366f1',
  ST: '#ec4899', SV: '#84cc16', CS: '#14b8a6', OTHER: '#94a3b8',
}
const pitchColor = pt => PITCH_COLORS[pt] || PITCH_COLORS.OTHER

const GRADE_COLOR = {
  'A+': '#10b981', 'A': '#10b981', 'A-': '#34d399',
  'B+': '#60a5fa', 'B': '#60a5fa', 'B-': '#93c5fd',
  'C+': '#94a3b8', 'C': '#94a3b8', 'C-': '#64748b',
  'D':  '#f97316',
  'F':  '#ef4444',
}

const GRADE_BG = {
  'A+': 'bg-emerald-500/20 border-emerald-500/40',
  'A':  'bg-emerald-500/15 border-emerald-500/30',
  'A-': 'bg-emerald-500/10 border-emerald-500/20',
  'B+': 'bg-blue-500/20 border-blue-500/40',
  'B':  'bg-blue-500/15 border-blue-500/30',
  'B-': 'bg-blue-500/10 border-blue-500/20',
  'C+': 'bg-surface-600 border-surface-500',
  'C':  'bg-surface-600 border-surface-500',
  'C-': 'bg-surface-600 border-surface-500',
  'D':  'bg-orange-500/10 border-orange-500/30',
  'F':  'bg-red-500/10 border-red-500/30',
}

const METRIC_LABELS = {
  whiff_pct: 'Whiff%',
  run_value_per_100: 'RV/100',
  mph: 'Velo',
  k_percent: 'K%',
  put_away: 'Put-Away%',
}

export default function ArsenalGradeCard({ grades }) {
  if (!grades || Object.keys(grades).length === 0) {
    return <div className="text-slate-600 text-sm text-center py-8">No grade data available — Savant arsenal data required.</div>
  }

  const pitchTypes = Object.keys(grades).sort((a, b) => grades[b].overall_percentile - grades[a].overall_percentile)

  return (
    <div>
      {/* Summary row */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {pitchTypes.map(pt => {
          const g = grades[pt]
          return (
            <div key={pt} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${GRADE_BG[g.overall_grade] || 'bg-surface-700 border-surface-600'}`}>
              <div>
                <div className="text-xs font-semibold mb-0.5" style={{ color: pitchColor(pt) }}>{pt}</div>
                <div className="text-xs text-slate-500">{g.pitches} pitches</div>
              </div>
              <div className="text-4xl font-black" style={{ color: GRADE_COLOR[g.overall_grade] || '#94a3b8' }}>
                {g.overall_grade}
              </div>
              <div className="text-xs text-slate-500 font-mono">{g.overall_percentile}th</div>
            </div>
          )
        })}
      </div>

      {/* Detail cards per pitch */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pitchTypes.map(pt => {
          const g = grades[pt]
          const metrics = Object.entries(g.metrics || {})
          return (
            <div key={pt} className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: pitchColor(pt) }} />
                  <span className="font-bold text-slate-200">{pt}</span>
                </div>
                <span className="text-2xl font-black" style={{ color: GRADE_COLOR[g.overall_grade] || '#94a3b8' }}>
                  {g.overall_grade}
                </span>
              </div>
              <div className="space-y-2">
                {metrics.map(([col, m]) => (
                  <div key={col} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-20 flex-shrink-0">{m.label}</span>
                    <div className="flex-1 bg-surface-600 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all"
                        style={{ width: `${m.percentile}%`, background: GRADE_COLOR[m.grade] || '#60a5fa' }} />
                    </div>
                    <span className="text-xs font-mono text-slate-400 w-8 text-right">{m.percentile}th</span>
                    <span className="text-xs font-bold w-6 text-right" style={{ color: GRADE_COLOR[m.grade] }}>{m.grade}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-600 mt-2 text-right">{g.overall_percentile}th percentile overall</div>
            </div>
          )
        })}
      </div>
      <div className="text-xs text-slate-600 mt-3">Grades relative to all MLB pitchers throwing same pitch type · Source: Baseball Savant arsenal stats</div>
    </div>
  )
}
