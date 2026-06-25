/**
 * Solves y0 + vy0*t + 0.5*ay*t² = 0 for t (time ball crosses home plate).
 * MLB convention: y0 ≈ 50 ft from plate, vy0 is negative (moving toward plate).
 * Returns the smallest positive root, or 0.45s as a safe fallback.
 */
export function solveTPlate(y0, vy0, ay) {
  const a = 0.5 * ay
  const b = vy0
  const c = y0
  if (Math.abs(a) < 1e-9) {
    const t = -c / b
    return t > 0 ? t : 0.45
  }
  const disc = b * b - 4 * a * c
  if (disc < 0) return 0.45
  const sq = Math.sqrt(disc)
  const t1 = (-b + sq) / (2 * a)
  const t2 = (-b - sq) / (2 * a)
  const pos = [t1, t2].filter(t => t > 0)
  return pos.length ? Math.min(...pos) : 0.45
}

/**
 * Evaluate constant-acceleration position at time t.
 */
export function evalPos(p0, v0, a, t) {
  return p0 + v0 * t + 0.5 * a * t * t
}

/**
 * Convert MLB Statcast coordinates → Three.js world space.
 *   MLB:   x = catcher-right, y = distance from pitcher toward plate, z = height
 *   Three: X = right, Y = up (height), Z = toward pitcher (plate at Z=0, mound at Z≈+55)
 */
export function mlbToThree(mlbX, mlbY, mlbZ) {
  return [mlbX, mlbZ, -(mlbY - 60.5)]
}

/**
 * Compute full pitch trajectory as array of Three.js [X,Y,Z] points.
 * Returns null if physics params are missing.
 */
export function computeTrajectory(pitch, numPts = 48) {
  const { x0, y0, z0, vx0, vy0, vz0, ax, ay, az } = pitch
  if (x0 == null || y0 == null || z0 == null || vy0 == null) return null

  const tPlate = solveTPlate(y0, vy0, ay)
  const points = []
  for (let i = 0; i <= numPts; i++) {
    const t = (i / numPts) * tPlate
    const mx = evalPos(x0, vx0, ax, t)
    const my = evalPos(y0, vy0, ay, t)
    const mz = evalPos(z0, vz0, az, t)
    points.push(mlbToThree(mx, my, mz))
  }
  return { points, tPlate }
}
