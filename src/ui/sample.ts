/**
 * A procedurally drawn sample picture so the app opens in a working state without shipping anyone's photo:
 * a lit sphere on a stepped plinth in front of a window, with enough tonal range to exercise every tone.
 */
export async function sampleImage(): Promise<Blob> {
  const W = 1200, H = 1600
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')!

  // wall: soft vertical light falloff
  const wall = g.createLinearGradient(0, 0, W, 0)
  wall.addColorStop(0, '#3a3a3a'); wall.addColorStop(0.55, '#8c8c8c'); wall.addColorStop(1, '#5a5a5a')
  g.fillStyle = wall; g.fillRect(0, 0, W, H)

  // window with mullions, blown-out light
  g.fillStyle = '#f4f4f4'; g.fillRect(760, 180, 330, 560)
  g.fillStyle = '#6d6d6d'; g.fillRect(915, 180, 20, 560); g.fillRect(760, 450, 330, 20)
  const glow = g.createRadialGradient(925, 460, 40, 925, 460, 520)
  glow.addColorStop(0, 'rgba(255,255,255,0.35)'); glow.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = glow; g.fillRect(0, 0, W, H)

  // stepped plinth
  const steps = [[140, 1180, 920, 120, '#b9b9b9'], [220, 1060, 760, 120, '#a3a3a3'], [300, 1300, 1000, 300, '#cfcfcf']] as const
  for (const [x, y, w, h, col] of steps) {
    g.fillStyle = col; g.fillRect(x, y, w, h)
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y + h - 14, w, 14)
  }

  // sphere, lit from the window side
  const cx = 600, cy = 800, r = 260
  const sph = g.createRadialGradient(cx + 110, cy - 120, 20, cx, cy, r)
  sph.addColorStop(0, '#ffffff'); sph.addColorStop(0.35, '#c8c8c8'); sph.addColorStop(0.8, '#3c3c3c'); sph.addColorStop(1, '#141414')
  g.beginPath(); g.ellipse(cx + 40, cy + r + 8, r * 0.95, 34, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fill()
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = sph; g.fill()

  // a few thin details that test small features
  g.strokeStyle = '#1b1b1b'; g.lineWidth = 6
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(80, 300 + i * 120); g.lineTo(80 + 420, 250 + i * 120); g.stroke() }
  g.fillStyle = '#111'; g.font = 'bold 120px sans-serif'; g.fillText('RELIEF', 120, 1520)

  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'))
}
