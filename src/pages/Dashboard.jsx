import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'
import Navbar from '../components/Navbar'
import JobCard from '../components/JobCard'
import JobDetail from '../components/JobDetail'
import FilterPanel from '../components/FilterPanel'

const TABS = ['Job Matches', 'Applying', 'Applied']

export default function Dashboard() {
  const [tab, setTab] = useState('Job Matches')
  const [allJobs, setAllJobs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(null)
  const [scraping, setScraping] = useState(false)
  const [liveMode, setLiveMode] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [queue, setQueue] = useState([]) // [{job_id, status, queue_position, title, company, source, dry_run}]
  const [filters, setFilters] = useState({
    keywords: [], experience: [], work_type: [],
    min_salary: 0, job_type: ['Full time'],
    exclude_companies: '', location: ''
  })
  const [profileStatus, setProfileStatus] = useState(null) // null=loading, 'ok', 'incomplete'
  const [missingFields, setMissingFields] = useState([])
  const [autoApply, setAutoApply] = useState({ enabled: false, applied_today: 0, daily_limit: 10 })
  const [sortBy, setSortBy] = useState('score') // 'score' | 'date'
  const [togglingAuto, setTogglingAuto] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queuePollRef = useRef(null)

  // Build a quick lookup: job_id → queue entry
  const queueMap = Object.fromEntries(queue.map(q => [q.job_id, q]))

  useEffect(() => {
    loadData()
    api.get('/auto-apply/').then(r => setAutoApply(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (searchParams.get('tab') === 'filters') setShowFilters(true)
  }, [searchParams])

  // Poll queue — every 2s while something is applying, every 5s otherwise
  const hasApplying = queue.some(q => q.status === 'applying')
  const prevQueueRef = useRef([])
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await api.get('/queue/')
        const newQueue = r.data
        // If queue just drained (had active jobs, now none), refresh allJobs so Applied tab updates
        const hadActive = prevQueueRef.current.some(q => q.status !== 'failed')
        const hasActive = newQueue.some(q => q.status !== 'failed')
        if (hadActive && !hasActive) loadData()
        prevQueueRef.current = newQueue
        setQueue(newQueue)
      } catch {}
    }
    poll()
    queuePollRef.current = setInterval(poll, hasApplying ? 2000 : 5000)
    return () => clearInterval(queuePollRef.current)
  }, [hasApplying])

  useEffect(() => {
    api.get('/profile/').then(res => {
      const p = res.data
      const prefs = p.preferences || {}
      const missing = []
      if (!p.name?.trim()) missing.push('Full name')
      if (!prefs.phone?.trim()) missing.push('Phone number')
      if (!p.resume_url) missing.push('Resume')
      setMissingFields(missing)
      setProfileStatus(missing.length > 0 ? 'incomplete' : 'ok')
    }).catch(() => setProfileStatus('ok'))
  }, [])

  // Load saved filters from profile on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await api.get('/profile/')
        const prefs = res.data.preferences || {}
        if (prefs.dashboard_filters) {
          setFilters(prefs.dashboard_filters)
        }
      } catch {}
    }
    loadFilters()
  }, [])

  const loadData = async () => {
    try {
      const [jobsRes, statsRes] = await Promise.all([
        api.get('/jobs/', { params: { min_score: 1, limit: 200 } }),
        api.get('/jobs/stats')
      ])
      setAllJobs(jobsRes.data)
      setStats(statsRes.data)
    } catch {
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const saveFilters = async (newFilters) => {
    try {
      const res = await api.get('/profile/')
      const raw = res.data.preferences || {}
      // Only save dashboard_filters, don't touch other prefs — pick known keys to avoid "too many properties"
      const safePrefKeys = ['phone', 'salary_min', 'salary_max', 'linkedin', 'portfolio', 'portfolio_password', 'github', 'work_auth', 'address', 'address2', 'city', 'state', 'zip', 'country', 'work_preference', 'employer', 'job_title', 'people_managed', 'security_clearance', 'career_highlight', 'challenging_situation', 'start_date', 'verify_work_history', 'startup_experience', 'skills', 'gender', 'has_disability', 'is_veteran', 'is_student', 'languages', 'vaccinated', 'willing_to_travel', 'background_check', 'keywords']
      const cleaned = {}
      for (const k of safePrefKeys) {
        if (raw[k] !== undefined) cleaned[k] = raw[k]
      }
      await api.put('/profile/', {
        name: res.data.name,
        preferences: { ...cleaned, dashboard_filters: newFilters }
      })
    } catch (e) {
      console.error('Failed to save filters', e)
    }
  }

  const applyToJob = async (jobId) => {
    setApplying(jobId)
    try {
      const res = await api.post(`/apply/${jobId}?dry_run=${!liveMode}`)
      const { position } = res.data
      // Refresh queue immediately
      api.get('/queue/').then(r => setQueue(r.data)).catch(() => {})
      setTab('Applying')
      if (position > 1) {
        // Just added — no alert needed, UI shows position
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to queue application')
    } finally {
      setApplying(null)
    }
  }

  const toggleAutoApply = async () => {
    if (!autoApply.enabled) {
      if (!window.confirm(
        'Enable Auto Apply?\n\nThis will automatically submit up to 10 real job applications per day from your top matches (score ≥ 6).\n\nMake sure your profile is complete before enabling.'
      )) return
    }
    setTogglingAuto(true)
    try {
      const r = await api.post('/auto-apply/toggle')
      setAutoApply(prev => ({ ...prev, enabled: r.data.enabled }))
      if (r.data.enabled) {
        setTab('Applying')
        setTimeout(() => api.get('/queue/').then(r => setQueue(r.data)).catch(() => {}), 2000)
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not toggle Auto Apply')
    } finally {
      setTogglingAuto(false)
    }
  }

  const cancelQueued = async (jobId) => {
    try {
      await api.delete(`/queue/${jobId}`)
      setQueue(prev => prev.filter(q => q.job_id !== jobId))
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not cancel')
    }
  }

  const getFilteredJobs = useCallback(() => {
    let jobs = [...allJobs]

    if (tab === 'Applied') jobs = jobs.filter(j => j.status === 'applied')
    else if (tab === 'Applying') jobs = jobs.filter(j => j.status === 'applying')
    else jobs = jobs.filter(j => !j.status || j.status === 'new')

    if (filters.keywords?.length > 0) {
      jobs = jobs.filter(j => {
        const text = `${j.title} ${j.company}`.toLowerCase()
        return filters.keywords.some(kw => text.includes(kw.toLowerCase()))
      })
    }

    if (filters.experience?.length > 0) {
      jobs = jobs.filter(j =>
        filters.experience.some(exp =>
          j.experience_level?.toLowerCase().includes(exp.split(' ')[0].toLowerCase())
        )
      )
    }

    if (filters.work_type?.length > 0) {
      jobs = jobs.filter(j => {
        const loc = (j.location || '').toLowerCase()
        return filters.work_type.some(wt => {
          if (wt === 'Remote') return loc.includes('remote')
          if (wt === 'In person') return !loc.includes('remote')
          if (wt === 'Hybrid') return loc.includes('hybrid')
          return true
        })
      })
    }

    if (filters.location?.trim()) {
      const loc = filters.location.trim().toLowerCase()
      jobs = jobs.filter(j =>
        (j.location || '').toLowerCase().includes(loc) ||
        // "Remote" keyword also matches jobs with no location listed
        (loc === 'remote' && !j.location?.trim())
      )
    }

    if (filters.exclude_companies) {
      const excluded = filters.exclude_companies.toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
      jobs = jobs.filter(j =>
        !excluded.some(e => j.company?.toLowerCase().includes(e))
      )
    }

    if (sortBy === 'date') {
      jobs.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at) : new Date(0)
        const db = b.created_at ? new Date(b.created_at) : new Date(0)
        return db - da
      })
    } else {
      jobs.sort((a, b) => (b.score || 0) - (a.score || 0))
    }
    return jobs
  }, [allJobs, tab, filters, sortBy])

  const filteredJobs = getFilteredJobs()

  if (loading) return (
    <div style={s.loadWrap}>
      <div style={s.loadSpinner} />
      <div style={s.loadText}>Finding your matches...</div>
    </div>
  )

  const clearFilters = () => {
    const empty = {
      keywords: [], experience: [], work_type: [],
      min_salary: 0, job_type: ['Full time'],
      exclude_companies: '', location: ''
    }
    setFilters(empty)
    saveFilters(empty)
  }

  const activeCount = (filters.keywords?.length || 0) + (filters.experience?.length || 0) + (filters.work_type?.length || 0) + (filters.location?.trim() ? 1 : 0)

  return (
    <div style={s.page}>
      <Navbar credits={stats?.credits || 0} />

      {profileStatus === 'incomplete' && (
        <div style={s.onboardBanner}>
          <span style={s.onboardIcon}>👋</span>
          <div>
            <strong>Complete your profile to start applying</strong>
            <span style={s.onboardMissing}> — missing: {missingFields.join(', ')}</span>
          </div>
          <a href="/profile" style={s.onboardBtn}>Go to Profile →</a>
        </div>
      )}

      <div style={s.container}>
        {stats && (
          <div style={s.statsBar}>
            <div style={s.stat}>
              <span style={s.statNum}>{stats.total_jobs?.toLocaleString()}</span>
              <span style={s.statLabel}>Jobs found</span>
            </div>
            <div style={s.statDivider} />
            <div style={s.stat}>
              <span style={s.statNum}>{stats.strong_matches}</span>
              <span style={s.statLabel}>Strong matches</span>
            </div>
            <div style={s.statDivider} />
            <div style={s.stat}>
              <span style={{...s.statNum, color: '#16a34a'}}>{stats.applied || 0}</span>
              <span style={s.statLabel}>Applied</span>
            </div>
            <div style={s.statDivider} />
            <div style={s.stat}>
              <span style={s.statNum}>{tab === 'Applying' ? queue.length : filteredJobs.length}</span>
              <span style={s.statLabel}>Showing</span>
            </div>
            <div style={s.statDivider} />
            <div style={s.stat}>
              <span style={{...s.statNum, fontSize: '13px', color: '#6b7280'}}>{stats.last_scraped_ago || 'Never'}</span>
              <span style={s.statLabel}>Last updated</span>
            </div>
            <div style={s.statRight}>
              <div style={s.activeFilters}>
                {filters.location?.trim() && (
                  <span style={s.filterChip}>
                    📍 {filters.location}
                    <button type="button" style={s.chipRemove} onClick={() => {
                      const newFilters = {...filters, location: ''}
                      setFilters(newFilters)
                      saveFilters(newFilters)
                    }}>✕</button>
                  </span>
                )}
                {filters.keywords?.map(kw => (
                  <span key={kw} style={s.filterChip}>
                    {kw}
                    <button type="button" style={s.chipRemove} onClick={() => {
                      const newFilters = {...filters, keywords: filters.keywords.filter(k => k !== kw)}
                      setFilters(newFilters)
                      saveFilters(newFilters)
                    }}>✕</button>
                  </span>
                ))}
                {filters.experience?.map(exp => (
                  <span key={exp} style={s.filterChip}>
                    {exp}
                    <button type="button" style={s.chipRemove} onClick={() => {
                      const newFilters = {...filters, experience: filters.experience.filter(e => e !== exp)}
                      setFilters(newFilters)
                      saveFilters(newFilters)
                    }}>✕</button>
                  </span>
                ))}
                {filters.work_type?.map(wt => (
                  <span key={wt} style={s.filterChip}>
                    {wt}
                    <button type="button" style={s.chipRemove} onClick={() => {
                      const newFilters = {...filters, work_type: filters.work_type.filter(w => w !== wt)}
                      setFilters(newFilters)
                      saveFilters(newFilters)
                    }}>✕</button>
                  </span>
                ))}
              </div>
              {/* Auto Apply Toggle */}
              <button
                style={{
                  ...s.autoApplyBtn,
                  ...(autoApply.enabled ? s.autoApplyBtnOn : {}),
                  opacity: togglingAuto ? 0.6 : 1,
                }}
                onClick={toggleAutoApply}
                disabled={togglingAuto}
              >
                <span style={s.autoApplyBtnLabel}>
                  <span style={{
                    ...s.autoApplyIndicator,
                    background: autoApply.enabled ? '#4ade80' : 'rgba(255,255,255,0.4)',
                    boxShadow: autoApply.enabled ? '0 0 6px #4ade80' : 'none',
                  }} />
                  Auto Apply
                </span>
                {autoApply.enabled && (
                  <span style={s.autoApplyCount}>{autoApply.applied_today}/{autoApply.daily_limit} today</span>
                )}
                <div style={{...s.toggle, ...(autoApply.enabled ? s.toggleOn : {})}}>
                  <div style={{...s.toggleThumb, ...(autoApply.enabled ? s.toggleThumbOn : {})}} />
                </div>
              </button>
              <button
                style={{...s.filterBtn, background: liveMode ? '#dc2626' : '#374151', marginRight: 8}}
                onClick={() => {
                  if (!liveMode && !window.confirm('Enable Live Mode? This will ACTUALLY submit applications. Make sure your profile is complete.')) return
                  setLiveMode(v => !v)
                }}
              >
                {liveMode ? '🔴 Live Mode ON' : '⚫ Dry Run'}
              </button>
              <button
                style={{...s.filterBtn, background: scraping ? '#6b7280' : '#059669'}}
                disabled={scraping}
                onClick={async () => {
                  setScraping(true)
                  try {
                    await api.post('/queue/trigger-scrape')
                    // Poll stats every 8s — stop when job count grows or after 3 min
                    const prevCount = stats?.total_jobs || 0
                    const start = Date.now()
                    const poll = setInterval(async () => {
                      try {
                        const r = await api.get('/jobs/stats')
                        if (r.data.total_jobs > prevCount || Date.now() - start > 180000) {
                          clearInterval(poll)
                          await loadData()
                          setScraping(false)
                        }
                      } catch { clearInterval(poll); setScraping(false) }
                    }, 8000)
                  } catch { setScraping(false) }
                }}
              >
                {scraping ? '⏳ Searching...' : '🔍 Search Jobs'}
              </button>
              <button
                style={{...s.filterBtn, background: sortBy === 'date' ? '#7c3aed' : '#374151'}}
                onClick={() => setSortBy(s => s === 'score' ? 'date' : 'score')}
                title={sortBy === 'score' ? 'Currently sorted by match score — click to sort by date' : 'Currently sorted by newest — click to sort by match score'}
              >
                {sortBy === 'score' ? '⭐ Best Match' : '🕐 Newest First'}
              </button>
              <button style={s.filterBtn} onClick={() => setShowFilters(true)}>
                ⚙ Filters {activeCount > 0 ? `(${activeCount})` : ''}
              </button>
            </div>
          </div>
        )}

        <div style={s.tabs}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(t)}
              style={{...s.tab, ...(tab === t ? s.tabActive : {})}}>
              {t}
              {t === 'Applying' && queue.length > 0 && (
                <span style={{
                  background: tab === 'Applying' ? 'rgba(255,255,255,0.3)' : '#4F46E5',
                  color: '#fff', fontSize: '11px', fontWeight: '700',
                  padding: '1px 7px', borderRadius: '20px', minWidth: '18px', textAlign: 'center',
                }}>{queue.length}</span>
              )}
              {i < TABS.length - 1 && <span style={s.tabArrow}>›</span>}
            </button>
          ))}
        </div>

        {tab === 'Applying' ? (
          <div style={s.jobList}>
            {queue.length === 0 ? (
              <div style={s.empty}>
                <div style={s.emptyIcon}>📋</div>
                <div style={s.emptyTitle}>Queue is empty</div>
                <div style={s.emptyText}>Click "Apply Me" on any job to queue an application. Completed ones appear in the Applied tab.</div>
              </div>
            ) : (
              queue.map((item, idx) => (
                <div key={item.job_id} style={{
                  ...s.queueCard,
                  borderColor: item.status === 'applying' ? 'rgba(252,211,77,0.5)' : item.status === 'failed' ? 'rgba(254,202,202,0.4)' : 'rgba(196,181,253,0.2)',
                  background: item.status === 'applying' ? 'rgba(217,119,6,0.15)' : item.status === 'failed' ? 'rgba(220,38,38,0.12)' : undefined,
                }}>
                  <div style={s.queueLeft}>
                    {item.status === 'applying' ? (
                      <div style={s.spinnerWrap}><QueueSpinner /></div>
                    ) : item.status === 'failed' ? (
                      <div style={s.failedIcon}>✗</div>
                    ) : (
                      <div style={s.queuePos}>#{item.queue_position}</div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={s.queueTitle}>{item.title}</div>
                      <div style={s.queueMeta}>
                        {item.company}
                        <span style={s.dot}>·</span>
                        <span style={{
                          ...s.sourcePill,
                          background: item.source === 'greenhouse' ? '#dcfce7' : '#dbeafe',
                          color: item.source === 'greenhouse' ? '#15803d' : '#1d4ed8'
                        }}>{item.source}</span>
                        <span style={s.dot}>·</span>
                        <span style={{ color: item.dry_run ? '#6b7280' : '#dc2626', fontSize: '11px', fontWeight: '600' }}>
                          {item.dry_run ? 'Dry run' : 'Live'}
                        </span>
                      </div>
                      {item.status === 'failed' && item.notes && (
                        <div style={s.failedNote}>{item.notes}</div>
                      )}
                    </div>
                  </div>
                  <div style={s.queueRight}>
                    {item.status === 'applying' ? (
                      <div style={{ textAlign: 'right' }}>
                        <span style={s.applyingBadge}>Applying now...</span>
                        {item.notes && item.notes !== 'Starting...' && (
                          <div style={s.stepNote}>{item.notes}</div>
                        )}
                      </div>
                    ) : item.status === 'failed' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          style={s.retryBtn}
                          onClick={() => applyToJob(item.job_id)}
                          disabled={applying === item.job_id}
                        >
                          {applying === item.job_id ? '...' : '↺ Retry'}
                        </button>
                        <button style={s.removeBtn} onClick={() => cancelQueued(item.job_id)}>
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={s.cancelBtn} onClick={() => cancelQueued(item.job_id)}>
                          Cancel
                        </button>
                        <button style={s.removeBtn} onClick={() => cancelQueued(item.job_id)}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div style={s.jobList}>
            {filteredJobs.length === 0 ? (
              <div style={s.empty}>
                <div style={s.emptyIcon}>🔍</div>
                <div style={s.emptyTitle}>No jobs match your filters</div>
                <div style={s.emptyText}>Try adjusting your filters or run the scraper for more jobs</div>
                <button style={s.emptyBtn} onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              filteredJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  onApply={applyToJob}
                  applying={applying}
                  onClick={() => setSelectedJob(job)}
                  queueState={queueMap[job.id]}
                />
              ))
            )}
          </div>
        )}
      </div>

      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onSave={saveFilters}
          onClose={() => setShowFilters(false)}
          jobCount={filteredJobs.length}
        />
      )}

      {selectedJob && (
        <JobDetail
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onApply={applyToJob}
          applying={applying}
        />
      )}
    </div>
  )
}

function QueueSpinner() {
  return (
    <div style={{
      width: '28px', height: '28px',
      border: '3px solid #FCD34D', borderTopColor: '#92400E',
      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    }} />
  )
}

// Inject spin keyframes once
if (typeof document !== 'undefined' && !document.getElementById('spin-style')) {
  const el = document.createElement('style')
  el.id = 'spin-style'
  el.textContent = '@keyframes spin { to { transform: rotate(360deg) } }'
  document.head.appendChild(el)
}

const s = {
  page: { minHeight: '100vh', background: 'transparent' },
  loadWrap: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'transparent' },
  loadSpinner: { width: '44px', height: '44px', border: '3px solid #e9d5ff', borderTopColor: '#9333ea', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadText: { fontSize: '15px', color: '#7c3aed', fontWeight: '500' },
  container: { maxWidth: '900px', margin: '0 auto', padding: '24px 16px' },
  statsBar: { background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid rgba(196,181,253,0.35)', flexWrap: 'wrap' },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px' },
  statNum: { fontSize: '22px', fontWeight: '700', color: '#111' },
  statLabel: { fontSize: '12px', color: '#888', marginTop: '2px' },
  statDivider: { width: '1px', height: '36px', background: '#f0f0f0' },
  statRight: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  activeFilters: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  filterChip: { background: '#EDE9FE', color: '#6D28D9', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', border: '1px solid #C4B5FD' },
  chipRemove: { background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '10px', padding: '0' },
  filterBtn: { background: '#4F46E5', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' },
  tabs: { display: 'flex', marginBottom: '20px', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(196,181,253,0.35)' },
  tab: { flex: 1, padding: '10px 16px', border: 'none', background: 'none', fontSize: '14px', fontWeight: '500', color: '#8B85C1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  tabActive: { background: 'linear-gradient(135deg, #6d28d9, #4f46e5)', color: '#fff' },
  tabArrow: { color: '#ccc', fontSize: '18px' },
  jobList: { display: 'flex', flexDirection: 'column' },
  empty: { background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderRadius: '12px', padding: '60px 20px', textAlign: 'center', border: '1px solid rgba(196,181,253,0.35)' },
  emptyIcon: { fontSize: '40px', marginBottom: '12px' },
  emptyTitle: { fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#111' },
  emptyText: { fontSize: '14px', color: '#888', marginBottom: '20px' },
  emptyBtn: { background: 'linear-gradient(135deg, #9333ea, #6d28d9)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 3px 10px rgba(109,40,217,0.3)' },
  onboardBanner: {
    background: '#FEF3C7', borderBottom: '1px solid #FCD34D',
    padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '12px',
    fontSize: '14px', color: '#92400E',
  },
  onboardIcon: { fontSize: '20px', flexShrink: 0 },
  onboardMissing: { color: '#B45309', fontWeight: '500' },
  onboardBtn: {
    marginLeft: 'auto', background: '#D97706', color: '#fff',
    padding: '7px 16px', borderRadius: '8px', fontSize: '13px',
    fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
  },
  queueCard: {
    background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
    borderRadius: '14px', border: '1px solid rgba(196,181,253,0.35)',
    marginBottom: '10px', padding: '16px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
    transition: 'border-color 0.2s, background 0.2s',
  },
  queueLeft: { display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 },
  spinnerWrap: { flexShrink: 0 },
  queuePos: {
    width: '28px', height: '28px', borderRadius: '50%',
    background: '#EDE9FE', color: '#6D28D9', fontSize: '11px', fontWeight: '800',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  queueTitle: { fontSize: '15px', fontWeight: '600', color: '#111', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  queueMeta: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#666', flexWrap: 'wrap' },
  sourcePill: { fontSize: '11px', padding: '1px 7px', borderRadius: '20px', fontWeight: '500' },
  queueRight: { flexShrink: 0 },
  applyingBadge: { fontSize: '12px', fontWeight: '700', color: '#92400E', background: '#FEF3C7', padding: '4px 12px', borderRadius: '20px', border: '1px solid #FCD34D' },
  stepNote: { fontSize: '11px', color: '#92400E', marginTop: '4px', fontStyle: 'italic', opacity: 0.8 },
  cancelBtn: { background: 'none', border: '1px solid #E5E7EB', color: '#6b7280', padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  retryBtn: { background: '#4F46E5', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
  removeBtn: { background: 'none', border: '1px solid #FECACA', color: '#DC2626', padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  failedIcon: { width: '28px', height: '28px', borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  failedNote: { fontSize: '11px', color: '#DC2626', marginTop: '4px', fontStyle: 'italic' },
  dot: { color: '#ccc', fontSize: '12px' },

  // Auto Apply toggle button
  autoApplyBtn: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'rgba(255,255,255,0.72)', color: '#374151',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    border: '1.5px solid rgba(196,181,253,0.35)', borderRadius: '10px',
    padding: '7px 14px', cursor: 'pointer',
    transition: 'all 0.25s ease', fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  autoApplyBtnOn: {
    background: '#052e16', color: '#fff',
    border: '1.5px solid #16a34a',
    boxShadow: '0 0 0 3px rgba(22,163,74,0.15)',
  },
  autoApplyBtnLabel: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '13px', fontWeight: '700',
  },
  autoApplyIndicator: {
    width: '7px', height: '7px', borderRadius: '50%',
    display: 'inline-block', transition: 'all 0.3s',
  },
  autoApplyCount: {
    fontSize: '11px', fontWeight: '600', color: '#4ade80',
    background: 'rgba(74,222,128,0.15)', padding: '2px 8px',
    borderRadius: '20px', border: '1px solid rgba(74,222,128,0.3)',
  },
  toggle: {
    width: '36px', height: '20px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)',
    position: 'relative', transition: 'background 0.3s ease', flexShrink: 0,
  },
  toggleOn: { background: '#16a34a', border: '1.5px solid #15803d' },
  toggleThumb: {
    position: 'absolute', top: '2px', left: '2px',
    width: '14px', height: '14px', borderRadius: '50%',
    background: '#9ca3af', transition: 'left 0.3s ease, background 0.3s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
  },
  toggleThumbOn: { left: '18px', background: '#fff' },
}
