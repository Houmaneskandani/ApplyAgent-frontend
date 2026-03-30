import { useState } from 'react'

const EXPERIENCE_LEVELS = ['Entry Level & Graduate', 'Junior (1-2 years)', 'Mid Level (3-5 years)', 'Senior (5-8 years)', 'Staff / Principal (8+ years)']
const JOB_TYPES = ['Full time', 'Part time', 'Contract']
const INDUSTRIES = ['FinTech', 'AI / ML', 'Healthcare', 'E-commerce', 'Cybersecurity', 'Media & Entertainment', 'Developer Tools', 'Infrastructure']
const KEYWORDS = ['Python', 'Go', 'Golang', 'JavaScript', 'Backend', 'API', 'PostgreSQL', 'AWS', 'GCP', 'Docker', 'Kubernetes', 'GraphQL', 'MongoDB']

export default function FilterPanel({ filters, onChange, onClose, jobCount, onSave }) {
  const [local, setLocal] = useState(filters)

  const toggle = (key, value) => {
    const arr = local[key] || []
    const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
    setLocal({ ...local, [key]: next })
  }

  const has = (key, value) => (local[key] || []).includes(value)

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.panel}>
        <div style={s.header}>
          <h2 style={s.title}>Filters</h2>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.body}>
          {/* Job section */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <span style={s.sectionIcon}>💼</span>
              <span style={s.sectionTitle}>Job</span>
              <span style={s.matchedBadge}>✓ Matched from your resume</span>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Keywords</label>
              <div style={s.tags}>
                {KEYWORDS.map(k => (
                  <button key={k} onClick={() => toggle('keywords', k)}
                    style={{...s.tag, ...(has('keywords', k) ? s.tagActive : {})}}>
                    {k} {has('keywords', k) && <span onClick={e => { e.stopPropagation(); toggle('keywords', k) }}>✕</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Experience level</label>
              <div style={s.tags}>
                {EXPERIENCE_LEVELS.map(l => (
                  <button key={l} onClick={() => toggle('experience', l)}
                    style={{...s.tag, ...(has('experience', l) ? s.tagActive : {})}}>
                    {l} {has('experience', l) && '✕'}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Industries</label>
              <div style={s.tags}>
                {INDUSTRIES.map(i => (
                  <button key={i} onClick={() => toggle('industries', i)}
                    style={{...s.tag, ...(has('industries', i) ? s.tagActive : {})}}>
                    {i} {has('industries', i) && '✕'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Location section */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <span style={s.sectionIcon}>📍</span>
              <span style={s.sectionTitle}>Location</span>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Working preference</label>
              <div style={s.checkRow}>
                {['Remote', 'Hybrid', 'In person'].map(w => (
                  <label key={w} style={s.checkLabel}>
                    <input type="checkbox" checked={has('work_type', w)}
                      onChange={() => toggle('work_type', w)} style={s.checkbox} />
                    {w}
                  </label>
                ))}
              </div>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>City / State / Country</label>
              <input
                style={s.input}
                placeholder="e.g. San Francisco, New York, California..."
                value={local.location || ''}
                onChange={e => setLocal({ ...local, location: e.target.value })}
              />
              <div style={s.quickLocations}>
                {['San Francisco', 'New York', 'Austin', 'Seattle', 'Los Angeles', 'Chicago', 'Boston', 'Remote'].map(city => (
                  <button
                    key={city}
                    style={{
                      ...s.tag,
                      ...(local.location === city ? s.tagActive : {}),
                      fontSize: '12px', padding: '4px 10px',
                    }}
                    onClick={() => setLocal({ ...local, location: local.location === city ? '' : city })}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Minimum salary: <strong>${(local.min_salary || 60).toLocaleString()}k</strong></label>
              <input type="range" min="40" max="300" step="10"
                value={local.min_salary || 60}
                onChange={e => setLocal({...local, min_salary: parseInt(e.target.value)})}
                style={s.slider} />
              <div style={s.sliderLabels}><span>$40k</span><span>$300k</span></div>
            </div>
          </div>

          {/* Job type section */}
          <div style={s.section}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Job type</label>
              <div style={s.checkRow}>
                {JOB_TYPES.map(t => (
                  <label key={t} style={s.checkLabel}>
                    <input type="checkbox" checked={has('job_type', t)}
                      onChange={() => toggle('job_type', t)} style={s.checkbox} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Companies section */}
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <span style={s.sectionIcon}>🏢</span>
              <span style={s.sectionTitle}>Companies</span>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Don't apply me to these companies</label>
              <input style={s.input} placeholder="e.g. google.com or *consulting*"
                value={local.exclude_companies || ''}
                onChange={e => setLocal({...local, exclude_companies: e.target.value})} />
              <p style={s.hint}>Type company website and press Enter</p>
            </div>
          </div>
        </div>

        <div style={s.footer}>
          <div style={s.jobCount}>{jobCount} Jobs</div>
          <button style={s.saveBtn} onClick={() => { onChange(local); onSave?.(local); onClose() }}>
            Save Filters
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' },
  panel: { background: '#fff', width: '480px', height: '100vh', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 16px', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 },
  title: { fontSize: '24px', fontWeight: '700' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', color: '#888', padding: '4px 8px', borderRadius: '6px' },
  body: { flex: 1, padding: '16px 24px', overflowY: 'auto' },
  section: { marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #f5f5f5' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' },
  sectionIcon: { fontSize: '18px' },
  sectionTitle: { fontSize: '18px', fontWeight: '600' },
  matchedBadge: { marginLeft: 'auto', fontSize: '12px', background: '#f0fdf4', color: '#16a34a', padding: '3px 10px', borderRadius: '20px', border: '1px solid #bbf7d0' },
  fieldGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '8px' },
  tags: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  tag: { padding: '6px 12px', borderRadius: '20px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '13px', color: '#444', display: 'flex', alignItems: 'center', gap: '6px' },
  tagActive: { background: '#6d28d9', color: '#fff', borderColor: '#7c3aed' },
  checkRow: { display: 'flex', gap: '20px' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#444', cursor: 'pointer' },
  checkbox: { width: '16px', height: '16px', cursor: 'pointer' },
  slider: { width: '100%', marginTop: '8px', accentColor: '#7c3aed' },
  sliderLabels: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginTop: '4px' },
  input: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '14px', outline: 'none' },
  hint: { fontSize: '12px', color: '#999', marginTop: '4px' },
  quickLocations: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  footer: { padding: '16px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', bottom: 0, background: '#fff' },
  jobCount: { background: '#d4f564', color: '#111', padding: '6px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: '600' },
  saveBtn: { background: 'linear-gradient(135deg, #9333ea, #6d28d9)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: '600', boxShadow: '0 3px 10px rgba(109,40,217,0.3)' },
}
