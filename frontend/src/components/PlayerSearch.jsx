import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, X, ChevronDown } from 'lucide-react'
import { searchPlayers } from '../utils/api'
import PlayerPhoto from './PlayerPhoto'

const SEASONS = [2026, 2025, 2024, 2023, 2022, 2021]

export default function PlayerSearch({ season, onSeasonChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const wrapperRef = useRef(null)
  const timer = useRef(null)

  const clear = () => { setQuery(''); setResults([]); setOpen(false); setError(null) }

  useEffect(() => {
    const handler = (e) => { if (!wrapperRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const parts = query.trim().split(/\s+/)
    if (parts.length < 2 || query.trim().length < 4) { setResults([]); setOpen(false); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true); setError(null)
      try {
        const res = await searchPlayers(query)
        setResults(res.data)
        setOpen(res.data.length > 0)
      } catch (e) {
        setError('Search failed — is the backend running?')
      } finally { setLoading(false) }
    }, 320)
  }, [query])

  const pick = (p) => {
    navigate(`/player/${p.player_id}?season=${season}&name=${encodeURIComponent(p.name)}`)
    clear()
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="flex gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-600 pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search by first and last name…"
            className="w-full bg-surface-750 border border-surface-600 rounded-xl pl-11 pr-10 py-3 text-sm text-ink-100 placeholder-ink-600 focus:outline-none focus:border-brand-500/80 focus:ring-2 focus:ring-brand-500/15 transition-all hover:border-surface-550"
          />
          {query && (
            <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg text-ink-500 hover:text-ink-300 hover:bg-surface-700 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400 animate-spin" />
          )}
        </div>

        {/* Season selector */}
        <div className="relative">
          <select
            value={season}
            onChange={e => onSeasonChange(Number(e.target.value))}
            className="appearance-none bg-surface-750 border border-surface-600 rounded-xl pl-4 pr-9 py-3 text-sm font-semibold text-ink-200 focus:outline-none focus:border-brand-500/80 hover:border-surface-550 transition-all cursor-pointer">
            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500 pointer-events-none" />
        </div>
      </div>

      <div className="text-xs text-ink-600 mt-2 pl-1 font-medium">
        Enter full name (e.g. "Gerrit Cole") · {season} season data
      </div>

      {error && <div className="text-xs text-bad-400 mt-1.5 pl-1 font-medium">{error}</div>}

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-800 border border-surface-600 rounded-2xl shadow-[0_8px_48px_rgba(0,0,0,0.6)] z-50 overflow-hidden animate-slide-up">
          {results.map((p, i) => (
            <button
              key={p.player_id}
              onClick={() => pick(p)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-750 transition-colors text-left ${
                i < results.length - 1 ? 'border-b border-surface-700/60' : ''
              }`}
            >
              <PlayerPhoto playerId={p.player_id} name={p.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink-100 text-sm">{p.name}</div>
                <div className="text-xs text-ink-500 mt-0.5 font-medium">
                  {p.team} · {p.throws}HP · {p.position}
                </div>
              </div>
              <span className="text-brand-400 text-xs font-bold shrink-0">View →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
