import { colors, radii } from '../theme'

/**
 * Pill — small colored chip used for status, score, source, and counters.
 *
 * tone: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
 * size: 'sm' | 'md'
 */
const TONE_STYLES = {
  brand:   { bg: colors.brandSoft,    fg: colors.textBrand,     bd: colors.brandBorder },
  success: { bg: colors.successSoft,  fg: colors.success,       bd: colors.successBorder },
  warning: { bg: colors.warningSoft,  fg: colors.warning,       bd: colors.warningBorder },
  danger:  { bg: colors.dangerSoft,   fg: colors.danger,        bd: colors.dangerBorder },
  info:    { bg: colors.infoSoft,     fg: colors.info,          bd: colors.infoBorder },
  neutral: { bg: '#F3F4F6',           fg: colors.textSecondary, bd: '#E5E7EB' },
}

const SIZE_STYLES = {
  sm: { fontSize: 11, padding: '2px 8px',  gap: 4 },
  md: { fontSize: 12, padding: '4px 10px', gap: 6 },
}

export default function Pill({
  tone = 'brand',
  size = 'sm',
  icon,
  dot = false,
  style,
  children,
  ...rest
}) {
  const t = TONE_STYLES[tone] || TONE_STYLES.brand
  return (
    <span
      style={{
        ...SIZE_STYLES[size],
        display: 'inline-flex',
        alignItems: 'center',
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        borderRadius: radii.pill,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: t.fg, marginRight: 6, flexShrink: 0,
        }} />
      )}
      {icon}
      {children}
    </span>
  )
}
