import React from 'react'

export default function Linescore({ innings = [], totals = {}, awayAbbr, homeAbbr, currentInning, inningHalf }) {
  if (!innings.length) return null

  const maxInn = Math.max(9, innings.length)
  const displayInnings = Array.from({ length: maxInn }, (_, i) => {
    const inn = innings.find(x => x.num === i + 1)
    return inn || { num: i + 1, away_runs: null, home_runs: null }
  })

  const isCurrentAway = inningHalf === 'Top'
  const isCurrentHome = inningHalf === 'Bottom'

  return (
    <div className="overflow-x-auto">
      <table className="text-xs font-mono w-full min-w-max">
        <thead>
          <tr>
            <th className="py-1.5 px-3 text-left text-[10px] uppercase tracking-widest text-ink-600 font-bold w-16">Team</th>
            {displayInnings.map(inn => (
              <th key={inn.num}
                className={`py-1.5 px-2 text-center text-[10px] font-bold w-8 ${
                  inn.num === currentInning ? 'text-brand-300' : 'text-ink-600'
                }`}>
                {inn.num}
              </th>
            ))}
            <th className="py-1.5 px-3 text-center text-[10px] uppercase tracking-widest text-ink-500 font-bold border-l border-surface-700">R</th>
            <th className="py-1.5 px-2 text-center text-[10px] uppercase tracking-widest text-ink-600 font-bold">H</th>
            <th className="py-1.5 px-2 text-center text-[10px] uppercase tracking-widest text-ink-600 font-bold">E</th>
          </tr>
        </thead>
        <tbody>
          {/* Away row */}
          <tr className="border-t border-surface-700/60">
            <td className={`py-2 px-3 font-bold text-sm ${isCurrentAway ? 'text-ink-100' : 'text-ink-400'}`}>
              {awayAbbr || 'AWY'}
            </td>
            {displayInnings.map(inn => {
              const val = inn.away_runs
              const isCurrent = inn.num === currentInning && isCurrentAway
              return (
                <td key={inn.num}
                  className={`py-2 px-2 text-center ${
                    isCurrent ? 'text-brand-300 font-bold' : val != null ? 'text-ink-300' : 'text-ink-700'
                  }`}>
                  {isCurrent ? '▶' : val != null ? val : '·'}
                </td>
              )
            })}
            <td className="py-2 px-3 text-center font-bold text-ink-100 border-l border-surface-700">
              {totals.away?.runs ?? 0}
            </td>
            <td className="py-2 px-2 text-center text-ink-400">{totals.away?.hits ?? 0}</td>
            <td className="py-2 px-2 text-center text-ink-600">{totals.away?.errors ?? 0}</td>
          </tr>
          {/* Home row */}
          <tr className="border-t border-surface-700/60">
            <td className={`py-2 px-3 font-bold text-sm ${isCurrentHome ? 'text-ink-100' : 'text-ink-400'}`}>
              {homeAbbr || 'HME'}
            </td>
            {displayInnings.map(inn => {
              const val = inn.home_runs
              const isCurrent = inn.num === currentInning && isCurrentHome
              return (
                <td key={inn.num}
                  className={`py-2 px-2 text-center ${
                    isCurrent ? 'text-brand-300 font-bold' : val != null ? 'text-ink-300' : 'text-ink-700'
                  }`}>
                  {isCurrent ? '▶' : val != null ? val : '·'}
                </td>
              )
            })}
            <td className="py-2 px-3 text-center font-bold text-ink-100 border-l border-surface-700">
              {totals.home?.runs ?? 0}
            </td>
            <td className="py-2 px-2 text-center text-ink-400">{totals.home?.hits ?? 0}</td>
            <td className="py-2 px-2 text-center text-ink-600">{totals.home?.errors ?? 0}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
