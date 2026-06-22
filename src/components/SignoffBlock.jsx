import { useState, useEffect } from 'react'
import { generateSignoff } from '../lib/signoffGenerator'

// Displays a live AI-generated sign-off paragraph based on occupation.
// Regenerates automatically when occupation changes (debounced).
// Allows manual editing of the result.
export default function SignoffBlock({ occupation, docType, value, onChange, label = 'Sign-Off Compliance Note' }) {
  const [generating, setGenerating] = useState(false)
  const [lastOccupation, setLastOccupation] = useState('')

  const generate = async (occ) => {
    if (!occ || occ === lastOccupation) return
    setGenerating(true)
    const text = await generateSignoff(occ, docType)
    onChange(text)
    setLastOccupation(occ)
    setGenerating(false)
  }

  // Auto-generate on first load if occupation present but value empty
  useEffect(() => {
    if (!occupation || occupation.length < 3 || value) return
    const timer = setTimeout(() => generate(occupation), 800)
    return () => clearTimeout(timer)
  }, [])  // runs once on mount

  // Auto-regenerate when occupation changes
  useEffect(() => {
    if (!occupation || occupation.length < 3) return
    const timer = setTimeout(() => generate(occupation), 1000)
    return () => clearTimeout(timer)
  }, [occupation])

  return (
    <div className="form-group" style={{ gridColumn: 'span 2' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
        <label>{label}</label>
        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={() => generate(occupation)}
          disabled={generating || !occupation}
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
        >
          {generating ? '...' : '↻ Regenerate'}
        </button>
      </div>

      {generating ? (
        <div className="signoff-generating">
          <div className="spinner" />
          <span>Generating sign-off paragraph for <strong>{occupation}</strong>…</span>
        </div>
      ) : value ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ minHeight: '120px', fontStyle: 'italic', fontSize: '0.88rem', lineHeight: '1.7', background: '#faf8f1', borderColor: 'rgba(201,168,76,0.4)' }}
        />
      ) : (
        <div style={{ fontSize: '0.82rem', color: 'var(--slate-light)', fontStyle: 'italic', padding: '0.75rem', background: 'var(--off-white)', borderRadius: '7px', border: '1px dashed var(--border-light)' }}>
          {occupation
            ? 'Sign-off paragraph will auto-generate — or click Regenerate'
            : 'Enter the client\'s occupation above to auto-generate a custom sign-off paragraph'}
        </div>
      )}
    </div>
  )
}
