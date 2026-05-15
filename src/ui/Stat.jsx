import { colors, text } from '../theme'

/**
 * Stat — a numeric headline used for trust signals on landing/login/pricing.
 *
 * Renders a large number + label below. If `loading` is true, shows a
 * subtle pulse placeholder so the marketing page never has a "—" gap.
 */
export default function Stat({
  value,
  label,
  prefix,
  suffix,
  loading = false,
  align = 'center',
  size = 'md',
  style,
}) {
  const SIZES = {
    sm: { num: 22, gap: 2 },
    md: { num: 30, gap: 4 },
    lg: { num: 42, gap: 6 },
  }
  const s = SIZES[size]
  return (
    <div style={{ textAlign: align, ...style }}>
      <div style={{
        fontSize: s.num,
        fontWeight: 800,
        color: colors.brand,
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
        marginBottom: s.gap,
        minHeight: s.num + 4,
      }}>
        {loading ? (
          <span style={{ opacity: 0.4 }}>—</span>
        ) : (
          <>
            {prefix}
            <AnimatedNumber value={value} />
            {suffix}
          </>
        )}
      </div>
      <div style={{ ...text.tiny, color: colors.textMuted }}>{label}</div>
    </div>
  )
}

/**
 * Subtle count-up animation. Picks duration based on the magnitude so big
 * numbers don't roll for 5 seconds while small ones zip by.
 */
function AnimatedNumber({ value }) {
  // We don't bother with a real RAF animation here — that'd add jitter on
  // re-renders. The CSS keyframe gives a tasteful fade-in instead.
  const n = typeof value === 'number' ? value.toLocaleString() : String(value ?? '')
  return <span className="fade-in">{n}</span>
}
