import { useState, useEffect } from 'react'
import { Upload, X, Check } from 'lucide-react'

const SIG_KEYS = {
  advisor: 'gjm_sig_advisor',
  co:      'gjm_sig_co',
  client:  'gjm_sig_client',
}

export function getSignature(role) {
  try { return sessionStorage.getItem(SIG_KEYS[role]) || '' } catch { return '' }
}

function setSignature(role, b64) {
  try { sessionStorage.setItem(SIG_KEYS[role], b64) } catch {}
}

function SigUploader({ label, role, onSaved }) {
  const [preview, setPreview] = useState(() => getSignature(role))
  const [saved,   setSaved]   = useState(!!getSignature(role))

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const b64 = ev.target.result // data:image/png;base64,....
      setPreview(b64)
      setSignature(role, b64)
      setSaved(true)
      onSaved?.()
    }
    reader.readAsDataURL(file)
  }

  const clear = () => {
    setPreview('')
    setSaved(false)
    try { sessionStorage.removeItem(SIG_KEYS[role]) } catch {}
    onSaved?.()
  }

  return (
    <div style={{
      background: 'var(--off-white)',
      border: '1px solid var(--border-light)',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{label}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate)', marginTop: '0.15rem' }}>
            {saved ? '✅ Signature loaded — will appear in all generated documents' : 'No signature set — documents will have blank signature lines'}
          </div>
        </div>
        {preview && (
          <button type="button" onClick={clear}
            style={{ background: 'none', border: '1px solid var(--border-light)', borderRadius: '6px',
              padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--slate)',
              display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {preview ? (
        <div style={{
          background: 'white', border: '1px solid var(--border-light)', borderRadius: '6px',
          padding: '0.75rem', textAlign: 'center', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <img src={preview} alt={label} style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain' }} />
        </div>
      ) : (
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          background: 'white', border: '2px dashed var(--border-light)', borderRadius: '6px',
          padding: '1.5rem', cursor: 'pointer', color: 'var(--slate)', fontSize: '0.82rem',
          transition: 'border-color 0.15s',
        }}>
          <Upload size={16} />
          Click to upload signature image (PNG, JPG)
          <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </label>
      )}
    </div>
  )
}

export default function SignatureSettings() {
  const [refreshed, setRefreshed] = useState(0)

  return (
    <div>
      <div style={{
        background: 'var(--navy)', color: 'var(--gold)',
        padding: '0.6rem 1rem', borderRadius: '6px',
        fontSize: '0.78rem', marginBottom: '1rem',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <span style={{ fontSize: '1rem' }}>ℹ️</span>
        Signatures are stored for this session only and cleared when you close the browser.
        Re-upload each time you start a new session.
      </div>

      <SigUploader
        label="Dieter Hartig — Financial Advisor"
        role="advisor"
        onSaved={() => setRefreshed(r => r + 1)}
      />
      <SigUploader
        label="Tanya Van Niekerk — Compliance Officer"
        role="co"
        onSaved={() => setRefreshed(r => r + 1)}
      />
    </div>
  )
}
