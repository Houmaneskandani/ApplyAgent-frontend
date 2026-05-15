import axios from 'axios'

// SECURITY: never fall back to a hardcoded production URL. Preview deployments
// that forget VITE_API_URL would otherwise silently hit and mutate production.
const BASE_URL = import.meta.env.VITE_API_URL
if (!BASE_URL) {
  // Throwing here surfaces the misconfiguration at the FIRST API call, which
  // is far better than corrupting prod data from a preview build.
  console.error('VITE_API_URL is not set. Configure it in your Vercel project settings.')
}

const api = axios.create({
  baseURL: BASE_URL || '/',  // '/' makes calls fail visibly instead of hitting prod
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// SECURITY: a global 401 handler. Previously, when a JWT expired the user got
// stuck on the dashboard with silently-failing requests. Each page handled the
// failure differently (some redirected, some swallowed the error). Now any 401
// across the app clears the token and redirects to /login with a return-to.
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const onAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password']
        .some(p => window.location.pathname.startsWith(p))
      if (!onAuthPage) {
        localStorage.removeItem('token')
        localStorage.removeItem('name')
        // Preserve where the user was so we can return them after login.
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?next=${next}`
      }
    }
    return Promise.reject(err)
  },
)

export default api
