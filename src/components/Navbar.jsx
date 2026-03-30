import { Link, useLocation, useNavigate } from 'react-router-dom'
import ApplyAgentLogo from './Logo'
import { useState, useRef, useCallback } from 'react'

function SlideToLogout({ name, onLogout }) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [triggered, setTriggered] = useState(false)
  const trackRef = useRef(null)
  const startXRef = useRef(null)

  const TRACK_WIDTH = 160
  const HANDLE_SIZE = 32
  const MAX_OFFSET = TRACK_WIDTH - HANDLE_SIZE - 4
  const THRESHOLD = MAX_OFFSET * 0.72

  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
    startXRef.current = e.clientX - offset

    const onMouseMove = (e) => {
      const newOffset = Math.max(0, Math.min(MAX_OFFSET, e.clientX - startXRef.current))
      setOffset(newOffset)
    }

    const onMouseUp = (e) => {
      setDragging(false)
      const finalOffset = Math.max(0, Math.min(MAX_OFFSET, e.clientX - startXRef.current))
      if (finalOffset >= THRESHOLD) {
        setTriggered(true)
        setOffset(MAX_OFFSET)
        setTimeout(onLogout, 400)
      } else {
        setOffset(0)
      }
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [offset, onLogout])

  // Touch support
  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    startXRef.current = touch.clientX - offset
    setDragging(true)
  }, [offset])

  const onTouchMove = useCallback((e) => {
    if (!dragging) return
    const touch = e.touches[0]
    const newOffset = Math.max(0, Math.min(MAX_OFFSET, touch.clientX - startXRef.current))
    setOffset(newOffset)
  }, [dragging])

  const onTouchEnd = useCallback((e) => {
    setDragging(false)
    if (offset >= THRESHOLD) {
      setTriggered(true)
      setOffset(MAX_OFFSET)
      setTimeout(onLogout, 400)
    } else {
      setOffset(0)
    }
  }, [offset, onLogout])

  const progress = offset / MAX_OFFSET
  const trackBg = triggered
    ? '#ef4444'
    : `linear-gradient(to right, rgba(239,68,68,${0.15 + progress * 0.5}) ${progress * 100}%, rgba(255,255,255,0.12) ${progress * 100}%)`

  return (
    <div
      ref={trackRef}
      title="Slide to logout"
      style={{
        width: `${TRACK_WIDTH}px`,
        height: `${HANDLE_SIZE + 4}px`,
        background: trackBg,
        borderRadius: '999px',
        border: '1px solid rgba(255,255,255,0.25)',
        position: 'relative',
        cursor: 'default',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Label */}
      <span style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: `${HANDLE_SIZE + 8}px`,
        fontSize: '11px',
        fontWeight: '500',
        color: triggered ? '#fff' : 'rgba(255,255,255,0.6)',
        letterSpacing: '0.02em',
        pointerEvents: 'none',
        transition: 'color 0.2s',
      }}>
        {triggered ? 'Logging out…' : 'slide to logout →'}
      </span>

      {/* Handle */}
      <div
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'absolute',
          top: '2px',
          left: `${2 + offset}px`,
          width: `${HANDLE_SIZE}px`,
          height: `${HANDLE_SIZE}px`,
          borderRadius: '50%',
          background: triggered ? '#ef4444' : '#818CF8',
          color: '#fff',
          fontSize: '13px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: triggered ? 'default' : 'grab',
          boxShadow: dragging
            ? '0 4px 16px rgba(0,0,0,0.35)'
            : '0 2px 8px rgba(0,0,0,0.25)',
          transition: dragging ? 'none' : 'left 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.2s',
          zIndex: 2,
          border: '2px solid rgba(255,255,255,0.35)',
        }}
      >
        {triggered ? '✓' : name.charAt(0).toUpperCase()}
      </div>
    </div>
  )
}

export default function Navbar({ credits = 0 }) {
  const navigate = useNavigate()
  const location = useLocation()
  const name = localStorage.getItem('name') || '?'

  const logout = () => { localStorage.clear(); navigate('/login') }

  const navItem = (to) => ({
    fontSize: '13px', fontWeight: '500',
    color: location.pathname === to ? '#fff' : '#C7D2FE',
    padding: '6px 14px', borderRadius: '8px',
    background: location.pathname === to ? 'rgba(255,255,255,0.15)' : 'transparent',
    transition: 'all 0.15s',
  })

  return (
    <nav style={s.nav}>
      <Link to="/dashboard"><ApplyAgentLogo height={32} variant="dark" /></Link>
      <div style={s.links}>
        <Link to="/dashboard" style={navItem('/dashboard')}>Home</Link>
        <Link to="/profile" style={navItem('/profile')}>Profile</Link>
      </div>
      <div style={s.right}>
        <Link to="/pricing" style={{
          ...s.credits,
          background: credits < 10 ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.15)',
          border: credits < 10 ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.2)',
          textDecoration: 'none',
        }} title="Buy more credits">
          <span style={{ fontSize: '12px' }}>⚡</span>
          <span style={s.creditsNum}>{credits < 10 && credits > 0 ? `${credits} low!` : credits}</span>
        </Link>
        <SlideToLogout name={name} onLogout={logout} />
      </div>
    </nav>
  )
}

const s = {
  nav: {
    background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 60%, #9333ea 100%)',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 16px rgba(109,40,217,0.35)',
  },
  links: { display: 'flex', gap: '4px' },
  right: { display: 'flex', alignItems: 'center', gap: '12px' },
  credits: {
    display: 'flex', alignItems: 'center', gap: '5px',
    background: 'rgba(255,255,255,0.15)',
    padding: '5px 12px', borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  creditsNum: { fontSize: '13px', fontWeight: '600', color: '#fff' },
}
