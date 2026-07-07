// ─── Client-facing signing page — accessible via unique link ──────────────────
import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getSigningSession, submitClientSignature } from '../lib/signingService'
import { CheckCircle, AlertCircle, FileSignature, Shield, ChevronDown, ChevronUp, X, PenLine } from 'lucide-react'

// ── Signature Pad ─────────────────────────────────────────────────────────────
function SignaturePad({ onDone, onCancel, label }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing]     = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [mode, setMode]           = useState('draw')
  const [typedName, setTypedName] = useState('')

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  }, [mode])

  const pos = (e, canvas) => {
    const r = canvas.getBoundingClientRect(), src = e.touches ? e.touches[0] : e
    return { x: (src.clientX - r.left) * canvas.width / r.width, y: (src.clientY - r.top) * canvas.height / r.height }
  }
  const start = e => { e.preventDefault(); const c = canvasRef.current, ctx = c.getContext('2d'), p = pos(e,c); ctx.beginPath(); ctx.moveTo(p.x,p.y); setDrawing(true) }
  const move  = e => { e.preventDefault(); if (!drawing) return; const c = canvasRef.current, ctx = c.getContext('2d'), p = pos(e,c); ctx.lineTo(p.x,p.y); ctx.stroke(); setHasStrokes(true) }
  const end   = () => setDrawing(false)
  const clear = () => { canvasRef.current.getContext('2d').clearRect(0,0,460,120); setHasStrokes(false) }
  const applyType = () => {
    if (!typedName.trim()) return
    const c = canvasRef.current, ctx = c.getContext('2d')
    ctx.clearRect(0,0,c.width,c.height); ctx.font = 'italic 36px Georgia,serif'; ctx.fillStyle = '#1a1a2e'
    ctx.fillText(typedName, 16, 64); setHasStrokes(true)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:200,
      display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'0' }}>
      <div style={{ background:'white', borderRadius:'20px 20px 0 0', padding:'1.5rem',
        width:'min(520px,100%)', boxShadow:'0 -8px 40px rgba(0,0,0,0.25)', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <h3 style={{ margin:0, color:'#0f1636', fontSize:'1.05rem', fontFamily:'Georgia,serif' }}>{label}</h3>
          <button onClick={onCancel} style={{ background:'none', border:'none', cursor:'pointer', color:'#718096', padding:'0.25rem' }}>
            <X size={20}/>
          </button>
        </div>

        <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem' }}>
          {['draw','type'].map(m => (
            <button key={m} onClick={() => { setMode(m); setHasStrokes(false) }}
              style={{ flex:1, padding:'0.6rem', fontSize:'0.85rem', cursor:'pointer', borderRadius:'8px',
                border:`2px solid ${mode===m?'#c6a64c':'#e2e8f0'}`,
                background:mode===m?'#c6a64c':'white', fontWeight:mode===m?700:400,
                color:mode===m?'#1a1a2e':'#718096' }}>
              {m==='draw' ? '✏️  Draw signature' : '⌨️  Type your name'}
            </button>
          ))}
        </div>

        {mode === 'type' && (
          <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.75rem' }}>
            <input value={typedName} onChange={e => setTypedName(e.target.value)}
              placeholder="Type your full name"
              style={{ flex:1, padding:'0.65rem', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'0.95rem' }}/>
            <button onClick={applyType}
              style={{ padding:'0.65rem 1rem', background:'#0f1636', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:700 }}>
              Apply
            </button>
          </div>
        )}

        <div style={{ border:'2px dashed #c6a64c', borderRadius:'10px', background:'#fafaf7', position:'relative', marginBottom:'1rem' }}>
          <canvas ref={canvasRef} width={460} height={120}
            style={{ display:'block', width:'100%', touchAction:'none', cursor:'crosshair' }}
            onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
            onTouchStart={start} onTouchMove={move} onTouchEnd={end}/>
          {!hasStrokes && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
              color:'#a0aec0', fontSize:'0.85rem', pointerEvents:'none' }}>
              {mode === 'draw' ? 'Sign here with your finger or mouse' : 'Type name above then tap Apply'}
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button onClick={clear}
            style={{ padding:'0.7rem 1.2rem', background:'white', border:'1.5px solid #e2e8f0',
              borderRadius:'8px', cursor:'pointer', color:'#718096', flex:0 }}>
            Clear
          </button>
          <button onClick={() => onDone(canvasRef.current.toDataURL('image/png'))} disabled={!hasStrokes}
            style={{ flex:1, padding:'0.7rem', fontWeight:700, borderRadius:'8px', border:'none',
              cursor:hasStrokes ? 'pointer' : 'not-allowed', fontSize:'1rem',
              background:hasStrokes ? '#c6a64c' : '#e2e8f0', color:hasStrokes ? '#1a1a2e' : '#a0aec0' }}>
            ✓  Use this signature
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main client signing page ──────────────────────────────────────────────────
export default function ClientSigningPage() {
  const { token } = useParams()
  const [session, setSession]       = useState(null)
  const [step, setStep]             = useState('loading')  // loading|review|sign|done|error
  const [error, setError]           = useState('')
  const [consented, setConsented]   = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Per-field signature state: { [fieldId]: dataUrl }
  const [fieldSigs, setFieldSigs]   = useState({})
  const [signingField, setSigningField] = useState(null) // field being signed right now

  // PDF canvas rendering
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages]   = useState(1)
  const [pdfDoc, setPdfDoc]           = useState(null)
  const canvasRef = useRef(null)
  const fieldRefs = useRef({}) // ref per field id for scrolling

  // Load pdf.js
  useEffect(() => {
    if (window.pdfjsLib) return
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js' }
    document.head.appendChild(s)
  }, [])

  // Fetch session
  useEffect(() => {
    if (!token) { setError('Invalid signing link'); setStep('error'); return }
    getSigningSession(token)
      .then(s => {
        setSession(s)
        setStep(s.status === 'client_signed' || s.status === 'complete' ? 'done' : 'review')
      })
      .catch(e => { setError(e.message); setStep('error') })
  }, [token])

  // Load PDF into pdf.js when session available
  useEffect(() => {
    if (!session?.document_b64 || !window.pdfjsLib) return
    let cancelled = false
    const loadPdf = async () => {
      // Wait for pdfjsLib to be ready
      let attempts = 0
      while (!window.pdfjsLib?.getDocument && attempts < 20) {
        await new Promise(r => setTimeout(r, 200)); attempts++
      }
      if (cancelled) return
      const raw = atob(session.document_b64)
      const bytes = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
      const doc = await window.pdfjsLib.getDocument({ data: bytes }).promise
      if (cancelled) return
      setPdfDoc(doc)
      setTotalPages(doc.numPages)
    }
    // Retry if pdfjsLib not loaded yet
    const timer = setTimeout(loadPdf, 500)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [session?.document_b64])

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return
    let cancelled = false
    ;(async () => {
      const page = await pdfDoc.getPage(currentPage)
      if (cancelled) return
      const viewport = page.getViewport({ scale: 1.6 })
      const canvas = canvasRef.current
      if (!canvas || cancelled) return
      canvas.width = viewport.width; canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    })()
    return () => { cancelled = true }
  }, [pdfDoc, currentPage])

  // Derived values
  const fields    = session?.sig_fields || []
  const signed    = fields.filter(f => fieldSigs[f.id])
  const unsigned  = fields.filter(f => !fieldSigs[f.id])
  const allSigned = fields.length > 0 && signed.length === fields.length

  // Navigate to next unsigned field
  const goToNextUnsigned = useCallback(() => {
    const next = unsigned[0]
    if (!next) return
    setCurrentPage(next.page)
    setTimeout(() => {
      const el = fieldRefs.current[next.id]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }, [unsigned])

  // Auto-navigate to first field when consent given
  useEffect(() => {
    if (consented && fields.length > 0) {
      setTimeout(() => setCurrentPage(fields[0].page), 200)
    }
  }, [consented])

  const applyFieldSig = (fieldId, dataUrl) => {
    setFieldSigs(prev => ({ ...prev, [fieldId]: dataUrl }))
    setSigningField(null)
    // Auto-navigate to next unsigned
    const nextUnsigned = fields.filter(f => !fieldSigs[f.id] && f.id !== fieldId)
    if (nextUnsigned.length > 0) {
      setTimeout(() => {
        setCurrentPage(nextUnsigned[0].page)
        setTimeout(() => {
          const el = fieldRefs.current[nextUnsigned[0].id]
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 300)
      }, 400)
    }
  }

  const handleSubmit = async () => {
    if (!allSigned || !consented) return
    setSubmitting(true)
    try {
      // Merge all field signatures into one composite image
      // Use the first field's sig as the primary, pass all as JSON
      const primarySig = fieldSigs[fields[0]?.id] || Object.values(fieldSigs)[0]
      await submitClientSignature(token, {
        clientSig: primarySig,
        fieldSigs: fieldSigs,
        auditEntry: { ts: new Date().toISOString(), action: 'CLIENT_SIGNED',
          detail: `${fields.length} signature field(s) signed | Device: ${navigator.userAgent.slice(0,60)}` }
      })
      setStep('done')
    } catch (e) {
      setError(e.message)
    }
    setSubmitting(false)
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const page = { minHeight:'100vh', background:'#f7f8fa', fontFamily:"'Inter',-apple-system,sans-serif" }
  const header = { width:'100%', background:'#0f1636', borderBottom:'3px solid #c6a64c',
    padding:'0.9rem 1.25rem', display:'flex', alignItems:'center', gap:'0.75rem',
    position:'sticky', top:0, zIndex:100 }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (step === 'loading') return (
    <div style={page}>
      <div style={header}>
        <FileSignature size={20} color="#c6a64c"/>
        <span style={{ color:'white', fontWeight:700, fontFamily:'Georgia,serif' }}>GJM Ultra Brokers</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'4rem 1rem' }}>
        <div style={{ width:36, height:36, border:'3px solid #c6a64c', borderTopColor:'transparent',
          borderRadius:'50%', animation:'spin 0.8s linear infinite', marginBottom:'1rem' }}/>
        <p style={{ color:'#718096' }}>Loading your document…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )

  // ── Error ────────────────────────────────────────────────────────────────
  if (step === 'error') return (
    <div style={page}>
      <div style={header}>
        <FileSignature size={20} color="#c6a64c"/>
        <span style={{ color:'white', fontWeight:700, fontFamily:'Georgia,serif' }}>GJM Ultra Brokers</span>
      </div>
      <div style={{ maxWidth:440, margin:'3rem auto', padding:'1.5rem', background:'white',
        borderRadius:'12px', textAlign:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
        <AlertCircle size={44} color="#e53e3e" style={{ marginBottom:'1rem' }}/>
        <h2 style={{ color:'#1a1a2e', marginBottom:'0.5rem' }}>Unable to open document</h2>
        <p style={{ color:'#718096', marginBottom:'1rem' }}>{error}</p>
        <p style={{ color:'#a0aec0', fontSize:'0.82rem' }}>
          Contact Dieter Hartig at GJM Ultra Brokers for a new link.
        </p>
      </div>
    </div>
  )

  // ── Done ────────────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div style={page}>
      <div style={header}>
        <FileSignature size={20} color="#c6a64c"/>
        <span style={{ color:'white', fontWeight:700, fontFamily:'Georgia,serif' }}>GJM Ultra Brokers</span>
      </div>
      <div style={{ maxWidth:440, margin:'3rem auto 1rem', padding:'2rem', background:'white',
        borderRadius:'16px', textAlign:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
        <div style={{ width:72, height:72, background:'#f0fff4', borderRadius:'50%',
          display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem' }}>
          <CheckCircle size={40} color="#38a169"/>
        </div>
        <h2 style={{ color:'#1a1a2e', fontFamily:'Georgia,serif', margin:'0 0 0.5rem', fontSize:'1.4rem' }}>
          Document Signed
        </h2>
        <p style={{ color:'#4a5568', marginBottom:'1.25rem', lineHeight:1.6 }}>
          Thank you{session?.client_name ? `, ${session.client_name}` : ''}. Your signature has been securely recorded.
        </p>
        <div style={{ background:'#f0fff4', border:'1px solid #c6f6d5', borderRadius:'10px',
          padding:'1rem', textAlign:'left', fontSize:'0.83rem', color:'#276749', lineHeight:1.6 }}>
          <strong>What happens next:</strong><br/>
          Dieter Hartig will countersign the document. You will receive a copy of the fully signed document for your records.
        </div>
        <div style={{ marginTop:'1.25rem', padding:'0.75rem', background:'#f7fafc',
          borderRadius:'8px', fontSize:'0.75rem', color:'#718096', display:'flex', alignItems:'center', gap:'0.4rem' }}>
          <Shield size={12}/>
          Signed electronically under ECTA 25 of 2002 · GJM Ultra Brokers
        </div>
      </div>
    </div>
  )

  // ── Review & Sign ────────────────────────────────────────────────────────
  const currentPageFields = fields.filter(f => f.page === currentPage)

  return (
    <div style={page}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(198,166,76,0.6) } 50% { box-shadow: 0 0 0 8px rgba(198,166,76,0) } }
        @keyframes popIn { from { transform: scale(0.85); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>

      {/* ── Header ── */}
      <div style={header}>
        <FileSignature size={20} color="#c6a64c"/>
        <div style={{ flex:1 }}>
          <div style={{ color:'white', fontWeight:700, fontFamily:'Georgia,serif', fontSize:'0.95rem' }}>
            GJM Ultra Brokers
          </div>
          <div style={{ color:'rgba(255,255,255,0.55)', fontSize:'0.72rem' }}>
            {session?.document_name}
          </div>
        </div>
        {/* Progress badge */}
        {fields.length > 0 && consented && (
          <div style={{ background: allSigned ? '#38a169' : '#c6a64c', color: allSigned ? 'white' : '#1a1a2e',
            padding:'0.3rem 0.75rem', borderRadius:'20px', fontSize:'0.8rem', fontWeight:700,
            display:'flex', alignItems:'center', gap:'0.3rem', flexShrink:0 }}>
            {allSigned ? <CheckCircle size={14}/> : <PenLine size={14}/>}
            {allSigned ? 'All signed' : `${signed.length} of ${fields.length} signed`}
          </div>
        )}
      </div>

      {/* ── Progress bar (only after consent) ── */}
      {fields.length > 0 && consented && (
        <div style={{ background:'white', borderBottom:'1px solid #e2e8f0', padding:'0.75rem 1rem' }}>
          {/* Progress bar */}
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.5rem' }}>
            <div style={{ flex:1, height:6, background:'#e2e8f0', borderRadius:'3px', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${fields.length ? signed.length/fields.length*100 : 0}%`,
                background: allSigned ? '#38a169' : '#c6a64c',
                borderRadius:'3px', transition:'width 0.4s ease' }}/>
            </div>
            <span style={{ fontSize:'0.8rem', fontWeight:700, color: allSigned ? '#276749' : '#744210',
              flexShrink:0 }}>{signed.length}/{fields.length}</span>
          </div>

          {/* Field pills */}
          <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
            {fields.map((f, i) => {
              const isSigned = !!fieldSigs[f.id]
              return (
                <button key={f.id}
                  onClick={() => { setCurrentPage(f.page); setTimeout(() => { fieldRefs.current[f.id]?.scrollIntoView({ behavior:'smooth', block:'center' }) }, 300) }}
                  style={{ display:'flex', alignItems:'center', gap:'0.3rem',
                    padding:'0.3rem 0.65rem', borderRadius:'20px', fontSize:'0.75rem', fontWeight:700,
                    border:`1.5px solid ${isSigned ? '#c6f6d5' : '#f6e05e'}`,
                    background: isSigned ? '#f0fff4' : '#fffbeb',
                    color: isSigned ? '#276749' : '#744210', cursor:'pointer' }}>
                  {isSigned ? <CheckCircle size={11}/> : <PenLine size={11}/>}
                  Field {i+1}{f.page !== currentPage ? ` · p${f.page}` : ''}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ maxWidth:600, margin:'0 auto', padding:'1rem' }}>

        {/* ── Consent ── */}
        {!consented && (
          <div style={{ background:'white', borderRadius:'12px', padding:'1.25rem',
            marginBottom:'1rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin:'0 0 0.5rem', color:'#1a1a2e', fontSize:'1rem', fontFamily:'Georgia,serif' }}>
              Document to Sign
            </h3>
            <p style={{ color:'#4a5568', fontSize:'0.85rem', margin:'0 0 1rem', lineHeight:1.5 }}>
              Prepared for <strong>{session?.client_name}</strong> by Dieter Hartig · GJM Ultra Brokers
            </p>
            <label style={{ display:'flex', gap:'0.75rem', cursor:'pointer', alignItems:'flex-start',
              background:'#fffbeb', border:'1px solid #f6e05e', borderRadius:'8px', padding:'0.9rem' }}>
              <input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)}
                style={{ marginTop:2, accentColor:'#c6a64c', width:18, height:18, flexShrink:0 }}/>
              <span style={{ fontSize:'0.83rem', color:'#744210', lineHeight:1.5 }}>
                I confirm that I have read this document and consent to sign it electronically.
                This electronic signature is legally binding under the Electronic Communications and Transactions Act 25 of 2002.
              </span>
            </label>
            {consented && fields.length > 0 && (
              <button onClick={goToNextUnsigned}
                style={{ marginTop:'1rem', width:'100%', padding:'0.85rem', background:'#c6a64c',
                  border:'none', borderRadius:'10px', cursor:'pointer', fontWeight:700,
                  fontSize:'0.95rem', color:'#1a1a2e', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
                <PenLine size={18}/> Go to first signature
              </button>
            )}
          </div>
        )}

        {/* ── PDF Canvas ── */}
        <div style={{ background:'white', borderRadius:'12px', overflow:'hidden',
          boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:'1rem', position:'relative' }}>

          {/* Page nav */}
          {totalPages > 1 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'0.6rem 1rem', background:'#f7f8fa', borderBottom:'1px solid #e2e8f0', fontSize:'0.82rem' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1}
                style={{ padding:'0.35rem 0.75rem', background:'white', border:'1px solid #e2e8f0',
                  borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.3rem',
                  color:currentPage===1?'#a0aec0':'#4a5568' }}>
                <ChevronUp size={14}/> Prev
              </button>
              <span style={{ color:'#718096' }}>Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages}
                style={{ padding:'0.35rem 0.75rem', background:'white', border:'1px solid #e2e8f0',
                  borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.3rem',
                  color:currentPage===totalPages?'#a0aec0':'#4a5568' }}>
                Next <ChevronDown size={14}/>
              </button>
            </div>
          )}

          {/* Canvas with field overlays */}
          <div style={{ position:'relative', display:'inline-block', width:'100%' }}>
            <canvas ref={canvasRef} style={{ display:'block', width:'100%' }}/>

            {/* Signature field overlays — only on current page */}
            {consented && currentPageFields.map(field => {
              const canvas = canvasRef.current
              if (!canvas) return null
              const scaleX = canvas.clientWidth / canvas.width
              const scaleY = canvas.clientHeight / canvas.height
              const isSigned = !!fieldSigs[field.id]
              return (
                <div key={field.id}
                  ref={el => fieldRefs.current[field.id] = el}
                  onClick={() => !isSigned && setSigningField(field)}
                  style={{
                    position: 'absolute',
                    left:   field.x * scaleX,
                    top:    field.y * scaleY,
                    width:  field.w * scaleX,
                    height: field.h * scaleY,
                    border: isSigned ? '2px solid #38a169' : '2px solid #c6a64c',
                    borderRadius: 6,
                    background: isSigned ? 'rgba(56,161,105,0.06)' : 'rgba(198,166,76,0.08)',
                    cursor: isSigned ? 'default' : 'pointer',
                    zIndex: 10,
                    animation: isSigned ? 'none' : 'pulse 2s infinite',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 2,
                    transition: 'all 0.2s',
                  }}>
                  {isSigned ? (
                    <img src={fieldSigs[field.id]}
                      style={{ maxWidth:'90%', maxHeight:'88%', objectFit:'contain', animation:'popIn 0.3s ease' }}
                      alt="Signature"/>
                  ) : (
                    <>
                      <PenLine size={18} color="#c6a64c"/>
                      <span style={{ fontSize:'0.68rem', color:'#744210', fontWeight:700, textAlign:'center',
                        lineHeight:1.2, padding:'0 4px' }}>
                        Tap to sign
                      </span>
                      <span style={{ fontSize:'0.62rem', color:'#a0aec0', textAlign:'center' }}>
                        {field.label}
                      </span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Next Signature Button (sticky) ── */}
        {consented && !allSigned && unsigned.length > 0 && (
          <div style={{ position:'sticky', bottom:'1rem', zIndex:50 }}>
            <button onClick={goToNextUnsigned}
              style={{ width:'100%', padding:'1rem', background:'#c6a64c', border:'none',
                borderRadius:'12px', cursor:'pointer', fontWeight:700, fontSize:'0.95rem',
                color:'#1a1a2e', boxShadow:'0 4px 20px rgba(198,166,76,0.5)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem' }}>
              <PenLine size={20}/>
              {unsigned.length === fields.length
                ? `Sign here (${fields.length} signature${fields.length>1?'s':''})`
                : `Next signature · ${unsigned.length} remaining`}
            </button>
          </div>
        )}

        {/* ── Submit button (when all signed) ── */}
        {consented && allSigned && (
          <div style={{ position:'sticky', bottom:'1rem', zIndex:50 }}>
            <button onClick={handleSubmit} disabled={submitting}
              style={{ width:'100%', padding:'1rem', background:'#38a169', border:'none',
                borderRadius:'12px', cursor:'pointer', fontWeight:700, fontSize:'1rem',
                color:'white', boxShadow:'0 4px 20px rgba(56,161,105,0.4)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem',
                animation:'popIn 0.3s ease' }}>
              <CheckCircle size={22}/>
              {submitting ? 'Submitting…' : 'Submit — All Signed'}
            </button>
          </div>
        )}

        {/* Legal footer */}
        <div style={{ marginTop:'4rem', padding:'0.75rem', fontSize:'0.72rem', color:'#a0aec0',
          textAlign:'center', lineHeight:1.5 }}>
          <Shield size={11} style={{ display:'inline', marginRight:'0.3rem' }}/>
          GJM Ultra Brokers | Authorised Financial Services Provider
          <br/>Electronic signature valid under ECTA 25 of 2002 & FAIS Act 37 of 2002
        </div>
      </div>

      {/* ── Signature Pad Modal ── */}
      {signingField && (
        <SignaturePad
          label={`Sign: ${signingField.label}`}
          onDone={dataUrl => applyFieldSig(signingField.id, dataUrl)}
          onCancel={() => setSigningField(null)}/>
      )}
    </div>
  )
}
