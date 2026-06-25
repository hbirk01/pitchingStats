import React, { useState, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Stars, Html } from '@react-three/drei'
import BaseballDiamond from './BaseballDiamond'
import StrikeZone3D from './StrikeZone3D'
import PitchTrajectory from './PitchTrajectory'
import GhostTrails from './GhostTrails'

// Camera presets: [position, target]
const CAMERAS = {
  catcher: { pos: [0, 6,  -8], target: [0, 2,  55] },
  pitcher: { pos: [0, 8,  70], target: [0, 2,  0 ] },
  top:     { pos: [0, 200, -45], target: [0, 0, -45] },
  thirdbase: { pos: [-100, 18, -45], target: [0, 1, -45] },
}

function Scene({ pitches, runners, playing, onComplete }) {
  const lastPitch   = pitches[0] || null
  // Ghost trails = pitches 1..7 (skip pitch[0] — that's the one being animated)
  const ghostPitches = playing ? pitches.slice(1, 7) : pitches.slice(0, 6)

  return (
    <>
      <color attach="background" args={['#060812']} />
      <Stars radius={300} depth={80} count={2000} factor={4} fade />
      <ambientLight intensity={0.35} />
      <directionalLight position={[50, 120, 50]} intensity={1.2} castShadow />
      <directionalLight position={[-50, 60, -80]} intensity={0.4} />

      <BaseballDiamond runners={runners} />
      <StrikeZone3D pitches={pitches} lastPitch={playing ? null : lastPitch} />
      <GhostTrails pitches={ghostPitches} />

      {playing && lastPitch && (
        <PitchTrajectory
          pitch={lastPitch}
          playing={playing}
          onComplete={onComplete}
        />
      )}
    </>
  )
}

export default function PitchScene({ pitches = [], runners = [] }) {
  const [playing, setPlaying]     = useState(false)
  const [done, setDone]           = useState(false)
  const [camera, setCamera]       = useState('catcher')
  const controlsRef               = useRef()

  const lastPitch    = pitches[0] || null
  const hasPhysics   = lastPitch?.vy0 != null

  const handleReplay = useCallback(() => {
    if (!hasPhysics) return
    setDone(false)
    setPlaying(false)
    // tiny delay so useEffect in PitchTrajectory resets properly
    setTimeout(() => setPlaying(true), 50)
  }, [hasPhysics])

  const handleComplete = useCallback(() => {
    setPlaying(false)
    setDone(true)
  }, [])

  const applyCamera = (key) => {
    setCamera(key)
    const ctrl = controlsRef.current
    if (!ctrl) return
    const { pos, target } = CAMERAS[key]
    ctrl.object.position.set(...pos)
    ctrl.target.set(...target)
    ctrl.update()
  }

  return (
    <div className="relative w-full" style={{ height: 480 }}>
      {/* Camera + replay controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
        {Object.keys(CAMERAS).map(k => (
          <button key={k} onClick={() => applyCamera(k)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
              camera === k
                ? 'bg-brand-600 text-white'
                : 'bg-surface-800/80 text-ink-400 hover:text-ink-200 border border-surface-600'
            }`}>
            {k === 'thirdbase' ? '3B Line' : k === 'catcher' ? 'Catcher' : k === 'pitcher' ? 'Pitcher' : 'Top Down'}
          </button>
        ))}
      </div>

      <div className="absolute top-3 right-3 z-10 flex gap-2 items-center">
        {lastPitch && (
          <div className="text-[10px] text-ink-500 bg-surface-800/80 rounded-lg px-2 py-1 border border-surface-700">
            #{lastPitch.pitch_num} · <span className="font-bold" style={{ color: '#c7c5ff' }}>{lastPitch.pitch_name || lastPitch.pitch_type}</span>
            {lastPitch.velo && ` · ${lastPitch.velo} mph`}
          </div>
        )}
        <button
          onClick={handleReplay}
          disabled={!hasPhysics || playing}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            !hasPhysics
              ? 'bg-surface-800/60 text-ink-600 border border-surface-700 cursor-not-allowed'
              : playing
                ? 'bg-brand-600/50 text-brand-300 border border-brand-500/30 cursor-wait'
                : 'bg-brand-600 text-white hover:bg-brand-500 border border-brand-500'
          }`}>
          {playing ? '⬤ Playing…' : done ? '↺ Replay' : '▶ Replay Last Pitch'}
        </button>
      </div>

      {!hasPhysics && lastPitch && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-[10px] text-ink-600 bg-surface-900/80 rounded-lg px-3 py-1.5 border border-surface-700">
          Physics data unavailable for this pitch — replay disabled
        </div>
      )}

      <Canvas shadows gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={CAMERAS.catcher.pos} fov={50} />
        <OrbitControls
          ref={controlsRef}
          target={CAMERAS.catcher.target}
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={400}
        />
        <Scene
          pitches={pitches}
          runners={runners}
          playing={playing}
          onComplete={handleComplete}
        />
      </Canvas>
    </div>
  )
}
