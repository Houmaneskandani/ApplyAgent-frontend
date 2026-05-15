import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { initAnalytics } from './lib/analytics'

// Boot analytics before the first render. No-op if VITE_POSTHOG_KEY isn't set
// (local dev, Vercel previews without the env var, etc.).
initAnalytics()

// Suppress the harmless ResizeObserver loop notification (browser quirk, not a real error)
const _origError = window.onerror
window.onerror = (msg, ...args) => {
  if (typeof msg === 'string' && msg.includes('ResizeObserver loop')) return true
  return _origError ? _origError(msg, ...args) : false
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1E1B4B',
          color: '#fff',
          fontSize: '14px',
          borderRadius: '10px',
          padding: '12px 16px',
          maxWidth: '420px',
        },
        success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }}
    />
  </StrictMode>,
)
