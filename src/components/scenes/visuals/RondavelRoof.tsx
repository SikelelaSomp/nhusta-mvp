'use client';

/**
 * RondavelRoof: Explore simulation for Grade 10 trigonometry (SOH CAH TOA).
 * Drop into src/components/scenes/visuals/RondavelRoof.tsx.
 * Self-contained: no assets, no external libs. Everything is SVG drawn in code.
 *
 * Story: a cold front is coming. A storm knocked a rafter off gogo's rondavel.
 * Fix the roof before sunset.
 *   Round 1: name the sides of the roof triangle (opposite / adjacent / hypotenuse)
 *   Round 2: drag the pole top to set the roof pitch (tan = opposite / adjacent)
 *   Round 3: pick the right ratio (cos) and cut the rafter to length
 *
 * Not marked, no scores sent anywhere. Calls onComplete() when the learner finishes.
 */

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

type Props = { onComplete?: () => void };
type Side = 'pole' | 'floor' | 'rafter';
type Ratio = 'sin' | 'cos' | 'tan';
type Round = 1 | 2 | 3 | 4;

// geometry: 1 metre = 50px, side-view cutaway
const R = 4; // metres from centre pole to wall
const PX = 50;
const CX = 400;
const WALL_Y = 290; // top of the wall = the "window to window" line
const FLOOR_Y = 440;
const ZONE_MIN = 25;
const ZONE_MAX = 35;

const PROMPTS: { angle: 'θ' | 'φ'; ask: string; answer: Side; wrong: string; intro: string }[] = [
  {
    angle: 'θ',
    ask: 'opposite',
    answer: 'pole',
    intro: 'Tap the side opposite θ.',
    wrong: 'Not that one. Opposite means across from the angle, not touching it.',
  },
  {
    angle: 'θ',
    ask: 'adjacent',
    answer: 'floor',
    intro: 'Now tap the side adjacent to θ (next to it, but not the longest side).',
    wrong: 'Adjacent means next to the angle. It is not the longest side.',
  },
  {
    angle: 'θ',
    ask: 'hypotenuse',
    answer: 'rafter',
    intro: 'Last one: tap the hypotenuse.',
    wrong: 'The hypotenuse is the longest side, across from the right angle.',
  },
  {
    angle: 'φ',
    ask: 'opposite',
    answer: 'floor',
    intro: 'Now stand at the peak. φ is up here. Which side is opposite φ?',
    wrong: 'Opposite means across from the angle. Look at where φ is.',
  },
];

export default function RondavelRoof({ onComplete }: Props) {
  const [round, setRound] = useState<Round>(1);
  const [step, setStep] = useState(0);
  const [nudge, setNudge] = useState('');
  const [labels, setLabels] = useState<Partial<Record<Side, string>>>({});
  const [h, setH] = useState(2); // metres the pole sticks up above the wall
  const [ratio, setRatio] = useState<Ratio | null>(null);
  const [ratioMsg, setRatioMsg] = useState('');
  const [cut, setCut] = useState(3);
  const [cutMsg, setCutMsg] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // re-centre on the roof whenever zoom changes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    el.scrollTop = Math.max(0, el.scrollHeight * 0.34 - el.clientHeight / 2);
  }, [zoom]);
  const ZOOMS = [1, 1.5, 2, 2.5];
  const zi = ZOOMS.indexOf(zoom);

  const hh = round === 1 ? 2 : h;
  const peakY = WALL_Y - hh * PX;
  const deg = (Math.atan(hh / R) * 180) / Math.PI;
  const rafter = Math.hypot(R, hh);
  const inZone = deg >= ZONE_MIN && deg <= ZONE_MAX;
  const Bx = CX + R * PX;
  const Ax = CX - R * PX;
  const midPoleY = (WALL_Y + peakY) / 2;
  const rad = (deg * Math.PI) / 180;

  // ---------- round 1 ----------
  function tap(side: Side) {
    if (round !== 1 || step >= PROMPTS.length) return;
    const p = PROMPTS[step];
    if (side !== p.answer) {
      setNudge(p.wrong);
      return;
    }
    setNudge('');
    const next = step + 1;
    if (next === 3) setLabels({});
    else setLabels((prev) => ({ ...prev, [side]: p.ask }));
    setStep(next);
    if (next === PROMPTS.length) setLabels({ floor: 'opposite' });
  }

  // ---------- round 2 ----------
  function moveTo(e: PointerEvent<SVGElement>) {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    const metres = Math.min(4, Math.max(0.3, (WALL_Y - p.y) / PX));
    setH(Math.round(metres * 20) / 20);
  }

  // ---------- round 3 ----------
  function pickRatio(r: Ratio) {
    if (r === 'cos') {
      setRatio('cos');
      setRatioMsg('');
      return;
    }
    setRatioMsg(
      r === 'sin'
        ? 'sin θ = opposite ÷ hypotenuse. The pole top is gone, so you cannot measure the opposite side tonight.'
        : 'tan θ = opposite ÷ adjacent. It does not include the rafter at all.'
    );
  }

  function doCut() {
    const diff = cut - rafter;
    if (Math.abs(diff) <= 0.1) {
      setCutMsg('');
      setRound(4);
    } else if (diff < 0) {
      setCutMsg('Too short. There is a gap and the rain will get in. Check your calculation.');
    } else {
      setCutMsg('Too long. It will not sit on the wall. Check your calculation.');
    }
  }

  function reset() {
    setRound(1);
    setStep(0);
    setNudge('');
    setLabels({});
    setH(2);
    setRatio(null);
    setRatioMsg('');
    setCut(3);
    setCutMsg('');
  }

  const dusk = [0, 0.12, 0.3, 0.55][round - 1];
  const sunY = [110, 150, 200, 285][round - 1];
  const angleAtWall = step < 3 || round !== 1;
  const sideColor = (s: Side) => (labels[s] ? '#7ee0a1' : '#fff3d6');

  const arcB = `M ${Bx - 44} ${WALL_Y} A 44 44 0 0 1 ${Bx - 44 * Math.cos(rad)} ${WALL_Y - 44 * Math.sin(rad)}`;
  const len = Math.hypot(R * PX, hh * PX);
  const ux = (R * PX) / len;
  const uy = (hh * PX) / len;
  const arcC = `M ${CX} ${peakY + 44} A 44 44 0 0 0 ${CX + 44 * ux} ${peakY + 44 * uy}`;

  return (
    <div className="mx-auto w-full max-w-3xl select-none">
      <div className="relative">
      <div ref={scrollRef} className="overflow-auto rounded-2xl" style={{ maxHeight: '75vh' }}>
      <svg
        ref={svgRef}
        viewBox="150 60 500 410"
        className="block max-w-none"
        style={{ width: `${zoom * 100}%` }}
        role="img"
        aria-label="Cutaway of a rondavel with a fire in the middle, a central pole and a thatch roof"
      >
        <defs>
          <linearGradient id="rr-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d2350" />
            <stop offset="0.55" stopColor="#7a3e6b" />
            <stop offset="1" stopColor="#e8844a" />
          </linearGradient>
          <radialGradient id="rr-glow">
            <stop offset="0" stopColor="#ffb347" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
          </radialGradient>
        </defs>
        <style>{`
          @keyframes rr-flick { 0%,100% { transform: scaleY(1) } 50% { transform: scaleY(1.14) } }
          .rr-flame { transform-box: fill-box; transform-origin: 50% 100%; animation: rr-flick 0.9s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) { .rr-flame { animation: none } }
        `}</style>

        {/* sky, sun, ground */}
        <rect width="800" height="520" fill="url(#rr-sky)" />
        <rect width="800" height="520" fill="#0a0d24" opacity={dusk} />
        <circle cx="185" cy={sunY} r="26" fill="#ffd27a" />
        {round === 4 &&
          [[560, 90], [610, 130], [480, 75], [625, 85], [250, 95]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="#fff" />
          ))}
        <rect y={FLOOR_Y} width="800" height="80" fill="#3b2a1d" />
        <rect y={FLOOR_Y} width="800" height="6" fill="#5b7a3a" />

        {/* wall cutaway */}
        <rect x={Ax} y={WALL_Y} width={R * 2 * PX} height={FLOOR_Y - WALL_Y} fill="#3a2318" />
        <rect x={Ax - 18} y={WALL_Y} width="18" height={FLOOR_Y - WALL_Y} fill="#b0623a" />
        <rect x={Bx} y={WALL_Y} width="18" height={FLOOR_Y - WALL_Y} fill="#b0623a" />

        {/* thatch shell + dark interior */}
        <polygon points={`${Ax - 28},${WALL_Y + 8} ${CX},${peakY - 14} ${Bx + 28},${WALL_Y + 8}`} fill="#d9b25f" />
        <polygon points={`${Ax},${WALL_Y} ${CX},${peakY} ${Bx},${WALL_Y}`} fill="#2b1b17" />
        {[0.2, 0.4, 0.6, 0.8].map((t) => (
          <g key={t} stroke="#a98334" strokeWidth="2" opacity="0.7">
            <line x1={CX} y1={peakY - 14} x2={Ax - 28 + t * (R * PX + 28)} y2={WALL_Y + 8} />
            <line x1={CX} y1={peakY - 14} x2={Bx + 28 - t * (R * PX + 28)} y2={WALL_Y + 8} />
          </g>
        ))}

        {/* fire glow, pole, fire, people */}
        <circle cx={CX} cy={FLOOR_Y - 20} r={round === 4 ? 150 : 100} fill="url(#rr-glow)" />
        <line x1={CX} y1={FLOOR_Y} x2={CX} y2={peakY} stroke="#7a4a2a" strokeWidth="9" />
        <g className="rr-flame">
          <ellipse cx={CX} cy={FLOOR_Y - 16} rx="16" ry="24" fill="#ff7a1a" />
          <ellipse cx={CX} cy={FLOOR_Y - 12} rx="8" ry="15" fill="#ffd54a" />
        </g>
        <rect x={CX - 22} y={FLOOR_Y - 5} width="44" height="7" rx="3" fill="#4a2c18" />
        {[330, 470].map((x, i) => (
          <g key={x}>
            <circle cx={x} cy={FLOOR_Y - 46} r="10" fill="#1a0f0c" />
            <rect x={x - 14} y={FLOOR_Y - 36} width="28" height="34" rx="12" fill={i === 0 ? '#6b8fd1' : '#1a0f0c'} />
          </g>
        ))}

        {/* axes labels (her idea: pole = y, window-to-window = x) */}
        <text stroke="#140c0a" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" x={Ax + 10} y={WALL_Y - 8} fill="#fff3d6" fontSize="15" opacity="0.85">
          window
        </text>
        <text stroke="#140c0a" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" x={Bx - 56} y={WALL_Y - 8} fill="#fff3d6" fontSize="15" opacity="0.85">
          window
        </text>

        {/* triangle: pole (A to C), floor line (A to B), rafter (B to C) */}
        <g strokeLinecap="round" fill="none">
          <line
            x1={CX} y1={WALL_Y} x2={CX} y2={peakY}
            stroke={sideColor('pole')} strokeWidth="4"
            strokeDasharray={labels.pole ? undefined : '8 6'}
          />
          <line
            x1={CX} y1={WALL_Y} x2={Bx} y2={WALL_Y}
            stroke={sideColor('floor')} strokeWidth="4"
            strokeDasharray={labels.floor ? undefined : '8 6'}
          />
          <line
            x1={Bx} y1={WALL_Y} x2={CX} y2={peakY}
            stroke={round === 4 ? '#7ee0a1' : round === 3 ? '#ff8a6b' : sideColor('rafter')}
            strokeWidth="4"
            strokeDasharray={round === 4 ? undefined : round === 3 ? '3 9' : labels.rafter ? undefined : '8 6'}
          />
          <rect x={CX} y={WALL_Y - 12} width="12" height="12" stroke="#fff3d6" strokeWidth="2" />
          <path d={arcB} stroke="#ffd54a" strokeWidth="3" opacity={angleAtWall ? 1 : 0.3} />
          <path d={arcC} stroke="#ffd54a" strokeWidth="3" opacity={angleAtWall ? 0.3 : 1} />
        </g>
        <text stroke="#140c0a" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" x={Bx - 78} y={WALL_Y - 12} fill="#ffd54a" fontSize="30" fontWeight="700" opacity={angleAtWall ? 1 : 0.35}>
          θ
        </text>
        <text stroke="#140c0a" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" x={CX + 12} y={peakY + 46} fill="#ffd54a" fontSize="30" fontWeight="700" opacity={angleAtWall ? 0.35 : 1}>
          φ
        </text>

        {/* side labels once learner gets them right */}
        {labels.pole && (
          <text stroke="#140c0a" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" x={CX - 14} y={midPoleY} textAnchor="end" fill="#7ee0a1" fontSize="21" fontWeight="600">
            {labels.pole}
          </text>
        )}
        {labels.floor && (
          <text stroke="#140c0a" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" x={CX + 100} y={WALL_Y + 22} textAnchor="middle" fill="#7ee0a1" fontSize="21" fontWeight="600">
            {labels.floor}
          </text>
        )}
        {labels.rafter && (
          <text stroke="#140c0a" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" x={(CX + Bx) / 2 + 14} y={(WALL_Y + peakY) / 2 - 10} fill="#7ee0a1" fontSize="21" fontWeight="600">
            {labels.rafter}
          </text>
        )}

        {/* measurements */}
        <text stroke="#140c0a" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" x={CX + 100} y={WALL_Y + 44} textAnchor="middle" fill="#fff3d6" fontSize="19">
          {R} m
        </text>
        {round !== 3 && round !== 4 && (
          <text stroke="#140c0a" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" x={CX + 12} y={midPoleY + 5} fill="#fff3d6" fontSize="19">
            {hh.toFixed(2).replace(/\.?0+$/, '')} m
          </text>
        )}
        {round >= 3 && (
          <text stroke="#140c0a" strokeWidth="4" strokeLinejoin="round" paintOrder="stroke" x={CX + 12} y={midPoleY + 5} fill="#ff8a6b" fontSize="24" fontWeight="700">
            ?
          </text>
        )}

        {/* invisible tap targets, round 1 only */}
        {round === 1 && step < PROMPTS.length && (
          <g stroke="transparent" strokeWidth="30" style={{ cursor: 'pointer' }}>
            <line x1={CX} y1={WALL_Y} x2={CX} y2={peakY} role="button" tabIndex={0} aria-label="Pole side"
              onClick={() => tap('pole')} onKeyDown={(e) => e.key === 'Enter' && tap('pole')} />
            <line x1={CX} y1={WALL_Y} x2={Bx} y2={WALL_Y} role="button" tabIndex={0} aria-label="Window to window side"
              onClick={() => tap('floor')} onKeyDown={(e) => e.key === 'Enter' && tap('floor')} />
            <line x1={Bx} y1={WALL_Y} x2={CX} y2={peakY} role="button" tabIndex={0} aria-label="Rafter side"
              onClick={() => tap('rafter')} onKeyDown={(e) => e.key === 'Enter' && tap('rafter')} />
          </g>
        )}

        {/* draggable pole top, round 2 only */}
        {round === 2 && (
          <g>
            <circle cx={CX} cy={peakY} r="26" fill="#ffd54a" opacity="0.25" />
            <circle
              cx={CX} cy={peakY} r="15" fill="#ffd54a" stroke="#7a4a2a" strokeWidth="3"
              style={{ cursor: 'ns-resize', touchAction: 'none' }}
              onPointerDown={(e) => {
                dragging.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => dragging.current && moveTo(e)}
              onPointerUp={() => (dragging.current = false)}
              onPointerCancel={() => (dragging.current = false)}
            />
          </g>
        )}
      </svg>
      </div>
      <div className="absolute right-2 top-2 flex gap-1">
        <button
          aria-label="Zoom out"
          disabled={zi <= 0}
          onClick={() => setZoom(ZOOMS[Math.max(0, zi - 1)])}
          className="h-11 w-11 rounded-full bg-slate-900/80 text-2xl font-bold text-white disabled:opacity-30"
        >
          −
        </button>
        <button
          aria-label="Zoom in"
          disabled={zi >= ZOOMS.length - 1}
          onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, zi + 1)])}
          className="h-11 w-11 rounded-full bg-slate-900/80 text-2xl font-bold text-white disabled:opacity-30"
        >
          +
        </button>
      </div>
      </div>

      {/* ---------------- panel ---------------- */}
      <div className="mt-4 rounded-2xl bg-slate-900 p-5 text-lg text-slate-100">
        {round === 1 && (
          <>
            {step === 0 && (
              <p className="mb-2 text-slate-300">
                A cold front hits tonight. The storm knocked a rafter off gogo&apos;s rondavel and you have until
                sunset to fix the roof. First, read the triangle the roof makes.
              </p>
            )}
            {step < PROMPTS.length ? (
              <p className="text-xl font-semibold">{PROMPTS[step].intro}</p>
            ) : (
              <>
                <p className="text-xl font-semibold">Look at that: the labels swapped.</p>
                <p className="mt-1 text-slate-300">
                  Opposite and adjacent depend on which angle you stand at. The hypotenuse stays the same.
                </p>
                <button
                  className="mt-3 rounded-lg bg-amber-400 px-5 py-3 text-lg font-semibold text-slate-900"
                  onClick={() => {
                    setH(1);
                    setRound(2);
                  }}
                >
                  Set the roof
                </button>
              </>
            )}
            {nudge && <p className="mt-2 text-rose-300">{nudge}</p>}
          </>
        )}

        {round === 2 && (
          <>
            <p className="text-xl font-semibold">Drag the top of the pole to set the roof pitch.</p>
            <p className="mt-1 text-slate-300">
              Aim for between {ZONE_MIN}° and {ZONE_MAX}°: steep enough for rain to run off, flat enough that the
              thatch still reaches.
            </p>
            <input
              type="range" min={0.3} max={4} step={0.05} value={h}
              onChange={(e) => setH(Number(e.target.value))}
              aria-label="Height of the pole above the wall in metres"
              className="mt-3 w-full"
            />
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-slate-800 p-2">
                <div className="text-slate-400">opposite (pole)</div>
                <div className="text-base font-semibold">{h.toFixed(2)} m</div>
              </div>
              <div className="rounded-lg bg-slate-800 p-2">
                <div className="text-slate-400">tan θ = opp ÷ adj</div>
                <div className="text-base font-semibold">{(h / R).toFixed(3)}</div>
              </div>
              <div className="rounded-lg bg-slate-800 p-2">
                <div className="text-slate-400">θ</div>
                <div className="text-base font-semibold">{deg.toFixed(1)}°</div>
              </div>
            </div>
            <div className="relative mt-3 h-3 rounded-full bg-slate-700">
              <div
                className="absolute inset-y-0 rounded-full bg-emerald-500/70"
                style={{ left: `${(ZONE_MIN / 60) * 100}%`, width: `${((ZONE_MAX - ZONE_MIN) / 60) * 100}%` }}
              />
              <div
                className="absolute -top-1 h-5 w-1.5 rounded bg-amber-300"
                style={{ left: `${Math.min(100, (deg / 60) * 100)}%` }}
              />
            </div>
            <p className={`mt-2 ${inZone ? 'text-emerald-300' : 'text-amber-200'}`}>
              {deg < ZONE_MIN
                ? 'Too flat: water will pool and the roof will leak.'
                : deg > ZONE_MAX
                ? 'Too steep: you will run out of thatch and the rafter gets long.'
                : 'Good pitch. Rain will run off.'}
            </p>
            <button
              disabled={!inZone}
              className="mt-3 rounded-lg bg-amber-400 px-5 py-3 text-lg font-semibold text-slate-900 disabled:opacity-40"
              onClick={() => setRound(3)}
            >
              Lock the roof
            </button>
          </>
        )}

        {round === 3 && (
          <>
            <p className="text-xl font-semibold">Sunset is close. Time to cut the rafter.</p>
            <p className="mt-1 text-slate-300">
              The storm took the top of the pole, so you can&apos;t measure its height. You do know the roof pitch,
              θ = <b>{deg.toFixed(1)}°</b>, and the distance from the pole to the wall, <b>{R} m</b>. Which ratio
              finds the rafter?
            </p>
            {!ratio && (
              <div className="mt-3 flex gap-2">
                {(['sin', 'cos', 'tan'] as Ratio[]).map((r) => (
                  <button key={r} className="rounded-lg bg-slate-700 px-5 py-3 text-lg font-semibold" onClick={() => pickRatio(r)}>
                    {r} θ
                  </button>
                ))}
              </div>
            )}
            {ratioMsg && <p className="mt-2 text-rose-300">{ratioMsg}</p>}
            {ratio && (
              <>
                <p className="mt-3 text-emerald-300">
                  cos θ = adjacent ÷ hypotenuse, so the rafter = {R} ÷ cos θ. Use your calculator, then cut the log to
                  that length.
                </p>
                <div className="mt-3 h-4 rounded bg-slate-700">
                  <div className="h-4 rounded bg-amber-700" style={{ width: `${(cut / 7) * 100}%` }} />
                </div>
                <input
                  type="range" min={3} max={7} step={0.01} value={cut}
                  onChange={(e) => setCut(Number(e.target.value))}
                  aria-label="Length to cut the rafter in metres"
                  className="mt-2 w-full"
                />
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-lg font-semibold">{cut.toFixed(2)} m</span>
                  <button className="rounded-lg bg-amber-400 px-5 py-3 text-lg font-semibold text-slate-900" onClick={doCut}>
                    Cut and fit
                  </button>
                </div>
                {cutMsg && <p className="mt-2 text-rose-300">{cutMsg}</p>}
              </>
            )}
          </>
        )}

        {round === 4 && (
          <>
            <p className="text-xl font-semibold">The rafter fits. Gogo is warm tonight.</p>
            <p className="mt-1 text-slate-300">
              Rafter ≈ {rafter.toFixed(2)} m. You used two ratios on one triangle: tan θ = opposite ÷ adjacent to set
              the pitch, and cos θ = adjacent ÷ hypotenuse to find the length.
            </p>
            <div className="mt-3 flex gap-2">
              <button className="rounded-lg bg-amber-400 px-5 py-3 text-lg font-semibold text-slate-900" onClick={() => onComplete?.()}>
                Continue
              </button>
              <button className="rounded-lg bg-slate-700 px-5 py-3 text-lg font-semibold" onClick={reset}>
                Play again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}