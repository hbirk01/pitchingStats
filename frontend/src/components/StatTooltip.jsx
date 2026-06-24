import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

const STAT_DEFS = {
  ERA: "Earned Run Average — runs allowed per 9 innings. Affected by defense, sequencing, and luck.",
  XERA: "Expected ERA based on quality of contact allowed (exit velocity, launch angle). Better predictor of future ERA than ERA itself.",
  "K%": "Strikeout rate — strikeouts per plate appearance. Higher is better for pitchers.",
  "BB%": "Walk rate — walks per plate appearance. Lower is better for pitchers.",
  XBA: "Expected Batting Average — based on exit velocity and launch angle of balls in play. Ignores defense.",
  XWOBA: "Expected Weighted On-Base Average — combines xBA, xSLG. Best single-number predictor of offensive value allowed.",
  FIP: "Fielding Independent Pitching — ERA-scale stat using only K, BB, HBP, HR. Removes defensive influence.",
  XFIP: "Expected FIP — like FIP but normalizes HR rate to league average fly ball HR%. Regresses outlier HR seasons.",
  "K%-BB%": "Strikeout rate minus walk rate. Best combined control+stuff metric. Elite relievers often above 20%.",
  WHIP: "Walks + Hits per Inning Pitched. Simple durability/control metric.",
  BABIP: "Batting Average on Balls In Play. League avg ~.295. Pitchers with BABIP far below avg often regress upward.",
  "Velo": "Average pitch velocity in mph.",
  "Stuff+": "Stuff+ (100 = avg). Grades pitch characteristics — velo, movement, spin — vs. league avg for that pitch type. >130 is elite.",
  PLV: "Pitch Level Value (0–10, 5 = avg). Estimated run value of a pitch based on predictive outcomes.",
  VAA: "Vertical Approach Angle in degrees. How steeply the ball descends into the zone. -3.5° at top of zone = elite; ball appears to 'rise' to hitters.",
  "iVB": "Induced Vertical Break (inches). Movement above/below gravity alone. High iVB on fastballs = ride effect.",
  "HB": "Horizontal Break (inches). Side-to-side movement due to spin. Positive = arm-side, negative = glove-side (for RHP).",
  "SpinEff%": "Spin Efficiency — % of total spin that generates Magnus force (movement). High gyro spin is 'wasted.' Lower efficiency = more glove-side run.",
  "Whiff%": "Whiff rate on swings — swinging strikes ÷ total swings. Elite is 35%+.",
  "RelHt": "Release height in feet. Lower release height with high spin efficiency = flatter VAA = harder to elevate.",
  "Tunnel Dist": "Average distance (inches) between two pitch paths at 23 ft from plate (~0.15 sec of decision time). Under 4\" = Elite tunneling.",
  "Miss Dist": "Average displacement from median intended target location (inches). Lower = better command.",
  "Breakout Score": "Composite score (0–100) weighing ERA vs xERA/FIP gap, K%, BB%, and Stuff+. High score = ERA likely to improve.",
  "Luck Component": "ERA minus xERA. Positive = ERA inflated by bad luck/defense. Expect positive regression toward xERA.",
}

export default function StatTooltip({ stat, children, className = '' }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef(null)
  const def = STAT_DEFS[stat]

  if (!def) return <span className={className}>{children || stat}</span>

  const TOOLTIP_W = 256 // w-64 = 16rem = 256px

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const spaceRight = window.innerWidth - rect.left
      const alignRight = spaceRight < TOOLTIP_W + 16

      setPos({
        top: rect.top + window.scrollY - 8,
        left: alignRight
          ? rect.right + window.scrollX - TOOLTIP_W   // flush with right edge of trigger
          : rect.left + window.scrollX,                // flush with left edge
        alignRight,
      })
    }
    setShow(true)
  }

  return (
    <span
      ref={ref}
      className={`relative inline-flex items-center gap-1 cursor-help group ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children || stat}
      <Info className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />

      {show && createPortal(
        <div
          style={{ position: 'absolute', top: pos.top, left: pos.left, transform: 'translateY(-100%)', width: TOOLTIP_W }}
          className="z-[9999] bg-surface-700 border border-brand-500/30 rounded-lg p-3 shadow-xl pointer-events-none"
        >
          <div className="text-xs font-semibold text-brand-400 mb-1">{stat}</div>
          <div className="text-xs text-slate-300 leading-relaxed">{def}</div>
          <div className={`absolute top-full w-2 h-2 bg-surface-700 border-r border-b border-brand-500/30 rotate-45 -translate-y-1 ${pos.alignRight ? 'right-4' : 'left-4'}`} />
        </div>,
        document.body
      )}
    </span>
  )
}
