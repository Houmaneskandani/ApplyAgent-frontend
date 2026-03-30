export default function ApplyAgentLogo({ height = 36, variant = 'light' }) {
  const onDark = variant === 'dark'
  const textPrimary = onDark ? '#FFFFFF' : '#1E1B4B'
  const textAccent = onDark ? '#A5B4FC' : '#4F46E5'
  const strokeMain = onDark ? '#818CF8' : '#6366F1'
  const strokeAccent = onDark ? '#C7D2FE' : '#A78BFA'
  const crossbar = onDark ? '#FFFFFF' : '#4F46E5'
  const sz = height
  const sw = sz * 0.6

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
      <svg width={sw} height={sz} viewBox="0 0 24 40" fill="none">
        <path d="M2 38L12 4L22 38" stroke={strokeAccent} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 38L12 4" stroke={strokeMain} strokeWidth="3.5" strokeLinecap="round"/>
        <line x1="5.5" y1="26" x2="18.5" y2="26" stroke={crossbar} strokeWidth="3" strokeLinecap="round"/>
      </svg>
      <div style={{ display: 'flex', alignItems: 'baseline', letterSpacing: '-0.02em' }}>
        <span style={{ fontSize: sz * 0.56, fontWeight: '800', color: textPrimary, lineHeight: 1 }}>Apply</span>
        <span style={{ fontSize: sz * 0.56, fontWeight: '800', color: textAccent, lineHeight: 1 }}>Agent</span>
      </div>
    </div>
  )
}
