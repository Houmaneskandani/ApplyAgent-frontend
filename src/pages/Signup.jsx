import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'
import ApplyAgentLogo from '../components/Logo'
import useIsMobile from '../hooks/useIsMobile'
import usePublicStats from '../hooks/usePublicStats'
import Button from '../ui/Button'
import Stat from '../ui/Stat'
import TrustBadge from '../ui/TrustBadge'
import { colors, gradients, radii, text } from '../theme'

// Lightweight client-side password strength feedback. The backend still
// validates and enforces; this is purely UX so users can self-correct.
function scorePassword(pw) {
  if (!pw) return { score: 0, label: 'Enter a password', color: colors.textMuted }
  if (pw.length < 8) return { score: 1, label: 'Too short — use 8+ characters', color: colors.danger }
  let s = 1
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (pw.length >= 14) s++
  const labels = ['', 'Weak', 'Okay', 'Good', 'Strong', 'Excellent']
  const colorsByScore = [colors.textMuted, colors.danger, colors.warning, colors.brandAccent, colors.success, colors.success]
  return { score: s, label: labels[s], color: colorsByScore[s] }
}

export default function Signup() {
  const isMobile = useIsMobile()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { stats, loading: statsLoading } = usePublicStats()
  const pw = scorePassword(form.password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/signup', form)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('name', res.data.name)
      // Analytics: attach this anonymous session to a person, then fire
      // the funnel event. The order matters — identify first so the
      // signup_completed event is attributed to the right user_id.
      const { identifyUser, track } = await import('../lib/analytics')
      identifyUser({ user_id: res.data.user_id, email: form.email, name: form.name })
      track('signup_completed', { method: 'email' })
      navigate('/dashboard')
    } catch (err) {
      const status = err.response?.status
      if (status === 429) {
        setError('Too many attempts. Please wait a minute and try again.')
      } else {
        setError(err.response?.data?.detail || 'Signup failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.container}>
      {!isMobile && <HeroPanel stats={stats} statsLoading={statsLoading} />}

      <div style={{ ...s.right, padding: isMobile ? '32px 20px' : '48px 32px' }}>
        <div style={{ ...s.formBox, maxWidth: isMobile ? '100%' : '420px' }}>
          {isMobile && (
            <div style={{ marginBottom: 28 }}>
              <ApplyAgentLogo height={36} />
            </div>
          )}

          <div className="fade-in">
            <h1 style={s.title}>Create your account</h1>
            <p style={s.subtitle}>Start applying smarter — 100 credits free, no card required.</p>
          </div>

          <form onSubmit={handleSubmit} style={s.form} autoComplete="on">
            <div className="fade-in-1" style={s.field}>
              <label style={s.label} htmlFor="name">Full name</label>
              <input
                id="name"
                style={s.input}
                placeholder="Jane Smith"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                autoComplete="name"
                required
              />
            </div>
            <div className="fade-in-2" style={s.field}>
              <label style={s.label} htmlFor="email">Email address</label>
              <input
                id="email"
                style={s.input}
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
                required
              />
            </div>
            <div className="fade-in-3" style={s.field}>
              <label style={s.label} htmlFor="password">Password</label>
              <input
                id="password"
                style={s.input}
                type="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                minLength={8}
                required
              />
              {/* Strength meter */}
              <div style={s.strengthRow}>
                <div style={s.strengthTrack}>
                  <div style={{
                    ...s.strengthFill,
                    width: `${(pw.score / 5) * 100}%`,
                    background: pw.color,
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: pw.color }}>{pw.label}</span>
              </div>
            </div>
            {error && (
              <div className="fade-in" role="alert" style={s.error}>
                <span aria-hidden="true">⚠</span> {error}
              </div>
            )}
            <div className="fade-in-4">
              <Button type="submit" size="lg" fullWidth loading={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </div>
            <p style={s.legal}>
              By signing up, you agree to our{' '}
              <a href="#" style={s.link}>Terms</a> and{' '}
              <a href="#" style={s.link}>Privacy Policy</a>.
            </p>
          </form>

          <p className="fade-in-4" style={s.footerLink}>
            Already have an account? <Link to="/login" style={s.link}>Sign in</Link>
          </p>

          <div style={s.trustStrip} className="fade-in-4">
            <TrustBadge icon="🎁" label="100 free credits" />
            <TrustBadge icon="🔒" label="Encrypted at rest" />
            <TrustBadge icon="✓" label="No card required" />
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroPanel({ stats, statsLoading }) {
  return (
    <div style={s.left}>
      <div style={s.heroBlobs} aria-hidden="true">
        <div style={s.blob1} />
        <div style={s.blob2} />
        <div style={s.blob3} />
      </div>

      <div style={s.leftContent}>
        <ApplyAgentLogo height={42} variant="dark" />

        <div style={{ marginTop: 36, marginBottom: 28 }}>
          <h2 style={s.heroTitle}>
            Hire your <span style={s.heroAccent}>AI job-applying agent</span>
          </h2>
          <p style={s.heroSub}>
            Stop spending nights pasting your resume into the same forms. Your agent does it
            for you — and tells you the truth about every result.
          </p>
        </div>

        <div style={s.statGrid}>
          <Stat
            value={stats?.applications_submitted}
            label="Applications sent"
            loading={statsLoading || stats?.applications_submitted == null}
            size="md"
            align="left"
            style={statStyle}
          />
          <Stat
            value={stats?.jobs_indexed}
            label="Live jobs indexed"
            loading={statsLoading || stats?.jobs_indexed == null}
            size="md"
            align="left"
            style={statStyle}
          />
        </div>

        <ul style={s.features}>
          {[
            { icon: '🎯', text: 'Scores every posting against your resume — only good fits get queued.' },
            { icon: '🤖', text: 'Supports Greenhouse, Lever, Ashby, Workday, SmartRecruiters + generic forms.' },
            { icon: '🛡️', text: 'Solves CAPTCHAs, retries failures, never silently lies about results.' },
            { icon: '💳', text: 'Pay-as-you-go credits — applies are 0.4 credits each, $4.99 starter.' },
          ].map((f) => (
            <li key={f.text} style={s.feature}>
              <span style={s.featureIcon} aria-hidden="true">{f.icon}</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>

        {/* Trust micro-strip on dark hero */}
        <div style={s.heroTrustRow}>
          <span style={s.heroTrustItem}>🔒 SSL · Fernet encrypted</span>
          <span style={s.heroDot}>·</span>
          <span style={s.heroTrustItem}>Stripe-secured payments</span>
          <span style={s.heroDot}>·</span>
          <span style={s.heroTrustItem}>Cancel anytime</span>
        </div>
      </div>
    </div>
  )
}

const statStyle = {
  background: 'rgba(255,255,255,0.10)',
  padding: '16px 18px',
  borderRadius: radii.md,
  border: '1px solid rgba(255,255,255,0.18)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
}

const s = {
  container: { minHeight: '100vh', display: 'flex', background: colors.surface },

  left: {
    width: '46%',
    background: gradients.hero,
    backgroundSize: '200% 200%',
    animation: 'gradientShift 14s ease infinite',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    color: colors.textOnDark,
  },
  heroBlobs: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  blob1: {
    position: 'absolute', top: '-10%', right: '-8%',
    width: 420, height: 420, borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)', filter: 'blur(40px)',
  },
  blob2: {
    position: 'absolute', bottom: '-12%', left: '-10%',
    width: 360, height: 360, borderRadius: '50%',
    background: 'rgba(168, 85, 247, 0.25)', filter: 'blur(50px)',
  },
  blob3: {
    position: 'absolute', top: '40%', left: '15%',
    width: 220, height: 220, borderRadius: '50%',
    background: 'rgba(255,255,255,0.10)', filter: 'blur(30px)',
  },
  leftContent: {
    position: 'relative',
    zIndex: 1,
    padding: '56px 48px',
    maxWidth: 520,
    width: '100%',
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
    color: colors.textOnDark,
  },
  heroAccent: {
    background: 'linear-gradient(90deg, #FDE68A 0%, #FBCFE8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 14,
    lineHeight: 1.55,
    maxWidth: 460,
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
    marginBottom: 28,
  },
  features: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    marginBottom: 28,
  },
  feature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14.5,
    lineHeight: 1.45,
  },
  featureIcon: {
    width: 28, height: 28,
    flexShrink: 0,
    background: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
  },
  heroTrustRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingTop: 18,
    borderTop: '1px solid rgba(255,255,255,0.18)',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12.5,
    fontWeight: 500,
  },
  heroTrustItem: { whiteSpace: 'nowrap' },
  heroDot: { opacity: 0.4 },

  // Right form
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.surface,
  },
  formBox: { width: '100%' },
  title: {
    ...text.h1,
    fontSize: 30,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 32,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: {
    padding: '13px 16px',
    borderRadius: radii.md,
    border: `1.5px solid ${colors.border}`,
    fontSize: 14,
    color: colors.textPrimary,
    background: '#FAFAFF',
    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
  },
  strengthRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    background: '#F3F4F6',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.25s ease, background 0.25s ease',
  },
  error: {
    background: colors.dangerSoft,
    border: `1px solid ${colors.dangerBorder}`,
    borderRadius: radii.sm,
    padding: '10px 14px',
    fontSize: 13,
    color: colors.danger,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  legal: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 1.5,
  },
  footerLink: {
    textAlign: 'center',
    marginTop: 22,
    fontSize: 14,
    color: colors.textMuted,
  },
  link: { color: colors.brandAccent, fontWeight: 600 },
  trustStrip: {
    marginTop: 24,
    paddingTop: 22,
    borderTop: `1px solid ${colors.border}`,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
}
