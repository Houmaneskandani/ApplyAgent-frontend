export default function JobCard({ job, onApply, applying, onClick, queueState }) {
  const isApplied = job.status === 'applied'
  const inQueue = queueState?.status === 'queued'
  const isApplying = queueState?.status === 'applying' || applying === job.id

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
  }

  return (
    <div style={s.card} className="job-card-hover" onClick={onClick}>
      <div style={s.cardInner}>
        {/* Left: title + meta */}
        <div style={s.left}>
          <div style={s.titleRow}>
            <h3 style={s.title}>{job.title}</h3>
            {job.score >= 8 && <span style={s.matchBadge}>✓ Strong match</span>}
          </div>

          <div style={s.pillRow}>
            {job.status === 'applied' ? (
              <span style={s.appliedPill}>✓ Applied</span>
            ) : isApplying ? (
              <span style={s.applyingPill}>⏳ Applying</span>
            ) : inQueue ? (
              <span style={s.queuedPill}>#{queueState.queue_position} Queued</span>
            ) : (
              <span style={s.newPill}>New</span>
            )}
            <span style={s.dot}>·</span>
            <span style={s.metaText}>{job.posted_at || 'Recently'}</span>
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
              {job.source && (
                <span style={{
                  ...s.sourceBadge,
                  background: job.source === 'greenhouse' ? '#dcfce7' : '#dbeafe',
                  color: job.source === 'greenhouse' ? '#15803d' : '#1d4ed8'
                }}>
                  {job.source}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: score + apply button */}
        <div style={s.right}>
          <div style={s.score}>{job.score}/10</div>
          <button
            onClick={e => { e.stopPropagation(); if (!isApplied && !isApplying) onApply(job.id) }}
            disabled={isApplied || isApplying}
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
  pillRow: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' },
  newPill: { fontSize: '11px', background: '#EDE9FE', color: '#6D28D9', padding: '2px 10px', borderRadius: '20px', fontWeight: '600' },
  appliedPill: { fontSize: '12px', background: '#f0fdf4', color: '#16a34a', padding: '2px 10px', borderRadius: '20px', fontWeight: '500' },
  applyingPill: { fontSize: '12px', background: '#FEF3C7', color: '#92400E', padding: '2px 10px', borderRadius: '20px', fontWeight: '500' },
  queuedPill: { fontSize: '12px', background: '#EDE9FE', color: '#6D28D9', padding: '2px 10px', borderRadius: '20px', fontWeight: '600' },
  dot: { color: '#ccc', fontSize: '12px' },
  metaText: { fontSize: '13px', color: '#888' },
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
