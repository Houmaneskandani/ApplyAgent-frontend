import { colors, radii, shadows, transitions } from '../theme'

/**
 * Card — the canonical surface component.
 *
 * Variants:
 *   solid  — opaque white card (default for forms and primary content)
 *   glass  — semi-transparent + backdrop-blur (sits over the ambient
 *            purple blobs, the existing visual hallmark of the app)
 *   muted  — flat colored surface (for nested groups)
 *
 * `interactive` adds hover lift — use it for cards that are clickable
 * targets (job cards, plan cards, list items).
 */
const VARIANT_STYLES = {
  solid: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    boxShadow: shadows.sm,
  },
  glass: {
    background: 'rgba(255, 255, 255, 0.72)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    border: `1px solid ${colors.borderSoft}`,
    boxShadow: shadows.md,
  },
  muted: {
    background: colors.brandSofter,
    border: `1px solid ${colors.borderSoft}`,
    boxShadow: 'none',
  },
}

export default function Card({
  variant = 'glass',
  interactive = false,
  padding = 20,
  style,
  className,
  children,
  ...rest
}) {
  const hoverClass = interactive ? 'card-interactive-hover' : ''
  return (
    <div
      className={`${hoverClass} ${className || ''}`.trim()}
      style={{
        ...VARIANT_STYLES[variant],
        borderRadius: radii.lg,
        padding,
        transition: `transform ${transitions.base}, box-shadow ${transitions.base}, border-color ${transitions.base}`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
