import { BrowserRouter, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SessionPage from './pages/SessionPage'
import { Shield, LogOut, User } from 'lucide-react'
import './index.css'

function AppShell() {
  const { user, role, signOut, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)' }}>
        <div style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>Loading…</div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="logo">GJM <span>Ultra</span> Brokers</Link>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/session">New Session</NavLink>
          <div className="user-badge">
            <User size={12} style={{ display: 'inline', marginRight: '0.3rem' }} />
            {user.email}
            {role === 'compliance_officer' && (
              <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: 'var(--gold)', color: 'var(--navy)', padding: '0.1em 0.5em', borderRadius: '10px', fontWeight: 700 }}>CO</span>
            )}
          </div>
          <button onClick={signOut} title="Sign out">
            <LogOut size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
            Sign out
          </button>
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
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}
