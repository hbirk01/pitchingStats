import React, { useState } from 'react'
import { User } from 'lucide-react'

const FALLBACK = 'https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/generic/headshot/67/current'

export default function PlayerPhoto({ playerId, name, size = 'md' }) {
  const [errored, setErrored] = useState(false)
  const src = `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`

  const sizeClass = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  }[size] || 'w-16 h-16'

  if (errored) {
    return (
      <div className={`${sizeClass} rounded-full bg-surface-600 border-2 border-surface-500 flex items-center justify-center flex-shrink-0`}>
        <User className="w-1/2 h-1/2 text-slate-500" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setErrored(true)}
      className={`${sizeClass} rounded-full object-cover border-2 border-surface-500 flex-shrink-0 bg-surface-700`}
    />
  )
}
