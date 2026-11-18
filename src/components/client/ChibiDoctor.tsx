import styles from './ChibiDoctor.module.css'

export type DoctorMood = 'idle' | 'greeting' | 'thinking' | 'talking' | 'concerned'

/** Bác sĩ chibi vẽ bằng SVG — trạng thái điều khiển cử động (vẫy tay, suy nghĩ, nói). */
export function ChibiDoctor({ mood = 'idle', talking = false, className = '' }: { mood?: DoctorMood; talking?: boolean; className?: string }) {
  const state = [styles.figure, mood === 'greeting' && styles.greeting, mood === 'thinking' && styles.thinking, mood === 'concerned' && styles.concerned, (talking || mood === 'talking') && styles.talking].filter(Boolean).join(' ')
  return (
    <svg viewBox="0 0 200 265" className={`${state} ${className}`} role="img" aria-label="Bác sĩ DERMA – trợ lý da liễu">
      <ellipse className={styles.shadow} cx="100" cy="254" rx="52" ry="8" fill="#0f3d3e" />
      <g className={styles.body}>
        {/* Chân */}
        <rect x="74" y="214" width="20" height="34" rx="9" fill="#1f5f61" />
        <rect x="106" y="214" width="20" height="34" rx="9" fill="#1f5f61" />
        <ellipse cx="83" cy="248" rx="15" ry="7" fill="#24333d" />
        <ellipse cx="117" cy="248" rx="15" ry="7" fill="#24333d" />
        {/* Áo blouse */}
        <path d="M52 168 Q54 136 100 132 Q146 136 148 168 L152 222 Q100 234 48 222 Z" fill="#ffffff" stroke="#d5e6ea" strokeWidth="2" />
        <path d="M84 134 L100 166 L116 134 Z" fill="#2aa198" />
        <path d="M100 166 L100 226" stroke="#d5e6ea" strokeWidth="2" />
        <circle cx="96" cy="184" r="2.2" fill="#b8ccd2" /><circle cx="96" cy="202" r="2.2" fill="#b8ccd2" />
        {/* Thẻ tên */}
        <rect x="112" y="172" width="26" height="15" rx="3" fill="#e6f6f4" stroke="#2aa198" />
        <rect x="116" y="177" width="18" height="2.5" rx="1" fill="#2aa198" /><rect x="116" y="181" width="12" height="2" rx="1" fill="#7fb8b2" />
        {/* Ống nghe */}
        <path d="M80 138 Q70 176 92 190 Q102 196 108 186" fill="none" stroke="#33475b" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="109" cy="184" r="5.5" fill="#9fb3c4" stroke="#33475b" strokeWidth="2.5" />
        {/* Tay trái cầm bảng */}
        <g className={styles.restArm}>
          <path d="M56 160 Q40 186 52 208" fill="none" stroke="#ffffff" strokeWidth="15" strokeLinecap="round" />
          <rect x="40" y="194" width="26" height="32" rx="3" fill="#f5c26b" transform="rotate(-8 53 210)" />
          <rect x="44" y="199" width="18" height="22" rx="1.5" fill="#fffdf6" transform="rotate(-8 53 210)" />
          <circle cx="54" cy="210" r="6" fill="#ffd9bf" />
        </g>
        {/* Tay chống cằm khi suy nghĩ */}
        <g className={styles.thinkArm}>
          <path d="M58 160 Q52 132 74 118" fill="none" stroke="#ffffff" strokeWidth="15" strokeLinecap="round" />
          <circle cx="77" cy="116" r="7" fill="#ffd9bf" />
        </g>
        {/* Tay phải vẫy */}
        <g className={styles.waveArm}>
          <path d="M144 160 Q164 140 160 112" fill="none" stroke="#ffffff" strokeWidth="15" strokeLinecap="round" />
          <circle cx="160" cy="106" r="8" fill="#ffd9bf" />
        </g>
        {/* Đầu */}
        <circle cx="100" cy="86" r="52" fill="#ffdcc4" />
        <ellipse cx="50" cy="90" rx="7" ry="10" fill="#ffd1b3" /><ellipse cx="150" cy="90" rx="7" ry="10" fill="#ffd1b3" />
        {/* Tóc */}
        <path d="M48 84 Q46 34 100 32 Q156 34 152 86 Q146 60 126 56 Q118 70 96 66 Q78 64 70 56 Q52 64 48 84 Z" fill="#3b2a24" />
        <path d="M70 56 Q84 44 104 48" fill="none" stroke="#5a4136" strokeWidth="3" strokeLinecap="round" />
        {/* Gương soi đầu */}
        <rect x="78" y="40" width="44" height="7" rx="3.5" fill="#cfd8dc" />
        <circle cx="100" cy="44" r="9" fill="#e8f1f4" stroke="#9fb3c4" strokeWidth="2.5" /><circle cx="97" cy="41" r="3" fill="#ffffff" />
        {/* Lông mày */}
        <g className={styles.brows} stroke="#3b2a24" strokeWidth="3" strokeLinecap="round">
          <path d="M72 76 Q80 72 88 76" fill="none" /><path d="M112 76 Q120 72 128 76" fill="none" />
        </g>
        {/* Mắt */}
        <g className={styles.eyes}>
          <ellipse cx="80" cy="92" rx="7" ry="9" fill="#2a1d18" /><ellipse cx="120" cy="92" rx="7" ry="9" fill="#2a1d18" />
          <circle cx="82.5" cy="88.5" r="2.6" fill="#ffffff" /><circle cx="122.5" cy="88.5" r="2.6" fill="#ffffff" />
        </g>
        <ellipse cx="68" cy="108" rx="8" ry="5" fill="#ff9e9e" opacity=".55" /><ellipse cx="132" cy="108" rx="8" ry="5" fill="#ff9e9e" opacity=".55" />
        {/* Miệng */}
        <path className={styles.mouthSmile} d="M90 110 Q100 120 110 110" fill="none" stroke="#7a3b2e" strokeWidth="3" strokeLinecap="round" />
        <g className={styles.mouthOpen}>
          <ellipse cx="100" cy="113" rx="8" ry="6.5" fill="#7a3b2e" />
          <ellipse cx="100" cy="116" rx="5" ry="2.5" fill="#ff8f8f" />
        </g>
        {/* Bóng suy nghĩ */}
        <g className={styles.dots} fill="#2aa198">
          <circle cx="150" cy="40" r="4" /><circle cx="162" cy="34" r="4" /><circle cx="174" cy="28" r="4" />
        </g>
      </g>
    </svg>
  )
}
