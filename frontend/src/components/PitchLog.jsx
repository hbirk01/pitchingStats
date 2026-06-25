import React from 'react'

const PITCH_COLORS = {
  FF: 'text-red-400',
  SI: 'text-orange-400',
  FC: 'text-amber-400',
  SL: 'text-cyan-400',
  ST: 'text-sky-400',
  SV: 'text-blue-300',
  CU: 'text-blue-400',
  KC: 'text-indigo-400',
  CH: 'text-green-400',
  FS: 'text-teal-400',
  FO: 'text-teal-300',
}

const RESULT_COLORS = {
  whiff:   'text-good-300 font-bold',
  strike:  'text-good-400',
  ball:    'text-blue-400',
  foul:    'text-ink-400',
  contact: 'text-amber-300',
  other:   'text-ink-500',
}

export default function PitchLog({ pitches = [], maxRows = 60 }) {
  if (!pitches.length) {
    return <div className="text-ink-600 text-sm text-center py-6">No pitches thrown yet.</div>
  }

  return (
    <div className="overflow-y-auto max-h-[340px]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-surface-900 z-10">
          <tr>
            {['#', 'Type', 'Velo', 'Zone', 'Result', 'Count', 'Batter'].map(h => (
              <th key={h} className="py-2 px-2 text-[9px] uppercase tracking-widest text-ink-600 text-left font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pitches.slice(0, maxRows).map((p, i) => (
            <tr key={i} className={`border-b border-surface-700/40 hover:bg-surface-750/50 transition-colors ${i === 0 ? 'bg-brand-500/5' : ''}`}>
              <td className="py-1.5 px-2 text-ink-600 font-mono">{p.pitch_num}</td>
              <td className="py-1.5 px-2">
                <span className={`font-mono font-bold ${PITCH_COLORS[p.pitch_type] || 'text-ink-400'}`}>
                  {p.pitch_type}
                </span>
              </td>
              <td className="py-1.5 px-2 font-mono text-ink-200">
                {p.velo != null ? p.velo.toFixed(1) : '—'}
              </td>
              <td className="py-1.5 px-2 font-mono text-ink-500">
                {p.zone ?? '—'}
              </td>
              <td className={`py-1.5 px-2 font-mono ${RESULT_COLORS[p.result_class] || 'text-ink-400'}`}>
                {p.result_abbr}
              </td>
              <td className="py-1.5 px-2 font-mono text-ink-500">
                {p.balls}-{p.strikes}
              </td>
              <td className="py-1.5 px-2 text-ink-400 max-w-[120px] truncate">
                {p.batter}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
