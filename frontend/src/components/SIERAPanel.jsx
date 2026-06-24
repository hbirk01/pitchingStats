import React from 'react'

const MetricCard = ({ label, value, sub, color }) => (
  <div className="bg-surface-700 rounded-xl p-4 border border-surface-600 text-center">
    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</div>
    <div className={`text-2xl font-bold font-mono ${color || 'text-slate-100'}`}>{value ?? '—'}</div>
    {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
  </div>
)

const eraColor = (v) => {
  if (v == null) return 'text-slate-400'
  if (v < 2.5) return 'text-emerald-400'
  if (v < 3.5) return 'text-blue-400'
  if (v < 4.5) return 'text-slate-300'
  return 'text-red-400'
}

export default function SIERAPanel({ data }) {
  if (!data) return <div className="text-slate-600 text-sm text-center py-8">Loading…</div>

  const { fip, xfip, siera, components: c, velo_trend: vt, spin_trend: st, ip } = data

  return (
    <div className="space-y-6">
      {/* Core metrics */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Skill-Based ERA Estimators</h3>
        <div className="grid grid-cols-3 gap-3 mb-2">
          <MetricCard label="FIP" value={fip} color={eraColor(fip)} sub="HR/BB/K only" />
          <MetricCard label="xFIP" value={xfip} color={eraColor(xfip)} sub="Normalised HR/FB" />
          <MetricCard label="SIERA" value={siera} color={eraColor(siera)} sub="Adds GB rate" />
        </div>
        <p className="text-xs text-slate-600">
          FIP isolates HR, BB, K. xFIP regresses HR/FB to league avg (10.5%). SIERA adds groundball rate — best single-number skill estimator.
        </p>
      </div>

      {/* BIP breakdown */}
      {c && (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Batted Ball Profile</h3>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: 'GB%', value: c.gb_pct, good: 'high', thresh: 45 },
              { label: 'FB%', value: c.fb_pct, good: 'low', thresh: 40 },
              { label: 'LD%', value: c.ld_pct, good: 'low', thresh: 22 },
              { label: 'HR/FB%', value: c.hr_fb_pct, good: 'low', thresh: 12 },
            ].map(({ label, value, good, thresh }) => {
              const cls = value == null ? 'text-slate-500' :
                good === 'high' ? (value >= thresh ? 'text-emerald-400' : 'text-slate-300') :
                (value <= thresh ? 'text-emerald-400' : 'text-red-400')
              return (
                <div key={label} className="bg-surface-700 rounded-lg p-3 border border-surface-600 text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
                  <div className={`text-lg font-bold font-mono mt-1 ${cls}`}>
                    {value != null ? `${value.toFixed(1)}%` : '—'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Stacked bar */}
          {c.gb_pct != null && (
            <div>
              <div className="text-xs text-slate-600 mb-1">Batted ball mix</div>
              <div className="flex h-4 rounded-full overflow-hidden gap-px">
                <div style={{ width: `${c.gb_pct}%`, background: '#34d399' }} title={`GB ${c.gb_pct?.toFixed(1)}%`} />
                <div style={{ width: `${c.fb_pct}%`, background: '#f87171' }} title={`FB ${c.fb_pct?.toFixed(1)}%`} />
                <div style={{ width: `${c.ld_pct}%`, background: '#fbbf24' }} title={`LD ${c.ld_pct?.toFixed(1)}%`} />
              </div>
              <div className="flex gap-4 text-[10px] text-slate-500 mt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block"/>GB</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block"/>FB</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block"/>LD</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-center text-slate-500">
            {[['K', c.k], ['BB', c.bb], ['HBP', c.hbp], ['HR', c.hr]].map(([l, v]) => (
              <div key={l} className="bg-surface-800 rounded p-2">
                <div>{l}</div>
                <div className="font-mono text-slate-300 font-bold">{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Velocity & spin trend / injury flags */}
      {(vt || st) && (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Health Signals</h3>
          <div className="space-y-3">
            {vt && (
              <div className={`rounded-lg p-3 border ${vt.warning ? 'border-red-500/40 bg-red-500/5' : 'border-surface-600 bg-surface-700'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-slate-200">Velocity Trend</div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${vt.warning ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {vt.label}
                  </span>
                </div>
                <div className="flex gap-6 text-xs font-mono text-slate-400">
                  <span>Early season: <span className="text-slate-200">{vt.early_velo} mph</span></span>
                  <span>Late season: <span className="text-slate-200">{vt.late_velo} mph</span></span>
                  <span>Drop: <span className={vt.drop > 1.5 ? 'text-red-400' : 'text-emerald-400'}>{vt.drop > 0 ? '−' : '+'}{Math.abs(vt.drop)} mph</span></span>
                </div>
              </div>
            )}
            {st && (
              <div className={`rounded-lg p-3 border ${st.warning ? 'border-red-500/40 bg-red-500/5' : 'border-surface-600 bg-surface-700'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-slate-200">Spin Rate Trend</div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.warning ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {st.label}
                  </span>
                </div>
                <div className="flex gap-6 text-xs font-mono text-slate-400">
                  <span>Early: <span className="text-slate-200">{st.early_spin} rpm</span></span>
                  <span>Late: <span className="text-slate-200">{st.late_spin} rpm</span></span>
                  <span>Drop: <span className={st.drop > 100 ? 'text-red-400' : 'text-emerald-400'}>−{st.drop} rpm</span></span>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-2">Velocity drop &gt;1.5 mph or spin drop &gt;100 rpm from first third to last third of season may indicate fatigue or injury.</p>
        </div>
      )}
    </div>
  )
}
