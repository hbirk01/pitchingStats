import React, { useState } from 'react'
import { PITCH_COLORS } from '../utils/pitchColors'

const RESULT_FILL = {
  whiff:   { fill: 'rgba(74,222,128,0.85)',  stroke: '#4ade80' },
  strike:  { fill: 'rgba(74,222,128,0.5)',   stroke: '#86efac' },
  ball:    { fill: 'rgba(96,165,250,0.5)',   stroke: '#60a5fa' },
  foul:    { fill: 'rgba(148,163,184,0.35)', stroke: '#64748b' },
  contact: { fill: 'rgba(251,191,36,0.6)',   stroke: '#fbbf24' },
  other:   { fill: 'rgba(100,116,139,0.35)', stroke: '#475569' },
}

// MLB strike zone in feet: x [-0.83, 0.83], z [1.5, 3.5]
// We map to SVG coords: width=220, height=220
const SVG_W = 220
const SVG_H = 220
const PAD   = 24  // padding for labels/edge

const ZONE_X = [PAD, SVG_W - PAD]         // [left, right] in SVG px
const ZONE_Z = [PAD, SVG_H - PAD]         // [top, bottom] in SVG px (SVG y is flipped)

const REAL_X = [-0.83, 0.83]
const REAL_Z = [1.5, 3.5]

function toSvg(px, pz) {
  const x = ZONE_X[0] + (px - REAL_X[0]) / (REAL_X[1] - REAL_X[0]) * (ZONE_X[1] - ZONE_X[0])
  // Z is inverted: higher z = higher pitch = lower SVG y
  const y = ZONE_Z[1] - (pz - REAL_Z[0]) / (REAL_Z[1] - REAL_Z[0]) * (ZONE_Z[1] - ZONE_Z[0])
  return { x, y }
}

export default function StrikeZonePlot({ pitches = [], filterType = null }) {
  const [hovered, setHovered] = useState(null)
  const [colorMode, setColorMode] = useState('type') // 'type' | 'result'

  const visible = pitches.filter(p => p.px != null && p.pz != null
    && (filterType == null || p.pitch_type === filterType))

  return (
    <div>
      {/* Color mode toggle */}
      <div className="flex gap-1 mb-3">
        {[['type', 'By Pitch Type'], ['result', 'By Result']].map(([k, l]) => (
          <button key={k} onClick={() => setColorMode(k)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${
              colorMode === k ? 'bg-brand-600 text-white' : 'bg-surface-700 text-ink-500 hover:text-ink-300'
            }`}>
            {l}
          </button>
        ))}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full max-w-[260px] mx-auto block"
          style={{ userSelect: 'none' }}
        >
          {/* Outer batter's box reference (faint) */}
          <rect
            x={PAD - 14} y={PAD - 14}
            width={SVG_W - (PAD - 14) * 2} height={SVG_H - (PAD - 14) * 2}
            fill="none" stroke="rgba(100,116,139,0.15)" strokeWidth={1} strokeDasharray="3 4"
            rx={2}
          />

          {/* Strike zone box */}
          <rect
            x={ZONE_X[0]} y={ZONE_Z[0]}
            width={ZONE_X[1] - ZONE_X[0]} height={ZONE_Z[1] - ZONE_Z[0]}
            fill="rgba(110,102,248,0.04)" stroke="rgba(110,102,248,0.4)" strokeWidth={1.5}
            rx={2}
          />

          {/* 3x3 inner grid lines */}
          {[1, 2].map(i => {
            const xLine = ZONE_X[0] + (ZONE_X[1] - ZONE_X[0]) * (i / 3)
            const yLine = ZONE_Z[0] + (ZONE_Z[1] - ZONE_Z[0]) * (i / 3)
            return (
              <g key={i}>
                <line x1={xLine} y1={ZONE_Z[0]} x2={xLine} y2={ZONE_Z[1]}
                  stroke="rgba(110,102,248,0.18)" strokeWidth={0.8} />
                <line x1={ZONE_X[0]} y1={yLine} x2={ZONE_X[1]} y2={yLine}
                  stroke="rgba(110,102,248,0.18)" strokeWidth={0.8} />
              </g>
            )
          })}

          {/* Home plate (simplified pentagon at bottom center) */}
          <polygon
            points={`${SVG_W/2 - 10},${SVG_H - 6} ${SVG_W/2 + 10},${SVG_H - 6} ${SVG_W/2 + 10},${SVG_H - 12} ${SVG_W/2},${SVG_H - 4} ${SVG_W/2 - 10},${SVG_H - 12}`}
            fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth={1}
          />

          {/* Pitch dots */}
          {visible.map((p, i) => {
            const { x, y } = toSvg(p.px, p.pz)
            const isHov = hovered === i
            const typeColor = PITCH_COLORS[p.pitch_type] || '#8b8fc8'
            const fill = colorMode === 'type'
              ? typeColor
              : (RESULT_FILL[p.result_class]?.fill || 'rgba(100,116,139,0.5)')
            const stroke = colorMode === 'type'
              ? typeColor
              : (RESULT_FILL[p.result_class]?.stroke || '#64748b')

            return (
              <circle
                key={i}
                cx={x} cy={y}
                r={isHov ? 7 : 5}
                fill={fill}
                stroke={stroke}
                strokeWidth={isHov ? 2 : 1.2}
                style={{ cursor: 'pointer', transition: 'r 0.1s, stroke-width 0.1s' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                opacity={i === 0 ? 1 : 0.75}  // most recent pitch full opacity
              />
            )
          })}

          {/* Most recent pitch marker (star) */}
          {visible[0] && (() => {
            const { x, y } = toSvg(visible[0].px, visible[0].pz)
            return (
              <circle cx={x} cy={y} r={5} fill="none"
                stroke="white" strokeWidth={1.5} strokeDasharray="2 2" />
            )
          })()}
        </svg>

        {/* Hover tooltip */}
        {hovered != null && visible[hovered] && (() => {
          const p = visible[hovered]
          return (
            <div className="absolute top-0 right-0 card-xs text-xs space-y-0.5 pointer-events-none min-w-[130px]">
              <div className="font-bold" style={{ color: PITCH_COLORS[p.pitch_type] || '#8b8fc8' }}>
                {p.pitch_name || p.pitch_type}
              </div>
              <div className="text-ink-300">{p.velo != null ? `${p.velo} mph` : 'N/A'}</div>
              <div className="text-ink-500">{p.description}</div>
              <div className="text-ink-600">{p.batter}</div>
              <div className="text-ink-700 text-[9px]">#{p.pitch_num} · {p.balls}-{p.strikes}</div>
            </div>
          )
        })()}
      </div>

      {/* Legend */}
      {colorMode === 'type' ? (
        <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
          {[...new Set(visible.map(p => p.pitch_type))].map(pt => (
            <span key={pt} className="flex items-center gap-1 text-[9px] text-ink-500">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: PITCH_COLORS[pt] || '#8b8fc8' }} />
              {pt}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mt-2 justify-center text-[9px] text-ink-500">
          {[['whiff','#4ade80','Whiff'],['strike','#86efac','Called K'],['ball','#60a5fa','Ball'],['foul','#64748b','Foul'],['contact','#fbbf24','In Play']].map(([cls,c,l]) => (
            <span key={cls} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}
            </span>
          ))}
        </div>
      )}

      <p className="text-[9px] text-ink-700 text-center mt-1">
        Dashed circle = most recent pitch · {visible.length} pitches shown
      </p>
    </div>
  )
}
