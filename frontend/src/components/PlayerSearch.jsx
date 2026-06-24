import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, X } from 'lucide-react'
import { searchPlayers } from '../utils/api'
import PlayerPhoto from './PlayerPhoto'

const SEASONS = [2026, 2025, 2024, 2023, 2022, 2021, 2020]

export default function PlayerSearch({ season, onSeasonChange }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)
  const navigate = useNavigate()

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced autocomplete
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const parts = query.trim().split(/\s+/)
    if (parts.length < 2 || query.trim().length < 4) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await searchPlayers(query.trim())
        setSuggestions(res.data || [])
        setOpen(res.data.length > 0)
      } catch {
        setError('Search failed')
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const select = (player) => {
    setQuery(player.name)
    setOpen(false)
    navigate(`/player/${player.player_id}?season=${season}&name=${encodeURIComponent(player.name)}`)
  }

  const clear = () => {
    setQuery('')
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="Search pitcher (e.g. Nick Mears, Gerrit Cole)"
            className="w-full bg-surface-700 border border-surface-500 rounded-lg pl-10 pr-9 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            autoComplete="off"
          />
          {query && (
            <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-400 animate-spin" />
          )}
        </div>

        {/* Season selector */}
        <select
          value={season}
          onChange={(e) => onSeasonChange(Number(e.target.value))}
          className="bg-surface-700 border border-surface-500 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
        >
          {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Hint */}
      {query.trim().split(/\s+/).length < 2 && query.length > 0 && (
        <div className="text-xs text-slate-600 mt-1.5 pl-1">Type first and last name to search</div>
      )}

      {error && <div className="text-xs text-red-400 mt-1.5 pl-1">{error}</div>}

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-700 border border-surface-500 rounded-xl shadow-2xl z-50 overflow-hidden">
          {suggestions.map((p) => (
            <button
              key={p.player_id}
              onMouseDown={() => select(p)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-600 transition-colors text-left border-b border-surface-600 last:border-b-0"
            >
              <PlayerPhoto playerId={p.player_id} name={p.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-100 text-sm">{p.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  MLB ID: {p.player_id}
                  {p.mlb_played_last && ` · Last active: ${p.mlb_played_last}`}
                </div>
              </div>
              <div className="text-brand-400 text-xs font-medium flex-shrink-0">View →</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
