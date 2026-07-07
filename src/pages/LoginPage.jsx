import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'Incorrect email or password.' : err.message)
    }
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">GJM <span>Ultra</span> Brokers</div>
        <div className="login-sub">Compliance Management Portal</div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
            <Lock size={15} /> {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@gjmultrabrokers.co.za"
                required
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate)' }} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--off-white)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--slate)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--navy)', display: 'block', marginBottom: '0.25rem' }}>POPIA Notice</strong>
          This system processes client personal information solely to generate compliance documentation. No client data is stored on any server. All information entered is used in-session only and discarded upon document download.
        </div>
      </div>
    </div>
  )
}
