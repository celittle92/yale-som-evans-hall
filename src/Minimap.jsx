import { useEffect, useRef } from 'react'
import { BEIN, BOUNDS, COURTYARD, DRUMS, LIBRARY, MEETING, STAIRS, arc } from './layout.js'
import { DAN } from './HandsomeDan.jsx'

const PAD = 3
const X0 = BOUNDS.xMin - PAD
const X1 = BOUNDS.xMax + BEIN.terrace + PAD
const Z0 = BOUNDS.zMin - PAD
const Z1 = BOUNDS.zMax + PAD
const S = 2.6 // px per meter
const Wpx = Math.round((X1 - X0) * S)
const Hpx = Math.round((Z1 - Z0) * S)
const px = (x, z) => [(x - X0) * S, (z - Z0) * S]

// warm editorial palette, same tokens as styles.css
const C = {
  ground: '#faf6ef',
  floor: '#fffdfa',
  line: '#d8ccbb',
  accent: '#6b2d5c',
  terrace: '#ece4d6',
  beinecke: '#e3d8ea',
  courtyard: '#dde6d6',
  drum: '#e8eef5',
  library: '#f0e5d2',
  meeting: '#eee7db',
  label: '#57534e',
  dan: '#1e3a5f',
  player: '#1c1917',
  cone: 'rgba(107,45,92,0.22)',
}

function drawStatic(g) {
  g.fillStyle = C.ground
  g.fillRect(0, 0, Wpx, Hpx)
  const path = (pts, close = true) => {
    g.beginPath()
    pts.forEach((p, i) => (i ? g.lineTo(...px(...p)) : g.moveTo(...px(...p))))
    if (close) g.closePath()
  }
  // building
  g.fillStyle = C.floor
  g.strokeStyle = C.accent
  g.lineWidth = 1.5
  path([[BOUNDS.xMin, BOUNDS.zMin], [BOUNDS.xMax, BOUNDS.zMin], [BOUNDS.xMax, BOUNDS.zMax], [BOUNDS.xMin, BOUNDS.zMax]])
  g.fill()
  g.stroke()
  // terrace + Beinecke
  path(arc(BEIN.c, BEIN.terrace, BEIN.terrace, 0, Math.PI, 30))
  g.fillStyle = C.terrace
  g.fill()
  path(arc(BEIN.c, BEIN.r, BEIN.r, 0, Math.PI, 30))
  g.fillStyle = C.beinecke
  g.fill()
  g.stroke()
  // courtyard
  path(COURTYARD)
  g.fillStyle = C.courtyard
  g.fill()
  g.strokeStyle = C.line
  g.stroke()
  // drums
  g.strokeStyle = C.accent
  for (const d of DRUMS) {
    path(arc(d.c, d.rx, d.rz, 0, Math.PI * 2, 48))
    g.fillStyle = C.drum
    g.fill()
    for (const [a0, a1] of d.arcs) {
      path(arc(d.c, d.rx, d.rz, a0, a1, 32), false)
      g.stroke()
    }
  }
  // library, meeting rooms, stairs
  g.fillStyle = C.library
  g.fillRect(...px(LIBRARY.x0, LIBRARY.z0), (LIBRARY.x1 - LIBRARY.x0) * S, (LIBRARY.z1 - LIBRARY.z0) * S)
  g.fillStyle = C.meeting
  for (const m of MEETING) g.fillRect(...px(m.x - 2.6, m.z - 2.8), 5.2 * S, 5.6 * S)
  g.fillStyle = C.accent
  g.font = 'bold 10px system-ui, sans-serif'
  for (const s of STAIRS) {
    g.fillRect(...px(s.c[0] - s.w / 2, s.c[1] - s.d / 2), s.w * S, s.d * S)
    g.fillStyle = C.floor
    g.fillText(s.id, ...px(s.c[0] - 0.9, s.c[1] + 1.2))
    g.fillStyle = C.accent
  }
  g.fillStyle = C.label
  g.font = '9px system-ui, sans-serif'
  g.fillText('ROSS LIB', ...px(LIBRARY.x0 + 0.6, 1))
  g.fillText('BEINECKE', ...px(BEIN.c[0] + 2, 1))
  g.fillText('COURTYARD', ...px(-7, 1))
  g.fillText('N ↑', ...px(BOUNDS.xMax + 6, BOUNDS.zMin + 2))
  for (const d of DRUMS) g.fillText(d.id, ...px(d.c[0] - 2.4, d.c[1] + 1))
}

export default function Minimap({ drawRef }) {
  const ref = useRef()
  useEffect(() => {
    const bg = document.createElement('canvas')
    bg.width = Wpx
    bg.height = Hpx
    drawStatic(bg.getContext('2d'))
    const g = ref.current.getContext('2d')
    drawRef.current = (x, z, fx, fz) => {
      g.drawImage(bg, 0, 0)
      // Handsome Dan
      const [dx, dy] = px(DAN.x, DAN.z)
      g.fillStyle = C.dan
      g.strokeStyle = C.floor
      g.lineWidth = 1.5
      g.beginPath()
      g.arc(dx, dy, 4, 0, Math.PI * 2)
      g.fill()
      g.stroke()
      const [cx, cy] = px(x, z)
      g.fillStyle = C.cone
      g.beginPath()
      g.moveTo(cx, cy)
      const a = Math.atan2(fz, fx)
      g.arc(cx, cy, 26, a - 0.5, a + 0.5)
      g.closePath()
      g.fill()
      // ink dot on a cream map, ringed so it reads over the darker room fills
      g.fillStyle = C.player
      g.beginPath()
      g.arc(cx, cy, 4, 0, Math.PI * 2)
      g.fill()
      g.stroke()
    }
  }, [drawRef])
  return <canvas ref={ref} className="minimap" width={Wpx} height={Hpx} />
}

