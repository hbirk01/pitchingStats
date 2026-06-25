let selectedPk = null
let overlayHidden = false

// ── Load state ─────────────────────────────────────────────────────────────

chrome.storage.local.get(['pitchiq_selected_pk', 'pitchiq_overlay_hidden'], d => {
  selectedPk    = d.pitchiq_selected_pk || null
  overlayHidden = d.pitchiq_overlay_hidden || false
  updateToggleBtn()
})

// ── Fetch games ────────────────────────────────────────────────────────────

chrome.runtime.sendMessage({ type: 'GET_GAMES' }, ({ games = [], error } = {}) => {
  const dot = document.getElementById('status-dot')
  const errorBanner = document.getElementById('error-banner')
  const list = document.getElementById('games-list')

  if (error) {
    errorBanner.style.display = 'block'
    errorBanner.textContent = error
    list.innerHTML = '<div class="loading">Start backend on port 8002</div>'
    return
  }

  const hasLive = games.some(g => g.state === 'live')
  if (hasLive) dot.classList.add('live')

  if (!games.length) {
    list.innerHTML = '<div class="loading">No games today</div>'
    return
  }

  list.innerHTML = ''
  games.forEach(g => {
    const card = document.createElement('div')
    card.className = 'game-card' + (g.game_pk === selectedPk ? ' selected' : '')
    card.dataset.pk = g.game_pk

    const statusClass = g.state === 'live' ? 'status-live' : g.state === 'final' ? 'status-final' : 'status-preview'
    const statusText  = g.state === 'live' ? `▲${g.inning || '?'} ${g.outs ?? 0}out` : g.state === 'final' ? 'Final' : g.game_time_utc ? formatTime(g.game_time_utc) : 'Preview'
    const scoreText   = (g.state === 'live' || g.state === 'final') ? `${g.away_score ?? 0}–${g.home_score ?? 0}` : ''

    card.innerHTML = `
      <div class="game-teams">
        <div class="game-matchup">${g.away_abbr} @ ${g.home_abbr}</div>
        <div class="game-meta">${g.venue || ''}</div>
      </div>
      <div class="game-status ${statusClass}">${statusText}</div>
      ${scoreText ? `<div class="game-score">${scoreText}</div>` : ''}
    `
    card.addEventListener('click', () => selectGame(g.game_pk, card))
    list.appendChild(card)
  })
})

// ── Select game ────────────────────────────────────────────────────────────

function selectGame(pk, cardEl) {
  selectedPk = pk
  document.querySelectorAll('.game-card').forEach(c => c.classList.remove('selected'))
  cardEl.classList.add('selected')

  chrome.runtime.sendMessage({ type: 'SELECT_GAME', pk }, () => {})
}

// ── Opacity slider ─────────────────────────────────────────────────────────

const slider  = document.getElementById('opacity-slider')
const opVal   = document.getElementById('opacity-val')

slider.addEventListener('input', () => {
  const pct = parseInt(slider.value)
  opVal.textContent = `${pct}%`
  chrome.runtime.sendMessage({ type: 'SET_OVERLAY_OPACITY', opacity: pct / 100 })
})

// ── Toggle overlay ─────────────────────────────────────────────────────────

document.getElementById('toggle-overlay').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'TOGGLE_OVERLAY' }, ({ hidden } = {}) => {
    overlayHidden = hidden
    updateToggleBtn()
  })
})

function updateToggleBtn() {
  const btn = document.getElementById('toggle-overlay')
  if (btn) btn.textContent = overlayHidden ? 'Show' : 'Hide'
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(utcStr) {
  try {
    return new Date(utcStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return '—'
  }
}
