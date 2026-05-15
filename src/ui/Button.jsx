import { forwardRef } from 'react'
import { colors, gradients, radii, shadows, transitions } from '../theme'

/**
 * Button — the canonical action component for ApplyAgent.
 *
 * Variants:
 *   primary   — gradient brand (default; for the main CTA on a screen)
 *   secondary — outlined brand (for secondary actions)
 *   ghost     — transparent (for tertiary actions and toolbar buttons)
 *   success   — green (confirm/applied)
 *   danger    — red (destructive)
 *
 * Sizes: sm | md | lg
 *
 * Accessibility: `loading` makes the button busy + disabled, swaps to a
 * spinner, and announces "Loading" to screen readers.
 */
const VARIANT_STYLES = {
  primary: {
    background: gradients.brand,
    color: colors.textOnDark,
    border: 'none',
    boxShadow: shadows.brand,
  },
  secondary: {
    background: colors.surface,
    color: colors.brand,
    border: `1.5px solid ${colors.brandBorder}`,
    boxShadow: 'none',
  },
  ghost: {
    background: 'transparent',
    color: colors.textSecondary,
    border: '1.5px solid transparent',
    boxShadow: 'none',
  },
  success: {
    background: colors.successSoft,
    color: colors.success,
    border: `1px solid ${colors.successBorder}`,
    boxShadow: 'none',
  },
  danger: {
    background: colors.dangerSoft,
    color: colors.danger,
    border: `1px solid ${colors.dangerBorder}`,
    boxShadow: 'none',
  },
}

const SIZE_STYLES = {
  sm: { padding: '7px 14px', fontSize: 13, borderRadius: radii.md, gap: 6 },
  md: { padding: '10px 18px', fontSize: 14, borderRadius: radii.md, gap: 8 },
  lg: { padding: '14px 24px', fontSize: 15, borderRadius: radii.lg, gap: 10 },
}

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    loading = false,
    disabled = false,
    fullWidth = false,
    style,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading
  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={{
        ...SIZE_STYLES[size],
        ...VARIANT_STYLES[variant],
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: `transform ${transitions.fast}, box-shadow ${transitions.base}, opacity ${transitions.fast}`,
        opacity: isDisabled ? 0.6 : 1,
        whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
      {...rest}
    >
      {loading ? <Spinner /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  )
})

function Spinner() {
  return (
    <span
      aria-label="Loading"
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  )
}

export default Button
