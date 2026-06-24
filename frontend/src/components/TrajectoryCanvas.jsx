import React, { useRef, useEffect, useState, useCallback } from 'react'
import { getPitchColor } from '../utils/grades'

// Kinematic: pos(t) = pos0 + v0*t + 0.5*a*t^2
// Statcast y0 ≈ 50-55 ft from plate; plate is y=0
// We animate from y0 down to y=0 (home plate)

const PITCH_LABELS = {
  FF: '4-Seam FB', SI: 'Sinker', FC: 'Cutter', SL: 'Slider',
  CU: 'Curveball', CH: 'Changeup', FS: 'Splitter', ST: 'Sweeper',
  SV: 'Slurve', KC: 'Knuckle-Curve',
}

function computePath(pitch, steps = 60) {
  const { x0, y0, z0, vx0, vy0, vz0, ax, ay, az } = pitch
  // Time for ball to reach plate (y=0): vy0*t + 0.5*ay*t^2 + y0 = 0
  // Solve quadratic: 0.5*ay*t^2 + vy0*t + y0 = 0
  const disc = vy0 * vy0 - 4 * (0.5 * ay) * y0
  const t_plate = disc >= 0 ? (-vy0 - Math.sqrt(disc)) / (2 * 0.5 * ay) : 0.45
  const t_max = Math.max(t_plate, 0.35)

  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * t_max
    pts.push({
      x: x0 + vx0 * t + 0.5 * ax * t * t,
      y: y0 + vy0 * t + 0.5 * ay * t * t,
      z: z0 + vz0 * t + 0.5 * az * t * t,
    })
  }
  return { pts, t_max }
}

function drawSideView(ctx, w, h, pitchesByType, visibleTypes, animT) {
  ctx.clearRect(0, 0, w, h)

  // Background
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, w, h)

  // Map y (0..55ft) → canvas x, z (0..7ft) → canvas y
  const PAD = { l: 40, r: 20, t: 20, b: 30 }
  const cw = w - PAD.l - PAD.r
  const ch = h - PAD.t - PAD.b

  const toCanvas = (y, z) => ({
    cx: PAD.l + (1 - y / 55) * cw,  // y=55ft → left, y=0 → right
    cy: PAD.t + (1 - (z - 0.5) / 6.5) * ch,  // z=7ft → top, z=0.5ft → bottom
  })

  // Grid lines
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 1
  for (let z = 1; z <= 6; z++) {
    const { cy } = toCanvas(0, z)
    ctx.beginPath(); ctx.moveTo(PAD.l, cy); ctx.lineTo(w - PAD.r, cy); ctx.stroke()
  }
  for (let y = 0; y <= 50; y += 10) {
    const { cx } = toCanvas(y, 0)
    ctx.beginPath(); ctx.moveTo(cx, PAD.t); ctx.lineTo(cx, h - PAD.b); ctx.stroke()
  }

  // Strike zone box (y=0, z=1.5-3.5ft)
  const sz_top = toCanvas(0, 3.5)
  const sz_bot = toCanvas(0, 1.5)
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 2
  ctx.strokeRect(sz_top.cx - 12, sz_top.cy, 12, sz_bot.cy - sz_top.cy)

  // Axis labels
  ctx.fillStyle = '#64748b'
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  for (let y = 0; y <= 50; y += 10) {
    const { cx } = toCanvas(y, 0)
    ctx.fillText(`${y}ft`, cx, h - 4)
  }
  ctx.textAlign = 'right'
  for (let z = 1; z <= 6; z++) {
    const { cy } = toCanvas(0, z)
    ctx.fillText(`${z}'`, PAD.l - 4, cy + 4)
  }
  ctx.fillText('H', PAD.l - 4, h - PAD.b + 4)

  // Mound marker
  const mound = toCanvas(60.5, 0)
  ctx.fillStyle = '#475569'
  ctx.fillText('60.5ft', mound.cx, PAD.t - 6)

  // Draw trajectories
  for (const [pt, pitches] of Object.entries(pitchesByType)) {
    if (!visibleTypes[pt]) continue
    const color = getPitchColor(pt)

    pitches.forEach(({ pts }) => {
      const t_idx = Math.floor(animT * (pts.length - 1))
      if (t_idx < 1) return

      // Trail
      ctx.beginPath()
      ctx.strokeStyle = color + '55'
      ctx.lineWidth = 1
      let first = true
      for (let i = 0; i <= t_idx; i++) {
        const { cx, cy } = toCanvas(pts[i].y, pts[i].z)
        if (first) { ctx.moveTo(cx, cy); first = false } else ctx.lineTo(cx, cy)
      }
      ctx.stroke()

      // Ball head
      if (t_idx < pts.length) {
        const { cx, cy } = toCanvas(pts[t_idx].y, pts[t_idx].z)
        ctx.beginPath()
        ctx.arc(cx, cy, 3, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      }
    })
  }
}

function drawCatcherView(ctx, w, h, pitchesByType, visibleTypes, animT) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, w, h)

  const cx = w / 2
  const cy = h / 2
  const scale = w * 0.13  // 1 ft = scale px

  // Strike zone: x = ±0.83ft, z = 1.5-3.5ft (roughly)
  const szW = 0.83 * 2 * scale
  const szH = 2.0 * scale
  const szX = cx - szW / 2
  const szY = cy - (2.75 - h / 2 / scale) * scale  // center ~2.75ft

  // Recalc based on z range
  const toC = (x, z) => ({
    px: cx + x * scale,
    py: h * 0.75 - (z - 2.0) * scale,
  })

  // Background grid
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 1
  for (let x = -2; x <= 2; x++) {
    const { px } = toC(x, 0)
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke()
  }
  for (let z = 0; z <= 5; z++) {
    const { py } = toC(0, z)
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke()
  }

  // Strike zone
  const tl = toC(-0.83, 3.5), br = toC(0.83, 1.5)
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 2
  ctx.strokeRect(tl.px, tl.py, br.px - tl.px, br.py - tl.py)

  // Inner zone thirds
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 1
  const w3 = (br.px - tl.px) / 3
  const h3 = (br.py - tl.py) / 3
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo(tl.px + w3 * i, tl.py)
    ctx.lineTo(tl.px + w3 * i, br.py)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(tl.px, tl.py + h3 * i)
    ctx.lineTo(br.px, tl.py + h3 * i)
    ctx.stroke()
  }

  // Labels
  ctx.fillStyle = '#475569'
  ctx.font = '9px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('Catcher POV', w / 2, 12)

  // Pitch endpoints / trajectory blobs
  for (const [pt, pitches] of Object.entries(pitchesByType)) {
    if (!visibleTypes[pt]) continue
    const color = getPitchColor(pt)

    pitches.forEach(({ pts }) => {
      const t_idx = Math.floor(animT * (pts.length - 1))
      if (t_idx < 1) return

      // Show trail at the catcher view
      ctx.beginPath()
      ctx.strokeStyle = color + '40'
      ctx.lineWidth = 1
      let first = true
      const startIdx = Math.max(0, t_idx - 15)
      for (let i = startIdx; i <= t_idx; i++) {
        const { px, py } = toC(pts[i].x, pts[i].z)
        if (first) { ctx.moveTo(px, py); first = false } else ctx.lineTo(px, py)
      }
      ctx.stroke()

      // Ball
      if (t_idx < pts.length) {
        const { px, py } = toC(pts[t_idx].x, pts[t_idx].z)
        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      }
    })
  }
}

export default function TrajectoryCanvas({ data }) {
  const sideRef = useRef(null)
  const catcherRef = useRef(null)
  const animRef = useRef(null)
  const [animT, setAnimT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [visibleTypes, setVisibleTypes] = useState({})
  const [speed, setSpeed] = useState(1)

  const pitchesByType = {}
  if (data?.pitches) {
    for (const p of data.pitches) {
      if (!pitchesByType[p.pitch_type]) pitchesByType[p.pitch_type] = []
      try {
        pitchesByType[p.pitch_type].push(computePath(p))
      } catch {}
    }
  }

  const types = Object.keys(pitchesByType)

  useEffect(() => {
    if (types.length > 0 && Object.keys(visibleTypes).length === 0) {
      setVisibleTypes(Object.fromEntries(types.map(t => [t, true])))
    }
  }, [types.join(',')])

  useEffect(() => {
    const side = sideRef.current
    const catcher = catcherRef.current
    if (!side || !catcher) return
    drawSideView(side.getContext('2d'), side.width, side.height, pitchesByType, visibleTypes, animT)
    drawCatcherView(catcher.getContext('2d'), catcher.width, catcher.height, pitchesByType, visibleTypes, animT)
  }, [animT, visibleTypes, data])

  useEffect(() => {
    if (!playing) return
    let last = null
    const tick = (ts) => {
      if (!last) last = ts
      const dt = (ts - last) / 1000
      last = ts
      setAnimT(t => {
        const next = t + dt * 0.6 * speed
        if (next >= 1) { setPlaying(false); return 1 }
        return next
      })
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [playing, speed])

  const toggle = () => {
    if (animT >= 1) { setAnimT(0); setPlaying(true) }
    else setPlaying(p => !p)
  }
  const reset = () => { setPlaying(false); setAnimT(0) }

  if (!data || types.length === 0) {
    return <div className="text-slate-600 text-sm text-center py-8">No trajectory data available.</div>
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button onClick={toggle}
          className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors">
          {playing ? '⏸ Pause' : animT >= 1 ? '↺ Replay' : '▶ Play'}
        </button>
        <button onClick={reset} className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-slate-300 rounded-lg text-sm transition-colors">
          Reset
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          Speed:
          {[0.5, 1, 2].map(s => (
            <button key={s} onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${speed === s ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-400 hover:text-slate-200'}`}>
              {s}×
            </button>
          ))}
        </div>
        <input type="range" min={0} max={1} step={0.01} value={animT}
          onChange={e => { setPlaying(false); setAnimT(Number(e.target.value)) }}
          className="flex-1 min-w-24 accent-blue-500" />
        <span className="text-xs font-mono text-slate-500 w-8">{Math.round(animT * 100)}%</span>
      </div>

      {/* Pitch type toggles */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {types.map(pt => (
          <button key={pt}
            onClick={() => setVisibleTypes(v => ({ ...v, [pt]: !v[pt] }))}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${visibleTypes[pt] ? 'opacity-100' : 'opacity-30'}`}
            style={{ background: getPitchColor(pt) + '30', border: `1px solid ${getPitchColor(pt)}80`, color: getPitchColor(pt) }}>
            <span className="w-2 h-2 rounded-full" style={{ background: getPitchColor(pt) }} />
            {PITCH_LABELS[pt] || pt}
            <span className="text-[10px] opacity-60">({pitchesByType[pt]?.length})</span>
          </button>
        ))}
      </div>

      {/* Canvases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1 text-center">Side View (pitcher → plate)</div>
          <canvas ref={sideRef} width={520} height={260}
            className="w-full rounded-lg border border-surface-600" style={{ imageRendering: 'crisp-edges' }} />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1 text-center">Catcher's POV</div>
          <canvas ref={catcherRef} width={300} height={260}
            className="w-full rounded-lg border border-surface-600" style={{ imageRendering: 'crisp-edges' }} />
        </div>
      </div>

      {/* Averages table */}
      {data.averages && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(data.averages).map(([pt, avg]) => (
            <div key={pt} className="bg-surface-700 rounded-lg p-2.5 border border-surface-600">
              <div className="text-xs font-bold mb-1" style={{ color: getPitchColor(pt) }}>{PITCH_LABELS[pt] || pt}</div>
              <div className="text-xs text-slate-400 font-mono space-y-0.5">
                <div>{avg.avg_speed} mph</div>
                <div>Ext: {avg.avg_extension}ft</div>
                <div>Plate: ({avg.avg_plate_x?.toFixed(2)}, {avg.avg_plate_z?.toFixed(2)})</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
