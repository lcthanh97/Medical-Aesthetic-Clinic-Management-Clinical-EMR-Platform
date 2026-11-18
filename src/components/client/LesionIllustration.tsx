import type { Morphology } from '@/features/derma-ai/skinConditions'

/** Sơ đồ hình thái thương tổn (minh họa giáo dục, không phải ảnh bệnh nhân). */
const SKIN = '#f2c8a6'
function seeded(n: number, seed: number) {
  let s = seed
  return Array.from({ length: n }, () => {
    s = (s * 9301 + 49297) % 233280
    const a = s / 233280
    s = (s * 9301 + 49297) % 233280
    const b = s / 233280
    s = (s * 9301 + 49297) % 233280
    return [14 + a * 72, 14 + b * 72, s / 233280] as const
  })
}

function Pattern({ m }: { m: Morphology }) {
  switch (m) {
    case 'papule':
      return <>{seeded(14, 7).map(([x, y, r], i) => <g key={i}><circle cx={x} cy={y} r={2.5 + r * 3} fill="#d9534f" opacity=".85" />{i % 3 === 0 && <circle cx={x} cy={y} r={1.3} fill="#fff6d6" />}{i % 4 === 1 && <circle cx={x} cy={y} r={0.9} fill="#3b2a24" />}</g>)}</>
    case 'plaque':
      return <><path d="M22 40 Q30 18 58 22 Q84 26 80 52 Q78 78 50 80 Q20 80 22 40 Z" fill="#d9625d" />{[30, 40, 50, 60, 70].map((y) => <path key={y} d={`M${30 + (y % 3)} ${y} Q50 ${y - 4} ${72 - (y % 5)} ${y}`} stroke="#f4f1ec" strokeWidth="2.6" fill="none" strokeLinecap="round" />)}</>
    case 'eczema':
      return <><ellipse cx="50" cy="50" rx="34" ry="26" fill="#e8908a" opacity=".75" />{seeded(18, 3).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.4} fill="#c0504b" />)}{[0, 1, 2].map((i) => <path key={i} d={`M${30 + i * 14} 34 L${38 + i * 14} 64`} stroke="#b4433e" strokeWidth="1.2" />)}</>
    case 'pigment':
      return <><path d="M20 44 Q28 26 46 32 Q52 46 40 56 Q24 62 20 44 Z" fill="#8a5a3c" opacity=".7" /><path d="M56 30 Q78 26 82 46 Q76 60 60 54 Q50 42 56 30 Z" fill="#8a5a3c" opacity=".6" />{seeded(10, 11).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.6} fill="#7a4a2c" opacity=".7" />)}</>
    case 'depigment':
      return <><path d="M18 40 Q26 20 48 26 Q58 44 44 58 Q22 64 18 40 Z" fill="#fff8f0" /><path d="M54 52 Q74 40 84 58 Q80 80 60 78 Q48 66 54 52 Z" fill="#fff8f0" /><circle cx="70" cy="28" r="7" fill="#fff8f0" /></>
    case 'ring':
      return <><circle cx="50" cy="50" r="30" fill="none" stroke="#c9504a" strokeWidth="7" />{seeded(16, 5).map(([, , r], i) => { const a = (i / 16) * Math.PI * 2; return <circle key={i} cx={50 + Math.cos(a) * 30} cy={50 + Math.sin(a) * 30} r={1.2 + r} fill="#fff3e8" /> })}<circle cx="50" cy="50" r="22" fill={SKIN} opacity=".9" /></>
    case 'vesicle':
      return <><ellipse cx="50" cy="50" rx="30" ry="22" fill="#e58c86" opacity=".7" />{seeded(16, 9).map(([x, y, r], i) => <g key={i}><circle cx={30 + (x - 14) * 0.55} cy={36 + (y - 14) * 0.4} r={2.4 + r * 2} fill="#fdfaf2" stroke="#d47a74" strokeWidth=".8" /><circle cx={29 + (x - 14) * 0.55} cy={35 + (y - 14) * 0.4} r={0.8} fill="#ffffff" /></g>)}</>
    case 'wheal':
      return <>{[[34, 38, 16], [64, 34, 12], [54, 64, 18], [26, 66, 9]].map(([x, y, r], i) => <g key={i}><circle cx={x} cy={y} r={r + 3} fill="#e56b6b" opacity=".5" /><circle cx={x} cy={y} r={r} fill="#fbd3c7" /></g>)}</>
    case 'growth':
      return <><circle cx="50" cy="52" r="18" fill="#b98a6a" />{seeded(22, 13).map(([x, y], i) => <circle key={i} cx={38 + (x - 14) * 0.33} cy={40 + (y - 14) * 0.33} r={1.8} fill="#8e6247" />)}<ellipse cx="44" cy="44" rx="5" ry="3" fill="#ffffff" opacity=".25" /></>
    case 'scar':
      return <>{seeded(11, 17).map(([x, y, r], i) => <g key={i}><ellipse cx={x} cy={y} rx={2.5 + r * 3} ry={2 + r * 2} fill="#c79a7c" /><ellipse cx={x} cy={y + 0.8} rx={1.6 + r * 2} ry={1.2 + r} fill="#a87c60" /></g>)}</>
    case 'vascular':
      return <><ellipse cx="50" cy="50" rx="34" ry="28" fill="#e46a6a" opacity=".45" />{[[20, 50, 50, 40, 80, 52], [30, 30, 46, 44, 60, 26], [34, 72, 50, 58, 70, 74]].map(([a, b, c, d, e, f], i) => <path key={i} d={`M${a} ${b} Q${c} ${d} ${e} ${f}`} stroke="#c0392b" strokeWidth="1.3" fill="none" />)}</>
    case 'hair':
      return <>{Array.from({ length: 34 }, (_, i) => { const x = 10 + (i % 17) * 5; const y = 22 + Math.floor(i / 17) * 40; return <path key={i} d={`M${x} ${y} q3 10 0 22`} stroke="#3b2a24" strokeWidth="1.8" fill="none" /> })}<circle cx="50" cy="50" r="16" fill={SKIN} /><circle cx="50" cy="50" r="16" fill="none" stroke="#e7b896" strokeWidth="1" /></>
    case 'nail':
      return <><rect x="30" y="18" width="40" height="64" rx="18" fill="#efd9c2" /><rect x="34" y="22" width="32" height="44" rx="14" fill="#e6c766" /><path d="M36 58 Q50 70 64 58 L64 64 Q50 74 36 64 Z" fill="#c9a24a" />{[40, 48, 56].map((x) => <path key={x} d={`M${x} 26 L${x + 2} 58`} stroke="#c9a24a" strokeWidth="1.2" />)}</>
    case 'mole':
      return <><path d="M38 40 Q48 30 62 38 Q70 50 60 62 Q46 70 38 58 Q32 48 38 40 Z" fill="#5a3a2a" /><path d="M46 44 Q54 40 58 48 Q56 56 48 56 Z" fill="#2d1b14" opacity=".8" /></>
    default:
      return <ellipse cx="38" cy="40" rx="10" ry="6" fill="#ffffff" opacity=".18" />
  }
}

export function LesionIllustration({ morphology, size = 88, label }: { morphology: Morphology; size?: number; label: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`Minh họa: ${label}`} className="shrink-0 rounded-2xl shadow-inner">
      <defs>
        <radialGradient id={`skin-${morphology}`} cx="40%" cy="35%" r="75%"><stop offset="0%" stopColor="#f8d7bd" /><stop offset="100%" stopColor="#e5b391" /></radialGradient>
      </defs>
      <rect width="100" height="100" rx="18" fill={`url(#skin-${morphology})`} />
      <Pattern m={morphology} />
    </svg>
  )
}
