import React, { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { computeTrajectory } from '../../utils/physics'
import { pitchColor } from '../../utils/pitchColors'

export default function GhostTrails({ pitches = [], maxTrails = 6 }) {
  const trails = useMemo(() => {
    return pitches
      .slice(0, maxTrails)
      .map((p, i) => {
        const traj = computeTrajectory(p, 32)
        if (!traj) return null
        return {
          points: traj.points,
          color: pitchColor(p.pitch_type),
          // older pitches are more faded
          opacity: Math.max(0.08, 0.55 - i * 0.09),
          lineWidth: Math.max(0.5, 1.8 - i * 0.25),
          pitch_num: p.pitch_num,
        }
      })
      .filter(Boolean)
  }, [pitches, maxTrails])

  return (
    <group>
      {trails.map(t => (
        <Line
          key={t.pitch_num}
          points={t.points}
          color={t.color}
          lineWidth={t.lineWidth}
          opacity={t.opacity}
          transparent
        />
      ))}
    </group>
  )
}
