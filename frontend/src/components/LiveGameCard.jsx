import React from 'react'

const STATUS_STYLES = {
  Live:    'bg-good-400/15 text-good-300 border border-good-400/30',
  Final:   'bg-surface-700 text-ink-500 border border-surface-600',
  Preview: 'bg-brand-500/10 text-brand-300 border border-brand-500/20',
}

function formatTime(utcStr) {
  if (!utcStr) return ''
  return new Date(utcStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
}

function statusLabel(game) {
  const s = game.detailed_status || game.status
  if (game.status === 'Live') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES.Live}`}>
        <span className="dot-live" />
        {game.inning_half === 'Top' ? '▲' : '▼'}{game.inning}
        {game.outs != null ? ` · ${game.outs} out${game.outs !== 1 ? 's' : ''}` : ''}
      </span>
    )
  }
  if (game.status === 'Final') {
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES.Final}`}>Final</span>
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES.Preview}`}>
      {s === 'Warmup' ? '⏳ Warmup' : formatTime(game.game_time_utc)}
    </span>
  )
}

export default function LiveGameCard({ game, isSelected, onClick }) {
  const showScore = game.status === 'Live' || game.status === 'Final'

  return (
    <div
      onClick={onClick}
      className={`card-hover cursor-pointer transition-all duration-200 ${
        isSelected ? 'border-brand-500/60 shadow-glow-sm ring-1 ring-brand-500/20' : ''
      }`}
    >
      {/* Teams + Score */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-sm text-ink-300 tracking-wide">{game.away_abbr}</span>
            {showScore && <span className="font-display font-bold text-lg text-ink-100">{game.away_score ?? '—'}</span>}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="font-display font-bold text-sm text-ink-300 tracking-wide">{game.home_abbr}</span>
            {showScore && <span className="font-display font-bold text-lg text-ink-100">{game.home_score ?? '—'}</span>}
          </div>
        </div>
        <div className="text-ink-600 text-xs font-bold px-1">@</div>
      </div>

      {/* Status */}
      <div className="mb-2">{statusLabel(game)}</div>

      {/* Pitchers */}
      <div className="text-[10px] text-ink-600 leading-relaxed">
        {game.away_probable && <div className="truncate">A: {game.away_probable}</div>}
        {game.home_probable && <div className="truncate">H: {game.home_probable}</div>}
      </div>

      {/* Venue */}
      {game.venue && <div className="text-[9px] text-ink-700 mt-1 truncate">{game.venue}</div>}
    </div>
  )
}
