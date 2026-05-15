/**
 * Design tokens for ApplyAgent.
 *
 * Single source of truth — every page should pull colors, spacing, and
 * shadows from here so that a future visual refresh is a one-file change
 * instead of a 12-file scavenger hunt.
 *
 * The visual language is "trustworthy SaaS + ambient purple gradient" —
 * keep it disciplined, no neon, no glow.
 */

export const colors = {
  // Brand
  brand:        '#4F46E5',   // primary indigo
  brandHover:   '#4338CA',
  brandDeep:    '#3730A3',
  brandLight:   '#6366F1',
  brandAccent:  '#7C3AED',   // violet accent for highlights
  brandSoft:    '#EDE9FE',   // soft fill on light bg
  brandSofter:  '#F5F3FF',   // softest fill (page bg)
  brandBorder:  '#C4B5FD',
  brandRing:    'rgba(124, 58, 237, 0.18)',  // focus ring color

  // Text
  textPrimary:   '#111827',
  textSecondary: '#4B5563',
  textMuted:     '#6B7280',
  textOnDark:    '#FFFFFF',
  textBrand:     '#5B21B6',

  // Surfaces
  surface:      '#FFFFFF',
  surfaceSoft:  'rgba(255, 255, 255, 0.72)',   // glassy
  surfaceHover: '#FAFAFF',
  page:         '#F8F6FF',
  pageDark:     '#1E1B4B',
  border:       '#E5E7EB',
  borderSoft:   'rgba(196, 181, 253, 0.35)',

  // Semantic
  success:      '#16A34A',
  successSoft:  '#F0FDF4',
  successBorder:'#BBF7D0',
  warning:      '#D97706',
  warningSoft:  '#FFFBEB',
  warningBorder:'#FCD34D',
  danger:       '#DC2626',
  dangerSoft:   '#FEF2F2',
  dangerBorder: '#FECACA',
  info:         '#0EA5E9',
  infoSoft:     '#F0F9FF',
  infoBorder:   '#BAE6FD',
}

export const gradients = {
  brand:        `linear-gradient(135deg, ${colors.brandAccent} 0%, ${colors.brand} 100%)`,
  brandSoft:    `linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)`,
  hero:         `linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #A855F7 100%)`,
  heroDark:     `linear-gradient(135deg, #1E1B4B 0%, #3B0764 100%)`,
  shimmer:      'linear-gradient(110deg, #EDE9FE 8%, #F5F3FF 18%, #EDE9FE 33%)',
}

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
}

export const shadows = {
  none:    'none',
  sm:      '0 1px 2px rgba(17, 24, 39, 0.05)',
  md:      '0 4px 12px rgba(79, 70, 229, 0.10)',
  lg:      '0 10px 30px rgba(79, 70, 229, 0.15)',
  xl:      '0 24px 60px rgba(79, 70, 229, 0.20)',
  hover:   '0 8px 28px rgba(109, 40, 217, 0.18)',
  brand:   '0 8px 24px rgba(79, 70, 229, 0.35)',
  ring:    `0 0 0 3px ${colors.brandRing}`,
}

export const spacing = {
  // Use as `spacing[4]` (=16px). 8-point grid.
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 10: 56, 12: 72,
}

export const fonts = {
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace",
}

export const text = {
  // Pre-baked typography styles. Use as `style={text.h1}`.
  display:   { fontSize: 44, fontWeight: 800, lineHeight: 1.1,  letterSpacing: '-0.02em' },
  h1:        { fontSize: 32, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.015em' },
  h2:        { fontSize: 24, fontWeight: 700, lineHeight: 1.2,  letterSpacing: '-0.01em' },
  h3:        { fontSize: 18, fontWeight: 600, lineHeight: 1.3 },
  body:      { fontSize: 14, fontWeight: 400, lineHeight: 1.55 },
  bodyLg:    { fontSize: 16, fontWeight: 400, lineHeight: 1.6 },
  caption:   { fontSize: 13, fontWeight: 500, color: colors.textMuted },
  tiny:      { fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: colors.textMuted },
}

export const transitions = {
  fast:   '0.12s ease',
  base:   '0.18s ease',
  slow:   '0.28s ease',
}

// Z-index scale to keep stacking predictable.
export const z = {
  base: 1,
  sticky: 50,
  toast: 100,
  modal: 200,
  popover: 300,
}

const theme = { colors, gradients, radii, shadows, spacing, fonts, text, transitions, z }
export default theme
