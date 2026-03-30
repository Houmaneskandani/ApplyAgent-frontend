import { useState, useEffect } from 'react'
import api from '../api'
import useIsMobile from '../hooks/useIsMobile'

// Decode HTML entities (handles double-encoded descriptions like &lt;h2&gt; → <h2>)
function decodeEntities(str) {
  if (!str) return str
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}

export default function JobDetail({ job, onClose, onApply, applying }) {
  const isMobile = useIsMobile()
  const [description, setDescription] = useState(null)

  useEffect(() => {
    if (!job) return
    setDescription(null)
    api.get(`/jobs/${job.id}`).then(res => {
      const raw = res.data.description || ''
      setDescription(decodeEntities(raw))
    }).catch(err => { console.error('JobDetail fetch failed:', err.response?.status, err.message); setDescription('') })
  }, [job?.id])

  if (!job) return null

  const scoreColor = job.score >= 9 ? '#16a34a' : job.score >= 7 ? '#d97706' : '#6b7280'
  const isApplied = job.status === 'applied'

  const getInitials = (company) => company?.slice(0, 2).toUpperCase() || 'JB'
  const getBgColor = (company) => {
    const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444']
    const idx = (company?.charCodeAt(0) || 0) % colors.length
    return colors[idx]
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        ...s.panel,
        width: isMobile ? '100%' : '480px',
        height: isMobile ? '92vh' : '100vh',
        alignSelf: isMobile ? 'flex-end' : 'auto',
        borderRadius: isMobile ? '20px 20px 0 0' : '0',
      }}>
        {/* Header */}
        <div style={s.header}>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Job info */}
        <div style={s.body}>
          <div style={s.topRow}>
            <div style={{...s.logo, background: getBgColor(job.company)}}>
              {getInitials(job.company)}
            </div>
            <div>
              <h2 style={s.title}>{job.title}</h2>
              <div style={s.meta}>
                <span style={s.company}>{job.company}</span>
                {job.location && <><span style={s.dot}>·</span><span style={s.metaText}>{job.location}</span></>}
              </div>
            </div>
          </div>

          {/* Score + source */}
          <div style={s.badges}>
            <div style={{...s.score, color: scoreColor, borderColor: scoreColor}}>
              {job.score}/10 match
            </div>
            {job.source && (
              <span style={{...s.sourceBadge,
                background: job.source === 'greenhouse' ? '#dcfce7' : '#dbeafe',
                color: job.source === 'greenhouse' ? '#15803d' : '#1d4ed8'
              }}>
                {job.source}
              </span>
            )}
            {job.status === 'applied' && <span style={s.appliedBadge}>✓ Applied</span>}
          </div>

          {/* Action buttons */}
          <div style={s.actions}>
            <a href={job.url} target="_blank" rel="noreferrer" style={s.viewBtn}>
              View original posting ↗
            </a>
            <button
              onClick={() => onApply(job.id)}
              disabled={applying === job.id || isApplied}
              style={{
                ...s.applyBtn,
                background: isApplied ? '#f0fdf4' : applying === job.id ? '#e5e7eb' : '#111',
                color: isApplied ? '#16a34a' : applying === job.id ? '#6b7280' : '#fff',
                border: isApplied ? '1px solid #bbf7d0' : 'none',
              }}
            >
              ⚡ {applying === job.id ? 'Starting...' : isApplied ? 'Applied' : 'Apply Me'}
            </button>
          </div>

          {/* Divider */}
          <div style={s.divider} />

          {/* Job details */}
          <div style={s.section}>
            <h3 style={s.sectionTitle}>Job details</h3>
            <div style={{...s.detailGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'}}>
              <div style={s.detailItem}>
                <span style={s.detailLabel}>Company</span>
                <span style={s.detailValue}>{job.company}</span>
              </div>
              <div style={s.detailItem}>
                <span style={s.detailLabel}>Location</span>
                <span style={s.detailValue}>{job.location || 'Not specified'}</span>
              </div>
              <div style={s.detailItem}>
                <span style={s.detailLabel}>Source</span>
                <span style={s.detailValue}>{job.source}</span>
              </div>
              <div style={s.detailItem}>
                <span style={s.detailLabel}>Status</span>
                <span style={s.detailValue}>{job.status || 'new'}</span>
              </div>
            </div>
          </div>

          <div style={s.divider} />
          <div style={s.section}>
            <h3 style={s.sectionTitle}>Description</h3>
            {description === null && <p style={s.loadingDesc}>Loading...</p>}
            {description !== null && description !== '' && (
              <div className="job-description" dangerouslySetInnerHTML={{ __html: description }} />
            )}
            {description === '' && (
              <div style={s.noDesc}>
                <p style={s.noDescText}>Full description available on the company's website.</p>
                <a href={job.url} target="_blank" rel="noreferrer" style={s.noDescLink}>
                  View full posting ↗
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' },
  panel: { background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', width: '480px', height: '100vh', display: 'flex', flexDirection: 'column', overflowY: 'auto', boxShadow: '-4px 0 40px rgba(109,40,217,0.12)', borderLeft: '1px solid rgba(196,181,253,0.35)' },
  header: { padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid rgba(196,181,253,0.2)', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 1 },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', color: '#888', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' },
  body: { padding: '24px', flex: 1 },
  topRow: { display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '16px' },
  logo: { width: '52px', height: '52px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '15px', fontWeight: '700', flexShrink: 0 },
  title: { fontSize: '18px', fontWeight: '700', color: '#111', marginBottom: '6px', lineHeight: '1.3' },
  meta: { display: 'flex', alignItems: 'center', gap: '6px' },
  company: { fontSize: '14px', color: '#555', fontWeight: '500' },
  dot: { color: '#ccc' },
  metaText: { fontSize: '14px', color: '#888' },
  badges: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' },
  score: { fontSize: '13px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', border: '1.5px solid' },
  sourceBadge: { fontSize: '12px', padding: '4px 10px', borderRadius: '20px', fontWeight: '500' },
  appliedBadge: { fontSize: '12px', background: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: '20px', border: '1px solid #bbf7d0', fontWeight: '500' },
  actions: { display: 'flex', gap: '10px', marginBottom: '24px' },
  viewBtn: { flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid #e0e0e0', color: '#555', background: 'none', fontSize: '14px', fontWeight: '500', textAlign: 'center' },
  applyBtn: { flex: 1, padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textAlign: 'center' },
  divider: { height: '1px', background: '#f0f0f0', margin: '20px 0' },
  section: { marginBottom: '8px' },
  sectionTitle: { fontSize: '15px', fontWeight: '600', color: '#111', marginBottom: '12px' },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  detailItem: { display: 'flex', flexDirection: 'column', gap: '3px' },
  detailLabel: { fontSize: '12px', color: '#999', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' },
  detailValue: { fontSize: '14px', color: '#333', fontWeight: '500' },
  loadingDesc: { fontSize: '14px', color: '#aaa' },
  noDesc: { background: '#f8fafc', borderRadius: '10px', padding: '20px', textAlign: 'center' },
  noDescText: { fontSize: '14px', color: '#888', marginBottom: '12px' },
  noDescLink: { fontSize: '14px', color: '#111', fontWeight: '600', textDecoration: 'underline' },
}
