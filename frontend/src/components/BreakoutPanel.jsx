import React from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import { breakoutColor, gradeClass } from '../utils/grades'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function BreakoutPanel({ analysis }) {
  if (!analysis) return null
  const { breakout_analysis, traditional, predictive, pitch_grades } = analysis
  if (!breakout_analysis) return null

  const score = breakout_analysis.breakout_score
  const components = breakout_analysis.components || {}

  const radarData = [
    { subject: 'ERA vs xERA', value: components.era_xera_component || 0, max: 30 },
    { subject: 'ERA vs FIP', value: components.era_fip_component || 0, max: 20 },
    { subject: 'Strikeouts', value: components.strikeout_component || 0, max: 20 },
    { subject: 'Walk Rate', value: components.walk_component || 0, max: 15 },
    { subject: 'Stuff+', value: components.stuff_component || 0, max: 15 },
  ]

  const eraGap = breakout_analysis.era_vs_xera_gap
  const GapIcon = eraGap > 0.5 ? TrendingUp : eraGap < -0.5 ? TrendingDown : Minus
  const gapColor = eraGap > 0.5 ? 'text-emerald-400' : eraGap < -0.5 ? 'text-red-400' : 'text-slate-400'

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1c2540" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={breakoutColor(score)}
              strokeWidth="10"
              strokeDasharray={`${(score / 100) * 263.9} 263.9`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-mono" style={{ color: breakoutColor(score) }}>{score}</span>
            <span className="text-xs text-slate-500">/100</span>
          </div>
        </div>
        <div>
          <div className="text-xl font-bold text-slate-100 mb-1">{breakout_analysis.verdict}</div>
          <div className="flex items-center gap-1.5 text-sm">
            <GapIcon className={`w-4 h-4 ${gapColor}`} />
            <span className={`font-semibold ${gapColor}`}>
              ERA is {Math.abs(eraGap?.toFixed(2))} runs {eraGap > 0 ? 'worse than' : 'better than'} xERA
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            ERA: {traditional?.era} · xERA: {predictive?.xera} · FIP: {predictive?.fip}
          </div>
        </div>
      </div>

      {/* Radar of components */}
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#1c2540" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
          <Radar
            name="Score"
            dataKey="value"
            stroke={breakoutColor(score)}
            fill={breakoutColor(score)}
            fillOpacity={0.25}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Pitch grades */}
      {pitch_grades?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-400 mb-3">Pitch Grades</h4>
          <div className="grid grid-cols-2 gap-2">
            {pitch_grades.map((p) => (
              <div key={p.pitch_type} className="bg-surface-700 rounded-lg p-3 border border-surface-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-200">{p.pitch_name} ({p.pitch_type})</span>
                  <span className={`stat-badge text-xs ${gradeClass(p.vaa_grade?.grade)}`}>
                    {p.vaa_grade?.grade}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div>
                    <div className="text-slate-500">Stuff+</div>
                    <div className="font-mono font-bold text-brand-400">{p.stuff_plus}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">PLV</div>
                    <div className="font-mono font-bold text-slate-200">{p.plv}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">VAA</div>
                    <div className="font-mono text-slate-200">{p.avg_vaa}°</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
