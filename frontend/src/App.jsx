import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import PlayerDashboard from './pages/PlayerDashboard'
import LeaderboardPage from './pages/LeaderboardPage'
import TeamPage from './pages/TeamPage'
import GameLogPage from './pages/GameLogPage'
import ComparePage from './pages/ComparePage'
import PitchTypeDeepDive from './pages/PitchTypeDeepDive'
import LivePage from './pages/LivePage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/player/:playerId" element={<PlayerDashboard />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/team/:teamId" element={<TeamPage />} />
        <Route path="/player/:playerId/game-log" element={<GameLogPage />} />
        <Route path="/player/:playerId/pitch/:pitchType" element={<PitchTypeDeepDive />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/live" element={<LivePage />} />
      </Routes>
    </Layout>
  )
}
