import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { computeTrajectory } from '../../utils/physics'
import { pitchColor } from '../../utils/pitchColors'

const ANIM_DURATION = 0.42  // seconds of animation playback

export default function PitchTrajectory({ pitch, playing, onComplete }) {
  const meshRef   = useRef()
  const timeRef   = useRef(0)
  const doneRef   = useRef(false)

  const traj = pitch ? computeTrajectory(pitch) : null

  useEffect(() => {
    timeRef.current = 0
    doneRef.current = false
    if (meshRef.current) meshRef.current.visible = !!traj
  }, [pitch, playing])

  useFrame((_, delta) => {
    if (!playing || !traj || doneRef.current || !meshRef.current) return

    timeRef.current += delta
    const t = Math.min(timeRef.current / ANIM_DURATION, 1)
    const idx = Math.floor(t * (traj.points.length - 1))
    const pt  = traj.points[idx]
    meshRef.current.position.set(pt[0], pt[1], pt[2])

    if (t >= 1 && !doneRef.current) {
      doneRef.current = true
      onComplete?.()
    }
  })

  if (!traj) return null

  const color = pitchColor(pitch.pitch_type)
  const start = traj.points[0]

  return (
    <mesh ref={meshRef} position={[start[0], start[1], start[2]]}>
      <sphereGeometry args={[0.15, 14, 14]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        roughness={0.4}
      />
    </mesh>
  )
}
