import React from 'react'
import * as THREE from 'three'

// Base positions in Three.js space (feet). Home plate = [0,0,0], pitcher at Z≈+55.
// Bases are 90ft apart. 1B is at (+63.6, 0, -63.6), 2B at (0, 0, -90), 3B at (-63.6, 0, -63.6).
const BASE_POS = {
  1: [ 63.64, 0.05, -63.64],
  2: [ 0,     0.05, -90   ],
  3: [-63.64, 0.05, -63.64],
}

function Basepath({ from, to }) {
  const mid = [(from[0]+to[0])/2, 0.02, (from[2]+to[2])/2]
  const dx = to[0] - from[0]
  const dz = to[2] - from[2]
  const len = Math.sqrt(dx*dx + dz*dz)
  const angle = Math.atan2(dx, dz)
  return (
    <mesh position={mid} rotation={[0, angle, 0]}>
      <planeGeometry args={[2.5, len]} />
      <meshStandardMaterial color="#c8a96e" roughness={1} />
    </mesh>
  )
}

export default function BaseballDiamond({ runners = [] }) {
  const occupiedBases = new Set(runners.map(r => r.base))
  const home  = [0,    0.02, 0     ]
  const first = [ 63.64, 0.02, -63.64]
  const second= [ 0,     0.02, -90   ]
  const third = [-63.64, 0.02, -63.64]

  return (
    <group>
      {/* Outfield grass */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, -100]}>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#1a4020" roughness={0.9} />
      </mesh>

      {/* Infield dirt */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, -45]}>
        <circleGeometry args={[95, 64]} />
        <meshStandardMaterial color="#8b6a1e" roughness={1} />
      </mesh>

      {/* Inner grass diamond */}
      <mesh rotation={[-Math.PI/2, Math.PI/4, 0]} position={[0, 0.015, -45]}>
        <planeGeometry args={[64, 64]} />
        <meshStandardMaterial color="#22502a" roughness={0.9} />
      </mesh>

      {/* Basepaths */}
      <Basepath from={home}   to={first}  />
      <Basepath from={first}  to={second} />
      <Basepath from={second} to={third}  />
      <Basepath from={third}  to={home}   />

      {/* Bases */}
      {Object.entries(BASE_POS).map(([base, pos]) => (
        <mesh key={base} position={pos}>
          <boxGeometry args={[1.25, 0.18, 1.25]} />
          <meshStandardMaterial color="white" roughness={0.5} />
        </mesh>
      ))}

      {/* Home plate */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[1.42, 0.08, 1.42]} />
        <meshStandardMaterial color="white" roughness={0.5} />
      </mesh>

      {/* Pitcher's mound */}
      <mesh position={[0, 0, -60.5]}>
        <cylinderGeometry args={[9, 10, 0.7, 40]} />
        <meshStandardMaterial color="#9a7a2e" roughness={1} />
      </mesh>
      {/* Rubber */}
      <mesh position={[0, 0.4, -60.5]}>
        <boxGeometry args={[2, 0.08, 0.6]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Foul lines */}
      <mesh rotation={[-Math.PI/2, -Math.PI/4, 0]} position={[100, 0.03, -100]}>
        <planeGeometry args={[0.4, 330]} />
        <meshStandardMaterial color="white" opacity={0.5} transparent />
      </mesh>
      <mesh rotation={[-Math.PI/2, Math.PI/4, 0]} position={[-100, 0.03, -100]}>
        <planeGeometry args={[0.4, 330]} />
        <meshStandardMaterial color="white" opacity={0.5} transparent />
      </mesh>

      {/* Outfield wall arc (simple curved line of boxes) */}
      {Array.from({ length: 36 }, (_, i) => {
        const angle = (-Math.PI * 0.1) + (i / 35) * Math.PI * 1.2
        const r = 330
        const x = Math.sin(angle) * r
        const z = -Math.abs(Math.cos(angle)) * r - 45
        return (
          <mesh key={i} position={[x, 1.5, z]}>
            <boxGeometry args={[28, 4, 1]} />
            <meshStandardMaterial color="#1a3a80" />
          </mesh>
        )
      })}

      {/* Runner indicators — glowing gold spheres above occupied bases */}
      {runners.map(r => {
        const pos = BASE_POS[r.base]
        if (!pos) return null
        return (
          <group key={r.base}>
            <mesh position={[pos[0], pos[1] + 1.8, pos[2]]}>
              <sphereGeometry args={[1.1, 16, 16]} />
              <meshStandardMaterial
                color="#facc15"
                emissive="#facc15"
                emissiveIntensity={1.2}
                roughness={0.3}
              />
            </mesh>
            {/* Glow halo */}
            <mesh position={[pos[0], pos[1] + 1.8, pos[2]]}>
              <sphereGeometry args={[1.7, 12, 12]} />
              <meshStandardMaterial
                color="#facc15"
                transparent
                opacity={0.12}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
