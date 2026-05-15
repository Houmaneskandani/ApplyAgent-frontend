import { colors, radii } from '../theme'

/**
 * TrustBadge — small icon + label combo for marketing/auth pages.
 *
 * Used for "Encrypted at rest", "No spam", "Cancel anytime", etc. These
 * are the cheap, honest trust signals that significantly improve signup
 * conversion on payment-adjacent products.
 */
export default function TrustBadge({ icon, label, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: 'rgba(255,255,255,0.6)', fg: colors.textSecondary, bd: colors.borderSoft },
    brand:   { bg: colors.brandSoft, fg: colors.textBrand, bd: colors.brandBorder },
    success: { bg: colors.successSoft, fg: colors.success, bd: colors.successBorder },
  }
  const t = tones[tone] || tones.neutral
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 14px',
      borderRadius: radii.pill,
      background: t.bg,
      color: t.fg,
      border: `1px solid ${t.bd}`,
      fontSize: 13,
      fontWeight: 600,
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      <span aria-hidden="true" style={{ fontSize: 14 }}>{icon}</span>
      {label}
    </span>
  )
}
