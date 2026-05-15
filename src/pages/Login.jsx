import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import api from '../api'
import ApplyAgentLogo from '../components/Logo'
import useIsMobile from '../hooks/useIsMobile'
import usePublicStats from '../hooks/usePublicStats'
import Button from '../ui/Button'
import Stat from '../ui/Stat'
import TrustBadge from '../ui/TrustBadge'
import AgentActivity from '../ui/AgentActivity'
import { colors, gradients, radii, shadows, text } from '../theme'

// Whitelist what's allowed in the `next` redirect — we MUST NOT allow an
// open redirect to an external URL after login (phishing risk).
function safeNext(raw) {
  if (!raw) return '/dashboard'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  if (/^\/(login|signup|forgot-password|reset-password)/.test(raw)) return '/dashboard'
  return raw
}

export default function Login() {
  const isMobile = useIsMobile()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { stats, loading: statsLoading } = usePublicStats()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('name', res.data.name)
      navigate(safeNext(searchParams.get('next')))
    } catch (err) {
      const status = err.response?.status
      if (status === 429) {
        setError('Too many login attempts. Please wait a minute and try again.')
      } else {
        setError(err.response?.data?.detail || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.container}>
      {/* Left hero panel — hidden on mobile */}
      {!isMobile && <HeroPanel stats={stats} statsLoading={statsLoading} />}

      {/* Right form panel */}
      <div style={{ ...s.right, padding: isMobile ? '32px 20px' : '48px 32px' }}>
        <div style={{ ...s.formBox, maxWidth: isMobile ? '100%' : '420px' }}>
          {isMobile && (
            <div style={{ marginBottom: 28 }}>
              <ApplyAgentLogo height={36} />
            </div>
          )}

          <div className="fade-in">
            <h1 style={s.title}>Welcome back</h1>
            <p style={s.subtitle}>Sign in — your agent is waiting.</p>
          </div>

          <form onSubmit={handleSubmit} style={s.form} autoComplete="on">
            <div className="fade-in-1" style={s.field}>
              <label style={s.label} htmlFor="email">Email address</label>
              <input
                id="email"
                style={s.input}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="fade-in-2" style={s.field}>
              <label style={s.label} htmlFor="password">Password</label>
              <input
                id="password"
                style={s.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <div className="fade-in" role="alert" style={s.error}>
                <span aria-hidden="true">⚠</span> {error}
              </div>
            )}
            <div className="fade-in-3">
              <Button type="submit" size="lg" fullWidth loading={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </form>

          <div className="fade-in-4" style={s.footer}>
            <p style={s.footerLink}>
              <Link to="/forgot-password" style={s.link}>Forgot password?</Link>
            </p>
            <p style={s.footerLink}>
              No account? <Link to="/signup" style={s.link}>Sign up free</Link>
            </p>
          </div>

          {/* Trust strip — visible on every viewport for credibility */}
          <div style={s.trustStrip} className="fade-in-4">
            <TrustBadge icon="🔒" label="Encrypted at rest" />
            <TrustBadge icon="✓" label="No spam, ever" />
            <TrustBadge icon="↺" label="Cancel anytime" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Hero panel (left side, desktop only)
// ────────────────────────────────────────────────────────────────────
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
            Your <span style={s.heroAccent}>job-applying agent</span>,
            <br />on autopilot.
          </h2>
          <p style={s.heroSub}>
            Match. Apply. Track. Your AI agent fills the forms while you focus on the interviews.
          </p>
        </div>

        {/* Live agent preview — idle state so visitors see what the product feels like. */}
        <div style={{ marginBottom: 28 }}>
          <AgentActivity queue={[]} stats={stats || { applied: stats?.applications_submitted || 0 }} />
        </div>

        {/* Trust stats */}
        <div style={s.statGrid}>
          <Stat
            value={stats?.applications_submitted}
            label="Applications sent"
            loading={statsLoading || stats?.applications_submitted == null}
            size="sm"
            align="left"
            style={statStyle}
          />
          <Stat
            value={stats?.jobs_indexed}
            label="Jobs indexed"
            loading={statsLoading || stats?.jobs_indexed == null}
            size="sm"
            align="left"
            style={statStyle}
          />
          <Stat
            value={stats?.success_rate_7d_pct}
            label="7-day success rate"
            suffix={stats?.success_rate_7d_pct != null ? '%' : ''}
            loading={statsLoading || stats?.success_rate_7d_pct == null}
            size="sm"
            align="left"
            style={statStyle}
          />
        </div>

        {/* Feature checklist */}
        <ul style={s.features}>
          {[
            { icon: '🎯', text: 'AI-matched to your resume — no junk applications' },
            { icon: '🤖', text: 'Auto-fills Greenhouse, Lever, Ashby, Workday, and more' },
            { icon: '🛡️', text: 'Solves CAPTCHAs, retries failures, never lies about results' },
            { icon: '⚡', text: 'Real-time progress — watch your agent work' },
          ].map((f) => (
            <li key={f.text} style={s.feature}>
              <span style={s.featureIcon} aria-hidden="true">{f.icon}</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────
const statStyle = {
  background: 'rgba(255,255,255,0.10)',
  padding: '14px 16px',
  borderRadius: radii.md,
  border: '1px solid rgba(255,255,255,0.18)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
}

const s = {
  container: { minHeight: '100vh', display: 'flex', background: colors.surface },

  // ── Left hero (desktop only) ─────────────────────────────────────
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
    position: 'absolute', top: '-12%', left: '-8%',
    width: 420, height: 420, borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)', filter: 'blur(40px)',
  },
  blob2: {
    position: 'absolute', bottom: '-10%', right: '-8%',
    width: 320, height: 320, borderRadius: '50%',
    background: 'rgba(168, 85, 247, 0.25)', filter: 'blur(50px)',
  },
  blob3: {
    position: 'absolute', top: '35%', right: '20%',
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
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginBottom: 28,
  },
  features: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
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

  // ── Right form panel ─────────────────────────────────────────────
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
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    letterSpacing: '0.01em',
  },
  input: {
    padding: '13px 16px',
    borderRadius: radii.md,
    border: `1.5px solid ${colors.border}`,
    fontSize: 14,
    color: colors.textPrimary,
    background: '#FAFAFF',
    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
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
  footer: { marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 },
  footerLink: { textAlign: 'center', fontSize: 14, color: colors.textMuted },
  link: { color: colors.brandAccent, fontWeight: 600 },
  trustStrip: {
    marginTop: 28,
    paddingTop: 22,
    borderTop: `1px solid ${colors.border}`,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
}
