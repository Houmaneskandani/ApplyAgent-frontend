import { memo } from 'react'

// Format the applied-at timestamp into two pieces:
//   relative: "5 min ago" / "2h ago" / "3d ago" / "May 15"
//   absolute: "May 15, 2026 at 4:42 PM" (used as a tooltip on hover)
// Returns { relative, absolute } or null if the timestamp is missing/bad.
function formatAppliedAt(raw) {
  if (!raw) return null
  // Backend returns Postgres timestamps as "2026-05-15 16:42:38.123456+00"
  // which Safari's Date constructor can't parse — replace the space with T
  // and ensure timezone is present so JS treats it as UTC, not local.
  let isoish = raw.replace(' ', 'T')
  if (!/[Zz]|[+-]\d{2}:?\d{2}$/.test(isoish)) isoish += 'Z'
  const d = new Date(isoish)
  if (isNaN(d.getTime())) return null
  const now = Date.now()
  const diff = Math.max(0, now - d.getTime())
  const min = Math.floor(diff / 60_000)
  const hour = Math.floor(diff / 3_600_000)
  const day = Math.floor(diff / 86_400_000)
  let relative
  if (min < 1) relative = 'just now'
  else if (min < 60) relative = `${min} min ago`
  else if (hour < 24) relative = `${hour}h ago`
  else if (day < 7) relative = `${day}d ago`
  else relative = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const absolute = d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
  return { relative, absolute }
}

function JobCard({ job, onApply, applying, onClick, queueState }) {
  const isApplied = job.status === 'applied'
  const isUnknown = job.status === 'unknown'  // Phase 5: needs review
  const inQueue = queueState?.status === 'queued'
  const isApplying = queueState?.status === 'applying' || applying === job.id
  const appliedAt = isApplied ? formatAppliedAt(job.applied_at) : null

  const getInitials = (company) => company?.slice(0, 2).toUpperCase() || 'JB'
  const getBgColor = (company) => {
    const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444']
    const idx = (company?.charCodeAt(0) || 0) % colors.length
    return colors[idx]
  }

  let btnLabel = 'Apply Me'
  let btnStyle = s.applyBtn
  if (isApplied) {
    btnLabel = '✓ Applied'
    btnStyle = { ...s.applyBtn, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }
  } else if (isApplying) {
    btnLabel = '⏳ Applying...'
    btnStyle = { ...s.applyBtn, background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }
  } else if (inQueue) {
    btnLabel = `#${queueState.queue_position} In Queue`
    btnStyle = { ...s.applyBtn, background: '#EDE9FE', color: '#6D28D9', border: '1px solid #C4B5FD' }
  } else if (isUnknown) {
    btnLabel = '⚠ Needs review'
    btnStyle = { ...s.applyBtn, background: '#FFFBEB', color: '#92400E', border: '1px solid #FCD34D' }
  }

  return (
    <div style={s.card} className="job-card-hover" onClick={onClick}
      role="button" tabIndex={0} aria-label={`Open ${job.title} at ${job.company || 'unknown company'}`}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onClick?.() } }}>
      <div style={s.cardInner}>
        {/* Left: title + meta */}
        <div style={s.left}>
          <div style={s.titleRow}>
            <h3 style={s.title}>{job.title}</h3>
            {job.score >= 8 && <span style={s.matchBadge}>✓ Strong match</span>}
            {/* Freshness badge — added to our index in the last 48h. Distinct
                from the "New" status pill (which just means "not applied"). */}
            {job.created_at && (Date.now() - new Date(job.created_at).getTime()) < 48 * 3600 * 1000 && (
              <span style={s.freshBadge}>🆕 New</span>
            )}
          </div>

          <div style={s.pillRow}>
            {job.status === 'applied' ? (
              <span style={s.appliedPill}>✓ Applied</span>
            ) : isApplying ? (
              <span style={s.applyingPill}>⏳ Applying</span>
            ) : inQueue ? (
              <span style={s.queuedPill}>#{queueState.queue_position} Queued</span>
            ) : isUnknown ? (
              <span style={s.unknownPill}>⚠ Needs Review</span>
            ) : (job.notes || '').includes('dry_run') ? (
              // Outcome visibility: a dry-run rehearsal quietly returned the
              // job to "new" with NO visible trace — the user couldn't tell
              // whether anything happened. Say it plainly on the card.
              <span style={s.rehearsedPill}>🧪 Rehearsed — NOT submitted</span>
            ) : (job.notes || '').includes('unsupported') ? (
              <span style={s.manualPill}>🖐 Manual apply only</span>
            ) : null /* default "New" status pill dropped — it duplicated the
              🆕 freshness badge with a different meaning (not-applied vs
              recently-added) and made cards read "New … New". */}
            {appliedAt ? (
              <>
                <span style={s.dot}>·</span>
                <span style={s.appliedTime} title={appliedAt.absolute}>
                  📅 Applied {appliedAt.relative}
                </span>
              </>
            ) : (
              <>
                <span style={s.dot}>·</span>
                <span style={s.metaText}>{job.posted_at || 'Recently'}</span>
              </>
            )}
            <span style={s.dot}>·</span>
            <span style={s.metaText}>{job.experience_level || 'Mid Level'}</span>
            {job.location && (
              <>
                <span style={s.dot}>·</span>
                <span style={s.metaText}>{job.location}</span>
              </>
            )}
          </div>

          <div style={s.companyRow}>
            <div style={{...s.logo, background: getBgColor(job.company)}}>
              {getInitials(job.company)}
            </div>
            <div>
              <div style={s.companyName}>{job.company}</div>
              {/* `ats` is the effective applier (Greenhouse / Lever / etc.)
                  — what code path will fire on Apply. We show THIS, not
                  the scrape source, because a job scraped from Indeed
                  often redirects to a Greenhouse URL and gets applied
                  through Greenhouse. Falls back to the scrape source if
                  the backend hasn't sent `ats` yet (old cached payload). */}
              {(job.ats || job.source) && (
                <span style={{
                  ...s.sourceBadge,
                  ...atsBadgeStyle(job.ats || job.source),
                }}>
                  {atsLabel(job.ats || job.source)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: score + apply button */}
        <div style={s.right}>
          <div style={s.score}>{job.score}/10</div>
          <button
            onClick={e => { e.stopPropagation(); if (!isApplied && !isApplying && !inQueue) onApply(job.id) }}
            disabled={isApplied || isApplying || inQueue}
            style={btnStyle}
          >
            {isApplying ? <Spinner /> : <span>⚡</span>}
            {btnLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// SECURITY/PERF: memoize so re-renders triggered by unrelated Dashboard state
// (filter chip clicks, queue polling, etc.) don't re-render every card.
//
// We compare props shallowly with a custom equality on the fields we
// actually use, so the parent passing fresh prop objects on every render
// won't bust the memo unless the underlying data changed.
export default memo(JobCard, (prev, next) => (
  prev.job?.id === next.job?.id
  && prev.job?.status === next.job?.status
  && prev.job?.score === next.job?.score
  && prev.job?.notes === next.job?.notes
  && prev.job?.applied_at === next.job?.applied_at
  && prev.applying === next.applying
  && prev.queueState?.status === next.queueState?.status
  && prev.queueState?.queue_position === next.queueState?.queue_position
  // NOTE: deliberately NOT comparing onApply/onClick identity. The parent
  // recreates those handlers on every render (queue polling every 2-5s), so
  // including them busted the memo and re-rendered all ~200 cards each poll.
  // Because we ignore handler identity, a rendered card keeps its ORIGINAL
  // handler closure — so the handler must NOT close over mutable state like
  // Live Mode directly; the parent reads such state from a ref at call time
  // (see liveModeRef in Dashboard.jsx). Do not "simplify" that back to a
  // captured value or live/dry-run selection breaks silently.
))

// ATS badge styling — one tone per applier bucket so the user can
// recognize "yep, that's another Lever job" at a glance. Greenhouse
// keeps the original green so existing screenshots still look right.
function atsBadgeStyle(ats) {
  switch ((ats || '').toLowerCase()) {
    case 'greenhouse':      return { background: '#dcfce7', color: '#15803d' }
    case 'lever':           return { background: '#dbeafe', color: '#1d4ed8' }
    case 'ashby':           return { background: '#ede9fe', color: '#5b21b6' }
    case 'workday':         return { background: '#fef3c7', color: '#92400e' }
    case 'smartrecruiters': return { background: '#fce7f3', color: '#9d174d' }
    case 'ziprecruiter':    return { background: '#ccfbf1', color: '#0f766e' }
    case 'generic':         return { background: '#f3f4f6', color: '#374151' }
    default:                return { background: '#f3f4f6', color: '#374151' }
  }
}
function atsLabel(ats) {
  const map = {
    greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby',
    workday: 'Workday', smartrecruiters: 'SmartRecruiters',
    ziprecruiter: 'ZipRecruiter', generic: 'Other',
  }
  return map[(ats || '').toLowerCase()] || ats
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: '12px', height: '12px',
      border: '2px solid rgba(0,0,0,0.15)', borderTopColor: '#92400E',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  )
}

const s = {
  card: {
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
    borderRadius: '14px', border: '1px solid rgba(196,181,253,0.35)',
    marginBottom: '10px', cursor: 'pointer', transition: 'box-shadow 0.15s',
  },
  cardInner: { padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  left: { flex: 1 },
  titleRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' },
  title: { fontSize: '16px', fontWeight: '600', color: '#111' },
  matchBadge: { fontSize: '11px', background: '#EDE9FE', color: '#6D28D9', padding: '2px 8px', borderRadius: '20px', border: '1px solid #C4B5FD', fontWeight: '600' },
  freshBadge: { fontSize: '11px', background: '#ECFDF5', color: '#047857', padding: '2px 8px', borderRadius: '20px', border: '1px solid #6EE7B7', fontWeight: '600' },
  rehearsedPill: { fontSize: '11px', background: '#FFFBEB', color: '#92400E', padding: '2px 8px', borderRadius: '20px', border: '1px solid #FCD34D', fontWeight: '700' },
  manualPill: { fontSize: '11px', background: '#F3F4F6', color: '#374151', padding: '2px 8px', borderRadius: '20px', border: '1px solid #D1D5DB', fontWeight: '600' },
  pillRow: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' },
  newPill: { fontSize: '11px', background: '#EDE9FE', color: '#6D28D9', padding: '2px 10px', borderRadius: '20px', fontWeight: '600' },
  appliedPill: { fontSize: '12px', background: '#f0fdf4', color: '#16a34a', padding: '2px 10px', borderRadius: '20px', fontWeight: '500' },
  appliedTime: { fontSize: '12px', color: '#15803d', fontWeight: '600', cursor: 'help' },
  applyingPill: { fontSize: '12px', background: '#FEF3C7', color: '#92400E', padding: '2px 10px', borderRadius: '20px', fontWeight: '500' },
  queuedPill: { fontSize: '12px', background: '#EDE9FE', color: '#6D28D9', padding: '2px 10px', borderRadius: '20px', fontWeight: '600' },
  unknownPill: { fontSize: '12px', background: '#FFFBEB', color: '#92400E', padding: '2px 10px', borderRadius: '20px', fontWeight: '600', border: '1px solid #FCD34D' },
  dot: { color: '#ccc', fontSize: '12px' },
  metaText: { fontSize: '13px', color: '#6B7280' },
  companyRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  logo: { width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: '700', flexShrink: 0 },
  companyName: { fontSize: '13px', fontWeight: '600', color: '#444' },
  sourceBadge: { fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '500', marginTop: '2px', display: 'inline-block' },
  right: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' },
  score: { fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', border: '1.5px solid #A78BFA', background: '#EDE9FE', color: '#6D28D9' },
  applyBtn: {
    padding: '8px 18px', borderRadius: '8px',
    fontSize: '13px', fontWeight: '700',
    cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: '5px',
    whiteSpace: 'nowrap',
    background: 'linear-gradient(135deg, #6d28d9, #4f46e5)', color: '#fff', border: 'none',
    boxShadow: '0 2px 8px rgba(109,40,217,0.3)',
  },
}
