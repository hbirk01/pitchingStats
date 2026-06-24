import { useState, useEffect } from 'react'

const KEY = 'pitchiq_watchlist'

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') }
    catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(watchlist))
  }, [watchlist])

  const isWatched = (playerId) => watchlist.some(p => String(p.id) === String(playerId))

  const toggle = (player) => {
    setWatchlist(prev =>
      isWatched(player.id)
        ? prev.filter(p => String(p.id) !== String(player.id))
        : [...prev, { ...player, addedAt: Date.now() }]
    )
  }

  const remove = (playerId) => setWatchlist(prev => prev.filter(p => String(p.id) !== String(playerId)))

  return { watchlist, isWatched, toggle, remove }
}
