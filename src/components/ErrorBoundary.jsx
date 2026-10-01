import { Component } from 'react'

// A failed dynamic import — the classic post-deploy case: every page is
// lazy-loaded, Vercel rewrites every path to index.html, and after a deploy
// the OLD hashed chunk URLs 404 (served as HTML). An open tab navigating to
// a route it hasn't loaded yet then throws here and React would otherwise
// unmount the whole tree to a blank white page.
const CHUNK_ERROR_RE = /(Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading (CSS )?chunk [\d]+ failed|Unable to preload CSS|MIME type)/i

const RELOAD_KEY = 'chunk_reload_at'
const RELOAD_WINDOW_MS = 30 * 1000

function isChunkLoadError(error) {
  const msg = String(error?.message || error || '')
  return CHUNK_ERROR_RE.test(msg)
}

// Reload at most once per 30s so a persistently broken deploy can't put the
// browser into an infinite reload loop. Returns true if a reload was issued.
function reloadOnceForChunkError() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < RELOAD_WINDOW_MS) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // sessionStorage unavailable (private mode / blocked) — still reload once
    // per boundary instance via the in-memory flag in the component.
  }
  window.location.reload()
  return true
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, reloading: false }
    this.reloadedOnce = false
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Keep the detail in the console for debugging; PostHog's autocapture of
    // exceptions picks it up when analytics is configured.
    console.error('[ErrorBoundary]', error, info?.componentStack)
    if (isChunkLoadError(error) && !this.reloadedOnce) {
      this.reloadedOnce = true
      if (reloadOnceForChunkError()) {
        this.setState({ reloading: true })
      }
    }
  }

  render() {
    const { error, reloading } = this.state
    if (!error) return this.props.children

    const chunk = isChunkLoadError(error)
    return (
      <div style={styles.page} role="alert">
        <div style={styles.card}>
          <div style={styles.icon}>{chunk ? '🔄' : '⚠️'}</div>
          <h2 style={styles.title}>
            {reloading ? 'Loading the latest version…'
              : chunk ? 'A new version is available'
              : 'Something went wrong'}
          </h2>
          <p style={styles.text}>
            {reloading
              ? 'One moment — refreshing the page.'
              : chunk
                ? 'The app was updated while this tab was open. Reload to get the latest version.'
                : 'This page hit an unexpected error. Reloading usually fixes it; your data is safe.'}
          </p>
          {!reloading && (
            <div style={styles.actions}>
              <button style={styles.primary} onClick={() => window.location.reload()}>
                Reload page
              </button>
              <a href="/dashboard" style={styles.secondary}>Go to dashboard</a>
            </div>
          )}
          {!chunk && error?.message && (
            <pre style={styles.detail}>{String(error.message).slice(0, 300)}</pre>
          )}
        </div>
      </div>
    )
  }
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    fontFamily: 'inherit',
  },
  card: {
    background: '#fff',
    padding: '36px',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(79,70,229,0.25)',
    textAlign: 'center',
  },
  icon: { fontSize: '36px', marginBottom: '10px' },
  title: { margin: '0 0 8px 0', fontSize: '20px', color: '#1E1B4B', fontWeight: 700 },
  text: { color: '#6B7280', fontSize: '14px', margin: '0 0 20px 0', lineHeight: 1.5 },
  actions: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' },
  primary: {
    padding: '12px 18px', borderRadius: '10px',
    background: '#4F46E5', color: '#fff',
    border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
  },
  secondary: {
    padding: '12px 18px', borderRadius: '10px',
    background: '#EEF2FF', color: '#4F46E5', textDecoration: 'none',
    fontSize: '14px', fontWeight: 700,
  },
  detail: {
    marginTop: '18px', padding: '10px', borderRadius: '8px',
    background: '#F3F4F6', color: '#6B7280', fontSize: '11px',
    textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  },
}
