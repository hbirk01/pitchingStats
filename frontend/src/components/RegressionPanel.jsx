import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function RegressionPanel({ regression }) {
  if (!regression) return null

  const { actual_era, predicted_era, xera, era_vs_predicted, interpretation, features_used } = regression

  const eraData = [
    { label: 'Actual ERA', value: actual_era, color: '#ef4444' },
    { label: 'Predicted ERA', value: predicted_era, color: '#3b82f6' },
    { label: 'xERA', value: xera, color: '#10b981' },
  ]

  const positive = era_vs_predicted > 0

  const featureList = [
    { key: 'k_pct', label: 'K%', fmt: (v) => `${v?.toFixed(1)}%` },
    { key: 'bb_pct', label: 'BB%', fmt: (v) => `${v?.toFixed(1)}%` },
    { key: 'avg_stuff_plus', label: 'Avg Stuff+', fmt: (v) => v?.toFixed(1) },
    { key: 'avg_whiff_rate', label: 'Avg Whiff%', fmt: (v) => `${v?.toFixed(1)}%` },
    { key: 'avg_vaa', label: 'Avg VAA', fmt: (v) => `${v?.toFixed(2)}°` },
    { key: 'avg_spin_eff', label: 'Avg SpinEff%', fmt: (v) => `${v?.toFixed(1)}%` },
  ]

  return (
    <div className="space-y-6">
      {/* ERA comparison chart */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={eraData} layout="vertical" margin={{ left: 10, right: 30 }}>
          <CartesianGrid stroke="#1c2540" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, Math.max(actual_era, predicted_era, xera) * 1.3]}
            tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => v.toFixed(2)} />
          <YAxis type="category" dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} width={90} />
          <Tooltip
            contentStyle={{ background: '#0f1523', border: '1px solid #1c2540', borderRadius: 8, fontSize: 12 }}
            formatter={(v) => v.toFixed(2)}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {eraData.map((d) => <Cell key={d.label} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Interpretation */}
      <div className={`rounded-lg p-4 border ${positive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <div className={`font-semibold text-sm mb-1 ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
          {positive ? 'Positive Regression Expected' : 'Negative Regression Expected'}
        </div>
        <div className="text-sm text-slate-300">{interpretation?.description}</div>
        <div className="text-xs text-slate-500 mt-2">
          Luck component: {interpretation?.luck_component > 0 ? '+' : ''}{interpretation?.luck_component}
          {interpretation?.luck_component > 0.5 ? ' (ERA inflated by bad luck / poor sequencing)' :
           interpretation?.luck_component < -0.5 ? ' (ERA deflated — may not be sustainable)' : ' (ERA aligned with outcomes)'}
        </div>
      </div>

      {/* Feature inputs */}
      <div>
        <h4 className="text-sm font-semibold text-slate-400 mb-3">Model Inputs</h4>
        <div className="grid grid-cols-3 gap-2">
          {featureList.map((f) => (
            <div key={f.key} className="bg-surface-700 rounded-lg p-2.5 border border-surface-600">
              <div className="text-xs text-slate-500">{f.label}</div>
              <div className="font-mono font-semibold text-slate-200 text-sm mt-0.5">
                {features_used?.[f.key] != null ? f.fmt(features_used[f.key]) : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
