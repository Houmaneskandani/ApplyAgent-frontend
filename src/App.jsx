import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Code-split every page so the Login screen doesn't ship the full Dashboard
// + Profile + Pricing JS. Login + Signup are lightweight; Dashboard.jsx and
// Profile.jsx in particular were inflating the initial bundle.
const Login          = lazy(() => import('./pages/Login'))
const Signup         = lazy(() => import('./pages/Signup'))
const Dashboard      = lazy(() => import('./pages/Dashboard'))
const Profile        = lazy(() => import('./pages/Profile'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword  = lazy(() => import('./pages/ResetPassword'))
const Pricing        = lazy(() => import('./pages/Pricing'))

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

// Small visual fallback while a route chunk loads. Matches the page background
// so it doesn't feel like a flash of unstyled content.
function RouteFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.25)',
        borderTopColor: '#fff',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute><Profile /></PrivateRoute>
          } />
          <Route path="/pricing" element={
            <PrivateRoute><Pricing /></PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
