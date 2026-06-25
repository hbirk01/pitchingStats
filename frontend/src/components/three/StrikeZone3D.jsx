import React, { useMemo } from 'react'
import { Line } from '@react-three/drei'

const X_MIN = -0.83, X_MAX = 0.83
const Z_MIN =  1.50, Z_MAX = 3.50
const XW = (X_MAX - X_MIN) / 3
const ZW = (Z_MAX - Z_MIN) / 3

function whiffColor(rate) {
  if (rate === null) return { color: '#2a2a4a', opacity: 0.08 }
  // green (high whiff) → red (low whiff)
  const hue = Math.round(rate * 120)
  return { color: `hsl(${hue}, 65%, 45%)`, opacity: 0.28 + rate * 0.25 }
}

export default function StrikeZone3D({ pitches = [], lastPitch = null }) {
  const cellStats = useMemo(() => {
    const grid = Array.from({ length: 9 }, () => ({ swings: 0, whiffs: 0 }))
    pitches.forEach(p => {
      if (p.px == null || p.pz == null) return
      const col = Math.floor((p.px - X_MIN) / XW)
      const row = Math.floor((p.pz - Z_MIN) / ZW)
      if (col < 0 || col > 2 || row < 0 || row > 2) return
      const idx = row * 3 + col
      if (['whiff','strike','foul'].includes(p.result_class)) {
        grid[idx].swings++
        if (p.result_class === 'whiff') grid[idx].whiffs++
      }
    })
    return grid.map(c => ({
      rate: c.swings > 2 ? c.whiffs / c.swings : null,
    }))
  }, [pitches])

  // Zone corners for outer wireframe
  const corners = [
    [X_MIN, Z_MIN, 0], [X_MAX, Z_MIN, 0],
    [X_MAX, Z_MAX, 0], [X_MIN, Z_MAX, 0], [X_MIN, Z_MIN, 0],
  ]

  return (
    <group>
      {/* Outer zone border */}
      <Line points={corners} color="#aaaaff" lineWidth={2} opacity={0.8} transparent />

      {/* 3×3 cell fill planes */}
      {Array.from({ length: 3 }, (_, row) =>
        Array.from({ length: 3 }, (_, col) => {
          const idx = row * 3 + col
          const { color, opacity } = whiffColor(cellStats[idx].rate)
          const cx = X_MIN + (col + 0.5) * XW
          const cz = Z_MIN + (row + 0.5) * ZW
          return (
            <mesh key={idx} position={[cx, cz, 0.005]}>
              <planeGeometry args={[XW - 0.03, ZW - 0.03]} />
              <meshBasicMaterial color={color} opacity={opacity} transparent side={2} />
            </mesh>
          )
        })
      )}

      {/* Grid dividers */}
      {[1, 2].map(i => (
        <Line key={`v${i}`}
          points={[[X_MIN + i*XW, Z_MIN, 0.01], [X_MIN + i*XW, Z_MAX, 0.01]]}
          color="white" lineWidth={0.8} opacity={0.25} transparent />
      ))}
      {[1, 2].map(i => (
        <Line key={`h${i}`}
          points={[[X_MIN, Z_MIN + i*ZW, 0.01], [X_MAX, Z_MIN + i*ZW, 0.01]]}
          color="white" lineWidth={0.8} opacity={0.25} transparent />
      ))}

      {/* Plate-crossing dot for last pitch */}
      {lastPitch?.px != null && lastPitch?.pz != null && (
        <mesh position={[lastPitch.px, lastPitch.pz, 0.06]}>
          <sphereGeometry args={[0.07, 14, 14]} />
          <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1.5} />
        </mesh>
      )}
    </group>
  )
}
