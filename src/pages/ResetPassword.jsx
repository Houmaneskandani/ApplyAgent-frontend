import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'
import ApplyAgentLogo from '../components/Logo'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/reset-password', {
        email,
        code,
        new_password: newPassword,
      })
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password')
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
        <h2 style={styles.title}>Enter your reset code</h2>

        {done ? (
          <p style={styles.success}>Password updated! Redirecting to login...</p>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              style={styles.input}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              style={{ ...styles.input, letterSpacing: '0.2em', fontSize: '20px', textAlign: 'center' }}
              type="text"
              placeholder="6-digit code"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
            />
            <input
              style={styles.input}
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} type="submit" disabled={loading || code.length < 6}>
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}

        <p style={styles.link}>
          <Link to="/forgot-password">Resend code</Link>
          {' · '}
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
  title: { margin: '0 0 24px 0', fontSize: '20px', color: '#1E1B4B', fontWeight: 700 },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  input: {
    padding: '13px 16px', borderRadius: '10px',
    border: '1.5px solid #E8E5FF', fontSize: '14px',
    outline: 'none', color: '#1E1B4B',
  },
  button: {
    padding: '14px', borderRadius: '10px',
    background: '#4F46E5', color: '#fff',
    border: 'none', fontSize: '15px',
    fontWeight: '700', cursor: 'pointer',
    marginTop: '4px',
    opacity: 1,
  },
  error: { color: '#dc2626', fontSize: '13px', margin: 0 },
  success: { color: '#16a34a', fontSize: '15px', fontWeight: 600 },
  link: { textAlign: 'center', marginTop: '22px', color: '#8B85C1', fontSize: '14px' },
}
