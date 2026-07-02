import { useState, useRef, useEffect, useCallback } from 'react'
import { FileSignature, Upload, Download, Plus, CheckCircle, X,
         User, Shield, Clock, Hash, Send, Copy, ExternalLink,
         RefreshCw, Trash2, Eye } from 'lucide-react'
import {
  createSigningSession, listSigningSessions, getSigningSession,
  submitAdvisorSignature, deleteSigningSession, subscribeToSession
} from '../lib/signingService'

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

function StatusBadge({ status }) {
  const cfg = {
    pending:       { bg:'#fffbeb', color:'#744210', text:'⏳ Awaiting Client' },
    client_signed: { bg:'#ebf8ff', color:'#2b6cb0', text:'✍️ Client Signed' },
    complete:      { bg:'#f0fff4', color:'#276749', text:'✅ Complete' },
  }[status] || { bg:'#f7fafc', color:'#718096', text:status }
  return (
    <span style={{ padding:'0.2rem 0.6rem', borderRadius:'20px', fontSize:'0.75rem',
      fontWeight:700, background:cfg.bg, color:cfg.color }}>
      {cfg.text}
    </span>
  )
}

function SignaturePad({ onDone, onCancel, label }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [mode, setMode] = useState('draw')
  const [typedName, setTypedName] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle='#1a1a2e'; ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.lineJoin='round'
  }, [mode])

  const getPos=(e,canvas)=>{
    const rect=canvas.getBoundingClientRect(), src=e.touches?e.touches[0]:e
    return{x:(src.clientX-rect.left)*(canvas.width/rect.width),
           y:(src.clientY-rect.top)*(canvas.height/rect.height)}
  }
  const startDraw=e=>{e.preventDefault();const canvas=canvasRef.current,ctx=canvas.getContext('2d'),pos=getPos(e,canvas);ctx.beginPath();ctx.moveTo(pos.x,pos.y);setDrawing(true)}
  const draw=e=>{e.preventDefault();if(!drawing)return;const canvas=canvasRef.current,ctx=canvas.getContext('2d'),pos=getPos(e,canvas);ctx.lineTo(pos.x,pos.y);ctx.stroke();setHasStrokes(true)}
  const endDraw=()=>setDrawing(false)
  const clear=()=>{canvasRef.current.getContext('2d').clearRect(0,0,460,120);setHasStrokes(false)}
  const applyTyped=()=>{if(!typedName.trim())return;const canvas=canvasRef.current,ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.font='italic 36px Georgia, serif';ctx.fillStyle='#1a1a2e';ctx.fillText(typedName,16,60);setHasStrokes(true)}

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:'white',borderRadius:'12px',padding:'1.5rem',width:'min(500px,100%)',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <h3 style={{margin:0,fontFamily:'var(--font-display)',color:'var(--navy)',fontSize:'1.1rem'}}>{label}</h3>
          <button onClick={onCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--slate)'}}><X size={20}/></button>
        </div>
        <div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem'}}>
          {['draw','type'].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setHasStrokes(false)}}
              style={{flex:1,padding:'0.5rem',border:`2px solid ${mode===m?'var(--gold)':'var(--border-light)'}`,borderRadius:'6px',background:mode===m?'var(--gold)':'white',color:mode===m?'var(--black)':'var(--slate)',fontWeight:mode===m?700:400,cursor:'pointer',fontSize:'0.85rem'}}>
              {m==='draw'?'✏️ Draw':'⌨️ Type name'}
            </button>
          ))}
        </div>
        {mode==='type'&&(
          <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.75rem'}}>
            <input value={typedName} onChange={e=>setTypedName(e.target.value)} placeholder="Type your full name"
              style={{flex:1,padding:'0.6rem 0.75rem',border:'1.5px solid var(--border-light)',borderRadius:'6px',fontSize:'0.9rem'}}/>
            <button onClick={applyTyped} style={{padding:'0.6rem 1rem',background:'var(--navy)',color:'white',border:'none',borderRadius:'6px',cursor:'pointer'}}>Apply</button>
          </div>
        )}
        <div style={{border:'2px dashed var(--border-light)',borderRadius:'8px',background:'#fafafa',position:'relative',marginBottom:'1rem'}}>
          <canvas ref={canvasRef} width={460} height={120}
            style={{display:'block',width:'100%',touchAction:'none',cursor:'crosshair'}}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}/>
          {!hasStrokes&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--slate)',fontSize:'0.85rem',pointerEvents:'none'}}>
            {mode==='draw'?'Sign here':'Type name and click Apply'}
          </div>}
        </div>
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <button onClick={clear} style={{padding:'0.6rem 1rem',background:'none',border:'1.5px solid var(--border-light)',borderRadius:'6px',cursor:'pointer',color:'var(--slate)'}}>Clear</button>
          <button onClick={()=>onDone(canvasRef.current.toDataURL('image/png'))} disabled={!hasStrokes}
            style={{padding:'0.6rem 1.5rem',background:hasStrokes?'var(--gold)':'var(--border-light)',color:hasStrokes?'var(--black)':'var(--slate)',border:'none',borderRadius:'6px',cursor:hasStrokes?'pointer':'not-allowed',fontWeight:700}}>
            Use this signature
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SigningPage() {
  const [view, setView]             = useState('dashboard') // dashboard | new | session
  const [sessions, setSessions]     = useState([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [selectedSession, setSelectedSession] = useState(null)
  // New session state
  // Multi-document support
  const [pdfs, setPdfs]             = useState([]) // [{id,name,file,bytes,url,pageCount}]
  const [activePdfId, setActivePdfId] = useState(null)
  const [sigFields, setSigFields]   = useState([]) // each field has pdfId
  const [placing, setPlacing]       = useState(null)
  // Derived from active PDF
  const activePdf   = pdfs.find(p => p.id === activePdfId) || pdfs[0] || null
  const pageCount   = activePdf?.pageCount || 1
  const [currentPage, setCurrentPage] = useState(1)
  const [clientName, setClientName] = useState('')
  const [clientMobile, setClientMobile] = useState('')
  const [docHash, setDocHash]       = useState('')
  const [creating, setCreating]     = useState(false)
  const [createdLink, setCreatedLink] = useState('')
  const [copied, setCopied]         = useState(false)
  // Advisor signing state
  const [editingAdvisor, setEditingAdvisor] = useState(false)
  const [advisorSig, setAdvisorSig] = useState(null)
  const [generating, setGenerating] = useState(false)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const loadSessions = useCallback(() => {
    setLoadingSessions(true)
    listSigningSessions()
      .then(setSessions)
      .catch(e => console.error(e))
      .finally(() => setLoadingSessions(false))
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  // Real-time updates for selected session
  useEffect(() => {
    if (!selectedSession?.session_token) return
    const sub = subscribeToSession(selectedSession.session_token, updated => {
      setSelectedSession(updated)
      loadSessions()
    })
    return () => sub.unsubscribe()
  }, [selectedSession?.session_token, loadSessions])

  // Load pdf.js
  useEffect(() => {
    if (window.pdfjsLib) return
    const s = document.createElement('script')
    s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    s.onload=()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}
    document.head.appendChild(s)
  }, [])

  // Render PDF page
  useEffect(() => {
    if (!activePdf?.url || !window.pdfjsLib || !canvasRef.current) return
    let cancelled=false
    ;(async()=>{
      const pdf=await window.pdfjsLib.getDocument(activePdf.url).promise
      const page=await pdf.getPage(Math.min(currentPage, activePdf.pageCount))
      const viewport=page.getViewport({scale:1.5})
      const canvas=canvasRef.current
      if(!canvas||cancelled)return
      canvas.width=viewport.width; canvas.height=viewport.height
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise
    })()
    return()=>{cancelled=true}
  }, [activePdf?.url, activePdf?.id, currentPage])

  const handleFiles = async e => {
    const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf')
    if (!files.length) return
    const newPdfs = []
    for (const file of files) {
      const bytes = await file.arrayBuffer()
      const url   = URL.createObjectURL(file)
      const id    = Date.now() + Math.random()
      let pages   = 1
      if (window.pdfjsLib) {
        const pdf = await window.pdfjsLib.getDocument(url).promise
        pages = pdf.numPages
      }
      newPdfs.push({ id, name: file.name, file, bytes: new Uint8Array(bytes), url, pageCount: pages })
    }
    setPdfs(prev => {
      const combined = [...prev, ...newPdfs]
      if (!activePdfId) setActivePdfId(combined[0].id)
      return combined
    })
    setCreatedLink('')
    setCurrentPage(1)
    // Update hash from first new file
    const firstBytes = newPdfs[0]?.bytes
    if (firstBytes) {
      const hash = await sha256(new TextDecoder().decode(firstBytes.slice(0, 10000)))
      setDocHash(hash.slice(0, 16).toUpperCase())
    }
    e.target.value = '' // allow re-selecting same file
  }

  const removePdf = (id) => {
    setPdfs(prev => {
      const next = prev.filter(p => p.id !== id)
      if (activePdfId === id) setActivePdfId(next[0]?.id || null)
      return next
    })
    setSigFields(prev => prev.filter(f => f.pdfId !== id))
    setCurrentPage(1)
  }

  const replacePdf = async (id, file) => {
    if (!file || file.type !== 'application/pdf') return
    const bytes = await file.arrayBuffer()
    const url   = URL.createObjectURL(file)
    let pages   = 1
    if (window.pdfjsLib) {
      const pdf = await window.pdfjsLib.getDocument(url).promise
      pages = pdf.numPages
    }
    setPdfs(prev => prev.map(p => p.id === id
      ? { ...p, name: file.name, file, bytes: new Uint8Array(bytes), url, pageCount: pages }
      : p
    ))
    setSigFields(prev => prev.filter(f => f.pdfId !== id))
    setCurrentPage(1)
  }

  const handleCanvasClick = e => {
    if(!placing||!activePdf)return
    const canvas=canvasRef.current, rect=canvas.getBoundingClientRect()
    const scaleX=canvas.width/rect.width, scaleY=canvas.height/rect.height
    const x=(e.clientX-rect.left)*scaleX, y=(e.clientY-rect.top)*scaleY
    setSigFields(f=>[...f,{id:Date.now(),pdfId:activePdf.id,pdfName:activePdf.name,page:currentPage,x:x-120,y:y-30,w:240,h:60,label:placing.label,role:placing.role,sig:null}])
    setPlacing(null)
  }

  const toB64 = (bytes) => {
    let b64 = ''
    const CHUNK = 8192
    for (let i = 0; i < bytes.length; i += CHUNK) {
      b64 += btoa(String.fromCharCode(...bytes.subarray(i, i + CHUNK)))
    }
    return b64
  }

  const createSession = async () => {
    if(!pdfs.length||!clientName.trim())return
    setCreating(true)
    try {
      let finalBytes, finalName

      if (pdfs.length === 1) {
        // Single PDF — use as-is
        finalBytes = pdfs[0].bytes
        finalName  = pdfs[0].name
      } else {
        // Multiple PDFs — merge with pdf-lib
        if (!window.PDFLib) {
          await new Promise(resolve => {
            const s = document.createElement('script')
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'
            s.onload = resolve; document.head.appendChild(s)
          })
        }
        const { PDFDocument } = window.PDFLib
        const merged = await PDFDocument.create()
        for (const pdf of pdfs) {
          const src = await PDFDocument.load(pdf.bytes)
          const pages = await merged.copyPages(src, src.getPageIndices())
          pages.forEach(p => merged.addPage(p))
        }
        finalBytes = await merged.save()
        finalName  = `${pdfs.map(p=>p.name.replace('.pdf','')).join('_+_')}.pdf`
      }

      // Map sigFields: adjust page numbers for merged PDF
      let pageOffset = 0
      const mergedFields = []
      for (const pdf of pdfs) {
        const fields = sigFields.filter(f => f.pdfId === pdf.id)
        fields.forEach(f => mergedFields.push({ ...f, page: f.page + pageOffset }))
        pageOffset += pdf.pageCount
      }

      const b64 = toB64(new Uint8Array(finalBytes instanceof Uint8Array ? finalBytes.buffer : finalBytes))
      const { signingUrl } = await createSigningSession({
        documentName: finalName,
        documentB64:  b64,
        sigFields:    mergedFields.filter(f => f.role === 'client'),
        clientName:   clientName.trim(),
        clientMobile: clientMobile.trim(),
        docHash
      })
      setCreatedLink(signingUrl)
      loadSessions()
    } catch(e) {
      alert('Error creating session: ' + e.message)
      console.error(e)
    }
    setCreating(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(createdLink)
    setCopied(true)
    setTimeout(()=>setCopied(false), 2000)
  }

  const openSession = async (s) => {
    const full = await getSigningSession(s.session_token)
    setSelectedSession(full)
    setAdvisorSig(full.advisor_sig || null)
    setView('session')
  }

  const submitAdvisor = async () => {
    if(!advisorSig||!selectedSession)return
    setGenerating(true)
    try {
      await submitAdvisorSignature(selectedSession.session_token, { advisorSig })
      // Generate final signed PDF
      await generateFinalPDF(selectedSession, advisorSig)
      loadSessions()
      setSelectedSession(s=>({...s,status:'complete',advisor_sig:advisorSig}))
    } catch(e) { alert('Error: '+e.message) }
    setGenerating(false)
  }

  const generateFinalPDF = async (session, advSig) => {
    if(!window.PDFLib){
      await new Promise(resolve=>{
        const s=document.createElement('script')
        s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'
        s.onload=resolve; document.head.appendChild(s)
      })
    }
    const {PDFDocument,rgb,StandardFonts}=window.PDFLib
    // Decode base64 safely for large files
    const b64str = session.document_b64
    const raw = atob(b64str)
    const pdfBytes2 = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) pdfBytes2[i] = raw.charCodeAt(i)
    const pdfDoc=await PDFDocument.load(pdfBytes2)
    const pages=pdfDoc.getPages()
    const font=await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontB=await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Embed client signature
    if(session.client_sig&&session.sig_fields){
      for(const field of session.sig_fields){
        if(field.role!=='client')continue
        const page=pages[field.page-1]
        const{height:pH}=page.getSize(), scale=1/1.5
        const imgBytes=await fetch(session.client_sig).then(r=>r.arrayBuffer())
        const img=await pdfDoc.embedPng(imgBytes)
        page.drawImage(img,{x:field.x*scale,y:pH-(field.y+field.h)*scale,width:field.w*scale,height:field.h*scale})
        page.drawText(`${session.client_name} | ${new Date().toLocaleDateString('en-ZA')}`,{x:field.x*scale,y:pH-(field.y+field.h+14)*scale,size:7,font,color:rgb(0.4,0.4,0.4)})
        page.drawLine({start:{x:field.x*scale,y:pH-(field.y+field.h)*scale},end:{x:(field.x+field.w)*scale,y:pH-(field.y+field.h)*scale},thickness:0.5,color:rgb(0.6,0.6,0.6)})
      }
    }

    // Embed advisor signature on last page
    if(advSig){
      const lastPage=pages[pages.length-1]
      const{width:pW,height:pH}=lastPage.getSize()
      const imgBytes=await fetch(advSig).then(r=>r.arrayBuffer())
      const img=await pdfDoc.embedPng(imgBytes)
      lastPage.drawImage(img,{x:pW-200,y:50,width:160,height:50})
      lastPage.drawText(`Dieter Hartig | ${new Date().toLocaleDateString('en-ZA')}`,{x:pW-200,y:40,size:7,font,color:rgb(0.4,0.4,0.4)})
      lastPage.drawLine({start:{x:pW-200,y:50},end:{x:pW-40,y:50},thickness:0.5,color:rgb(0.6,0.6,0.6)})
    }

    // Audit certificate page
    const auditPage=pdfDoc.addPage([595,842])
    const{width:aW,height:aH}=auditPage.getSize()
    const navy=rgb(0.05,0.08,0.22), gold=rgb(0.78,0.65,0.29), grey=rgb(0.45,0.45,0.45)
    auditPage.drawRectangle({x:0,y:aH-80,width:aW,height:80,color:navy})
    auditPage.drawText('ELECTRONIC SIGNATURE AUDIT CERTIFICATE',{x:40,y:aH-38,size:14,font:fontB,color:gold})
    auditPage.drawText('GJM Ultra Brokers — FSCA/ECTA Compliant Electronic Record',{x:40,y:aH-54,size:9,font,color:rgb(0.8,0.8,0.8)})
    let y=aH-110
    const rows=[
      ['Document:',session.document_name],
      ['Document Hash:',session.doc_hash||''],
      ['Client:',session.client_name||''],
      ['Client Mobile:',session.client_mobile||''],
      ['Advisor:',session.advisor_name||'Dieter Hartig'],
      ['Date Signed:',new Date().toLocaleString('en-ZA')],
      ['Legal Basis:','Electronic Communications and Transactions Act 25 of 2002 (ECTA) s13'],
      ['FAIS:','FAIS Act 37 of 2002 — record-keeping per FSCA requirements'],
    ]
    auditPage.drawText('DOCUMENT & PARTIES',{x:40,y,size:10,font:fontB,color:navy}); y-=4
    auditPage.drawLine({start:{x:40,y},end:{x:aW-40,y},thickness:1,color:gold}); y-=16
    for(const[l,v]of rows){
      auditPage.drawText(l,{x:40,y,size:9,font:fontB,color:rgb(0.1,0.1,0.1)})
      auditPage.drawText(v,{x:200,y,size:9,font,color:grey}); y-=16
    }
    y-=8
    auditPage.drawText('AUDIT TRAIL',{x:40,y,size:10,font:fontB,color:navy}); y-=4
    auditPage.drawLine({start:{x:40,y},end:{x:aW-40,y},thickness:1,color:gold}); y-=14
    for(const entry of(session.audit_trail||[])){
      if(y<60)break
      const time=new Date(entry.ts).toLocaleString('en-ZA')
      auditPage.drawText(`[${time}] ${entry.action}`,{x:40,y,size:7.5,font:fontB,color:rgb(0.1,0.1,0.1)}); y-=11
      const words=(entry.detail||'').split(' '); let line=''
      for(const word of words){
        if((line+' '+word).length>85){auditPage.drawText(line,{x:55,y,size:7,font,color:grey});y-=10;line=word}
        else line=line?line+' '+word:word
      }
      if(line){auditPage.drawText(line,{x:55,y,size:7,font,color:grey});y-=10}
      y-=4
    }
    auditPage.drawRectangle({x:0,y:0,width:aW,height:36,color:rgb(0.96,0.96,0.96)})
    auditPage.drawText('Electronically signed under ECTA 25 of 2002. GJM Ultra Brokers | Authorised Financial Services Provider | FSCA',{x:40,y:14,size:7,font,color:grey})

    const signed=await pdfDoc.save()
    const blob=new Blob([signed],{type:'application/pdf'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a'); a.href=url
    a.download=`SIGNED_${session.document_name}`; a.click()
  }

  // ── DASHBOARD VIEW ──────────────────────────────────────────────────────────
  if(view==='dashboard') return (
    <div style={{maxWidth:'900px',margin:'0 auto',padding:'1.5rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
        <div>
          <h1 style={{fontFamily:'var(--font-display)',color:'var(--navy)',margin:0,fontSize:'1.5rem',display:'flex',alignItems:'center',gap:'0.6rem'}}>
            <FileSignature size={26} color="var(--gold)"/> Document Signing
          </h1>
          <p style={{color:'var(--slate)',margin:'0.3rem 0 0',fontSize:'0.85rem'}}>
            Send documents to clients for remote signing. Signed PDFs download automatically with audit trail.
          </p>
        </div>
        <div style={{display:'flex',gap:'0.75rem'}}>
          <button onClick={loadSessions} style={{padding:'0.6rem 1rem',background:'none',border:'1.5px solid var(--border-light)',borderRadius:'8px',cursor:'pointer',color:'var(--slate)',display:'flex',alignItems:'center',gap:'0.4rem',fontSize:'0.85rem'}}>
            <RefreshCw size={14}/> Refresh
          </button>
          <button onClick={()=>setView('new')} style={{padding:'0.6rem 1.25rem',background:'var(--gold)',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:700,color:'var(--black)',display:'flex',alignItems:'center',gap:'0.4rem'}}>
            <Plus size={16}/> New Signing Request
          </button>
        </div>
      </div>

      {loadingSessions ? (
        <div style={{textAlign:'center',padding:'3rem',color:'var(--slate)'}}>Loading sessions…</div>
      ) : sessions.length === 0 ? (
        <div style={{textAlign:'center',padding:'4rem',background:'var(--off-white)',borderRadius:'12px',border:'2px dashed var(--border-light)'}}>
          <FileSignature size={48} color="var(--gold)" style={{marginBottom:'1rem'}}/>
          <h3 style={{color:'var(--navy)',fontFamily:'var(--font-display)',margin:'0 0 0.5rem'}}>No signing sessions yet</h3>
          <p style={{color:'var(--slate)',margin:'0 0 1.5rem'}}>Create a signing request to send a document to a client</p>
          <button onClick={()=>setView('new')} style={{padding:'0.75rem 2rem',background:'var(--gold)',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:700,color:'var(--black)'}}>
            Create First Request
          </button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
          {sessions.map(s=>(
            <div key={s.id} style={{background:'white',border:'1px solid var(--border-light)',borderRadius:'10px',padding:'1rem 1.25rem',display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontWeight:700,color:'var(--navy)',fontSize:'0.9rem'}}>{s.document_name}</div>
                <div style={{color:'var(--slate)',fontSize:'0.82rem',marginTop:'0.2rem'}}>{s.client_name}</div>
              </div>
              <StatusBadge status={s.status}/>
              <div style={{fontSize:'0.78rem',color:'var(--slate)',display:'flex',alignItems:'center',gap:'0.3rem'}}>
                <Clock size={12}/>{new Date(s.created_at).toLocaleDateString('en-ZA')}
              </div>
              <div style={{display:'flex',gap:'0.5rem'}}>
                <button onClick={()=>openSession(s)} style={{padding:'0.4rem 0.9rem',background:'var(--navy)',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'0.8rem',fontWeight:600,display:'flex',alignItems:'center',gap:'0.3rem'}}>
                  <Eye size={13}/> View
                </button>
                <button onClick={async()=>{if(confirm('Delete this session?'))await deleteSigningSession(s.session_token).then(loadSessions)}}
                  style={{padding:'0.4rem',background:'none',border:'1px solid #fed7d7',borderRadius:'6px',cursor:'pointer',color:'#c53030'}}>
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── SESSION DETAIL VIEW ─────────────────────────────────────────────────────
  if(view==='session'&&selectedSession) return (
    <div style={{maxWidth:'900px',margin:'0 auto',padding:'1.5rem'}}>
      <button onClick={()=>setView('dashboard')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--slate)',marginBottom:'1rem',fontSize:'0.85rem',display:'flex',alignItems:'center',gap:'0.3rem'}}>
        ← Back to Dashboard
      </button>
      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:'1.5rem',alignItems:'start'}}>
        <div>
          <div style={{background:'white',border:'1px solid var(--border-light)',borderRadius:'10px',padding:'1.25rem',marginBottom:'1rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
              <div>
                <h2 style={{margin:0,fontFamily:'var(--font-display)',color:'var(--navy)',fontSize:'1.1rem'}}>{selectedSession.document_name}</h2>
                <p style={{margin:'0.25rem 0 0',color:'var(--slate)',fontSize:'0.85rem'}}>Client: {selectedSession.client_name}</p>
              </div>
              <StatusBadge status={selectedSession.status}/>
            </div>

            {/* Signing link */}
            {selectedSession.status==='pending'&&(
              <div style={{background:'#fffbeb',border:'1px solid #f6e05e',borderRadius:'8px',padding:'1rem',marginBottom:'1rem'}}>
                <div style={{fontWeight:700,color:'#744210',fontSize:'0.85rem',marginBottom:'0.5rem'}}>
                  📱 Share this link with {selectedSession.client_name}:
                </div>
                <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
                  <input readOnly value={`${window.location.origin}/sign/${selectedSession.session_token}`}
                    style={{flex:1,padding:'0.5rem',border:'1px solid #ecc94b',borderRadius:'6px',fontSize:'0.78rem',background:'white',color:'var(--navy)'}}/>
                  <button onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}/sign/${selectedSession.session_token}`);setCopied(true);setTimeout(()=>setCopied(false),2000)}}
                    style={{padding:'0.5rem 0.9rem',background:copied?'#38a169':'var(--navy)',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'0.8rem',fontWeight:700,display:'flex',alignItems:'center',gap:'0.3rem'}}>
                    <Copy size={13}/>{copied?'Copied!':'Copy'}
                  </button>
                </div>
                <p style={{margin:'0.5rem 0 0',color:'#744210',fontSize:'0.78rem'}}>
                  Send via WhatsApp or email. The client can sign on any device. This link is valid for 7 days.
                </p>
              </div>
            )}

            {/* Client signed — add advisor signature */}
            {(selectedSession.status==='client_signed'||selectedSession.status==='complete')&&(
              <div style={{background:'#ebf8ff',border:'1px solid #90cdf4',borderRadius:'8px',padding:'1rem',marginBottom:'1rem'}}>
                <div style={{fontWeight:700,color:'#2b6cb0',fontSize:'0.85rem',marginBottom:'0.5rem'}}>
                  ✍️ {selectedSession.client_name} has signed. Add your signature to finalise:
                </div>
                {selectedSession.client_sig&&(
                  <div style={{marginBottom:'0.75rem'}}>
                    <div style={{fontSize:'0.78rem',color:'var(--slate)',marginBottom:'0.3rem'}}>Client signature:</div>
                    <img src={selectedSession.client_sig} style={{maxHeight:60,border:'1px solid var(--border-light)',borderRadius:'4px',background:'white',padding:'0.25rem'}} alt="Client signature"/>
                  </div>
                )}
                {selectedSession.status==='complete' ? (
                  <div style={{color:'#276749',fontWeight:700,fontSize:'0.85rem'}}>✅ Fully signed. Download above.</div>
                ) : advisorSig ? (
                  <div>
                    <img src={advisorSig} style={{maxHeight:60,marginBottom:'0.5rem',border:'1px solid var(--border-light)',borderRadius:'4px',background:'white',padding:'0.25rem'}} alt="Advisor signature"/>
                    <div style={{display:'flex',gap:'0.5rem'}}>
                      <button onClick={()=>setAdvisorSig(null)} style={{padding:'0.4rem 0.75rem',background:'none',border:'1px solid var(--border-light)',borderRadius:'6px',cursor:'pointer',color:'var(--slate)',fontSize:'0.8rem'}}>Re-sign</button>
                      <button onClick={submitAdvisor} disabled={generating}
                        style={{padding:'0.4rem 1rem',background:'var(--gold)',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:700,color:'var(--black)',fontSize:'0.8rem',display:'flex',alignItems:'center',gap:'0.3rem'}}>
                        <Download size={14}/>{generating?'Generating…':'Finalise & Download'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={()=>setEditingAdvisor(true)}
                    style={{padding:'0.6rem 1.25rem',background:'var(--gold)',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:700,color:'var(--black)',fontSize:'0.85rem',display:'flex',alignItems:'center',gap:'0.4rem'}}>
                    <Shield size={15}/> Add My Signature
                  </button>
                )}
              </div>
            )}

            {/* PDF preview */}
            {selectedSession.document_b64&&(
              <iframe src={`data:application/pdf;base64,${selectedSession.document_b64}`}
                style={{width:'100%',height:'500px',border:'1px solid var(--border-light)',borderRadius:'8px'}} title="Document"/>
            )}
          </div>
        </div>

        {/* Audit trail sidebar */}
        <div style={{background:'white',border:'1px solid var(--border-light)',borderRadius:'10px',padding:'1.25rem'}}>
          <div style={{fontWeight:700,color:'var(--navy)',marginBottom:'0.75rem',display:'flex',alignItems:'center',gap:'0.4rem'}}>
            <Shield size={16} color="var(--gold)"/> Audit Trail
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'0.75rem',maxHeight:'500px',overflowY:'auto'}}>
            {(selectedSession.audit_trail||[]).map((e,i)=>(
              <div key={i} style={{borderLeft:'2px solid var(--gold)',paddingLeft:'0.75rem',fontSize:'0.78rem'}}>
                <div style={{fontWeight:700,color:'var(--navy)',fontSize:'0.75rem'}}>{e.action}</div>
                <div style={{color:'var(--slate)',fontSize:'0.72rem'}}>{new Date(e.ts).toLocaleString('en-ZA')}</div>
                <div style={{color:'var(--slate)',marginTop:'0.2rem',lineHeight:1.4}}>{e.detail?.slice(0,120)}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:'1rem',padding:'0.75rem',background:'var(--off-white)',borderRadius:'6px',fontSize:'0.72rem',color:'var(--slate)'}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.3rem',marginBottom:'0.3rem'}}>
              <Hash size={11}/> Doc hash: {selectedSession.doc_hash}
            </div>
            ECTA 25 of 2002 compliant
          </div>
        </div>
      </div>

      {editingAdvisor&&(
        <SignaturePad label="Dieter Hartig — Advisor Signature"
          onDone={sig=>{setAdvisorSig(sig);setEditingAdvisor(false)}}
          onCancel={()=>setEditingAdvisor(false)}/>
      )}
    </div>
  )

  // ── NEW SESSION VIEW ─────────────────────────────────────────────────────
  return (
    <div style={{maxWidth:'1000px',margin:'0 auto',padding:'1.5rem'}}>
      <button onClick={()=>setView('dashboard')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--slate)',marginBottom:'1rem',fontSize:'0.85rem',display:'flex',alignItems:'center',gap:'0.3rem'}}>
        ← Back
      </button>
      <h2 style={{fontFamily:'var(--font-display)',color:'var(--navy)',margin:'0 0 1.5rem',fontSize:'1.3rem'}}>
        New Signing Request
      </h2>

      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:'1.5rem',alignItems:'start'}}>
        <div>

          {/* ── Document list + upload ── */}
          <div style={{marginBottom:'1rem'}}>
            {pdfs.length > 0 && (
              <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',marginBottom:'0.75rem'}}>
                {pdfs.map((pdf,i) => (
                  <div key={pdf.id} style={{display:'flex',alignItems:'center',gap:'0.6rem',padding:'0.6rem 0.9rem',
                    background:activePdfId===pdf.id?'var(--navy)':'var(--off-white)',
                    border:`2px solid ${activePdfId===pdf.id?'var(--gold)':'var(--border-light)'}`,
                    borderRadius:'8px',cursor:'pointer'}}
                    onClick={()=>{setActivePdfId(pdf.id);setCurrentPage(1)}}>
                    <div style={{width:28,height:28,borderRadius:'6px',background:activePdfId===pdf.id?'var(--gold)':'var(--border-light)',
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',fontWeight:700,
                      color:activePdfId===pdf.id?'var(--black)':'var(--slate)',flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:'0.85rem',color:activePdfId===pdf.id?'white':'var(--navy)',
                        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pdf.name}</div>
                      <div style={{fontSize:'0.72rem',color:activePdfId===pdf.id?'rgba(255,255,255,0.6)':'var(--slate)'}}>
                        {pdf.pageCount} page{pdf.pageCount!==1?'s':''} · {sigFields.filter(f=>f.pdfId===pdf.id).length} field{sigFields.filter(f=>f.pdfId===pdf.id).length!==1?'s':''}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'0.35rem',flexShrink:0}}>
                      {/* Replace button */}
                      <label title="Replace this document" style={{width:28,height:28,borderRadius:'5px',
                        background:'rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',
                        cursor:'pointer',color:activePdfId===pdf.id?'white':'var(--slate)'}}>
                        <Upload size={13}/>
                        <input type="file" accept="application/pdf" style={{display:'none'}}
                          onChange={e=>{if(e.target.files[0])replacePdf(pdf.id,e.target.files[0]);e.target.value=''}}/>
                      </label>
                      {/* Delete button */}
                      <button onClick={e=>{e.stopPropagation();removePdf(pdf.id)}}
                        title="Remove this document"
                        style={{width:28,height:28,borderRadius:'5px',background:'rgba(220,53,69,0.15)',border:'none',
                          display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#dc3545'}}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add more / first upload */}
            <div onClick={()=>fileInputRef.current?.click()}
              style={{border:`2px dashed ${pdfs.length?'var(--border-light)':'var(--gold)'}`,borderRadius:'10px',
                padding:pdfs.length?'0.75rem 1rem':'2.5rem 2rem',textAlign:'center',cursor:'pointer',
                background:'var(--off-white)',display:'flex',alignItems:'center',
                justifyContent:pdfs.length?'flex-start':'center',gap:'0.75rem',
                flexDirection:pdfs.length?'row':'column'}}>
              <Upload size={pdfs.length?18:40} color="var(--gold)"/>
              {pdfs.length ? (
                <span style={{color:'var(--slate)',fontSize:'0.85rem',fontWeight:600}}>Add another document</span>
              ) : (
                <div>
                  <h3 style={{color:'var(--navy)',margin:'0 0 0.4rem',fontFamily:'var(--font-display)'}}>Upload PDF to Send</h3>
                  <p style={{color:'var(--slate)',margin:0,fontSize:'0.85rem'}}>ROA, FNA, RA Calculation, or any compliance document</p>
                  <p style={{color:'var(--slate)',margin:'0.3rem 0 0',fontSize:'0.78rem'}}>You can add multiple documents</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="application/pdf" multiple onChange={handleFiles} style={{display:'none'}}/>
            </div>
          </div>

          {/* ── PDF canvas for active document ── */}
          {activePdf && (
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.75rem',
                padding:'0.75rem',background:'var(--navy)',borderRadius:'8px',flexWrap:'wrap'}}>
                <span style={{color:'var(--gold)',fontSize:'0.8rem',fontWeight:700}}>
                  Placing on: {activePdf.name}
                </span>
                <button onClick={()=>setPlacing({role:'client',label:`${clientName||'Client'} Signature`})}
                  style={{display:'flex',alignItems:'center',gap:'0.4rem',padding:'0.5rem 0.9rem',
                    background:placing?.role==='client'?'var(--gold)':'rgba(255,255,255,0.1)',
                    color:placing?.role==='client'?'var(--black)':'white',
                    border:'1.5px solid rgba(255,255,255,0.2)',borderRadius:'6px',cursor:'pointer',fontSize:'0.8rem',fontWeight:600}}>
                  <User size={14}/>{placing?.role==='client'?'→ Click on PDF':'+ Client Signature'}
                </button>
                {placing&&<button onClick={()=>setPlacing(null)}
                  style={{padding:'0.5rem 0.75rem',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.6)',
                    border:'1px solid rgba(255,255,255,0.15)',borderRadius:'6px',cursor:'pointer',fontSize:'0.8rem'}}>Cancel</button>}
                {pageCount>1&&<div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'0.5rem'}}>
                  <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1}
                    style={{padding:'0.35rem 0.75rem',background:'rgba(255,255,255,0.1)',color:'white',border:'none',borderRadius:'4px',cursor:'pointer'}}>‹</button>
                  <span style={{color:'white',fontSize:'0.82rem'}}>Page {currentPage}/{pageCount}</span>
                  <button onClick={()=>setCurrentPage(p=>Math.min(pageCount,p+1))} disabled={currentPage===pageCount}
                    style={{padding:'0.35rem 0.75rem',background:'rgba(255,255,255,0.1)',color:'white',border:'none',borderRadius:'4px',cursor:'pointer'}}>›</button>
                </div>}
              </div>
              {placing&&<div style={{padding:'0.6rem 1rem',background:'#fff3cd',borderRadius:'6px',marginBottom:'0.5rem',fontSize:'0.85rem',color:'#856404'}}>
                📌 Click where you want the signature box on "{activePdf.name}"
              </div>}
              <div style={{position:'relative',display:'inline-block',width:'100%'}}>
                <canvas ref={canvasRef} onClick={handleCanvasClick}
                  style={{display:'block',width:'100%',border:'1px solid var(--border-light)',borderRadius:'4px',cursor:placing?'crosshair':'default'}}/>
                {sigFields.filter(f=>f.pdfId===activePdf.id&&f.page===currentPage).map(field=>{
                  const canvas=canvasRef.current; if(!canvas)return null
                  const sx=canvas.clientWidth/canvas.width, sy=canvas.clientHeight/canvas.height
                  return(
                    <div key={field.id} style={{position:'absolute',left:field.x*sx,top:field.y*sy,
                      width:field.w*sx,height:field.h*sy,border:'2px dashed var(--gold)',borderRadius:'4px',
                      background:'rgba(198,166,76,0.08)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10}}>
                      <span style={{fontSize:'0.7rem',color:'var(--slate)',textAlign:'center'}}>{field.label}</span>
                      <button onClick={()=>setSigFields(f=>f.filter(x=>x.id!==field.id))}
                        style={{position:'absolute',top:-8,right:-8,width:18,height:18,borderRadius:'50%',
                          background:'#dc3545',border:'none',color:'white',fontSize:'10px',cursor:'pointer',
                          display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div style={{background:'white',border:'1px solid var(--border-light)',borderRadius:'8px',padding:'1rem'}}>
            <div style={{fontWeight:700,fontSize:'0.85rem',color:'var(--navy)',marginBottom:'0.75rem'}}>Client Details</div>
            <div className="form-group" style={{margin:'0 0 0.75rem'}}>
              <label>Client Name *</label>
              <input value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Full name"/>
            </div>
            <div className="form-group" style={{margin:0}}>
              <label>WhatsApp / Mobile</label>
              <input value={clientMobile} onChange={e=>setClientMobile(e.target.value)} placeholder="+27 82 000 0000"/>
            </div>
          </div>

          {pdfs.length > 0 && (
            <div style={{background:'var(--off-white)',border:'1px solid var(--border-light)',borderRadius:'8px',padding:'1rem'}}>
              <div style={{fontWeight:700,fontSize:'0.85rem',color:'var(--navy)',marginBottom:'0.5rem'}}>
                Signature Fields ({sigFields.length} total)
              </div>
              {sigFields.length === 0 ? (
                <p style={{color:'var(--slate)',fontSize:'0.82rem',margin:0}}>
                  Select a document above and click "+ Client Signature" to place signature fields
                </p>
              ) : (
                sigFields.map(f=>(
                  <div key={f.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'0.4rem',background:'white',borderRadius:'5px',border:'1px solid var(--border-light)',
                    marginBottom:'0.4rem',fontSize:'0.78rem'}}>
                    <div>
                      <div style={{fontWeight:600,color:'var(--navy)'}}>{f.label}</div>
                      <div style={{color:'var(--slate)',fontSize:'0.72rem'}}>{f.pdfName} p{f.page}</div>
                    </div>
                    <button onClick={()=>setSigFields(fs=>fs.filter(x=>x.id!==f.id))}
                      style={{background:'none',border:'none',cursor:'pointer',color:'#dc3545'}}><X size={14}/></button>
                  </div>
                ))
              )}
              {pdfs.length > 1 && (
                <div style={{marginTop:'0.5rem',padding:'0.5rem',background:'#fffbeb',borderRadius:'5px',fontSize:'0.75rem',color:'#744210'}}>
                  ℹ️ {pdfs.length} documents will be merged into one PDF for signing
                </div>
              )}
            </div>
          )}

          {createdLink ? (
            <div style={{background:'#f0fff4',border:'1px solid #c6f6d5',borderRadius:'8px',padding:'1rem'}}>
              <div style={{fontWeight:700,color:'#276749',marginBottom:'0.75rem',display:'flex',alignItems:'center',gap:'0.4rem'}}>
                <Send size={16}/> Link Ready to Share
              </div>
              <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.75rem'}}>
                <input readOnly value={createdLink} style={{flex:1,padding:'0.5rem',border:'1px solid #c6f6d5',borderRadius:'6px',fontSize:'0.75rem',background:'white'}}/>
                <button onClick={copyLink} style={{padding:'0.5rem 0.75rem',background:copied?'#38a169':'#276749',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:700,fontSize:'0.8rem'}}>
                  {copied?'✓':'Copy'}
                </button>
              </div>
              {clientMobile && (
                <a href={`https://wa.me/${clientMobile.replace(/\D/g,'')}?text=${encodeURIComponent('Please sign your GJM Ultra Brokers document here: '+createdLink)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'0.4rem',
                    padding:'0.6rem',background:'#25d366',color:'white',borderRadius:'6px',
                    textDecoration:'none',fontWeight:700,fontSize:'0.82rem'}}>
                  📱 Send via WhatsApp
                </a>
              )}
            </div>
          ) : (
            <button onClick={createSession}
              disabled={!pdfs.length||!clientName.trim()||sigFields.length===0||creating}
              style={{width:'100%',padding:'0.9rem',fontWeight:700,fontSize:'0.9rem',borderRadius:'8px',border:'none',
                background:pdfs.length&&clientName.trim()&&sigFields.length>0&&!creating?'var(--gold)':'var(--border-light)',
                color:pdfs.length&&clientName.trim()&&sigFields.length>0?'var(--black)':'var(--slate)',
                cursor:pdfs.length&&clientName.trim()&&sigFields.length>0?'pointer':'not-allowed',
                display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem'}}>
              <Send size={18}/>{creating?'Creating…':'Create Signing Link'}
            </button>
          )}

          <div style={{padding:'0.75rem',background:'var(--off-white)',borderRadius:'6px',fontSize:'0.75rem',color:'var(--slate)',lineHeight:1.5}}>
            <Shield size={11} style={{display:'inline',marginRight:'0.3rem'}}/>
            Multiple documents are merged into one PDF. Client receives a single link to sign all documents at once.
          </div>
        </div>
      </div>
    </div>
  )
}
