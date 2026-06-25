export const PITCH_COLORS = {
  FF: '#f87171',
  SI: '#fb923c',
  FC: '#fbbf24',
  SL: '#22d3ee',
  ST: '#38bdf8',
  SV: '#93c5fd',
  CU: '#60a5fa',
  KC: '#818cf8',
  CH: '#34d399',
  FS: '#2dd4bf',
  FO: '#6ee7b7',
  EP: '#e879f9',
  DEFAULT: '#8b8fc8',
}

export function pitchColor(code) {
  return PITCH_COLORS[code] ?? PITCH_COLORS.DEFAULT
}
