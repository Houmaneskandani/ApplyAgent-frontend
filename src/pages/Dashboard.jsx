import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'
import Navbar from '../components/Navbar'
import JobCard from '../components/JobCard'
import JobDetail from '../components/JobDetail'
import FilterPanel from '../components/FilterPanel'
import AgentActivity from '../ui/AgentActivity'
import { JobCardSkeleton } from '../ui/Skeleton'

// 'Needs Review' lives between Applying and Applied — that's where 'unknown'
// outcomes surface so users can confirm-or-retry without losing them.
const TABS = ['Job Matches', 'Applying', 'Needs Review', 'Applied']

export default function Dashboard() {
  const [tab, setTab] = useState('Job Matches')
  const [allJobs, setAllJobs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(null)
  const [scraping, setScraping] = useState(false)
  // Default to DRY RUN. The confirm dialog only guards the dry→live toggle, so
  // defaulting to live meant a brand-new user's first "Apply Me" submitted a
  // REAL application with no confirmation. Start safe; the user opts into live.
  const [liveMode, setLiveMode] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [queue, setQueue] = useState([]) // [{job_id, status, queue_position, title, company, source, dry_run}]
  const [filters, setFilters] = useState({
    keywords: [], experience: [], work_type: [],
    industries: [],
    min_salary: 0, job_type: ['Full time'],
    exclude_companies: '', location: ''
  })
  const [profileStatus, setProfileStatus] = useState(null) // null=loading, 'ok', 'incomplete'
  const [missingFields, setMissingFields] = useState([])
  const [autoApply, setAutoApply] = useState({ enabled: false, applied_today: 0, daily_limit: 10 })
  const [sortBy, setSortBy] = useState('score') // 'score' | 'date'
  // Quick-filter state (separate from FilterPanel filters so they're easy to clear)
  const [search, setSearch] = useState('')
  // Debounced copy of `search` — this is what we send to the SERVER (so a
  // location/keyword search queries the whole DB, not just the loaded slice).
  // Debounced ~300ms so typing doesn't fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [strongOnly, setStrongOnly] = useState(false)   // score >= 8
  const [postedWithinDays, setPostedWithinDays] = useState(0) // 0 = all
  const [quickRemote, setQuickRemote] = useState(false)
  // ATS quick-filter: filter the job list to one applier bucket. Used
  // mainly for the validation flow ("show me only Lever jobs so I can
  // test the Lever applier"). Ephemeral — not saved to preferences.
  const [atsFilter, setAtsFilter] = useState('all')  // 'all' | 'greenhouse' | 'lever' | ...
  // Job mode: switch between career jobs and local warehouse/temp work.
  // Server-side filter (jobs.category column) — each mode re-fetches so the
  // 200-row window is spent entirely on that mode's jobs.
  const [jobMode, setJobMode] = useState('all')  // 'all' | 'professional' | 'warehouse_logistics'
  const [refreshing, setRefreshing] = useState(false)
  const [togglingAuto, setTogglingAuto] = useState(false)
  // Per-ATS performance breakdown — fetched alongside other dashboard
  // data. Renders only when the user has at least one real (non-dry-run)
  // terminal application; below that threshold the data is just noise.
  const [perAtsStats, setPerAtsStats] = useState({ per_ats: [], total_attempts: 0 })
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queuePollRef = useRef(null)
  const scrapePollRef = useRef(null)
  const loadReqIdRef = useRef(0)  // latest-wins guard for concurrent loadData calls

  // PERF: memoize so unrelated state changes (filter chip clicks, search
  // params, applying flips) don't rebuild this object every render — which
  // would cascade into every JobCard seeing a new queueState prop reference.
  const queueMap = useMemo(
    () => Object.fromEntries(queue.map(q => [q.job_id, q])),
    [queue],
  )

  useEffect(() => {
    loadData()
    api.get('/auto-apply/').then(r => setAutoApply(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (searchParams.get('tab') === 'filters') setShowFilters(true)
  }, [searchParams])

  // Debounce the search box → debouncedSearch (the value we send to the server).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

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

  // Onboarding checklist state. Three concrete steps the user needs to
  // complete before applies will work well:
  //   1. Upload resume   — the matcher and form-filler both need it
  //   2. Fill profile    — name + phone are required by most ATS forms
  //   3. Enable IMAP     — Greenhouse + Lever email-verification flows
  //                        depend on this; without it, verification-code
  //                        prompts time out and the apply fails.
  // We derive this from GET /profile/ (which now returns `imap_pass_set`
  // as a boolean — the cleartext password never leaves the server).
  const [onboardingSteps, setOnboardingSteps] = useState([])
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('onboarding_dismissed') === '1',
  )
  const dismissOnboarding = () => {
    try { localStorage.setItem('onboarding_dismissed', '1') } catch {}
    setOnboardingDismissed(true)
  }

  useEffect(() => {
    api.get('/profile/').then(res => {
      const p = res.data
      const prefs = p.preferences || {}
      // Keep the legacy `missingFields`/`profileStatus` state for any
      // call sites that still reference them; the banner uses the new
      // `onboardingSteps` array.
      const missing = []
      if (!p.name?.trim()) missing.push('Full name')
      if (!prefs.phone?.trim()) missing.push('Phone number')
      if (!p.resume_url) missing.push('Resume')
      setMissingFields(missing)
      setProfileStatus(missing.length > 0 ? 'incomplete' : 'ok')

      // Build the structured checklist.
      setOnboardingSteps([
        {
          key: 'resume',
          label: 'Upload resume',
          done: !!p.resume_url,
        },
        {
          key: 'profile',
          label: 'Fill profile basics',
          done: !!(p.name && p.name.trim()) && !!(prefs.phone && prefs.phone.trim()),
        },
        {
          key: 'imap',
          label: 'Enable email verification',
          done: !!prefs.imap_pass_set && !!(prefs.imap_user && prefs.imap_user.trim()),
        },
      ])
    }).catch(() => setProfileStatus('ok'))
  }, [])

  // Load saved filters from profile on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await api.get('/profile/')
        const prefs = res.data.preferences || {}
        const df = prefs.dashboard_filters
        if (df) {
          setFilters(df)
          // Tell the user their SAVED filters are active — otherwise a saved
          // "Seattle" narrows the list on every load with no visible reason.
          const active = []
          if (df.location?.trim()) active.push(`📍 ${df.location.trim()}`)
          if (df.keywords?.length) active.push(...df.keywords)
          if (df.experience?.length) active.push(...df.experience)
          if (df.work_type?.length) active.push(...df.work_type)
          if (active.length) {
            toast(`Showing your saved filters: ${active.join(' · ')}`, {
              icon: '🔎', duration: 5000,
            })
          }
        }
      } catch {}
    }
    loadFilters()
  }, [])

  const loadData = async () => {
    // Latest-wins: multiple triggers (mount, filter change, poll, focus, queue
    // drain) can call loadData concurrently. Tag each request and drop stale
    // responses so an in-flight UNFILTERED fetch can never overwrite the
    // results of a newer FILTERED one (the race that made a saved Seattle
    // filter briefly show the wrong jobs on first load).
    const myReqId = ++loadReqIdRef.current
    try {
      // Pass the active ATS filter through so the backend can filter
      // BEFORE the top-N truncation — otherwise low-volume ATSes (like
      // Lever) get crowded out by Greenhouse's high-scored mass.
      const jobsParams = { min_score: 1, limit: 200 }
      if (atsFilter !== 'all') jobsParams.ats = atsFilter
      // Push location + search to the SERVER so they filter the WHOLE scored
      // set BEFORE the top-200 cap — otherwise a city/keyword only ever
      // searches the 200 highest-scored jobs already downloaded (which is why
      // "Seattle" used to show nothing despite 400+ Seattle jobs existing).
      if (filters.location?.trim()) jobsParams.location = filters.location.trim()
      if (debouncedSearch) jobsParams.search = debouncedSearch
      if (jobMode !== 'all') jobsParams.category = jobMode
      const [jobsRes, statsRes, perAtsRes] = await Promise.all([
        api.get('/jobs/', { params: jobsParams }),
        api.get('/jobs/stats'),
        // Per-ATS breakdown — best-effort; if it fails (e.g., transient
        // 500 from the new endpoint) we don't break the dashboard.
        api.get('/jobs/stats/per-ats').catch(() => ({ data: { per_ats: [], total_attempts: 0 } })),
      ])
      if (myReqId !== loadReqIdRef.current) return  // superseded by a newer load
      setAllJobs(jobsRes.data)
      setStats(statsRes.data)
      setPerAtsStats(perAtsRes.data || { per_ats: [], total_attempts: 0 })
    } catch (err) {
      if (myReqId !== loadReqIdRef.current) return  // superseded — ignore stale error
      // Only an AUTH failure should bounce to /login — the axios 401
      // interceptor already handles that globally. A transient 500 / network
      // blip must NOT log the user out (their token is still valid); show an
      // error toast and keep them on the page so a refresh can recover.
      if (err?.response?.status !== 401) {
        toast.error('Could not load jobs — check your connection and refresh.')
      }
    } finally {
      if (myReqId === loadReqIdRef.current) setLoading(false)
    }
  }

  // Re-fetch whenever a SERVER-SIDE filter changes (ATS bucket, location, or
  // the debounced search term). These can't be resolved client-side because
  // the top-200 fetch is score-truncated — narrowing to Lever / a city /
  // a keyword needs a fresh server query so the LIMIT selects the matching
  // rows, not "matching rows that happen to be in the global top-200".
  // Keyed on a serialized signature so unrelated (client-only) filter changes
  // like experience/work_type do NOT trigger a network round-trip.
  const serverFilterSig = `${atsFilter}|${(filters.location || '').trim()}|${debouncedSearch}|${jobMode}`
  const filterSigMountedRef = useRef(false)
  useEffect(() => {
    // Skip the first run — the mount effect already did the initial fetch.
    // On every later change, ALWAYS refetch (even if a load is still in flight);
    // latest-wins in loadData drops the stale response, so a saved filter that
    // loads mid-initial-fetch still wins.
    if (!filterSigMountedRef.current) { filterSigMountedRef.current = true; return }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverFilterSig])

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
      if (position > 1) {
        // Just added — no alert needed, UI shows position
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to queue application')
    } finally {
      setApplying(null)
    }
  }

  const toggleAutoApply = async () => {
    if (!autoApply.enabled) {
      if (!window.confirm(
        'Enable Auto Apply?\n\nThis will automatically submit up to 10 real job applications per day from your top matches (score ≥ 6) that pass your saved filters.\n\n• Saved FilterPanel chips (Experience / Keywords / Industries / Salary / Location / Excluded companies) → APPLY to Auto Apply\n• Quick toggles above the job list (Strong-8+ / Newest / Remote Only / Past 7d) → only affect what you see while browsing; Auto Apply ignores them\n\nMake sure your profile is complete before enabling.'
      )) return
    }
    setTogglingAuto(true)
    try {
      const r = await api.post('/auto-apply/toggle')
      setAutoApply(prev => ({ ...prev, enabled: r.data.enabled }))
      // Analytics: this is one of the most important "aha" moments for
      // the product — the user trusted the bot enough to let it apply
      // for them. Track each transition (off→on and on→off).
      import('../lib/analytics').then(({ track }) => {
        track('auto_apply_toggled', { enabled: r.data.enabled })
      }).catch(() => {})
      if (r.data.enabled) {
        setTab('Applying')
        setTimeout(() => api.get('/queue/').then(r => setQueue(r.data)).catch(() => {}), 2000)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not toggle Auto Apply')
    } finally {
      setTogglingAuto(false)
    }
  }

  const cancelQueued = async (jobId) => {
    try {
      await api.delete(`/queue/${jobId}`)
      setQueue(prev => prev.filter(q => q.job_id !== jobId))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not cancel')
    }
  }

  // Phase 5 — manually confirm an unknown apply. Charges the credit
  // (best-effort; backend doesn't go negative).
  const confirmApplied = async (jobId) => {
    try {
      const res = await api.post(`/apply/${jobId}/confirm`)
      toast.success(res.data.credit_deducted
        ? 'Marked as applied — 0.4 credits charged'
        : 'Marked as applied — credit waived (low balance)')
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not confirm')
    }
  }

  // Phase 5 — retry an unknown or failed apply. No credit charge here;
  // the next live attempt will charge if it lands.
  const retryApplication = async (jobId) => {
    try {
      await api.post(`/apply/${jobId}/retry`)
      toast.success('Reset — you can re-apply from Job Matches')
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not retry')
    }
  }

  // "Submit anyway" — overrides a reviewer-blocked apply. Re-queues the
  // application with the force_submit flag set; the next run bypasses
  // the reviewer entirely. The user has accepted the risk that the
  // reviewer's concerns may have been valid.
  const forceSubmitApplication = async (jobId) => {
    if (!window.confirm(
      'Submit anyway?\n\n' +
      'The reviewer flagged issues with this application, but you can ' +
      'override and submit it as-is. We\'ll bypass the audit and click ' +
      'Submit immediately on the next attempt.\n\n' +
      'A credit will be charged if the submission lands successfully.'
    )) return
    try {
      await api.post(`/apply/${jobId}/force-submit`)
      toast.success('Queued — submitting without reviewer audit')
      setTab('Applying')
      setTimeout(() => api.get('/queue/').then(r => setQueue(r.data)).catch(() => {}), 1000)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not force-submit')
    }
  }

  // Manual refresh — fast re-fetch of the jobs list from the DB. This does
  // NOT trigger a scrape (that's the "Search Jobs" button which can take
  // minutes). Used both by the explicit Refresh button and by the
  // auto-refetch-on-tab-focus effect below.
  const refreshJobs = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadData()
      toast.success('Job list refreshed', { duration: 2000 })
    } catch {
      toast.error('Could not refresh — try again in a moment')
    } finally {
      setRefreshing(false)
    }
  }, [])

  // Search Jobs — properly UX'd version.
  //
  // The old version waited up to 3 minutes polling `total_jobs` and only
  // refreshed the list once at the end. Two problems with that:
  //   (a) If the scrape finds only DUPLICATES (which happens often after
  //       the first run), total_jobs never grows and we waited the full
  //       3 min for nothing.
  //   (b) The user just sees "⏳ Searching..." with zero feedback.
  //
  // This version:
  //   - Toasts immediately so the user knows the request landed.
  //   - Refreshes the job list every 10s during the scrape, so newly
  //     scored jobs trickle in live instead of all-at-once.
  //   - Watches BOTH `scored` and `total_jobs` so we detect progress
  //     even when scraping finds only dupes (rescoring still happens).
  //   - Has a hard 4-minute timeout, after which we tell the user the
  //     scrape may still be running in the background.
  //   - Always ends with a toast (success OR "no new jobs this time").
  const runScrape = useCallback(async () => {
    if (scraping) return
    setScraping(true)
    const t = toast.loading('Searching 40+ companies for new jobs...', { duration: Infinity })
    const startTotal = stats?.total_jobs || 0
    const startScored = stats?.scored || 0
    const start = Date.now()
    let poll
    let resolved = false

    const finish = (msg, kind = 'success') => {
      if (resolved) return
      resolved = true
      clearInterval(poll)
      scrapePollRef.current = null
      toast.dismiss(t)
      if (kind === 'success') toast.success(msg)
      else if (kind === 'error') toast.error(msg)
      else toast(msg)
      setScraping(false)
    }

    try {
      await api.post('/queue/trigger-scrape')
    } catch (err) {
      const status = err.response?.status
      if (status === 429) finish('Slow down — wait a minute and try again', 'error')
      else finish('Could not start scrape — try again', 'error')
      return
    }

    let lastScored = startScored
    poll = setInterval(async () => {  // stored in scrapePollRef for unmount cleanup
      // Hard timeout
      if (Date.now() - start > 4 * 60 * 1000) {
        finish('Still running in the background — check back in a minute', 'info')
        loadData()
        return
      }
      try {
        const r = await api.get('/jobs/stats')
        setStats(r.data)
        const newJobs = (r.data.total_jobs || 0) - startTotal
        const newScored = (r.data.scored || 0) - startScored
        // Capture the PREVIOUS poll's count BEFORE updating, so the "did it
        // stop moving?" check below is meaningful. (Previously lastScored was
        // reassigned first, making `scored === lastScored` always true and
        // finishing the scrape at the very first 30s poll — usually with a
        // misleading "no new jobs".)
        const prevScored = lastScored
        if (r.data.scored > lastScored) {
          lastScored = r.data.scored
          await loadData()
        }
        // Done heuristic: after >=30s, if scored didn't move since the
        // previous poll, assume the scrape finished.
        if (Date.now() - start > 30000 && r.data.scored === prevScored) {
          if (newJobs > 0) {
            finish(`Found ${newJobs} new ${newJobs === 1 ? 'job' : 'jobs'}, ${newScored > 0 ? `${newScored} new matches scored` : 'all already scored'}`)
          } else if (newScored > 0) {
            finish(`${newScored} new ${newScored === 1 ? 'match' : 'matches'} scored from existing jobs`)
          } else {
            finish('No new jobs this time — check back in a few hours', 'info')
          }
        }
      } catch {
        // Network blip — keep trying. Don't kill the whole flow.
      }
    }, 10000)
    scrapePollRef.current = poll
  }, [scraping, stats])

  // Clear the scrape poll if the user navigates away mid-scrape — otherwise
  // the interval keeps calling setState/loadData on an unmounted component.
  useEffect(() => () => {
    if (scrapePollRef.current) clearInterval(scrapePollRef.current)
  }, [])

  // Keep refs to the latest loadData + "busy" flag so the timers below always
  // use the CURRENT filters and never fire mid-action. loadData isn't memoized,
  // so capturing it in a []-deps effect would freeze it at the initial (empty)
  // filters and a background poll would clobber the user's filtered view.
  const loadDataRef = useRef(loadData)
  loadDataRef.current = loadData
  const busyRef = useRef(false)
  busyRef.current = loading || refreshing || scraping || hasApplying

  // Auto-refresh the job list — on tab re-focus AND a periodic poll — so new
  // jobs (the worker adds ~125/day) appear on their own, like a real job board,
  // with no manual reload. Skipped while a scrape/apply/refresh is in flight so
  // a background fetch can't overwrite an in-progress user action, throttled so
  // focus + visibilitychange can't double-fire, and cleared on unmount.
  useEffect(() => {
    let last = 0
    const maybeRefresh = () => {
      if (document.visibilityState !== 'visible' || busyRef.current) return
      const now = Date.now()
      if (now - last < 3000) return
      last = now
      loadDataRef.current()
    }
    const id = setInterval(maybeRefresh, 45000)
    document.addEventListener('visibilitychange', maybeRefresh)
    window.addEventListener('focus', maybeRefresh)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', maybeRefresh)
      window.removeEventListener('focus', maybeRefresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter + sort. Every filter the FilterPanel collects is now applied
  // (previously industries/salary/job_type were dead). Every filter uses
  // the new normalized backend fields (work_arrangement, description_snippet,
  // fixed experience_level) so results actually match what the user picked.
  const filteredJobs = useMemo(() => {
    let jobs = [...allJobs]

    // ── 1. Tab partition ─────────────────────────────────────────
    if (tab === 'Applied') jobs = jobs.filter(j => j.status === 'applied')
    else if (tab === 'Applying') jobs = jobs.filter(j => j.status === 'applying')
    else if (tab === 'Needs Review') jobs = jobs.filter(j => j.status === 'unknown')
    else jobs = jobs.filter(j => !j.status || j.status === 'new')

    // ── 2. Search box (instant) ─────────────────────────────────
    // Matches title, company, location, AND description snippet so
    // "python" or "stripe" or "remote" all work as a single search.
    const q = search.trim().toLowerCase()
    if (q) {
      jobs = jobs.filter(j => {
        const hay = [
          j.title, j.company, j.location, j.description_snippet,
        ].filter(Boolean).join(' ').toLowerCase()
        return hay.includes(q)
      })
    }

    // ── 3. Quick filters ────────────────────────────────────────
    if (strongOnly) jobs = jobs.filter(j => (j.score || 0) >= 8)
    if (quickRemote) jobs = jobs.filter(j => j.work_arrangement === 'Remote')
    if (postedWithinDays > 0) {
      const cutoff = Date.now() - postedWithinDays * 24 * 60 * 60 * 1000
      jobs = jobs.filter(j => j.created_at && new Date(j.created_at).getTime() >= cutoff)
    }
    // ATS quick-filter — narrows to one applier bucket. The backend
    // emits `j.ats` using the same dispatcher logic that decides which
    // applier code path fires on Apply, so this filter shows EXACTLY
    // the jobs that would be handled by the chosen applier.
    if (atsFilter !== 'all') jobs = jobs.filter(j => j.ats === atsFilter)

    // ── 4. Keywords from FilterPanel ────────────────────────────
    // Fixed: also search description snippet. Previously only title+company
    // → a job with Python in the description but "Backend Engineer" in the
    // title was invisible when filtering for Python.
    if (filters.keywords?.length > 0) {
      jobs = jobs.filter(j => {
        const text = [
          j.title, j.company, j.description_snippet,
        ].filter(Boolean).join(' ').toLowerCase()
        return filters.keywords.some(kw => text.includes(kw.toLowerCase()))
      })
    }

    // ── 5. Experience level ─────────────────────────────────────
    // Fixed: the backend now returns 'Entry' / 'Junior' / 'Mid Level' /
    // 'Senior' / 'Staff / Principal'. We map the verbose labels in the
    // FilterPanel chip group to those exact bucket names.
    if (filters.experience?.length > 0) {
      const EXP_MAP = {
        'Entry Level & Graduate':         'Entry',
        'Junior (1-2 years)':             'Junior',
        'Mid Level (3-5 years)':          'Mid Level',
        'Senior (5-8 years)':             'Senior',
        'Staff / Principal (8+ years)':   'Staff / Principal',
      }
      const wanted = new Set(filters.experience.map(e => EXP_MAP[e]).filter(Boolean))
      jobs = jobs.filter(j => wanted.has(j.experience_level))
    }

    // ── 6. Work arrangement (Remote / Hybrid / Onsite) ──────────
    // Fixed: now uses backend-derived work_arrangement field instead of
    // substring-matching on location. "In person" was previously matching
    // hybrid jobs because they didn't contain the word "remote".
    if (filters.work_type?.length > 0) {
      const wanted = new Set(
        filters.work_type.map(wt => wt === 'In person' ? 'Onsite' : wt),
      )
      jobs = jobs.filter(j => wanted.has(j.work_arrangement))
    }

    // ── 7. Industries (NEW — was previously dead) ───────────────
    if (filters.industries?.length > 0) {
      jobs = jobs.filter(j => {
        const text = [
          j.title, j.company, j.description_snippet,
        ].filter(Boolean).join(' ').toLowerCase()
        return filters.industries.some(ind => text.includes(ind.toLowerCase()))
      })
    }

    // ── 8. Location text input ──────────────────────────────────
    if (filters.location?.trim()) {
      const loc = filters.location.trim().toLowerCase()
      jobs = jobs.filter(j =>
        (j.location || '').toLowerCase().includes(loc) ||
        (loc === 'remote' && j.work_arrangement === 'Remote')
      )
    }

    // ── 9. Salary minimum (NEW — was previously dead) ───────────
    // We don't currently scrape numeric salary fields reliably, so this
    // filters by keyword search in the description snippet. Imperfect but
    // honest — at least the slider does something visible.
    if ((filters.min_salary || 0) > 0) {
      const min = filters.min_salary
      jobs = jobs.filter(j => {
        const text = (j.description_snippet || '').toLowerCase()
        // Look for "$120k", "$120,000", "120k", etc. Coarse but useful.
        const matches = text.match(/\$?\s?(\d{2,3})[,\s]?(\d{3})?\s?k?/g) || []
        if (matches.length === 0) return true  // keep jobs with no salary mention
        // Parse the largest number we find as the implied range top.
        const max = matches
          .map(m => parseInt(m.replace(/[^\d]/g, ''), 10))
          .map(n => n < 1000 ? n * 1000 : n)  // "120" → 120000
          .filter(n => n >= 30_000 && n <= 800_000) // sanity bounds
          .reduce((a, b) => Math.max(a, b), 0)
        return max === 0 || max >= min * 1000
      })
    }

    // ── 10. Excluded companies ──────────────────────────────────
    if (filters.exclude_companies) {
      const excluded = filters.exclude_companies.toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
      jobs = jobs.filter(j =>
        !excluded.some(e => j.company?.toLowerCase().includes(e))
      )
    }

    // ── 11. Sort ────────────────────────────────────────────────
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
  }, [allJobs, tab, filters, sortBy, search, strongOnly, quickRemote, postedWithinDays, atsFilter])

  // No full-screen spinner — render the page chrome and skeleton job cards
  // so users on cold-start Railway requests don't stare at a blank purple
  // gradient for several seconds. Perceived performance > actual performance.
  const showSkeletons = loading

  const clearFilters = () => {
    const empty = {
      keywords: [], experience: [], work_type: [],
      industries: [],
      min_salary: 0, job_type: ['Full time'],
      exclude_companies: '', location: ''
    }
    setFilters(empty)
    saveFilters(empty)
    // Also clear the quick filters so "clear" is honest about what it does.
    setSearch('')
    setStrongOnly(false)
    setQuickRemote(false)
    setPostedWithinDays(0)
    setAtsFilter('all')
  }

  const activeCount = (filters.keywords?.length || 0)
    + (filters.experience?.length || 0)
    + (filters.work_type?.length || 0)
    + (filters.industries?.length || 0)
    + ((filters.min_salary || 0) > 0 ? 1 : 0)
    + (filters.location?.trim() ? 1 : 0)
    + (filters.exclude_companies?.trim() ? 1 : 0)

  return (
    <div style={s.page}>
      <Navbar credits={stats?.credits || 0} />

      {/* Onboarding checklist — shows until all 3 steps are done or the
          user dismisses. Each step links to /profile so they can fix it. */}
      {!onboardingDismissed
        && onboardingSteps.length > 0
        && onboardingSteps.some(step => !step.done) && (
        <div style={s.onboardBanner}>
          <span style={s.onboardIcon}>🚀</span>
          <strong style={s.onboardTitle}>Get started:</strong>
          <div style={s.onboardSteps}>
            {onboardingSteps.map(step => (
              <a
                key={step.key}
                href="/profile"
                style={{
                  ...s.onboardStep,
                  ...(step.done ? s.onboardStepDone : s.onboardStepPending),
                }}
                aria-label={step.done ? `${step.label} — done` : `${step.label} — incomplete, click to go to profile`}
              >
                <span style={s.onboardStepIcon}>{step.done ? '✓' : '○'}</span>
                {step.label}
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={dismissOnboarding}
            style={s.onboardDismiss}
            aria-label="Dismiss onboarding checklist"
            title="Hide this banner"
          >
            ×
          </button>
        </div>
      )}

      <div style={s.container}>
        {stats && (
          <>
            {/* Hero header — frames the dashboard as "your opportunities, ranked" */}
            <div style={s.heroHeader}>
              <h1 style={s.heroTitle}>
                Your{' '}
                <span style={s.heroAccent}>
                  {(stats.total_jobs ?? 0).toLocaleString()}
                </span>{' '}
                opportunities, ranked.
              </h1>
              <p style={s.heroSub}>
                We scored every posting against your resume.{' '}
                <span style={s.heroSubMuted}>
                  Last updated {stats.last_scraped_ago || 'Never'}
                </span>
              </p>
            </div>

            {/* Stat cards — glassmorphic, no icons above numbers per user request */}
            <div style={s.statsGrid}>
              <div style={s.statCard}>
                <div style={s.statNum}>{(stats.total_jobs ?? 0).toLocaleString()}</div>
                <div style={s.statLabel}>Jobs found</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTab('Job Matches')
                  setStrongOnly(v => !v)
                }}
                style={{
                  ...s.statCard,
                  ...s.statCardClickable,
                  ...(strongOnly ? s.statCardActive : {}),
                }}
                aria-pressed={strongOnly}
                title="Click to filter to score 8+ only"
              >
                <div style={{
                  ...s.statNum,
                  color: strongOnly ? '#fff' : '#4F46E5',
                }}>{stats.strong_matches ?? 0}</div>
                <div style={{
                  ...s.statLabel,
                  color: strongOnly ? 'rgba(255,255,255,0.85)' : s.statLabel.color,
                }}>Strong matches</div>
              </button>

              <div style={s.statCard}>
                <div style={{ ...s.statNum, color: '#16A34A' }}>
                  {stats.applied ?? 0}
                </div>
                <div style={s.statLabel}>Applied</div>
              </div>

              <div style={s.statCard}>
                <div style={s.statNum}>
                  {tab === 'Applying' ? queue.length : filteredJobs.length}
                </div>
                <div style={s.statLabel}>Showing</div>
              </div>
            </div>

            {/* Active filter chips */}
            <div style={s.activeFiltersRow}>
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
                title={autoApply.enabled
                  ? 'Auto Apply is ON. Uses your saved FilterPanel filters (not the quick toggles below).'
                  : 'Turn on Auto Apply to automatically submit applications matching your saved filters.'}
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
              {/* Search Jobs lives inside the FilterPanel now — same scrape,
                  one fewer button up here. Best Match / Newest is also gone
                  (the chip row below the tabs has 1:1 duplicates). */}
              <button style={s.filterBtn} onClick={() => setShowFilters(true)}>
                ⚙ Filters {activeCount > 0 ? `(${activeCount})` : ''}
              </button>
              {/* Clear all filters — visible whenever ANY filter, search,
                  or quick-toggle is active. One click resets everything to
                  the wide-open default view. */}
              {(activeCount > 0 || search.trim() || strongOnly || quickRemote || postedWithinDays > 0 || atsFilter !== 'all') && (
                <button
                  type="button"
                  style={s.clearFiltersBtn}
                  onClick={() => {
                    clearFilters()
                    toast.success('All filters cleared', { duration: 2000 })
                  }}
                  title="Reset all filters, search, and quick toggles"
                >
                  ✕ Clear filters
                </button>
              )}
            </div>
          </>
        )}

        {/* Phase 5 / UX redesign — live agent activity panel.
            Sits above the tabs so users always see what their agent is doing,
            even when they're on a different tab. */}
        {!showSkeletons && (queue.length > 0 || stats?.applied > 0) && (
          <div style={s.agentPanel}>
            <AgentActivity queue={queue} stats={stats} />
          </div>
        )}

        {/* Lifecycle tabs sit FIRST — they're the primary navigation between
            the four states of an application. The search + filter chips
            below them only show on Job Matches because filtering doesn't
            make sense in Applying / Needs Review / Applied. */}
        <div style={s.tabs} role="tablist" aria-label="Job sections">
          {TABS.map((t, i) => {
            const isActive = tab === t
            const count = t === 'Applying'
              ? queue.length
              : t === 'Needs Review'
                ? (stats?.unknown || 0)
                : 0
            return (
              <button
                key={t}
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(t)}
                style={{ ...s.tab, ...(isActive ? s.tabActive : {}) }}
              >
                {t}
                {count > 0 && (
                  <span style={{
                    background: isActive ? 'rgba(255,255,255,0.3)' : '#4F46E5',
                    color: '#fff', fontSize: 11, fontWeight: 700,
                    padding: '1px 7px', borderRadius: 20, minWidth: 18, textAlign: 'center',
                  }}>{count}</span>
                )}
                {i < TABS.length - 1 && <span style={s.tabArrow}>›</span>}
              </button>
            )
          })}
        </div>

        {/* Search + quick-filter / quick-sort bar (Job Matches only).
            Inspired by Indeed/LinkedIn — instant search and one-tap toggles
            for the things users actually filter by 90% of the time. The
            FilterPanel button is still here for everything else. */}
        {tab === 'Job Matches' && !showSkeletons && (
          <div style={s.quickBar}>
            <div style={s.searchRow}>
              <div style={s.searchWrap}>
                <span style={s.searchIcon} aria-hidden="true">🔍</span>
                <input
                  type="text"
                  placeholder="Search title, company, or location…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={s.searchInput}
                  aria-label="Search jobs"
                />
                {search && (
                  <button
                    style={s.searchClear}
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    type="button"
                  >✕</button>
                )}
              </div>
              <button
                style={{ ...s.refreshBtn, opacity: refreshing ? 0.6 : 1 }}
                onClick={refreshJobs}
                disabled={refreshing}
                aria-label="Refresh job list"
                type="button"
                title="Refresh job list (does not run a new scrape)"
              >
                <span style={{
                  display: 'inline-block',
                  animation: refreshing ? 'spin 0.7s linear infinite' : 'none',
                }}>↻</span>
                <span>Refresh</span>
              </button>
            </div>

            {/* Job mode — switch between career jobs and local warehouse/temp
                work. Server-side (each mode re-fetches), so both worlds get
                the full result window instead of competing for 200 rows. */}
            <div style={s.modeRow} role="tablist" aria-label="Job mode">
              {[
                { key: 'all',                 label: '🗂 All' },
                { key: 'professional',        label: '💼 Professional' },
                { key: 'warehouse_logistics', label: '📦 Warehouse & Temp' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={jobMode === key}
                  style={{ ...s.modeBtn, ...(jobMode === key ? s.modeBtnActive : {}) }}
                  onClick={() => setJobMode(key)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={s.chipRow} className="trust-strip-scroll">
              <button
                style={{ ...s.chip, ...(sortBy === 'score' && !strongOnly && !quickRemote && postedWithinDays === 0 ? s.chipActive : {}) }}
                onClick={() => {
                  setSortBy('score')
                  setStrongOnly(false)
                  setQuickRemote(false)
                  setPostedWithinDays(0)
                }}
                type="button"
              >🎯 Best Match</button>

              <button
                style={{ ...s.chip, ...(sortBy === 'date' ? s.chipActive : {}) }}
                onClick={() => setSortBy(sortBy === 'date' ? 'score' : 'date')}
                type="button"
              >🕐 Newest</button>

              <button
                style={{ ...s.chip, ...(strongOnly ? s.chipActive : {}) }}
                onClick={() => setStrongOnly(v => !v)}
                type="button"
              >⭐ Strong Match (8+)</button>

              <button
                style={{ ...s.chip, ...(quickRemote ? s.chipActive : {}) }}
                onClick={() => setQuickRemote(v => !v)}
                type="button"
              >🌐 Remote Only</button>

              <button
                style={{ ...s.chip, ...(postedWithinDays === 7 ? s.chipActive : {}) }}
                onClick={() => setPostedWithinDays(postedWithinDays === 7 ? 0 : 7)}
                type="button"
              >📅 Past 7 days</button>

              <button
                style={{ ...s.chip, ...(postedWithinDays === 1 ? s.chipActive : {}) }}
                onClick={() => setPostedWithinDays(postedWithinDays === 1 ? 0 : 1)}
                type="button"
              >🔥 Past 24h</button>

              <div style={s.chipDivider} />

              {/* ATS source chips — filter to one applier bucket. Always
                  render all 6: when active, the Dashboard re-fetches
                  /jobs/?ats=X so even low-volume ATSes (e.g. Lever)
                  become visible. Without this re-fetch, Greenhouse's
                  mass-scored entries would crowd Lever out of the top
                  200 every time. Clicking the active chip clears back
                  to "All". */}
              {[
                { key: 'greenhouse',      label: 'Greenhouse' },
                { key: 'lever',           label: 'Lever' },
                { key: 'ashby',           label: 'Ashby' },
                { key: 'workday',         label: 'Workday' },
                { key: 'smartrecruiters', label: 'SmartRecruiters' },
                { key: 'ziprecruiter',    label: 'ZipRecruiter' },
                { key: 'generic',         label: 'Generic' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  style={{ ...s.chip, ...(atsFilter === key ? s.chipActive : {}) }}
                  onClick={() => setAtsFilter(atsFilter === key ? 'all' : key)}
                  type="button"
                  title={`Filter the job list to ${label} only`}
                >
                  {label}
                </button>
              ))}

              <div style={s.chipDivider} />

              <button
                style={{ ...s.chip, ...(activeCount > 0 ? s.chipBrand : {}) }}
                onClick={() => setShowFilters(true)}
                type="button"
              >
                ⚙ More filters
                {activeCount > 0 && (
                  <span style={s.chipBadge}>{activeCount}</span>
                )}
              </button>
            </div>
          </div>
        )}

        {showSkeletons ? (
          <div style={s.jobList}>
            {[0, 1, 2, 3, 4].map(i => <JobCardSkeleton key={i} />)}
          </div>
        ) : tab === 'Needs Review' ? (
          <NeedsReviewList
            jobs={filteredJobs}
            onConfirm={confirmApplied}
            onRetry={retryApplication}
            onForceSubmit={forceSubmitApplication}
            onClick={(j) => setSelectedJob(j)}
          />
        ) : tab === 'Applying' ? (
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
                {(() => {
                  // Name the ACTIVE filters so an empty list reads as "your
                  // filters are narrow" (fixable) rather than "there are no
                  // jobs" (alarming). Disambiguates a filter from a truly
                  // empty result now that filtering happens server-side.
                  const active = []
                  if (filters.location?.trim()) active.push(`📍 ${filters.location.trim()}`)
                  if (search.trim()) active.push(`“${search.trim()}”`)
                  if (filters.keywords?.length) active.push(...filters.keywords)
                  if (filters.experience?.length) active.push(...filters.experience)
                  if (filters.work_type?.length) active.push(...filters.work_type)
                  if (strongOnly) active.push('Score 8+')
                  if (quickRemote) active.push('Remote only')
                  if (postedWithinDays > 0) active.push(`Past ${postedWithinDays}d`)
                  if (atsFilter !== 'all') active.push(atsFilter)
                  if (jobMode !== 'all') active.push(jobMode === 'warehouse_logistics' ? '📦 Warehouse & Temp mode' : '💼 Professional mode')
                  return active.length ? (
                    <div style={s.emptyText}>
                      Active filters: <strong>{active.join(' · ')}</strong>. Clear them to see more.
                    </div>
                  ) : (
                    <div style={s.emptyText}>Run the scraper to pull in more jobs.</div>
                  )
                })()}
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

        {/* Per-ATS performance panel — only renders once the user has at
            least one real apply. Below that threshold the data is just
            noise (a 100% success-rate on 1 attempt isn't a signal). */}
        {perAtsStats.total_attempts > 0 && (
          <PerAtsPanel data={perAtsStats} />
        )}
      </div>

      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onSave={saveFilters}
          onClose={() => setShowFilters(false)}
          jobCount={filteredJobs.length}
          onRefreshJobs={runScrape}
          refreshing={scraping}
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

/**
 * NeedsReviewList — surfaces jobs the bot couldn't confirm landed.
 *
 * These rows USED to silently be marked 'applied' (and charge a credit) —
 * we fixed that in Phase 1 / Phase 5. Now the user sees them honestly and
 * can either confirm (charge credit) or retry (no charge until success).
 */
function NeedsReviewList({ jobs, onConfirm, onRetry, onForceSubmit, onClick }) {
  if (jobs.length === 0) {
    return (
      <div style={s.empty}>
        <div style={s.emptyIcon}>✓</div>
        <div style={s.emptyTitle}>Nothing needs your review</div>
        <div style={s.emptyText}>
          When the bot can't confirm whether an application landed (CAPTCHA, silent block,
          etc.), it'll show up here for you to verify or retry.
        </div>
      </div>
    )
  }
  return (
    <div style={s.jobList}>
      <div style={s.reviewIntro}>
        <span style={s.reviewIconWrap} aria-hidden="true">⚠</span>
        <div>
          <div style={s.reviewHeading}>The bot couldn't confirm these landed.</div>
          <div style={s.reviewSub}>
            Open the job, check your email or the company's careers portal, then
            <strong> mark as applied</strong> (0.4 credits) or <strong>retry</strong> (free).
            For reviewer-blocked applies you trust, you can <strong>submit anyway</strong>.
          </div>
        </div>
      </div>
      {jobs.map(job => (
        <ReviewCard
          key={job.id}
          job={job}
          onConfirm={() => onConfirm(job.id)}
          onRetry={() => onRetry(job.id)}
          onForceSubmit={() => onForceSubmit(job.id)}
          onClick={() => onClick(job)}
        />
      ))}
    </div>
  )
}

function ReviewCard({ job, onConfirm, onRetry, onForceSubmit, onClick }) {
  // Show "Submit anyway" only when the reviewer is the reason this row
  // is in Needs Review — i.e. the notes mention "Reviewer blocked" (the
  // exact prefix used by run_pre_submit_review in reviewer.py). For
  // generic unknown/failed rows (CAPTCHA, network, etc) the button
  // doesn't apply — Retry is the right action there.
  const reviewerBlocked = (job.notes || '').toLowerCase().includes('reviewer blocked')
  return (
    <div style={s.reviewCard} className="job-card-hover" onClick={onClick}>
      <div style={s.reviewLeft}>
        <div style={s.reviewBadge}>?</div>
        <div style={{ minWidth: 0 }}>
          <div style={s.reviewTitle}>{job.title}</div>
          <div style={s.reviewMeta}>
            <span style={s.reviewCompany}>{job.company}</span>
            {job.notes && (
              <>
                <span style={s.dot}>·</span>
                <span style={s.reviewNote}>{job.notes}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div style={s.reviewActions} onClick={e => e.stopPropagation()}>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          style={s.reviewLink}
          onClick={e => e.stopPropagation()}
        >
          Open posting ↗
        </a>
        <button style={s.reviewConfirmBtn} onClick={onConfirm}>
          ✓ Mark applied
        </button>
        <button style={s.reviewRetryBtn} onClick={onRetry}>
          ↺ Retry
        </button>
        {reviewerBlocked && (
          <button
            style={s.reviewForceBtn}
            onClick={onForceSubmit}
            title="Bypass the reviewer and submit immediately"
          >
            ⚠ Submit anyway
          </button>
        )}
      </div>
    </div>
  )
}

// ─── PerAtsPanel ─────────────────────────────────────────────────────
// "Apply performance by ATS" — small data widget rendered at the bottom
// of the Dashboard. Shows per-source success / failed / unknown counts
// and a stacked bar so the user can see at a glance "Greenhouse is
// reliable; Lever needs work." Data comes from GET /jobs/stats/per-ats.
function PerAtsPanel({ data }) {
  const rows = data?.per_ats || []
  if (rows.length === 0) return null

  // Friendly source labels — the DB stores lowercase identifiers.
  const SOURCE_LABEL = {
    greenhouse:      'Greenhouse',
    lever:           'Lever',
    ashby:           'Ashby',
    workday:         'Workday',
    smartrecruiters: 'SmartRecruiters',
    generic:         'Generic / Other',
    indeed:          'Indeed',
    dice:            'Dice',
    wellfound:       'Wellfound',
    ycombinator:     'YCombinator',
    himalayas:       'Himalayas',
    remotive:        'Remotive',
    jsearch:         'JSearch',
  }

  return (
    <div style={paS.card}>
      <div style={paS.header}>
        <span style={paS.title}>📊 Apply performance by ATS</span>
        <span style={paS.totalChip}>
          {data.total_attempts} {data.total_attempts === 1 ? 'attempt' : 'attempts'}
        </span>
      </div>
      <div style={paS.tableHeader}>
        <span style={paS.colSource}>Source</span>
        <span style={paS.colBar}>Outcome breakdown</span>
        <span style={paS.colRate}>Success</span>
        <span style={paS.colCount}>Total</span>
      </div>
      {rows.map(row => {
        const total = row.total || 1
        const aPct = (row.applied / total) * 100
        const uPct = (row.unknown / total) * 100
        const fPct = (row.failed  / total) * 100
        const rateColor =
          row.success_rate_pct == null ? '#6B7280'
          : row.success_rate_pct >= 80 ? '#16A34A'
          : row.success_rate_pct >= 50 ? '#D97706'
          : '#DC2626'
        return (
          <div key={row.source} style={paS.row}>
            <span style={paS.colSource}>{SOURCE_LABEL[row.source] || row.source}</span>
            <div style={paS.colBar}>
              <div style={paS.stack} role="img" aria-label={`${row.applied} applied, ${row.unknown} unknown, ${row.failed} failed`}>
                {aPct > 0 && <div style={{ ...paS.seg, background: '#16A34A', width: `${aPct}%` }} title={`${row.applied} applied`} />}
                {uPct > 0 && <div style={{ ...paS.seg, background: '#D97706', width: `${uPct}%` }} title={`${row.unknown} needs review`} />}
                {fPct > 0 && <div style={{ ...paS.seg, background: '#DC2626', width: `${fPct}%` }} title={`${row.failed} failed`} />}
              </div>
            </div>
            <span style={{ ...paS.colRate, color: rateColor, fontWeight: 700 }}>
              {row.success_rate_pct != null ? `${row.success_rate_pct}%` : '—'}
            </span>
            <span style={paS.colCount}>{row.total}</span>
          </div>
        )
      })}
      <div style={paS.legend}>
        <span style={{ ...paS.legendDot, background: '#16A34A' }} /> Applied
        <span style={{ ...paS.legendDot, background: '#D97706', marginLeft: 16 }} /> Needs review
        <span style={{ ...paS.legendDot, background: '#DC2626', marginLeft: 16 }} /> Failed
      </div>
    </div>
  )
}

const paS = {
  card: {
    marginTop: 24,
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    border: '1px solid rgba(196,181,253,0.35)',
    borderRadius: 16,
    padding: '18px 22px',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { fontSize: 14, fontWeight: 700, color: '#1E1B4B' },
  totalChip: {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
    textTransform: 'uppercase',
    background: '#EDE9FE', color: '#5B21B6',
    border: '1px solid #C4B5FD',
    padding: '3px 10px', borderRadius: 999,
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '140px 1fr 70px 60px',
    gap: 12, alignItems: 'center',
    fontSize: 11, fontWeight: 700, color: '#6B7280',
    letterSpacing: '0.04em', textTransform: 'uppercase',
    paddingBottom: 8, marginBottom: 6,
    borderBottom: '1px solid rgba(196,181,253,0.25)',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '140px 1fr 70px 60px',
    gap: 12, alignItems: 'center',
    fontSize: 13, color: '#111827',
    padding: '8px 0',
  },
  colSource: { fontWeight: 600 },
  colBar:    { minWidth: 0 },
  colRate:   { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  colCount:  { textAlign: 'right', color: '#6B7280', fontVariantNumeric: 'tabular-nums' },
  stack: {
    height: 8, borderRadius: 999, overflow: 'hidden',
    background: '#F3F4F6', display: 'flex',
  },
  seg: { height: '100%' },
  legend: {
    marginTop: 10, paddingTop: 10,
    borderTop: '1px solid rgba(196,181,253,0.25)',
    fontSize: 11, color: '#6B7280',
    display: 'flex', alignItems: 'center',
  },
  legendDot: { display: 'inline-block', width: 8, height: 8, borderRadius: 999, marginRight: 6 },
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
  container: { maxWidth: '900px', margin: '0 auto', padding: '16px 16px 32px' },

  // ─── Hero header (compact — keeps focus on the job list below) ────
  heroHeader: { marginBottom: 14 },
  heroTitle: {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    lineHeight: 1.18,
    color: '#1E1B4B',
    marginBottom: 4,
  },
  heroAccent: {
    background: 'linear-gradient(90deg, #7C3AED 0%, #EC4899 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSub: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 1.5,
  },
  heroSubMuted: { color: '#9CA3AF', fontSize: 12 },

  // ─── Stat cards (compact 4-col grid, glassmorphic, no emojis) ──────
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    background: 'rgba(255, 255, 255, 0.72)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    border: '1px solid rgba(196, 181, 253, 0.35)',
    borderRadius: 12,
    padding: '10px 14px',
    textAlign: 'left',
    transition: 'all 0.18s ease',
    fontFamily: 'inherit',
  },
  statCardClickable: {
    cursor: 'pointer',
  },
  statCardActive: {
    background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)',
    border: '1px solid #4F46E5',
    boxShadow: '0 6px 16px rgba(79, 70, 229, 0.28)',
  },
  statNum: {
    fontSize: 22,
    fontWeight: 800,
    color: '#1E1B4B',
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
    marginBottom: 2,
  },
  statLabel: { fontSize: 12, color: '#6B7280', fontWeight: 500 },

  // ─── Active filters / action row (was statRight) ───────────────────
  activeFiltersRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  activeFilters: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  filterChip: { background: '#EDE9FE', color: '#6D28D9', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', border: '1px solid #C4B5FD' },
  chipRemove: { background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '10px', padding: '0' },
  filterBtn: { background: '#4F46E5', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' },
  clearFiltersBtn: {
    background: 'transparent',
    color: '#6B7280',
    border: '1.5px solid #E5E7EB',
    padding: '7px 14px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  tabs: { display: 'flex', marginBottom: '12px', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(196,181,253,0.35)' },
  tab: { flex: 1, padding: '10px 16px', border: 'none', background: 'none', fontSize: '14px', fontWeight: '500', color: '#8B85C1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  tabActive: { background: 'linear-gradient(135deg, #6d28d9, #4f46e5)', color: '#fff' },
  tabArrow: { color: '#ccc', fontSize: '18px' },
  jobList: { display: 'flex', flexDirection: 'column' },
  empty: { background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderRadius: '12px', padding: '60px 20px', textAlign: 'center', border: '1px solid rgba(196,181,253,0.35)' },
  emptyIcon: { fontSize: '40px', marginBottom: '12px' },
  emptyTitle: { fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#111' },
  emptyText: { fontSize: '14px', color: '#888', marginBottom: '20px' },
  emptyBtn: { background: 'linear-gradient(135deg, #9333ea, #6d28d9)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 3px 10px rgba(109,40,217,0.3)' },
  // Onboarding checklist — brand-tinted (purple-soft) instead of the old
  // amber warning. A friendly "let's set you up" tone, not "you have an
  // error". Lives at the very top of the page above the hero.
  onboardBanner: {
    background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
    borderBottom: '1px solid #DDD6FE',
    padding: '12px 28px', display: 'flex', alignItems: 'center',
    gap: '14px', fontSize: '14px', color: '#1E1B4B',
    flexWrap: 'wrap',
  },
  onboardIcon: { fontSize: '20px', flexShrink: 0 },
  onboardTitle: { fontSize: '14px', fontWeight: 700, color: '#1E1B4B', flexShrink: 0 },
  onboardSteps: {
    display: 'flex', alignItems: 'center', gap: '8px',
    flexWrap: 'wrap', flex: 1,
  },
  onboardStep: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '6px 12px', borderRadius: '999px',
    fontSize: '13px', fontWeight: 600,
    textDecoration: 'none', whiteSpace: 'nowrap',
    transition: 'transform 0.12s ease, box-shadow 0.12s ease',
  },
  onboardStepPending: {
    background: '#FFFFFF',
    color: '#5B21B6',
    border: '1px solid #C4B5FD',
    boxShadow: '0 1px 2px rgba(79, 70, 229, 0.08)',
  },
  onboardStepDone: {
    background: '#F0FDF4',
    color: '#15803d',
    border: '1px solid #BBF7D0',
    cursor: 'default',
  },
  onboardStepIcon: { fontSize: '14px', fontWeight: 800, flexShrink: 0 },
  onboardDismiss: {
    marginLeft: 'auto', background: 'transparent', border: 'none',
    color: '#6B7280', fontSize: '22px', lineHeight: 1, padding: '0 4px',
    cursor: 'pointer', borderRadius: '6px', flexShrink: 0,
  },
  // Legacy alias kept so any stale reference doesn't crash. The new
  // checklist banner above replaces both `onboardMissing` and the
  // old single-link `onboardBtn`.
  onboardMissing: { display: 'none' },
  onboardBtn: { display: 'none' },
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

  // ─── Live agent activity panel (Phase 5 / UI redesign) ─────────────
  agentPanel: {
    marginBottom: 12,
  },

  // ─── Search + quick-filter bar (NEW: filter UX redesign) ───────────
  quickBar: {
    marginBottom: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  searchRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'stretch',
  },
  searchWrap: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    fontSize: 15,
    color: '#9CA3AF',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '11px 38px 11px 40px',
    borderRadius: 12,
    border: '1.5px solid rgba(196,181,253,0.4)',
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    fontSize: 14,
    color: '#111827',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  searchClear: {
    position: 'absolute',
    right: 10,
    width: 22, height: 22,
    border: 'none',
    background: '#E5E7EB',
    color: '#6B7280',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: 11,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderRadius: 12,
    border: '1.5px solid rgba(196,181,253,0.4)',
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: '#5B21B6',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s, transform 0.1s',
  },
  chipRow: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
    alignItems: 'center',
  },
  modeRow: {
    display: 'inline-flex',
    gap: 4,
    padding: 4,
    marginBottom: 10,
    borderRadius: 12,
    border: '1.5px solid rgba(196,181,253,0.35)',
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  modeBtn: {
    padding: '8px 16px',
    borderRadius: 9,
    border: 'none',
    background: 'transparent',
    color: '#374151',
    fontWeight: 700,
    fontSize: 13.5,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  },
  modeBtnActive: {
    background: 'linear-gradient(135deg, #6D28D9, #4F46E5)',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.30)',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 999,
    border: '1.5px solid rgba(196,181,253,0.35)',
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: '#374151',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
  },
  chipActive: {
    background: 'linear-gradient(135deg, #6D28D9, #4F46E5)',
    color: '#fff',
    border: '1.5px solid #4F46E5',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.30)',
  },
  chipBrand: {
    background: '#EDE9FE',
    color: '#5B21B6',
    border: '1.5px solid #C4B5FD',
  },
  chipBadge: {
    background: '#5B21B6',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    padding: '1px 7px',
    borderRadius: 999,
    minWidth: 18,
    textAlign: 'center',
    marginLeft: 4,
  },
  chipDivider: {
    width: 1,
    height: 24,
    background: 'rgba(196,181,253,0.4)',
    margin: '0 4px',
    flexShrink: 0,
  },
  // Small count appended to ATS chips: "Lever 12". Lighter weight
  // than the chip label and faded so it reads as secondary info.
  chipCount: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: 500,
    opacity: 0.65,
    fontVariantNumeric: 'tabular-nums',
  },

  // ─── Clickable stat (Strong matches → toggle filter) ────────────────
  statClickable: {
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    padding: '4px 10px',
    borderRadius: 10,
    fontFamily: 'inherit',
    transition: 'background 0.15s, color 0.15s',
  },
  statActive: {
    background: 'linear-gradient(135deg, #6D28D9, #4F46E5)',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.30)',
  },

  // ─── Needs Review tab styles ───────────────────────────────────────
  reviewIntro: {
    display: 'flex',
    gap: 12,
    background: '#FFFBEB',
    border: '1px solid #FCD34D',
    borderRadius: 12,
    padding: '14px 16px',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  reviewIconWrap: {
    width: 28, height: 28,
    flexShrink: 0,
    background: '#FEF3C7',
    borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, color: '#92400E', fontWeight: 700,
  },
  reviewHeading: { fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 2 },
  reviewSub:     { fontSize: 13, color: '#78350F', lineHeight: 1.45 },

  reviewCard: {
    background: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    borderRadius: 14,
    border: '1px solid rgba(252, 211, 77, 0.4)',
    marginBottom: 10,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    cursor: 'pointer',
    transition: 'box-shadow 0.18s, transform 0.18s, border-color 0.18s',
  },
  reviewLeft: {
    display: 'flex', alignItems: 'center', gap: 12,
    flex: 1, minWidth: 0,
  },
  reviewBadge: {
    width: 32, height: 32, borderRadius: 8,
    background: '#FEF3C7',
    color: '#92400E', fontWeight: 800, fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid #FCD34D',
  },
  reviewTitle: {
    fontSize: 15, fontWeight: 600, color: '#111',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  reviewMeta: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
    fontSize: 13, color: '#6b7280', marginTop: 4,
  },
  reviewCompany: { fontWeight: 600, color: '#4b5563' },
  reviewNote: { color: '#92400E', fontSize: 12 },
  reviewActions: {
    display: 'flex', gap: 8, flexWrap: 'wrap',
  },
  reviewLink: {
    fontSize: 12, padding: '7px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: 8, color: '#4B5563',
    fontWeight: 600, background: '#fff',
  },
  reviewConfirmBtn: {
    fontSize: 12, padding: '7px 12px',
    background: '#F0FDF4', color: '#16A34A',
    border: '1px solid #BBF7D0', borderRadius: 8,
    fontWeight: 700, cursor: 'pointer',
  },
  reviewRetryBtn: {
    fontSize: 12, padding: '7px 12px',
    background: '#FFFFFF', color: '#4F46E5',
    border: '1px solid #C4B5FD', borderRadius: 8,
    fontWeight: 700, cursor: 'pointer',
  },
  // "Submit anyway" — amber/warning tone because it's a deliberate
  // reviewer override. Only shows on reviewer-blocked rows.
  reviewForceBtn: {
    fontSize: 12, padding: '7px 12px',
    background: '#FFFBEB', color: '#B45309',
    border: '1px solid #FCD34D', borderRadius: 8,
    fontWeight: 700, cursor: 'pointer',
  },
}
