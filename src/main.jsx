import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Suppress the harmless ResizeObserver loop notification (browser quirk, not a real error)
const _origError = window.onerror
window.onerror = (msg, ...args) => {
  if (typeof msg === 'string' && msg.includes('ResizeObserver loop')) return true
  return _origError ? _origError(msg, ...args) : false
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
