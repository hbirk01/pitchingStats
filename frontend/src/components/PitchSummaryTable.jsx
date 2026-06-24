import React from 'react'
import { getPitchColor, stuffColor } from '../utils/grades'
import StatTooltip from './StatTooltip'

const COL = [
  { key: 'pitch_name', label: 'Pitch', align: 'left', tip: null },
  { key: 'usage_pct', label: 'Usage%', fmt: (v) => `${v}%`, tip: null },
  { key: 'avg_velocity', label: 'Velo', fmt: (v) => `${v}`, tip: 'Velo' },
  { key: 'avg_spin_rate', label: 'Spin', fmt: (v) => v?.toFixed(0), tip: null },
  { key: 'avg_spin_efficiency', label: 'SpinEff%', fmt: (v) => `${v?.toFixed(1)}%`, tip: 'SpinEff%' },
  { key: 'avg_vaa', label: 'VAA°', fmt: (v) => v?.toFixed(2), tip: 'VAA' },
  { key: 'avg_ivb', label: 'iVB"', fmt: (v) => v?.toFixed(1), tip: 'iVB' },
  { key: 'avg_hb', label: 'HB"', fmt: (v) => v?.toFixed(1), tip: 'HB' },
  { key: 'avg_release_height', label: 'RelHt', fmt: (v) => v?.toFixed(2), tip: 'RelHt' },
  { key: 'whiff_rate', label: 'Whiff%', fmt: (v) => `${v}%`, tip: 'Whiff%' },
  { key: 'stuff_plus', label: 'Stuff+', fmt: (v) => v?.toFixed(0), tip: 'Stuff+' },
  { key: 'plv', label: 'PLV', fmt: (v) => v?.toFixed(2), tip: 'PLV' },
]

export default function PitchSummaryTable({ pitches }) {
  if (!pitches?.length) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-600">
            {COL.map((c) => (
              <th
                key={c.key}
                className={`py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${c.align === 'left' ? 'text-left' : 'text-right'}`}
              >
                {c.tip ? <StatTooltip stat={c.tip}>{c.label}</StatTooltip> : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pitches.map((p) => (
            <tr key={p.pitch_type} className="border-b border-surface-700 hover:bg-surface-700/40 transition-colors">
              {COL.map((c) => {
                const raw = p[c.key]
                const display = c.fmt ? c.fmt(raw) : raw
                return (
                  <td
                    key={c.key}
                    className={`py-2.5 px-3 ${c.align === 'left' ? 'text-left' : 'text-right'} font-mono`}
                  >
                    {c.key === 'pitch_name' ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getPitchColor(p.pitch_type) }}
                        />
                        <span className="font-semibold text-slate-200">{display}</span>
                        <span className="text-slate-600 text-xs">({p.pitch_type})</span>
                      </div>
                    ) : c.key === 'stuff_plus' ? (
                      <span className="font-bold" style={{ color: stuffColor(raw) }}>
                        {display ?? '—'}
                      </span>
                    ) : (
                      <span className="text-slate-300">{display ?? '—'}</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
