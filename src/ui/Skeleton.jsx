import { radii } from '../theme'

/**
 * Skeleton — content-shaped loading placeholder.
 *
 * Use to mirror the shape of the content you're loading. The shimmer is
 * subtle on purpose: aggressive shimmers feel like a glitch on slow
 * connections. Set `width`/`height` directly or use the prebuilt variants.
 */
export default function Skeleton({
  width = '100%',
  height = 14,
  radius = radii.sm,
  style,
}) {
  return (
    <span
      aria-hidden="true"
      className="skeleton-shimmer"
      style={{
        display: 'inline-block',
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  )
}

export function JobCardSkeleton() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(18px)',
      borderRadius: 14,
      border: '1px solid rgba(196,181,253,0.35)',
      padding: '16px 18px',
      marginBottom: 10,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <Skeleton width="60%" height={16} style={{ marginBottom: 10 }} />
        <Skeleton width="40%" height={12} style={{ marginBottom: 14 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Skeleton width={36} height={36} radius={8} />
          <Skeleton width={90} height={13} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        <Skeleton width={50} height={22} radius={20} />
        <Skeleton width={110} height={34} radius={8} />
      </div>
    </div>
  )
}
