export const gradeClass = (grade) => {
  if (!grade) return 'grade-avg'
  const g = grade.toLowerCase()
  if (g.includes('elite')) return 'grade-elite'
  if (g.includes('plus') || g.includes('very good')) return 'grade-plus'
  if (g.includes('above')) return 'grade-above'
  if (g.includes('below')) return 'grade-below'
  return 'grade-avg'
}

export const stuffColor = (val) => {
  if (val >= 130) return '#10b981'
  if (val >= 115) return '#3b82f6'
  if (val >= 100) return '#6366f1'
  if (val >= 85) return '#f59e0b'
  return '#ef4444'
}

export const breakoutColor = (score) => {
  if (score >= 70) return '#10b981'
  if (score >= 50) return '#3b82f6'
  if (score >= 30) return '#f59e0b'
  return '#94a3b8'
}

export const pitchColors = {
  FF: '#ef4444',
  SI: '#f97316',
  FC: '#eab308',
  SL: '#22c55e',
  SW: '#10b981',
  CU: '#3b82f6',
  CB: '#3b82f6',
  KC: '#60a5fa',
  CH: '#a855f7',
  FS: '#ec4899',
  FO: '#f43f5e',
  KN: '#14b8a6',
}

export const getPitchColor = (pt) => pitchColors[pt] || '#94a3b8'
