// Run: node generate-icons.js
// Requires: npm install canvas  (in extension/ dir)
const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const SIZES = [16, 48, 128]

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx    = canvas.getContext('2d')

  // Background
  const bg = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
  bg.addColorStop(0, '#1a1b35')
  bg.addColorStop(1, '#06070f')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2)
  ctx.fill()

  // Brand accent ring
  ctx.strokeStyle = '#6e66f8'
  ctx.lineWidth   = size * 0.06
  ctx.globalAlpha = 0.6
  ctx.beginPath()
  ctx.arc(size/2, size/2, size/2 - size*0.06, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1

  // "P" letter
  const fontSize = Math.round(size * 0.55)
  ctx.font        = `700 ${fontSize}px sans-serif`
  ctx.fillStyle   = '#c7c5ff'
  ctx.textAlign   = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('P', size / 2, size / 2 + size * 0.02)

  // Green live dot (top-right)
  const dotR = size * 0.12
  const dotX = size - dotR * 1.2
  const dotY = dotR * 1.2
  ctx.fillStyle = '#22c55e'
  ctx.beginPath()
  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2)
  ctx.fill()

  return canvas
}

const iconsDir = path.join(__dirname, 'icons')
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir)

SIZES.forEach(size => {
  const canvas = drawIcon(size)
  const out    = path.join(iconsDir, `icon${size}.png`)
  fs.writeFileSync(out, canvas.toBuffer('image/png'))
  console.log(`✓  ${out}`)
})
