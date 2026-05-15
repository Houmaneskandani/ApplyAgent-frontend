import { useMemo } from 'react'
import { colors, radii, gradients } from '../theme'

/**
 * AgentActivity — the trust-defining widget for ApplyAgent.
 *
 * The user said: "I want to be able to see the agents in the website so
 * they can clearly see something is happening." This is that.
 *
 * Behavior:
 *  - If there's an `applying` job, show the live step ("Filling Greenhouse
 *    form..."), a pulsing indicator, and the job/company.
 *  - If there's a queued job, show it as next-up.
 *  - If nothing is in flight, show the idle state ("Agent idle — ready to
 *    apply") with a soft pulse to signal liveness.
 *
 * Props:
 *   queue      — current queue array from /queue/ (same shape Dashboard uses)
 *   stats      — { applied, scored, ... } from /jobs/stats (optional, used
 *                in idle state to humanize the message)
 *   compact    — render in a smaller variant (for sidebar / hero corner)
 */
export default function AgentActivity({ queue = [], stats = null, compact = false }) {
  const { active, queued } = useMemo(() => {
    const active = queue.find(q => q.status === 'applying') || null
    const queued = queue.filter(q => q.status === 'queued')
    return { active, queued }
  }, [queue])

  if (active) {
    return <ActiveCard job={active} queuedCount={queued.length} compact={compact} />
  }
  if (queued.length > 0) {
    return <QueuedCard next={queued[0]} count={queued.length} compact={compact} />
  }
  return <IdleCard stats={stats} compact={compact} />
}

function ActiveCard({ job, queuedCount, compact }) {
  const step = job.notes || 'Preparing application...'
  return (
    <div style={{
      ...container(compact),
      border: `1px solid ${colors.warningBorder}`,
      background: gradients.brandSoft,
    }}>
      <div style={header()}>
        <span style={liveDot('#D97706')} />
        <span style={{ ...labelText(), color: colors.warning }}>Agent is applying now</span>
      </div>
      <div style={titleRow(compact)}>
        <span style={{ fontWeight: 700, fontSize: compact ? 13 : 14, color: colors.textPrimary }}>
          {job.title}
        </span>
        <span style={{ color: colors.textMuted, fontSize: 13 }}>@ {job.company}</span>
      </div>
      <div style={stepRow()}>
        <span style={stepIcon()} />
        <span style={{ fontSize: 13, color: colors.textSecondary }}>{step}</span>
      </div>
      {queuedCount > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: colors.textMuted }}>
          + {queuedCount} more queued
        </div>
      )}
    </div>
  )
}

function QueuedCard({ next, count, compact }) {
  return (
    <div style={{
      ...container(compact),
      border: `1px solid ${colors.brandBorder}`,
      background: colors.brandSoft,
    }}>
      <div style={header()}>
        <span style={liveDot(colors.brand)} />
        <span style={{ ...labelText(), color: colors.brand }}>
          {count} {count === 1 ? 'application' : 'applications'} queued
        </span>
      </div>
      <div style={titleRow(compact)}>
        <span style={{ fontWeight: 700, fontSize: compact ? 13 : 14, color: colors.textPrimary }}>
          Next up: {next.title}
        </span>
      </div>
      <div style={{ fontSize: 13, color: colors.textMuted }}>@ {next.company}</div>
    </div>
  )
}

function IdleCard({ stats, compact }) {
  const applied = stats?.applied ?? null
  return (
    <div style={{
      position: 'relative',
      borderRadius: radii.lg,
      padding: compact ? 16 : 20,
      overflow: 'hidden',
      // Deep midnight-indigo → royal violet gradient
      background:
        'linear-gradient(135deg, #1E1B4B 0%, #312E81 45%, #4C1D95 100%)',
      border: '1px solid rgba(139, 92, 246, 0.28)',
      // 3D stack: big purple drop + tight contact shadow + inner top gloss
      // + inner bottom carve-line. Reads as a lit, dimensional surface.
      boxShadow: [
        '0 22px 50px -12px rgba(76, 29, 149, 0.55)',
        '0 8px 16px -8px rgba(30, 27, 75, 0.5)',
        'inset 0 1px 0 0 rgba(255, 255, 255, 0.12)',
        'inset 0 -1px 0 0 rgba(0, 0, 0, 0.28)',
      ].join(', '),
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    }}>
      {/* Ambient violet glow blob — top-right corner */}
      <div style={{
        position: 'absolute',
        top: -40, right: -40,
        width: 140, height: 140,
        background:
          'radial-gradient(circle, rgba(167, 139, 250, 0.35) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      {/* Cooler indigo glow — bottom-left, for opposing depth */}
      <div style={{
        position: 'absolute',
        bottom: -30, left: -30,
        width: 110, height: 110,
        background:
          'radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      {/* Top-edge specular highlight — the gloss line that sells the 3D */}
      <div style={{
        position: 'absolute',
        top: 0, left: '15%', right: '15%', height: 1,
        background:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{
          width: 9, height: 9, borderRadius: '50%',
          background: '#34D399',
          boxShadow:
            '0 0 0 0 rgba(52, 211, 153, 0.7), 0 0 14px 2px rgba(52, 211, 153, 0.55)',
          animation: 'agentPulse 1.6s ease-out infinite',
        }} />
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#6EE7B7',
          textShadow: '0 0 18px rgba(52, 211, 153, 0.35)',
        }}>
          Agent ready
        </span>
      </div>
      <div style={{
        position: 'relative',
        fontSize: compact ? 14 : 15,
        color: '#FFFFFF',
        fontWeight: 600,
        marginTop: 4,
        textShadow: '0 1px 12px rgba(0, 0, 0, 0.25)',
      }}>
        {applied != null && applied > 0
          ? `${applied} applications submitted so far`
          : 'Pick a job — your agent will handle the rest'}
      </div>
      <div style={{
        position: 'relative',
        fontSize: 13,
        color: 'rgba(196, 181, 253, 0.78)',
        marginTop: 6,
      }}>
        Standing by, watching for new matches.
      </div>
    </div>
  )
}

// ── styles (functions so we can keep theme imports localized) ──

function container(compact) {
  return {
    borderRadius: radii.lg,
    padding: compact ? 14 : 16,
    transition: 'all 0.3s ease',
  }
}

function header() {
  return {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
  }
}

function labelText() {
  return {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  }
}

function liveDot(color) {
  return {
    width: 8, height: 8, borderRadius: '50%',
    background: color,
    boxShadow: `0 0 0 0 ${color}`,
    animation: 'agentPulse 1.6s ease-out infinite',
  }
}

function titleRow(compact) {
  return {
    display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 6,
    marginBottom: compact ? 6 : 8,
  }
}

function stepRow() {
  return {
    display: 'flex', alignItems: 'center', gap: 8,
  }
}

function stepIcon() {
  return {
    width: 12, height: 12, borderRadius: '50%',
    border: `2px solid ${colors.brandBorder}`,
    borderTopColor: colors.brand,
    animation: 'spin 0.9s linear infinite',
    flexShrink: 0,
  }
}
