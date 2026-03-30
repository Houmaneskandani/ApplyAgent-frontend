import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import ApplyAgentLogo from '../components/Logo'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ marginBottom: '28px' }}>
          <ApplyAgentLogo height={40} variant="light" />
        </div>
        <h2 style={styles.title}>Reset your password</h2>

        {sent ? (
          <div>
            <p style={styles.success}>
              If an account exists for <strong>{email}</strong>, a 6-digit reset code has been sent.
            </p>
            <p style={styles.hint}>Check your terminal (until Twilio is configured).</p>
            <Link to={`/reset-password?email=${encodeURIComponent(email)}`} style={styles.button}>
              Enter reset code
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <p style={styles.subtitle}>Enter your email and we'll send you a reset code.</p>
            <input
              style={styles.input}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset code'}
            </button>
          </form>
        )}

        <p style={styles.link}>
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
  },
  card: {
    background: '#fff',
    padding: '44px',
    borderRadius: '20px',
    width: '380px',
    boxShadow: '0 20px 60px rgba(79,70,229,0.25)',
  },
  title: { margin: '0 0 8px 0', fontSize: '20px', color: '#1E1B4B', fontWeight: 700 },
  subtitle: { color: '#8B85C1', fontSize: '14px', margin: '0 0 20px 0' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  input: {
    padding: '13px 16px', borderRadius: '10px',
    border: '1.5px solid #E8E5FF', fontSize: '14px',
    outline: 'none', color: '#1E1B4B',
  },
  button: {
    display: 'block', textAlign: 'center', textDecoration: 'none',
    padding: '14px', borderRadius: '10px',
    background: '#4F46E5', color: '#fff',
    border: 'none', fontSize: '15px',
    fontWeight: '700', cursor: 'pointer',
    marginTop: '4px',
  },
  error: { color: '#dc2626', fontSize: '13px', margin: 0 },
  success: { color: '#1E1B4B', fontSize: '14px', marginBottom: '8px' },
  hint: { color: '#8B85C1', fontSize: '13px', marginBottom: '20px' },
  link: { textAlign: 'center', marginTop: '22px', color: '#8B85C1', fontSize: '14px' },
}
