import { BrowserRouter, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom'
import { Component } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import DashboardPage from './pages/DashboardPage'
import SessionPage from './pages/SessionPage'
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react'
import './index.css'

// Error boundary — catches render crashes so the app never goes blank
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('App error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--off-white)', flexDirection: 'column', gap: '1rem', padding: '2rem'
        }}>
          <AlertTriangle size={40} color="var(--gold)" />
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--black)', margin: 0 }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--slate)', maxWidth: '400px', textAlign: 'center', margin: 0 }}>
            {this.state.error?.message || 'An unexpected error occurred. Your data is safe — please refresh to continue.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'var(--gold)', color: 'var(--black)', border: 'none',
              borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: 700,
              cursor: 'pointer', fontSize: '0.9rem'
            }}>
            <RefreshCw size={16} /> Refresh & Continue
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function AppShell() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)' }}>
        <div style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Loading…</div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="logo">GJM <span>Ultra</span> Brokers</Link>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/session">New Session</NavLink>
          <div className="user-badge">
            GJM Ultra Brokers
          </div>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer style={{ background: 'var(--navy)', borderTop: '2px solid var(--gold)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>© {new Date().getFullYear()} GJM Ultra Brokers. All rights reserved.</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>
          <Shield size={12} /> POPIA Compliant — No client data stored on server
        </span>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <AppShell />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  )
}
