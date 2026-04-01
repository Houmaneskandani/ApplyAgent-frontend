import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import Navbar from '../components/Navbar'

const SECTIONS = ['Basics', 'Education', 'Portfolio & Links', 'Location', 'Previous Work', 'Behavioral', 'Demographic', 'Legal', 'Email Verification']

const SKILLS_LIST = ['Python', 'Go', 'Golang', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Ruby', 'Rust', 'Swift', 'Kotlin', 'SQL', 'GraphQL', 'REST APIs', 'PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'CI/CD', 'Linux', 'Backend', 'Frontend', 'Full Stack', 'DevOps', 'ML/AI', 'Data Engineering', 'Mobile', 'React', 'Node.js', 'Django', 'FastAPI', 'Spring Boot']
const LANGUAGES_LIST = ['English', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese', 'Korean', 'Arabic', 'Portuguese', 'Russian', 'Hindi', 'Italian']
const SECURITY_CLEARANCE = ['None', 'Confidential', 'Secret', 'Top Secret', 'Top Secret/SCI', 'TS/SCI with Polygraph']
const START_DATE = ['ASAP', 'Within 2 weeks', 'Within 1 month', 'Within 3 months', 'More than 3 months']
const NOTICE_PERIOD = ['Immediately', '1 week', '2 weeks', '3 weeks', '1 month', '2 months', '3 months']
const DEGREE_OPTIONS = ['No degree / Self-taught', 'High School / GED', "Associate's", "Bachelor's", "Master's", 'MBA', 'PhD', 'MD / JD / Other professional']
const EMPLOYMENT_TYPE = ['Full-time', 'Contract / Freelance', 'Either (full-time or contract)']
const RACE_OPTIONS = [
  'Decline to self identify',
  'White',
  'Black or African American',
  'Hispanic or Latino',
  'Asian',
  'Native American or Alaska Native',
  'Native Hawaiian or Pacific Islander',
  'Two or more races',
  'Other',
]
const PRONOUNS_OPTIONS = ['He/Him', 'She/Her', 'They/Them', 'He/They', 'She/They', 'Prefer not to say']

export default function Profile() {
  const [activeSection, setActiveSection] = useState('Basics')
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [langInput, setLangInput] = useState('')
  const [credits, setCredits] = useState(0)
  const [imapTest, setImapTest] = useState({ status: '', message: '' })
  const fileRef = useRef()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    // Basics
    first_name: '', last_name: '', email: '', phone: '',
    preferred_name: '',
    salary_min: '', salary_max: '',
    // Education
    degree: "Bachelor's", major: '', school: '', graduation_year: '',
    // Portfolio
    resume_url: '', linkedin: '', portfolio: '', github: '',
    // Location
    work_auth: 'citizen', work_preference: [], address: '', address2: '', city: '', state: '', zip: '', country: 'United States',
    willing_to_relocate: false, relocation_cities: '',
    // Previous Work
    employer: '', job_title: '', years_experience: '', employment_type: 'Full-time',
    people_managed: '', security_clearance: 'None',
    start_date: 'ASAP', notice_period: '2 weeks',
    currently_employed: true, previously_applied: false,
    verify_work_history: true, startup_experience: true, skills: [],
    // Behavioral
    professional_summary: '', work_motivation: '', career_highlight: '',
    greatest_achievement: '', challenging_situation: '', reason_for_leaving: '',
    // Demographic
    gender: 'decline', sexual_orientation: 'decline', pronouns: '',
    race_ethnicity: 'Decline to self identify',
    has_disability: false, is_veteran: false,
    is_student: false, languages: [], vaccinated: true, willing_to_travel: true,
    // Legal
    background_check: true, criminal_history: false, drivers_license: true, drug_test: true,
    // Email Verification
    imap_user: '', imap_pass: '',
  })

  useEffect(() => {
    loadProfile()
    api.get('/jobs/stats').then(r => setCredits(r.data.credits ?? 0)).catch(() => {})
  }, [])

  const normSkills = (arr) => (Array.isArray(arr) ? arr.map(s => typeof s === 'object' && s.name ? s : { name: String(s || ''), level: 'intermediate' }) : [])

  const loadProfile = async () => {
    try {
      const res = await api.get('/profile/')
      const p = res.data
      const nameParts = (p.name || '').split(' ')
      const raw = p.preferences || {}
      const safePrefs = {
        phone: raw.phone || '',
        preferred_name: raw.preferred_name || '',
        salary_min: raw.salary_min || '',
        salary_max: raw.salary_max || '',
        // Education
        degree: raw.degree || "Bachelor's",
        major: raw.major || '',
        school: raw.school || '',
        graduation_year: raw.graduation_year || '',
        // Portfolio
        linkedin: raw.linkedin || '',
        portfolio: raw.portfolio || '',
        github: raw.github || '',
        // Location
        work_auth: raw.work_auth || 'citizen',
        address: raw.address || '',
        address2: raw.address2 || '',
        city: raw.city || '',
        state: raw.state || '',
        zip: raw.zip || '',
        country: raw.country || 'United States',
        work_preference: Array.isArray(raw.work_preference) ? raw.work_preference : raw.work_preference ? [raw.work_preference] : ['remote'],
        willing_to_relocate: raw.willing_to_relocate ?? false,
        relocation_cities: raw.relocation_cities || '',
        // Previous Work
        employer: raw.employer || '',
        job_title: raw.job_title || '',
        years_experience: raw.years_experience || '',
        employment_type: raw.employment_type || 'Full-time',
        people_managed: raw.people_managed || '',
        security_clearance: raw.security_clearance || 'None',
        start_date: raw.start_date || 'ASAP',
        notice_period: raw.notice_period || '2 weeks',
        currently_employed: raw.currently_employed ?? true,
        previously_applied: raw.previously_applied ?? false,
        verify_work_history: raw.verify_work_history ?? true,
        startup_experience: raw.startup_experience ?? true,
        skills: normSkills(raw.skills),
        // Behavioral
        professional_summary: raw.professional_summary || '',
        work_motivation: raw.work_motivation || '',
        career_highlight: raw.career_highlight || '',
        greatest_achievement: raw.greatest_achievement || '',
        challenging_situation: raw.challenging_situation || '',
        reason_for_leaving: raw.reason_for_leaving || '',
        // Demographic
        gender: raw.gender || 'decline',
        sexual_orientation: raw.sexual_orientation || 'decline',
        pronouns: raw.pronouns || '',
        race_ethnicity: raw.race_ethnicity || 'Decline to self identify',
        has_disability: raw.has_disability ?? false,
        is_veteran: raw.is_veteran ?? false,
        is_student: raw.is_student ?? false,
        languages: raw.languages || [],
        vaccinated: raw.vaccinated ?? true,
        willing_to_travel: raw.willing_to_travel ?? true,
        // Legal
        background_check: raw.background_check ?? true,
        criminal_history: raw.criminal_history ?? false,
        drivers_license: raw.drivers_license ?? true,
        drug_test: raw.drug_test ?? true,
        dashboard_filters: raw.dashboard_filters || {},
        // Email Verification
        imap_user: raw.imap_user || '',
        imap_pass: raw.imap_pass || '',
      }
      setProfile(p)
      setForm(prev => ({
        ...prev,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: p.email || '',
        resume_url: p.resume_url || '',
        ...safePrefs
      }))
    } catch {
      navigate('/login')
    }
  }

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const toggleArrayItem = (key, value) => {
    const arr = form[key] || []
    const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
    update(key, next)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage({ text: '', type: '' })
    try {
      const { first_name, last_name, email, resume_url, ...prefs } = form
      await api.put('/profile/', {
        name: `${first_name} ${last_name}`.trim(),
        preferences: prefs
      })
      setMessage({ text: '✓ Profile saved successfully!', type: 'success' })
    } catch (err) {
      setMessage({ text: '✗ Failed to save: ' + (err.response?.data?.detail || 'Unknown error'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndRescore = async () => {
    await handleSave()
    try {
      await api.post('/profile/rescore')
      setMessage({ text: '✓ Profile saved and jobs rescored!', type: 'success' })
    } catch {
      setMessage({ text: '✓ Profile saved (rescore failed)', type: 'success' })
    }
  }

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.post('/profile/resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      update('resume_url', res.data.resume_url)
      setMessage({ text: '✓ Resume uploaded!', type: 'success' })
    } catch {
      setMessage({ text: '✗ Upload failed', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  if (!profile) return <div style={s.loading}>Loading...</div>

  const renderSection = () => {
    switch (activeSection) {

      case 'Basics': return (
        <div style={s.sectionBody}>
          <h2 style={s.sectionTitle}>Basics</h2>
          <div style={s.row}>
            <Field label="First Name" required>
              <input style={s.input} value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="Houman" />
            </Field>
            <Field label="Last Name" required>
              <input style={s.input} value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="Eskandani" />
            </Field>
          </div>
          <Field label="Preferred / Nickname">
            <input style={s.input} value={form.preferred_name} onChange={e => update('preferred_name', e.target.value)} placeholder="If different from legal first name (e.g. Mike instead of Michael)" />
          </Field>
          <Field label="Email" required>
            <input style={{...s.input, background: '#f8f8f8'}} value={form.email} disabled />
          </Field>
          <Field label="Phone number" required>
            <input style={s.input} value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="949-870-0432" />
          </Field>
          <div style={s.salaryBox}>
            <h3 style={s.fieldLabel}>Salary expectations</h3>
            <div style={s.row}>
              <Field label="Minimum (annual)">
                <input style={s.input} value={form.salary_min} onChange={e => update('salary_min', e.target.value)} placeholder="e.g. $120,000" />
              </Field>
              <Field label="Maximum (annual)">
                <input style={s.input} value={form.salary_max} onChange={e => update('salary_max', e.target.value)} placeholder="e.g. $160,000" />
              </Field>
            </div>
          </div>
        </div>
      )

      case 'Education': return (
        <div style={s.sectionBody}>
          <h2 style={s.sectionTitle}>Education</h2>
          <p style={s.sectionSubtitle}>Asked on most applications — fill these so the AI doesn't guess.</p>
          <Field label="Highest degree obtained" required>
            <select style={s.select} value={form.degree} onChange={e => update('degree', e.target.value)}>
              {DEGREE_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
            </select>
          </Field>
          <div style={s.row}>
            <Field label="Field of study / Major">
              <input style={s.input} value={form.major} onChange={e => update('major', e.target.value)} placeholder="Computer Science" />
            </Field>
            <Field label="Graduation year">
              <input style={s.input} value={form.graduation_year} onChange={e => update('graduation_year', e.target.value)} placeholder="2018" />
            </Field>
          </div>
          <Field label="School / University name">
            <input style={s.input} value={form.school} onChange={e => update('school', e.target.value)} placeholder="Cal State Fullerton" />
          </Field>
        </div>
      )

      case 'Portfolio & Links': return (
        <div style={s.sectionBody}>
          <h2 style={s.sectionTitle}>Portfolio & Links</h2>
          <Field label="Resume / CV" required>
            {form.resume_url ? (
              <div style={s.resumeRow}>
                <span style={s.resumeCheck}>✓</span>
                <span style={s.resumeText}>CV Uploaded</span>
                <button style={s.changeBtn} onClick={() => fileRef.current.click()}>{uploading ? 'Uploading...' : 'Change'}</button>
                <a href={form.resume_url} target="_blank" rel="noreferrer" style={s.downloadLink}>Download</a>
              </div>
            ) : (
              <button style={s.uploadBtn} onClick={() => fileRef.current.click()} disabled={uploading}>
                {uploading ? 'Uploading...' : '+ Upload Resume'}
              </button>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} style={{ display: 'none' }} />
          </Field>
          <Field label="LinkedIn URL" required>
            <input style={s.input} value={form.linkedin} onChange={e => update('linkedin', e.target.value)} placeholder="https://linkedin.com/in/yourname" />
          </Field>
          <Field label="GitHub URL">
            <input style={s.input} value={form.github} onChange={e => update('github', e.target.value)} placeholder="https://github.com/yourname" />
          </Field>
          <Field label="Portfolio / personal website">
            <input style={s.input} value={form.portfolio} onChange={e => update('portfolio', e.target.value)} placeholder="https://" />
          </Field>
        </div>
      )

      case 'Location': return (
        <div style={s.sectionBody}>
          <h2 style={s.sectionTitle}>Location</h2>
          <Field label="Work authorization" required>
            <div style={s.authTable}>
              <div style={s.authHeader}>
                <span style={s.authCol1}>Country</span>
                <span style={s.authCol2}>Citizen</span>
                <span style={s.authCol2}>Sponsor Req</span>
                <span style={s.authCol2}>No Sponsor Req</span>
              </div>
              <div style={s.authRow}>
                <span style={s.authCountry}>🇺🇸 United States</span>
                {['citizen', 'sponsor', 'no_sponsor'].map(opt => (
                  <span key={opt} style={s.authCol2}>
                    <input type="radio" name="work_auth" value={opt} checked={form.work_auth === opt} onChange={() => update('work_auth', opt)} />
                  </span>
                ))}
              </div>
            </div>
          </Field>
          <Field label="Work location preference">
            <div style={s.workPrefGrid}>
              {[
                { value: 'remote', label: '🏠 Remote', desc: 'Work from anywhere' },
                { value: 'onsite', label: '🏢 On-site', desc: 'Work from office' },
                { value: 'hybrid', label: '⚡ Hybrid', desc: 'Mix of both' },
              ].map(opt => {
                const selected = (form.work_preference || []).includes(opt.value)
                return (
                  <div key={opt.value} onClick={() => toggleArrayItem('work_preference', opt.value)}
                    style={{...s.workPrefCard, ...(selected ? s.workPrefCardActive : {})}}>
                    <span style={s.workPrefIcon}>{opt.label}</span>
                    <span style={s.workPrefDesc}>{opt.desc}</span>
                    {selected && <span style={s.workPrefCheck}>✓</span>}
                  </div>
                )
              })}
            </div>
          </Field>
          <Field label="Willing to relocate?">
            <YesNo value={form.willing_to_relocate} onChange={v => update('willing_to_relocate', v)} />
          </Field>
          {form.willing_to_relocate && (
            <Field label="Cities / states you'd relocate to">
              <input style={s.input} value={form.relocation_cities} onChange={e => update('relocation_cities', e.target.value)} placeholder="e.g. San Francisco, Seattle, Austin" />
            </Field>
          )}
          <Field label="Street address">
            <input style={s.input} value={form.address} onChange={e => update('address', e.target.value)} placeholder="1951 E Dyer Rd" />
          </Field>
          <Field label="Address line 2">
            <input style={s.input} value={form.address2} onChange={e => update('address2', e.target.value)} placeholder="APT# 345" />
          </Field>
          <div style={s.row}>
            <Field label="City">
              <input style={s.input} value={form.city} onChange={e => update('city', e.target.value)} placeholder="Santa Ana" />
            </Field>
            <Field label="State">
              <input style={s.input} value={form.state} onChange={e => update('state', e.target.value)} placeholder="California" />
            </Field>
          </div>
          <Field label="ZIP code">
            <input style={{...s.input, maxWidth: '200px'}} value={form.zip} onChange={e => update('zip', e.target.value)} placeholder="92705" />
          </Field>
        </div>
      )

      case 'Previous Work': return (
        <div style={s.sectionBody}>
          <h2 style={s.sectionTitle}>Previous Work</h2>
          <div style={s.row}>
            <Field label="Current employer" required>
              <input style={s.input} value={form.employer} onChange={e => update('employer', e.target.value)} placeholder="THE VPORT" />
              <p style={s.hint}>Write "N/A" if unemployed.</p>
            </Field>
            <Field label="Current job title">
              <input style={s.input} value={form.job_title} onChange={e => update('job_title', e.target.value)} placeholder="Software Engineer" />
            </Field>
          </div>
          <div style={s.row}>
            <Field label="Total years of professional experience">
              <input style={{...s.input}} type="number" value={form.years_experience} onChange={e => update('years_experience', e.target.value)} placeholder="7" />
            </Field>
            <Field label="Employment type preference">
              <select style={s.select} value={form.employment_type} onChange={e => update('employment_type', e.target.value)}>
                {EMPLOYMENT_TYPE.map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </Field>
          </div>
          <div style={s.row}>
            <Field label="Are you currently employed?">
              <YesNo value={form.currently_employed} onChange={v => update('currently_employed', v)} />
            </Field>
            <Field label="Notice period">
              <select style={s.select} value={form.notice_period} onChange={e => update('notice_period', e.target.value)}>
                {NOTICE_PERIOD.map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </Field>
          </div>
          <Field label="When can you start?">
            <select style={s.select} value={form.start_date} onChange={e => update('start_date', e.target.value)}>
              {START_DATE.map(opt => <option key={opt}>{opt}</option>)}
            </select>
          </Field>
          <Field label="How many people have you managed?">
            <input style={{...s.input, maxWidth: '200px'}} type="number" value={form.people_managed} onChange={e => update('people_managed', e.target.value)} placeholder="0" />
          </Field>
          <Field label="Security clearance">
            <select style={s.select} value={form.security_clearance} onChange={e => update('security_clearance', e.target.value)}>
              {SECURITY_CLEARANCE.map(opt => <option key={opt}>{opt}</option>)}
            </select>
          </Field>
          <Field label="Startup experience?">
            <YesNo value={form.startup_experience} onChange={v => update('startup_experience', v)} />
          </Field>
          <Field label="Can companies verify your work history?">
            <YesNo value={form.verify_work_history} onChange={v => update('verify_work_history', v)} />
          </Field>
          <Field label="Have you previously applied to a company you're applying to now?">
            <YesNo value={form.previously_applied} onChange={v => update('previously_applied', v)} />
            <p style={s.hint}>Default No — the AI will answer "No" unless told otherwise.</p>
          </Field>
          <Field label="Skills & technologies">
            <SkillInput value={form.skills} onChange={v => update('skills', v)} />
          </Field>
        </div>
      )

      case 'Behavioral': return (
        <div style={s.sectionBody}>
          <h2 style={s.sectionTitle}>Behavioral & Essay Answers</h2>
          <p style={s.sectionSubtitle}>Fill these in your own words. The AI will use them as-is or expand on them when answering open-ended questions.</p>
          <Field label="Professional summary (2–3 sentences about yourself)">
            <textarea style={s.textarea} rows={3} value={form.professional_summary}
              onChange={e => update('professional_summary', e.target.value)}
              placeholder="e.g. Software engineer with 7 years of backend experience in Python and Go. I specialize in building scalable APIs and distributed systems. I'm passionate about clean code and developer tooling." />
          </Field>
          <Field label="Why do you want to work in software / what motivates you?">
            <textarea style={s.textarea} rows={4} value={form.work_motivation}
              onChange={e => update('work_motivation', e.target.value)}
              placeholder="e.g. I enjoy solving complex technical problems and seeing the direct impact of my work on users. I'm motivated by working on products that millions of people rely on every day." />
          </Field>
          <Field label="Career highlight — describe a project you're most proud of">
            <textarea style={s.textarea} rows={5} value={form.career_highlight}
              onChange={e => update('career_highlight', e.target.value)}
              placeholder="Your answer..." />
          </Field>
          <Field label="Greatest achievement">
            <textarea style={s.textarea} rows={4} value={form.greatest_achievement}
              onChange={e => update('greatest_achievement', e.target.value)}
              placeholder="e.g. Led a team of 4 to rebuild our payment processing service from scratch, reducing latency by 60% and eliminating 3 production incidents per month." />
          </Field>
          <Field label="Describe a challenging situation you overcame at work">
            <textarea style={s.textarea} rows={5} value={form.challenging_situation}
              onChange={e => update('challenging_situation', e.target.value)}
              placeholder="Describe a challenging situation..." />
          </Field>
          <Field label="Why are you looking for a new role / leaving your current job?">
            <textarea style={s.textarea} rows={3} value={form.reason_for_leaving}
              onChange={e => update('reason_for_leaving', e.target.value)}
              placeholder="e.g. Looking for a role with more technical scope and impact. My current company is shifting focus away from engineering." />
          </Field>
        </div>
      )

      case 'Demographic': return (
        <div style={s.sectionBody}>
          <h2 style={s.sectionTitle}>Demographic</h2>
          <p style={s.sectionSubtitle}>Used for EEO compliance forms. All optional.</p>
          <Field label="Gender identity">
            <select style={s.select} value={form.gender || 'decline'} onChange={e => update('gender', e.target.value)}>
              <option value="male">Male / Man</option>
              <option value="female">Female / Woman</option>
              <option value="non-binary">Non-binary</option>
              <option value="transgender">Transgender</option>
              <option value="genderqueer">Genderqueer / Gender non-conforming</option>
              <option value="decline">Decline to self identify</option>
            </select>
          </Field>
          <Field label="Pronouns">
            <select style={s.select} value={form.pronouns || ''} onChange={e => update('pronouns', e.target.value)}>
              <option value="">Not specified</option>
              {PRONOUNS_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
            </select>
          </Field>
          <Field label="Sexual orientation">
            <select style={s.select} value={form.sexual_orientation || 'decline'} onChange={e => update('sexual_orientation', e.target.value)}>
              <option value="straight">Straight / Heterosexual</option>
              <option value="gay">Gay or Lesbian</option>
              <option value="bisexual">Bisexual</option>
              <option value="queer">Queer</option>
              <option value="asexual">Asexual</option>
              <option value="other">Other</option>
              <option value="decline">Decline to self identify</option>
            </select>
          </Field>
          <Field label="Race / Ethnicity">
            <select style={s.select} value={form.race_ethnicity || 'Decline to self identify'} onChange={e => update('race_ethnicity', e.target.value)}>
              {RACE_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
            </select>
          </Field>
          <Field label="Do you have a disability?">
            <YesNo value={form.has_disability || false} onChange={v => update('has_disability', v)} />
          </Field>
          <Field label="Are you a veteran?">
            <YesNo value={form.is_veteran || false} onChange={v => update('is_veteran', v)} />
          </Field>
          <Field label="Currently enrolled as a student?">
            <YesNo value={form.is_student} onChange={v => update('is_student', v)} />
          </Field>
          <Field label="Languages spoken">
            <TagInput
              value={form.languages.map(l => typeof l === 'object' ? l.name : l)}
              suggestions={LANGUAGES_LIST}
              input={langInput}
              onInput={setLangInput}
              onAdd={v => {
                const arr = form.languages.map(l => typeof l === 'object' ? l.name : l)
                if (!arr.includes(v)) update('languages', [...arr, v])
              }}
              onRemove={v => update('languages', form.languages.filter(l => (typeof l === 'object' ? l.name : l) !== v))}
              placeholder="Select a language..."
            />
          </Field>
          <Field label="Fully vaccinated for COVID?">
            <YesNo value={form.vaccinated} onChange={v => update('vaccinated', v)} />
          </Field>
          <Field label="Willing to travel for work?">
            <YesNo value={form.willing_to_travel} onChange={v => update('willing_to_travel', v)} />
          </Field>
        </div>
      )

      case 'Legal': return (
        <div style={s.sectionBody}>
          <h2 style={s.sectionTitle}>Legal & Compliance</h2>
          <p style={s.sectionSubtitle}>Asked on most applications. The AI will use these answers directly.</p>
          <Field label="Willing to undergo a background check?">
            <YesNo value={form.background_check} onChange={v => update('background_check', v)} />
          </Field>
          <Field label="Do you have a driver's license?">
            <YesNo value={form.drivers_license} onChange={v => update('drivers_license', v)} />
          </Field>
          <Field label="Willing to take a drug test?">
            <YesNo value={form.drug_test} onChange={v => update('drug_test', v)} />
          </Field>
          <Field label="Do you have any criminal convictions?">
            <YesNo value={form.criminal_history} onChange={v => update('criminal_history', v)} />
            <p style={s.hint}>Default No. Only change if applicable.</p>
          </Field>
        </div>
      )

      case 'Email Verification': return (
        <div style={s.sectionBody}>
          <h2 style={s.sectionTitle}>Email Verification</h2>
          <p style={s.sectionSubtitle}>
            Some job boards (like Greenhouse) send a verification code to your email before submitting.
            The bot reads the code automatically using IMAP. Use a Gmail account with an{' '}
            <strong>App Password</strong> (not your regular password) —{' '}
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{color:'#6d28d9'}}>
              generate one here
            </a>.
          </p>
          <Field label="Gmail address">
            <input
              style={s.input}
              type="email"
              placeholder="you@gmail.com"
              value={form.imap_user}
              onChange={e => update('imap_user', e.target.value)}
            />
          </Field>
          <Field label="Gmail App Password">
            <input
              style={s.input}
              type="password"
              placeholder="xxxx xxxx xxxx xxxx"
              value={form.imap_pass}
              onChange={e => update('imap_pass', e.target.value)}
            />
            <p style={s.hint}>This is stored in your profile and only used to read verification emails. Never shared.</p>
          </Field>
          <button
            style={{...s.saveBtn, marginTop: '8px', width: 'auto', padding: '10px 20px', fontSize: '14px'}}
            onClick={async () => {
              setImapTest({ status: 'loading', message: '' })
              try {
                const r = await api.post('/profile/test-imap')
                setImapTest({ status: 'ok', message: r.data.message })
              } catch (err) {
                setImapTest({ status: 'error', message: err.response?.data?.detail || 'Connection failed' })
              }
            }}
          >
            {imapTest.status === 'loading' ? '⏳ Testing...' : '🔌 Test Connection'}
          </button>
          {imapTest.message && (
            <p style={{ marginTop: '10px', fontSize: '13px', color: imapTest.status === 'ok' ? '#16a34a' : '#dc2626', fontWeight: '500' }}>
              {imapTest.message}
            </p>
          )}
        </div>
      )

      default: return null
    }
  }

  return (
    <div style={s.page}>
      <Navbar credits={credits} />
      <div style={s.container}>
        <div style={s.sidebar}>
          {SECTIONS.map(sec => (
            <button key={sec} onClick={() => setActiveSection(sec)}
              style={{...s.sideItem, ...(activeSection === sec ? s.sideItemActive : {})}}>
              {sec}
            </button>
          ))}
        </div>
        <div style={s.main}>
          {message.text && (
            <div style={{...s.message, background: message.type === 'success' ? '#f0fdf4' : '#fef2f2', color: message.type === 'success' ? '#15803d' : '#dc2626', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`}}>
              {message.text}
            </div>
          )}
          <div style={s.card}>{renderSection()}</div>
          <div style={s.saveRow}>
            <button style={s.saveBtn} onClick={handleSaveAndRescore} disabled={saving}>
              {saving ? 'Saving...' : '✓ Save & Rescore Jobs'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <label style={fS.label}>{label} {required && <span style={fS.req}>ⓘ</span>}</label>
      {children}
    </div>
  )
}

function YesNo({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      {[true, false].map(v => (
        <label key={String(v)} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
          <input type="checkbox" checked={value === v} onChange={() => onChange(v)}
            style={{ width: '16px', height: '16px', accentColor: '#2563eb' }} />
          {v ? 'Yes' : 'No'}
        </label>
      ))}
    </div>
  )
}

function SkillInput({ value, onChange }) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const LEVELS = ['beginner', 'intermediate', 'professional']
  const COLORS = { beginner: '#fef9c3', intermediate: '#dbeafe', professional: '#dcfce7' }
  const TEXT_COLORS = { beginner: '#854d0e', intermediate: '#1e40af', professional: '#15803d' }

  const normalized = (value || []).map(v => typeof v === 'object' && v.name ? v : { name: String(v || ''), level: 'intermediate' })
  const filtered = SKILLS_LIST.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !normalized.find(v => v.name === s))

  return (
    <div>
      {normalized.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={skS.tableHeader}>
            <span style={skS.nameCol}>Skill</span>
            <span style={skS.levelCol}>Beginner</span>
            <span style={skS.levelCol}>Intermediate</span>
            <span style={skS.levelCol}>Professional</span>
            <span style={{ width: '24px' }} />
          </div>
          {normalized.map(skill => (
            <div key={skill.name} style={skS.tableRow}>
              <span style={skS.nameCol}>
                <span style={{...skS.badge, background: COLORS[skill.level] || COLORS.intermediate, color: TEXT_COLORS[skill.level] || TEXT_COLORS.intermediate}}>
                  {skill.name}
                </span>
              </span>
              {LEVELS.map(level => (
                <span key={level} style={skS.levelCol}>
                  <input type="radio" name={`skill-${skill.name}`} checked={skill.level === level}
                    onChange={() => onChange(normalized.map(v => v.name === skill.name ? { ...v, level } : v))}
                    style={{ accentColor: '#2563eb', width: '16px', height: '16px' }} />
                </span>
              ))}
              <button style={skS.removeBtn} onClick={() => onChange(normalized.filter(v => v.name !== skill.name))} type="button">✕</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <input style={s.input} value={input}
          onChange={e => { setInput(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search and add a skill..." />
        {open && filtered.length > 0 && (
          <div style={tS.dropdown}>
            {filtered.slice(0, 8).map(s => (
              <div key={s} style={tS.option} onMouseDown={() => { onChange([...normalized, { name: s, level: 'intermediate' }]); setInput(''); setOpen(false) }}>
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TagInput({ value, suggestions, input, onInput, onAdd, onRemove, placeholder }) {
  const [open, setOpen] = useState(false)
  const filtered = suggestions.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s))
  return (
    <div style={tS.wrap}>
      <div style={tS.box}>
        {value.map(v => (
          <span key={v} style={tS.tag}>{v} <button style={tS.removeBtn} onClick={() => onRemove(v)}>✕</button></span>
        ))}
        <input style={tS.input} value={input}
          onChange={e => { onInput(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={value.length === 0 ? placeholder : ''} />
      </div>
      {open && filtered.length > 0 && (
        <div style={tS.dropdown}>
          {filtered.slice(0, 8).map(s => (
            <div key={s} style={tS.option} onMouseDown={() => { onAdd(s); onInput('') }}>{s}</div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'transparent' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#888' },
  container: { maxWidth: '960px', margin: '0 auto', padding: '32px 16px', display: 'flex', gap: '24px' },
  sidebar: { width: '200px', flexShrink: 0 },
  sideItem: { display: 'block', width: '100%', padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'none', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: '#555', cursor: 'pointer', marginBottom: '4px' },
  sideItemActive: { background: '#fff', color: '#111', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  main: { flex: 1 },
  card: { background: '#fff', borderRadius: '16px', padding: '32px', border: '1px solid #e8e8e8', marginBottom: '16px' },
  sectionBody: {},
  sectionTitle: { fontSize: '24px', fontWeight: '700', marginBottom: '24px', color: '#111' },
  sectionSubtitle: { fontSize: '13px', color: '#888', marginBottom: '20px', marginTop: '-16px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  input: { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e0e0e0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e0e0e0', fontSize: '14px', outline: 'none', background: '#fff' },
  textarea: { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e0e0e0', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' },
  fieldLabel: { fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '12px' },
  hint: { fontSize: '12px', color: '#888', marginTop: '6px' },
  salaryBox: { background: '#f9f9f9', borderRadius: '12px', padding: '20px', marginTop: '8px' },
  resumeRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
  resumeCheck: { color: '#16a34a', fontSize: '18px' },
  resumeText: { fontSize: '14px', fontWeight: '500' },
  changeBtn: { padding: '6px 14px', borderRadius: '8px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '13px', cursor: 'pointer' },
  downloadLink: { fontSize: '13px', color: '#2563eb', textDecoration: 'underline' },
  uploadBtn: { padding: '10px 20px', borderRadius: '10px', border: '2px dashed #ddd', background: '#fafafa', fontSize: '14px', color: '#555', cursor: 'pointer' },
  authTable: { border: '1px solid #e8e8e8', borderRadius: '10px', overflow: 'hidden' },
  authHeader: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 16px', background: '#f8f8f8', fontSize: '13px', fontWeight: '600', color: '#555' },
  authRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 16px', alignItems: 'center' },
  authCountry: { fontSize: '14px', fontWeight: '500' },
  authCol1: {}, authCol2: { textAlign: 'center' },
  workPrefGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
  workPrefCard: { padding: '16px', borderRadius: '12px', border: '2px solid #e8e8e8', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', transition: 'all 0.15s' },
  workPrefCardActive: { border: '2px solid #111', background: '#f8f8f8' },
  workPrefIcon: { fontSize: '15px', fontWeight: '600', color: '#111' },
  workPrefDesc: { fontSize: '12px', color: '#888' },
  workPrefCheck: { position: 'absolute', top: '10px', right: '12px', color: '#111', fontWeight: '700' },
  message: { padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '14px' },
  saveRow: { display: 'flex', justifyContent: 'flex-end' },
  saveBtn: { background: '#111', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
}
const fS = {
  label: { display: 'block', fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '8px' },
  req: { color: '#f97316', fontSize: '13px', marginLeft: '4px' },
}
const skS = {
  tableHeader: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 24px', padding: '8px 12px', background: '#f8f8f8', borderRadius: '8px 8px 0 0', border: '1px solid #e8e8e8', fontSize: '12px', fontWeight: '600', color: '#666', textAlign: 'center' },
  tableRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 24px', padding: '10px 12px', border: '1px solid #e8e8e8', borderTop: 'none', alignItems: 'center', textAlign: 'center' },
  nameCol: { textAlign: 'left' },
  levelCol: { display: 'flex', justifyContent: 'center', alignItems: 'center' },
  badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '500' },
  removeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '12px', padding: '0' },
}
const tS = {
  wrap: { position: 'relative' },
  box: { display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '10px', minHeight: '46px', alignItems: 'center' },
  tag: { background: '#f0f0f0', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' },
  removeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '11px', padding: '0' },
  input: { border: 'none', outline: 'none', fontSize: '14px', flex: 1, minWidth: '120px' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e0e0e0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, marginTop: '4px' },
  option: { padding: '10px 14px', fontSize: '14px', cursor: 'pointer', color: '#333' },
}
