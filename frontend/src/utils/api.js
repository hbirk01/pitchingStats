import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

export const searchPlayers = (name) => api.get('/players/search', { params: { name } })
export const getPitcherDashboard = (playerId, season) => api.get(`/pitching/${playerId}/dashboard`, { params: { season } })
export const getPitchTypes = (playerId, season) => api.get(`/pitching/${playerId}/pitch-types`, { params: { season } })
export const getTunneling = (playerId, pitchA, pitchB, season) =>
  api.get(`/pitching/${playerId}/tunneling`, { params: { pitch_a: pitchA, pitch_b: pitchB, season } })
export const getBreakoutAnalysis = (playerId, season) => api.get(`/analytics/${playerId}/breakout`, { params: { season } })
export const getRegressionAnalysis = (playerId, season) => api.get(`/analytics/${playerId}/regression`, { params: { season } })
export const getVAAAnalysis = (playerId, season) => api.get(`/analytics/${playerId}/vaa-analysis`, { params: { season } })
export const getLeaderboard = (season, minIp, role) => api.get('/players/leaderboard', { params: { season, min_ip: minIp, role } })
export const getPitcherSplits = (playerId, season) => api.get(`/pitching/${playerId}/splits`, { params: { season } })
export const getPitchTrajectories = (playerId, season) => api.get(`/pitching/${playerId}/trajectory`, { params: { season } })
export const getPitcherSIERA = (playerId, season) => api.get(`/pitching/${playerId}/siera`, { params: { season } })
export const getPitchComps = (playerId, season) => api.get(`/players/${playerId}/comps`, { params: { season } })
export const getSeasonCompare = (playerId, seasons) => api.get(`/pitching/${playerId}/seasons`, { params: { seasons } })
export const getPitchSequencing = (playerId, season) => api.get(`/pitching/${playerId}/sequencing`, { params: { season } })
export const getArsenalGrades = (playerId, season) => api.get(`/pitching/${playerId}/arsenal-grades`, { params: { season } })
export const getRecentForm = (playerId, season) => api.get(`/pitching/${playerId}/recent-form`, { params: { season } })
export const getBattedBall = (playerId, season) => api.get(`/pitching/${playerId}/batted-ball`, { params: { season } })
export const getFatigue = (playerId, season) => api.get(`/pitching/${playerId}/fatigue`, { params: { season } })
export const getGameLog = (playerId, season) => api.get(`/pitching/${playerId}/game-log`, { params: { season } })
export const getLeverageSplits = (playerId, season) => api.get(`/pitching/${playerId}/leverage-splits`, { params: { season } })
export const getPitchTypeDeepDive = (playerId, pitchType, season) => api.get(`/pitching/${playerId}/pitch-type/${pitchType}`, { params: { season } })
export const getTeams = () => api.get('/players/teams')
export const getTeamPitching = (teamId, season) => api.get(`/players/team/${teamId}`, { params: { season } })
