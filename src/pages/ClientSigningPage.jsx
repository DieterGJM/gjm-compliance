// ─── Client-facing signing page — accessible via unique link ──────────────────
// URL: /sign/:token
import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getSigningSession, submitClientSignature } from '../lib/signingService'
import { CheckCircle, AlertCircle, FileSignature, Shield } from 'lucide-react'

function SignaturePad({ onDone, label }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [mode, setMode] = useState('draw')
  const [typedName, setTypedName] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2.5
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  }, [mode])

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return { x: (src.clientX - rect.left) * (canvas.width / rect.width),
             y: (src.clientY - rect.top)  * (canvas.height / rect.height) }
  }

  const startDraw = e => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
  }
  const draw = e => {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y); ctx.stroke()
    setHasStrokes(true)
  }
  const endDraw = () => setDrawing(false)
  const clear = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }
  const applyTyped = () => {
    if (!typedName.trim()) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = 'italic 36px Georgia, serif'
    ctx.fillStyle = '#1a1a2e'
    ctx.fillText(typedName, 16, 60)
    setHasStrokes(true)
  }

  return (
    <div>
      <p style={{ color:'#4a5568', fontSize:'0.88rem', margin:'0 0 0.75rem' }}>{label}</p>
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.75rem' }}>
        {['draw','type'].map(m => (
          <button key={m} onClick={() => { setMode(m); setHasStrokes(false) }}
            style={{ flex:1, padding:'0.5rem', fontSize:'0.82rem', cursor:'pointer',
              borderRadius:'6px', border:`2px solid ${mode===m?'#c6a64c':'#e2e8f0'}`,
              background:mode===m?'#c6a64c':'white', fontWeight:mode===m?700:400,
              color:mode===m?'#1a1a2e':'#718096' }}>
            {m==='draw'?'✏️ Draw':'⌨️ Type name'}
          </button>
        ))}
      </div>
      {mode==='type' && (
        <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.75rem' }}>
          <input value={typedName} onChange={e=>setTypedName(e.target.value)}
            placeholder="Type your full name"
            style={{ flex:1, padding:'0.6rem', border:'1.5px solid #e2e8f0', borderRadius:'6px', fontSize:'0.9rem' }} />
          <button onClick={applyTyped}
            style={{ padding:'0.6rem 1rem', background:'#0f1636', color:'white',
              border:'none', borderRadius:'6px', cursor:'pointer' }}>Apply</button>
        </div>
      )}
      <div style={{ border:'2px dashed #c6a64c', borderRadius:'8px', background:'#fafafa', position:'relative' }}>
        <canvas ref={canvasRef} width={460} height={120}
          style={{ display:'block', width:'100%', touchAction:'none', cursor:'crosshair' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
        {!hasStrokes && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
            justifyContent:'center', color:'#a0aec0', fontSize:'0.85rem', pointerEvents:'none' }}>
            {mode==='draw' ? 'Sign here' : 'Type name above then Apply'}
          </div>
        )}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'0.75rem' }}>
        <button onClick={clear} style={{ padding:'0.5rem 1rem', background:'white',
          border:'1.5px solid #e2e8f0', borderRadius:'6px', cursor:'pointer', color:'#718096' }}>
          Clear
        </button>
        <button onClick={() => onDone(canvasRef.current.toDataURL('image/png'))}
          disabled={!hasStrokes}
          style={{ padding:'0.5rem 1.5rem', fontWeight:700, cursor:hasStrokes?'pointer':'not-allowed',
            borderRadius:'6px', border:'none',
            background:hasStrokes?'#c6a64c':'#e2e8f0', color:hasStrokes?'#1a1a2e':'#a0aec0' }}>
          Confirm Signature
        </button>
      </div>
    </div>
  )
}

export default function ClientSigningPage() {
  const { token } = useParams()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState('loading') // loading | review | sign | done | error
  const [consented, setConsented] = useState(false)
  const [sig, setSig] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const pdfRef = useRef(null)

  useEffect(() => {
    if (!token) { setError('Invalid signing link'); setStep('error'); return }
    getSigningSession(token)
      .then(s => { setSession(s); setStep(s.status === 'client_signed' ? 'done' : 'review') })
      .catch(e => { setError(e.message); setStep('error') })
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async () => {
    if (!sig || !consented) return
    setSubmitting(true)
    try {
      await submitClientSignature(token, {
        clientSig:  sig,
        auditEntry: { ts: new Date().toISOString(), action: 'CLIENT_CONFIRMED',
          detail: `Consent confirmed | Device: ${navigator.userAgent.slice(0,60)}` }
      })
      setStep('done')
    } catch (e) {
      setError(e.message); setStep('error')
    }
    setSubmitting(false)
  }

  const containerStyle = {
    minHeight:'100vh', background:'#f7f8fa',
    display:'flex', flexDirection:'column', alignItems:'center',
    fontFamily:"'Inter', -apple-system, sans-serif"
  }
  const cardStyle = {
    background:'white', borderRadius:'12px', boxShadow:'0 4px 24px rgba(0,0,0,0.1)',
    padding:'2rem', width:'min(520px, 94vw)', margin:'1.5rem auto'
  }

  if (step === 'loading' || loading) return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign:'center', padding:'2rem' }}>
          <div style={{ width:40, height:40, border:'3px solid #c6a64c', borderTopColor:'transparent',
            borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 1rem' }} />
          <p style={{ color:'#718096' }}>Loading your document…</p>
        </div>
      </div>
    </div>
  )

  if (step === 'error') return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign:'center' }}>
          <AlertCircle size={48} color="#e53e3e" style={{ marginBottom:'1rem' }} />
          <h2 style={{ color:'#1a1a2e', marginBottom:'0.5rem' }}>Unable to load document</h2>
          <p style={{ color:'#718096' }}>{error}</p>
          <p style={{ color:'#a0aec0', fontSize:'0.82rem', marginTop:'1rem' }}>
            Contact Dieter Hartig at GJM Ultra Brokers if you need a new link.
          </p>
        </div>
      </div>
    </div>
  )

  if (step === 'done') return (
    <div style={containerStyle}>
      <div style={{ ...cardStyle, textAlign:'center' }}>
        <CheckCircle size={56} color="#38a169" style={{ marginBottom:'1rem' }} />
        <h2 style={{ color:'#1a1a2e', fontFamily:'Georgia, serif', marginBottom:'0.5rem' }}>
          Document Signed
        </h2>
        <p style={{ color:'#4a5568', marginBottom:'1rem' }}>
          Thank you{session?.client_name ? `, ${session.client_name}` : ''}. Your signature has been securely recorded.
        </p>
        <div style={{ background:'#f0fff4', border:'1px solid #c6f6d5', borderRadius:'8px',
          padding:'1rem', textAlign:'left', fontSize:'0.82rem', color:'#276749' }}>
          <strong>What happens next:</strong><br/>
          Dieter Hartig will review and countersign the document. You will receive a copy of the fully signed document for your records.
        </div>
        <div style={{ marginTop:'1.5rem', padding:'1rem', background:'#f7fafc',
          borderRadius:'8px', fontSize:'0.78rem', color:'#718096', textAlign:'left' }}>
          <Shield size={12} style={{ display:'inline', marginRight:'0.3rem' }} />
          Signed electronically under the Electronic Communications and Transactions Act 25 of 2002 (ECTA)
        </div>
      </div>
    </div>
  )

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ width:'100%', background:'#0f1636', borderBottom:'3px solid #c6a64c',
        padding:'1rem 2rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
        <FileSignature size={22} color="#c6a64c" />
        <div>
          <div style={{ color:'white', fontWeight:700, fontFamily:'Georgia, serif', fontSize:'1rem' }}>
            GJM Ultra Brokers
          </div>
          <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.75rem' }}>
            Secure Document Signing
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        {/* Document info */}
        <div style={{ background:'#f7f8fa', borderRadius:'8px', padding:'1rem', marginBottom:'1.5rem',
          border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:'0.78rem', color:'#718096', marginBottom:'0.3rem', textTransform:'uppercase',
            letterSpacing:'0.05em' }}>Document to sign</div>
          <div style={{ fontWeight:700, color:'#1a1a2e', fontSize:'0.95rem' }}>
            {session?.document_name}
          </div>
          {session?.client_name && (
            <div style={{ color:'#4a5568', fontSize:'0.85rem', marginTop:'0.25rem' }}>
              Prepared for: {session.client_name}
            </div>
          )}
          <div style={{ color:'#a0aec0', fontSize:'0.75rem', marginTop:'0.4rem' }}>
            Prepared by Dieter Hartig · GJM Ultra Brokers
          </div>
        </div>

        {/* PDF viewer */}
        {session?.document_b64 && (
          <div style={{ marginBottom:'1.5rem' }}>
            <div style={{ fontSize:'0.82rem', color:'#718096', marginBottom:'0.5rem', fontWeight:600 }}>
              Review the document before signing:
            </div>
            <iframe
              src={`data:application/pdf;base64,${session.document_b64}`}
              style={{ width:'100%', height:'400px', border:'1px solid #e2e8f0',
                borderRadius:'8px', background:'white' }}
              title="Document to sign"
            />
          </div>
        )}

        {step === 'review' && (
          <>
            {/* Consent */}
            <div style={{ background:'#fffbeb', border:'1px solid #f6e05e', borderRadius:'8px',
              padding:'1rem', marginBottom:'1.5rem' }}>
              <label style={{ display:'flex', gap:'0.75rem', cursor:'pointer', alignItems:'flex-start' }}>
                <input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)}
                  style={{ marginTop:'2px', accentColor:'#c6a64c', width:16, height:16, flexShrink:0 }} />
                <span style={{ fontSize:'0.84rem', color:'#744210', lineHeight:1.5 }}>
                  I confirm that I have read and understood the document above, and I consent to signing it electronically.
                  This electronic signature is legally binding under the Electronic Communications and Transactions Act 25 of 2002.
                </span>
              </label>
            </div>

            {/* Signature pad */}
            {consented && (
              <div style={{ marginBottom:'1.5rem' }}>
                <div style={{ fontWeight:700, color:'#1a1a2e', marginBottom:'0.75rem', fontSize:'0.9rem' }}>
                  Your signature:
                </div>
                {!sig ? (
                  <SignaturePad
                    label={`Sign as: ${session?.client_name || 'Client'}`}
                    onDone={dataUrl => setSig(dataUrl)}
                  />
                ) : (
                  <div>
                    <div style={{ border:'2px solid #38a169', borderRadius:'8px', padding:'0.5rem',
                      background:'#f0fff4', marginBottom:'0.75rem', textAlign:'center' }}>
                      <img src={sig} style={{ maxHeight:80, maxWidth:'100%' }} alt="Your signature" />
                    </div>
                    <button onClick={() => setSig(null)}
                      style={{ width:'100%', padding:'0.4rem', background:'none',
                        border:'1px solid #e2e8f0', borderRadius:'6px', cursor:'pointer',
                        color:'#718096', fontSize:'0.82rem' }}>
                      Re-draw signature
                    </button>
                  </div>
                )}
              </div>
            )}

            <button onClick={handleSubmit}
              disabled={!sig || !consented || submitting}
              style={{ width:'100%', padding:'1rem', fontWeight:700, fontSize:'1rem',
                borderRadius:'8px', border:'none', cursor: sig&&consented?'pointer':'not-allowed',
                background: sig&&consented?'#c6a64c':'#e2e8f0',
                color: sig&&consented?'#1a1a2e':'#a0aec0',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
              <CheckCircle size={20} />
              {submitting ? 'Submitting…' : 'Submit Signature'}
            </button>
          </>
        )}

        {/* Legal footer */}
        <div style={{ marginTop:'1.5rem', padding:'0.75rem', background:'#f7fafc',
          borderRadius:'6px', fontSize:'0.73rem', color:'#a0aec0', lineHeight:1.5 }}>
          <Shield size={11} style={{ display:'inline', marginRight:'0.3rem' }} />
          GJM Ultra Brokers | Authorised Financial Services Provider |
          Electronic signature valid under ECTA 25 of 2002 &amp; FAIS Act 37 of 2002
        </div>
      </div>
    </div>
  )
}
