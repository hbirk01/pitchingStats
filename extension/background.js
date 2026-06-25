const API = 'http://localhost:8002/api/live'
const GAMES_ALARM  = 'pitchiq_games'
const DETAIL_ALARM = 'pitchiq_detail'

// ── Fetch helpers ──────────────────────────────────────────────────────────

async function fetchGames() {
  try {
    const res = await fetch(`${API}/games`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(res.status)
    const games = await res.json()
    await chrome.storage.local.set({ pitchiq_games: games, pitchiq_error: null })
    // Broadcast to any open content scripts
    broadcastToTabs({ type: 'GAMES_UPDATE', games })
    return games
  } catch (e) {
    await chrome.storage.local.set({ pitchiq_error: 'Backend unreachable' })
    return null
  }
}

async function fetchDetail(pk) {
  if (!pk) return
  try {
    const res = await fetch(`${API}/game/${pk}`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(res.status)
    const data = await res.json()
    await chrome.storage.local.set({ pitchiq_game_detail: data })
    broadcastToTabs({ type: 'GAME_UPDATE', data })
    return data
  } catch {
    // Keep stale data
  }
}

function broadcastToTabs(msg) {
  chrome.tabs.query({ url: ['https://www.mlb.com/*', 'https://mlb.com/*'] }, tabs => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, msg).catch(() => {})
    })
  })
}

// ── Alarm polling ──────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async ({ name }) => {
  if (name === GAMES_ALARM) {
    await fetchGames()
  }
  if (name === DETAIL_ALARM) {
    const { pitchiq_selected_pk } = await chrome.storage.local.get('pitchiq_selected_pk')
    await fetchDetail(pitchiq_selected_pk)
  }
})

// ── Install / startup ──────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(GAMES_ALARM,  { periodInMinutes: 1 })
  chrome.alarms.create(DETAIL_ALARM, { periodInMinutes: 0.5 })
  fetchGames()
})

chrome.runtime.onStartup.addListener(() => {
  fetchGames()
})

// ── Message handler ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_GAMES') {
    chrome.storage.local.get(['pitchiq_games', 'pitchiq_error'], d => {
      sendResponse({ games: d.pitchiq_games || [], error: d.pitchiq_error })
    })
    return true
  }

  if (msg.type === 'SELECT_GAME') {
    chrome.storage.local.set({ pitchiq_selected_pk: msg.pk })
    fetchDetail(msg.pk).then(data => sendResponse({ ok: true, data }))
    return true
  }

  if (msg.type === 'GET_DETAIL') {
    chrome.storage.local.get('pitchiq_game_detail', d => {
      sendResponse(d.pitchiq_game_detail || null)
    })
    return true
  }

  if (msg.type === 'SET_OVERLAY_OPACITY') {
    broadcastToTabs({ type: 'SET_OPACITY', opacity: msg.opacity })
    sendResponse({ ok: true })
    return true
  }

  if (msg.type === 'TOGGLE_OVERLAY') {
    chrome.storage.local.get('pitchiq_overlay_hidden', d => {
      const hidden = !d.pitchiq_overlay_hidden
      chrome.storage.local.set({ pitchiq_overlay_hidden: hidden })
      broadcastToTabs({ type: 'SET_VISIBILITY', hidden })
      sendResponse({ hidden })
    })
    return true
  }
})
