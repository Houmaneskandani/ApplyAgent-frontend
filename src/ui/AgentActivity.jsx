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
      ...container(compact),
      border: `1px solid ${colors.borderSoft}`,
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
    }}>
      <div style={header()}>
        <span style={liveDot(colors.success)} />
        <span style={{ ...labelText(), color: colors.success }}>Agent ready</span>
      </div>
      <div style={{ fontSize: compact ? 13 : 14, color: colors.textPrimary, fontWeight: 600, marginTop: 4 }}>
        {applied != null && applied > 0
          ? `${applied} applications submitted so far`
          : 'Pick a job — your agent will handle the rest'}
      </div>
      <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>
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
