import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'
import ApplyAgentLogo from '../components/Logo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('name', res.data.name)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.container}>
      {/* Left decorative panel */}
      <div style={s.left}>
        <div style={s.blob1} />
        <div style={s.blob2} />
        <div style={s.leftContent}>
          <ApplyAgentLogo height={44} variant="dark" />
          <p style={s.tagline}>Apply smarter.<br />Get hired faster.</p>
          <div style={s.features}>
            <div style={s.feature}><span style={s.featureDot} />AI-powered job matching</div>
            <div style={s.feature}><span style={s.featureDot} />Automated applications</div>
            <div style={s.feature}><span style={s.featureDot} />Real-time notifications</div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={s.right}>
        <div style={s.formBox}>
          <div className="fade-in">
            <h2 style={s.title}>Welcome back</h2>
            <p style={s.subtitle}>Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} style={s.form}>
            <div className="fade-in-1" style={s.field}>
              <label style={s.label}>Email address</label>
              <input
                style={s.input}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="fade-in-2" style={s.field}>
              <label style={s.label}>Password</label>
              <input
                style={s.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="fade-in" style={s.error}>⚠ {error}</div>
            )}
            <button className="fade-in-3" style={s.btn} type="submit" disabled={loading}>
              {loading
                ? <span style={s.btnInner}><span style={s.spinner} />Signing in...</span>
                : <span style={s.btnInner}>Sign In →</span>}
            </button>
          </form>

          <div className="fade-in-4" style={s.footer}>
            <p style={s.footerLink}>
              <Link to="/forgot-password" style={s.link}>Forgot password?</Link>
            </p>
            <p style={s.footerLink}>
              No account? <Link to="/signup" style={s.link}>Sign up free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  container: { minHeight: '100vh', display: 'flex' },

  left: {
    width: '42%',
    background: 'linear-gradient(145deg, #3730a3 0%, #6d28d9 50%, #9333ea 100%)',
    backgroundSize: '200% 200%',
    animation: 'gradientShift 10s ease infinite',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', top: '-100px', left: '-80px',
    width: '360px', height: '360px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
  },
  blob2: {
    position: 'absolute', bottom: '-80px', right: '-60px',
    width: '280px', height: '280px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
  },
  leftContent: { position: 'relative', zIndex: 1, padding: '48px' },
  tagline: {
    fontSize: '24px', fontWeight: '300', color: 'rgba(255,255,255,0.9)',
    lineHeight: 1.5, margin: '28px 0 40px',
  },
  features: { display: 'flex', flexDirection: 'column', gap: '14px' },
  feature: {
    display: 'flex', alignItems: 'center', gap: '10px',
    color: 'rgba(255,255,255,0.85)', fontSize: '15px',
  },
  featureDot: {
    width: '8px', height: '8px', borderRadius: '50%',
    background: '#a5b4fc', flexShrink: 0, display: 'inline-block',
  },

  right: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#fff', padding: '40px 24px',
  },
  formBox: { width: '100%', maxWidth: '400px' },
  title: {
    fontSize: '28px', fontWeight: '800', color: '#1e1b4b',
    letterSpacing: '-0.5px', marginBottom: '6px',
  },
  subtitle: { fontSize: '15px', color: '#6b7280', marginBottom: '32px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#374151', letterSpacing: '0.01em' },
  input: {
    padding: '13px 16px', borderRadius: '10px',
    border: '1.5px solid #e5e7eb', fontSize: '14px',
    color: '#1f2937', background: '#fafafa',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  error: {
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626',
  },
  btn: {
    padding: '14px', borderRadius: '10px',
    background: 'linear-gradient(135deg, #9333ea, #6d28d9)',
    color: '#fff', border: 'none', fontSize: '15px', fontWeight: '700',
    boxShadow: '0 4px 14px rgba(109,40,217,0.35)', marginTop: '4px',
  },
  btnInner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  spinner: {
    width: '15px', height: '15px', borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    display: 'inline-block', animation: 'spin 0.7s linear infinite',
  },
  footer: { marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '10px' },
  footerLink: { textAlign: 'center', fontSize: '14px', color: '#6b7280' },
  link: { color: '#7c3aed', fontWeight: '600' },
}
