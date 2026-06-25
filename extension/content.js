;(function () {
  'use strict'

  const PITCH_COLORS = {
    FF: '#f87171', SI: '#fb923c', FC: '#fbbf24',
    SL: '#22d3ee', ST: '#38bdf8', SV: '#93c5fd',
    CU: '#60a5fa', KC: '#818cf8', CH: '#34d399',
    FS: '#2dd4bf', DEFAULT: '#8b8fc8',
  }
  const RESULT_RING = {
    whiff:   '2px solid #4ade80',
    strike:  '1px solid #86efac88',
    ball:    '1px solid #60a5fa88',
    foul:    '1px solid #47556988',
    contact: '1px solid #fbbf2488',
    other:   '1px solid #33335588',
  }

  function pitchColor(code) {
    return PITCH_COLORS[code] || PITCH_COLORS.DEFAULT
  }

  let overlayEl = null
  let bodyEl    = null
  let isCollapsed = false
  let dragState = { active: false }

  // ── Build overlay DOM ──────────────────────────────────────────────────

  function createOverlay() {
    const el = document.createElement('div')
    el.id = 'pitchiq-overlay'
    el.innerHTML = `
      <div class="pitchiq-header" id="pitchiq-drag-handle">
        <span class="pitchiq-dot-live"></span>
        <span class="pitchiq-title">PitchIQ Live</span>
        <div class="pitchiq-controls">
          <button class="pitchiq-btn" id="pitchiq-opacity" title="Cycle opacity">◑</button>
          <button class="pitchiq-btn" id="pitchiq-collapse" title="Collapse">−</button>
        </div>
      </div>
      <div class="pitchiq-body" id="pitchiq-body">
        <div class="pitchiq-connecting" id="pitchiq-connecting">
          <div>Connecting to PitchIQ…</div>
          <div style="font-size:10px;color:#444;margin-top:4px">Start the backend on port 8002</div>
          <a class="pitchiq-link" href="http://localhost:5180" target="_blank">Open Dashboard ↗</a>
        </div>
        <div id="pitchiq-live-content" style="display:none">
          <div class="pitchiq-pitcher">
            <div class="pitchiq-pitcher-name" id="pitchiq-pitcher-name">—</div>
            <div class="pitchiq-pitcher-meta" id="pitchiq-pitcher-meta">ERA — · IP — · K-BB —</div>
          </div>
          <div class="pitchiq-situation">
            <div class="pitchiq-count" id="pitchiq-count">0-0</div>
            <div class="pitchiq-inning" id="pitchiq-inning">—</div>
            <span class="pitchiq-batter" id="pitchiq-batter"></span>
          </div>
          <div class="pitchiq-last-pitch" id="pitchiq-last-pitch" style="display:none">
            <div class="pitchiq-pitch-type" id="pitchiq-pitch-type">—</div>
            <div class="pitchiq-pitch-velo" id="pitchiq-pitch-velo">—</div>
            <div class="pitchiq-pitch-result" id="pitchiq-pitch-result">—</div>
          </div>
          <div class="pitchiq-strip" id="pitchiq-strip"></div>
          <canvas id="pitchiq-sparkline" width="200" height="36"></canvas>
          <div class="pitchiq-footer">
            <span id="pitchiq-pitch-count">—</span>
            <span id="pitchiq-whiff">whiff —%</span>
          </div>
        </div>
      </div>
    `
    document.body.appendChild(el)
    overlayEl = el
    attachHandlers()
  }

  // ── Render data into overlay ───────────────────────────────────────────

  function renderData(d) {
    if (!overlayEl) return
    const connecting = document.getElementById('pitchiq-connecting')
    const content    = document.getElementById('pitchiq-live-content')
    if (!d || d.state === 'preview') {
      connecting.style.display = 'block'
      content.style.display    = 'none'
      setText('pitchiq-connecting', d ? 'Game hasn\'t started yet' : 'Connecting to PitchIQ…')
      return
    }
    connecting.style.display = 'none'
    content.style.display    = 'block'

    const cp     = d.current_pitcher || {}
    const last   = d.pitch_log?.[0]
    const recent = d.pitch_log?.slice(0, 5) || []
    const inningSymbol = d.inning_half === 'Top' ? '▲' : '▼'

    // Pitcher
    setText('pitchiq-pitcher-name', cp.name || '—')
    setText('pitchiq-pitcher-meta',
      `ERA ${cp.era_today || '—'} · IP ${cp.ip_str || '—'} · K-BB ${
        cp.k_minus_bb != null ? (cp.k_minus_bb > 0 ? '+' : '') + cp.k_minus_bb : '—'
      }`)

    // Situation
    setText('pitchiq-count', `${cp.count_balls ?? 0}-${cp.count_strikes ?? 0}`)
    setText('pitchiq-inning', `${inningSymbol}${d.inning}${d.outs != null ? ` ${d.outs}out` : ''}`)
    setText('pitchiq-batter', cp.current_batter ? `vs. ${cp.current_batter}` : '')

    // Score in header title
    const title = document.querySelector('.pitchiq-title')
    if (title) {
      title.textContent = `PitchIQ · ${d.away_score ?? '—'}–${d.home_score ?? '—'}`
    }

    // Last pitch
    const lastEl = document.getElementById('pitchiq-last-pitch')
    if (last) {
      lastEl.style.display = 'flex'
      const col = pitchColor(last.pitch_type)
      document.getElementById('pitchiq-pitch-type').textContent = last.pitch_name || last.pitch_type
      document.getElementById('pitchiq-pitch-type').style.color = col
      document.getElementById('pitchiq-pitch-velo').textContent = last.velo ? `${last.velo} mph` : '—'
      document.getElementById('pitchiq-pitch-result').textContent = last.description || '—'
    } else {
      lastEl.style.display = 'none'
    }

    // Recent pitch strip (last 5)
    const strip = document.getElementById('pitchiq-strip')
    strip.innerHTML = recent.map(p => {
      const col = pitchColor(p.pitch_type)
      const border = RESULT_RING[p.result_class] || RESULT_RING.other
      return `<div class="pitchiq-strip-dot" style="background:${col}18;border:${border}" title="${p.pitch_name||p.pitch_type} ${p.velo||''}mph — ${p.description}">
        <span style="font-size:9px;font-weight:700;color:${col};font-family:monospace">${p.pitch_type}</span>
        <span style="font-size:7px;color:#666">${p.velo ? p.velo.toFixed(0) : '—'}</span>
      </div>`
    }).join('')

    // Sparkline
    drawSparkline(document.getElementById('pitchiq-sparkline'), d.velo_trend || [])

    // Footer
    setText('pitchiq-pitch-count', `${cp.pitch_count || 0} pitches · ${cp.strikeouts||0}K ${cp.walks||0}BB`)
    setText('pitchiq-whiff', d.whiff_pct != null ? `whiff ${d.whiff_pct}%` : '')
  }

  // ── Canvas sparkline ───────────────────────────────────────────────────

  function drawSparkline(canvas, veloTrend) {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (veloTrend.length < 2) return
    const min = Math.min(...veloTrend) - 0.5
    const max = Math.max(...veloTrend) + 0.5
    const w = canvas.width, h = canvas.height
    // Avg reference line
    const avg = veloTrend.reduce((s, v) => s + v, 0) / veloTrend.length
    const avgY = h - ((avg - min) / (max - min + 0.001)) * h
    ctx.strokeStyle = '#6e66f844'
    ctx.setLineDash([3, 3])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, avgY); ctx.lineTo(w, avgY)
    ctx.stroke()
    ctx.setLineDash([])
    // Velo line
    ctx.strokeStyle = '#6e66f8'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    veloTrend.forEach((v, i) => {
      const x = (i / (veloTrend.length - 1)) * w
      const y = h - ((v - min) / (max - min + 0.001)) * h
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  function setText(id, val) {
    const el = document.getElementById(id)
    if (el) el.textContent = val ?? ''
  }

  // ── Drag + collapse ────────────────────────────────────────────────────

  function attachHandlers() {
    const handle = document.getElementById('pitchiq-drag-handle')
    const colBtn = document.getElementById('pitchiq-collapse')
    const opBtn  = document.getElementById('pitchiq-opacity')
    bodyEl = document.getElementById('pitchiq-body')

    let opIdx = 0
    const opacities = [0.92, 0.65, 0.38]

    opBtn?.addEventListener('click', e => {
      e.stopPropagation()
      opIdx = (opIdx + 1) % opacities.length
      overlayEl.style.opacity = opacities[opIdx]
    })

    colBtn?.addEventListener('click', e => {
      e.stopPropagation()
      isCollapsed = !isCollapsed
      bodyEl.style.display = isCollapsed ? 'none' : 'block'
      colBtn.textContent   = isCollapsed ? '+' : '−'
    })

    handle?.addEventListener('mousedown', e => {
      if (e.target === opBtn || e.target === colBtn) return
      const rect = overlayEl.getBoundingClientRect()
      dragState = { active: true, startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top }
      e.preventDefault()
    })

    document.addEventListener('mousemove', e => {
      if (!dragState.active) return
      overlayEl.style.left  = `${dragState.origX + e.clientX - dragState.startX}px`
      overlayEl.style.top   = `${dragState.origY + e.clientY - dragState.startY}px`
      overlayEl.style.right = 'auto'
    })

    document.addEventListener('mouseup', () => { dragState.active = false })
  }

  // ── Message listener ───────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'GAME_UPDATE')    renderData(msg.data)
    if (msg.type === 'SET_OPACITY')    overlayEl && (overlayEl.style.opacity = msg.opacity)
    if (msg.type === 'SET_VISIBILITY') overlayEl && (overlayEl.style.display = msg.hidden ? 'none' : 'block')
  })

  // ── Mount ──────────────────────────────────────────────────────────────

  function tryMount() {
    if (document.getElementById('pitchiq-overlay')) return
    createOverlay()
    // Pull any already-cached detail
    chrome.runtime.sendMessage({ type: 'GET_DETAIL' }, detail => {
      if (detail) renderData(detail)
    })
    // Check overlay visibility pref
    chrome.storage.local.get('pitchiq_overlay_hidden', d => {
      if (d.pitchiq_overlay_hidden && overlayEl) overlayEl.style.display = 'none'
    })
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    tryMount()
  } else {
    document.addEventListener('DOMContentLoaded', tryMount)
  }

  // Remount after SPA navigation (MLB.com is a React SPA)
  new MutationObserver(() => {
    if (!document.getElementById('pitchiq-overlay')) tryMount()
  }).observe(document.body, { childList: true, subtree: false })
})()
