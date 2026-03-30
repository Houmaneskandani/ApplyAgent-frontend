import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'
import ApplyAgentLogo from '../components/Logo'

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/signup', form)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('name', res.data.name)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed')
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
          <p style={s.tagline}>Your AI-powered<br />job hunting partner.</p>
          <div style={s.statsRow}>
            <div style={s.statBox}>
              <div style={s.statNum}>10x</div>
              <div style={s.statLabel}>Faster applying</div>
            </div>
            <div style={s.statBox}>
              <div style={s.statNum}>24/7</div>
              <div style={s.statLabel}>Always watching</div>
            </div>
            <div style={s.statBox}>
              <div style={s.statNum}>AI</div>
              <div style={s.statLabel}>Smart matching</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={s.right}>
        <div style={s.formBox}>
          <div className="fade-in">
            <h2 style={s.title}>Create your account</h2>
            <p style={s.subtitle}>Start applying smarter — it's free</p>
          </div>

          <form onSubmit={handleSubmit} style={s.form}>
            <div className="fade-in-1" style={s.field}>
              <label style={s.label}>Full name</label>
              <input
                style={s.input}
                placeholder="Jane Smith"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="fade-in-2" style={s.field}>
              <label style={s.label}>Email address</label>
              <input
                style={s.input}
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="fade-in-3" style={s.field}>
              <label style={s.label}>Password</label>
              <input
                style={s.input}
                type="password"
                placeholder="Create a strong password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            {error && (
              <div className="fade-in" style={s.error}>⚠ {error}</div>
            )}
            <button className="fade-in-4" style={s.btn} type="submit" disabled={loading}>
              {loading
                ? <span style={s.btnInner}><span style={s.spinner} />Creating account...</span>
                : <span style={s.btnInner}>Get started free →</span>}
            </button>
          </form>

          <p className="fade-in-4" style={s.footerLink}>
            Already have an account? <Link to="/login" style={s.link}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const s = {
  container: { minHeight: '100vh', display: 'flex' },

  left: {
    width: '42%',
    background: 'linear-gradient(145deg, #3730a3 0%, #7c3aed 50%, #a855f7 100%)',
    backgroundSize: '200% 200%',
    animation: 'gradientShift 10s ease infinite',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', top: '-80px', right: '-60px',
    width: '340px', height: '340px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
  },
  blob2: {
    position: 'absolute', bottom: '-80px', left: '-80px',
    width: '300px', height: '300px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
  },
  leftContent: { position: 'relative', zIndex: 1, padding: '48px' },
  tagline: {
    fontSize: '24px', fontWeight: '300', color: 'rgba(255,255,255,0.9)',
    lineHeight: 1.5, margin: '28px 0 40px',
  },
  statsRow: { display: 'flex', gap: '12px' },
  statBox: {
    flex: 1, background: 'rgba(255,255,255,0.15)',
    borderRadius: '12px', padding: '16px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.2)',
    backdropFilter: 'blur(8px)',
  },
  statNum: { fontSize: '22px', fontWeight: '800', color: '#fff', marginBottom: '4px' },
  statLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

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
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
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
  footerLink: { textAlign: 'center', marginTop: '28px', fontSize: '14px', color: '#6b7280' },
  link: { color: '#7c3aed', fontWeight: '600' },
}
