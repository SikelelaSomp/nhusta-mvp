// svg diagrams for cue cards (and later, practise questions). driven by a small json "figure".
type Pos = 'l' | 'r' | 't' | 'b' | 'tl' | 'tr' | 'bl' | 'br'
type Pt = { x: number; y: number; label?: string; pos?: Pos }

type PlaneFig = {
  type: 'plane'
  x: [number, number]
  y: [number, number]
  tick?: [number, number]
  cast?: boolean
  points?: Pt[]
  segments?: { from: number; to: number; label?: string; flip?: boolean }[]
  rays?: { to: number; label?: string; flip?: boolean }[] // lines from the origin
  drops?: number[] // dashed lines from a point to both axes
  rightAngle?: { x: number; y: number; dx: number; dy: number }
  angle?: { to: number; label?: string } // from the positive x-axis to a point
}

type TriangleFig = {
  type: 'triangle'
  base: number
  height: number
  labels?: { adj?: string; opp?: string; hyp?: string }
  theta?: string
  phi?: string
  names?: { right?: string; theta?: string; top?: string }
}

export type Figure = PlaneFig | TriangleFig

const BRAND = '#0f5b4a'
const ACCENT = '#e07a2a'
const GOLD = '#f2b632'
const INK = '#1f2a24'
const GRID = '#d9d2bf'

const OFFSET: Record<Pos, { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' }> = {
  r: { dx: 8, dy: 4, anchor: 'start' },
  l: { dx: -8, dy: 4, anchor: 'end' },
  t: { dx: 0, dy: -9, anchor: 'middle' },
  b: { dx: 0, dy: 17, anchor: 'middle' },
  tl: { dx: -7, dy: -8, anchor: 'end' },
  tr: { dx: 7, dy: -8, anchor: 'start' },
  bl: { dx: -7, dy: 17, anchor: 'end' },
  br: { dx: 7, dy: 17, anchor: 'start' },
}

function anchorFor(nx: number): 'start' | 'middle' | 'end' {
  return nx < -0.3 ? 'end' : nx > 0.3 ? 'start' : 'middle'
}

function Plane({ f }: { f: PlaneFig }) {
  const W = 320
  const H = 320
  const pad = 34
  const [x0, x1] = f.x
  const [y0, y1] = f.y
  const s = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0))
  const ox = (W - (x1 - x0) * s) / 2
  const oy = (H - (y1 - y0) * s) / 2
  const X = (x: number) => ox + (x - x0) * s
  const Y = (y: number) => oy + (y1 - y) * s
  const [tx, ty] = f.tick ?? [1, 1]
  const pts = f.points ?? []
  const cx = X(0)
  const cy = Y(0)

  const xTicks: number[] = []
  for (let k = Math.ceil(x0 / tx) * tx; k <= x1; k += tx) xTicks.push(k)
  const yTicks: number[] = []
  for (let k = Math.ceil(y0 / ty) * ty; k <= y1; k += ty) yTicks.push(k)

  function segLabel(ax: number, ay: number, bx: number, by: number, text: string, flip = false) {
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy) || 1
    const sign = flip ? -1 : 1
    const nx = (sign * dy) / len
    const ny = (-sign * dx) / len
    return (
      <text
        x={(ax + bx) / 2 + nx * 13}
        y={(ay + by) / 2 + ny * 13 + 4}
        fontSize="13"
        fontWeight="700"
        fill={ACCENT}
        textAnchor={anchorFor(nx)}
      >
        {text}
      </text>
    )
  }

  let arc: React.ReactNode = null
  if (f.angle && pts[f.angle.to]) {
    const p = pts[f.angle.to]
    let th = Math.atan2(p.y, p.x)
    if (th < 0) th += 2 * Math.PI
    const r = 26
    const ex = cx + r * Math.cos(th)
    const ey = cy - r * Math.sin(th)
    arc = (
      <g>
        <path
          d={`M ${cx + r} ${cy} A ${r} ${r} 0 ${th > Math.PI ? 1 : 0} 0 ${ex} ${ey}`}
          fill="none"
          stroke={ACCENT}
          strokeWidth="2"
        />
        {f.angle.label && (
          <text
            x={cx + (r + 13) * Math.cos(th / 2)}
            y={cy - (r + 13) * Math.sin(th / 2) + 5}
            fontSize="15"
            fontWeight="700"
            fill={ACCENT}
            textAnchor="middle"
          >
            {f.angle.label}
          </text>
        )}
      </g>
    )
  }

  const ra = f.rightAngle
  const e = 10

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" className="w-full">
      {f.cast &&
        ([
          ['A', X(x1 * 0.4), Y(y1 * 0.78)],
          ['S', X(x0 * 0.4), Y(y1 * 0.78)],
          ['T', X(x0 * 0.4), Y(y0 * 0.78)],
          ['C', X(x1 * 0.4), Y(y0 * 0.78)],
        ] as [string, number, number][]).map(([t, x, y]) => (
          <text key={t} x={x} y={y + 12} fontSize="34" fontWeight="800" fill={BRAND} opacity="0.22" textAnchor="middle">
            {t}
          </text>
        ))}

      {xTicks.map(k => (
        <line key={`gx${k}`} x1={X(k)} y1={Y(y0)} x2={X(k)} y2={Y(y1)} stroke={GRID} strokeWidth="1" />
      ))}
      {yTicks.map(k => (
        <line key={`gy${k}`} x1={X(x0)} y1={Y(k)} x2={X(x1)} y2={Y(k)} stroke={GRID} strokeWidth="1" />
      ))}

      <line x1={X(x0)} y1={cy} x2={X(x1)} y2={cy} stroke={INK} strokeWidth="1.8" />
      <line x1={cx} y1={Y(y0)} x2={cx} y2={Y(y1)} stroke={INK} strokeWidth="1.8" />
      <text x={X(x1) + 4} y={cy + 4} fontSize="13" fontWeight="700" fill={INK}>x</text>
      <text x={cx + 6} y={Y(y1) - 4} fontSize="13" fontWeight="700" fill={INK}>y</text>

      {xTicks.filter(k => k !== 0).map(k => (
        <text key={`tx${k}`} x={X(k)} y={cy + 14} fontSize="10" fill="#555" textAnchor="middle">{k}</text>
      ))}
      {yTicks.filter(k => k !== 0).map(k => (
        <text key={`ty${k}`} x={cx - 5} y={Y(k) + 3} fontSize="10" fill="#555" textAnchor="end">{k}</text>
      ))}

      {(f.drops ?? []).map(i =>
        pts[i] ? (
          <g key={`d${i}`} stroke={BRAND} strokeWidth="1.2" strokeDasharray="4 3">
            <line x1={X(pts[i].x)} y1={Y(pts[i].y)} x2={X(pts[i].x)} y2={cy} />
            <line x1={X(pts[i].x)} y1={Y(pts[i].y)} x2={cx} y2={Y(pts[i].y)} />
          </g>
        ) : null
      )}

      {(f.segments ?? []).map((sg, n) => {
        const a = pts[sg.from]
        const b = pts[sg.to]
        if (!a || !b) return null
        return (
          <g key={`s${n}`}>
            <line x1={X(a.x)} y1={Y(a.y)} x2={X(b.x)} y2={Y(b.y)} stroke={BRAND} strokeWidth="2.4" />
            {sg.label && segLabel(X(a.x), Y(a.y), X(b.x), Y(b.y), sg.label, sg.flip)}
          </g>
        )
      })}

      {(f.rays ?? []).map((r, n) => {
        const p = pts[r.to]
        if (!p) return null
        return (
          <g key={`r${n}`}>
            <line x1={cx} y1={cy} x2={X(p.x)} y2={Y(p.y)} stroke={BRAND} strokeWidth="2.4" />
            {r.label && segLabel(cx, cy, X(p.x), Y(p.y), r.label, r.flip)}
          </g>
        )
      })}

      {ra && (
        <path
          d={`M ${X(ra.x) + ra.dx * e} ${Y(ra.y)} L ${X(ra.x) + ra.dx * e} ${Y(ra.y) - ra.dy * e} L ${X(ra.x)} ${Y(ra.y) - ra.dy * e}`}
          fill="none"
          stroke={INK}
          strokeWidth="1.5"
        />
      )}
      {arc}

      {pts.map((p, n) => {
        const o = OFFSET[p.pos ?? 'r']
        return (
          <g key={`p${n}`}>
            <circle cx={X(p.x)} cy={Y(p.y)} r="4.5" fill={GOLD} stroke={INK} strokeWidth="1.2" />
            {p.label && (
              <text x={X(p.x) + o.dx} y={Y(p.y) + o.dy} fontSize="12" fontWeight="700" fill={INK} textAnchor={o.anchor}>
                {p.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function Triangle({ f }: { f: TriangleFig }) {
  const W = 360
  const H = 240
  const x0 = 80
  const y0 = 190
  const s = Math.min((W - x0 - 70) / f.base, 140 / f.height)
  const bpx = f.base * s
  const hpx = f.height * s
  const A = { x: x0, y: y0 } // right angle
  const B = { x: x0 + bpx, y: y0 } // theta
  const C = { x: x0, y: y0 - hpx } // top
  const len = Math.hypot(bpx, hpx)
  const th = Math.atan2(hpx, bpx) // angle at B
  const ph = Math.PI / 2 - th // angle at C
  const r = 30
  const e = 11
  const L = f.labels ?? {}
  const nm = f.names ?? {}

  // outward normal of the hypotenuse (up and right)
  const hn = { x: hpx / len, y: -bpx / len }
  const hm = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" className="w-full">
      <polygon
        points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
        fill={BRAND} fillOpacity="0.08"
        stroke={BRAND}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d={`M ${A.x + e} ${A.y} L ${A.x + e} ${A.y - e} L ${A.x} ${A.y - e}`} fill="none" stroke={INK} strokeWidth="1.5" />

      {f.theta && (
        <g>
          <path
            d={`M ${B.x - r} ${B.y} A ${r} ${r} 0 0 1 ${B.x - r * Math.cos(th)} ${B.y - r * Math.sin(th)}`}
            fill="none"
            stroke={ACCENT}
            strokeWidth="2"
          />
          <text
            x={B.x - (r + 14) * Math.cos(th / 2)}
            y={B.y - (r + 14) * Math.sin(th / 2) + 5}
            fontSize="16"
            fontWeight="700"
            fill={ACCENT}
            textAnchor="middle"
          >
            {f.theta}
          </text>
        </g>
      )}
      {f.phi && (
        <g>
          <path
            d={`M ${C.x} ${C.y + r} A ${r} ${r} 0 0 0 ${C.x + r * Math.sin(th)} ${C.y + r * Math.cos(th)}`}
            fill="none"
            stroke={ACCENT}
            strokeWidth="2"
          />
          <text
            x={C.x + (r + 12) * Math.sin(ph / 2)}
            y={C.y + (r + 12) * Math.cos(ph / 2) + 5}
            fontSize="16"
            fontWeight="700"
            fill={ACCENT}
            textAnchor="middle"
          >
            {f.phi}
          </text>
        </g>
      )}

      {L.adj && (
        <text x={(A.x + B.x) / 2} y={A.y + 22} fontSize="13" fontWeight="700" fill={INK} textAnchor="middle">{L.adj}</text>
      )}
      {L.opp && (
        <text x={A.x - 10} y={(A.y + C.y) / 2 + 4} fontSize="13" fontWeight="700" fill={INK} textAnchor="end">{L.opp}</text>
      )}
      {L.hyp && (
        <text x={hm.x + hn.x * 14} y={hm.y + hn.y * 14 + 4} fontSize="13" fontWeight="700" fill={ACCENT} textAnchor="start">{L.hyp}</text>
      )}

      {nm.right && <text x={A.x - 10} y={A.y + 16} fontSize="13" fontWeight="800" fill={INK} textAnchor="end">{nm.right}</text>}
      {nm.theta && <text x={B.x + 8} y={B.y + 16} fontSize="13" fontWeight="800" fill={INK}>{nm.theta}</text>}
      {nm.top && <text x={C.x - 4} y={C.y - 10} fontSize="13" fontWeight="800" fill={INK} textAnchor="middle">{nm.top}</text>}
    </svg>
  )
}

export default function Diagram({ figure }: { figure: Figure | null | undefined }) {
  if (!figure) return null
  return (
    <div className="mx-auto max-w-sm rounded-xl bg-cream p-2">
      {figure.type === 'plane' ? <Plane f={figure} /> : <Triangle f={figure} />}
    </div>
  )
}