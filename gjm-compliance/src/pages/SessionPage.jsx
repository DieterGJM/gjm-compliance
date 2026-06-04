import { useState } from 'react'
import { Download, FileText, RefreshCw, AlertTriangle } from 'lucide-react'
import DocSelector from '../components/DocSelector'
import ClientDetailsForm from '../components/ClientDetailsForm'
import OnboardingForm from '../components/OnboardingForm'
import OngoingDDForm from '../components/OngoingDDForm'
import TransactionalDDForm from '../components/TransactionalDDForm'
import RAForm from '../components/RAForm'
import FNAForm from '../components/FNAForm'
import {
  buildOnboardingDoc, buildOngoingDDDoc, buildTransactionalDDDoc,
  buildRADoc, buildFNADoc, downloadDocx, downloadPdf
} from '../lib/docGenerator'
import { downloadROADocx } from '../lib/roaDocGenerator'
import ROAForm from '../components/ROAForm'

const STEPS = [
  { id: 'docs', label: 'Select Docs' },
  { id: 'client', label: 'Client Details' },
  { id: 'forms', label: 'Complete Forms' },
  { id: 'download', label: 'Download' },
]

const DOC_MAP = {
  onboarding: { label: 'Onboarding Questionnaire', build: buildOnboardingDoc },
  ongoing: { label: 'Ongoing Due Diligence', build: buildOngoingDDDoc },
  transactional: { label: 'Transactional DD', build: buildTransactionalDDDoc },
  ra: { label: 'RA Calculation', build: buildRADoc },
  fna: { label: 'FNA Calculator', build: buildFNADoc },
  roa: { label: 'Risk ROA', build: null },
}

export default function SessionPage() {
  const [step, setStep] = useState('docs')
  const [selectedDocs, setSelectedDocs] = useState([])
  const [clientType, setClientType] = useState('natural')
  const [shared, setShared] = useState({})        // shared client details
  const [formData, setFormData] = useState({})    // per-doc extra fields
  const [generating, setGenerating] = useState({})
  const [error, setError] = useState('')

  // Merge shared client data into per-doc data
  // Merge all shared fields + per-doc data.
  // Priority: per-doc form data > RA section > shared client details > defaults
  // This ensures DOB, income, fund value, occupation all flow everywhere automatically.
  const raData = formData.ra || {}
  const docData = (docId) => ({
    // Shared client details (step 2)
    ...shared,
    clientType,
    // RA section values flow to FNA and all other docs
    retirementAge:    raData.retirementAge    || shared.retirementAge    || 65,
    interestRate:     raData.interestRate     || shared.interestRate     || 6,
    reqIncome:        raData.reqIncome        || shared.reqIncome        || '',
    currentFundValue: raData.currentFundValue || shared.currentFundValue || '',
    currentPremium:   raData.currentPremium   || shared.currentPremium   || '',
    penalties:        raData.penalties        || shared.penalties        || '',
    p2Premium:        raData.p2Premium        || '',
    p3Premium:        raData.p3Premium        || '',
    // Occupation flows from onboarding to transactional/ongoing
    occupation: shared.occupation || formData.onboarding?.occupation || '',
    // Per-doc overrides last (most specific wins)
    ...formData[docId],
  })
  const setDocData = (docId) => (val) => setFormData(prev => ({ ...prev, [docId]: typeof val === 'function' ? val(prev[docId] || {}) : val }))

  const activeStep = STEPS.findIndex(s => s.id === step)

  const canProceed = {
    docs: selectedDocs.length > 0,
    client: clientType === 'legal' ? !!shared.registeredName : !!shared.fullName,
    forms: true,
    download: true,
  }

  const handleDownload = async (docId, format) => {
    setError('')
    setGenerating(prev => ({ ...prev, [`${docId}_${format}`]: true }))
    try {
      const data = docData(docId)
      const { label, build } = DOC_MAP[docId]
      const clientName = data.fullName || data.registeredName || 'Client'
      const filename = `${clientName.replace(/\s+/g, '_')}_${label.replace(/\s+/g, '_')}`

      if (docId === 'roa') {
        await downloadROADocx(data)
      } else if (format === 'docx') {
        const doc = build(data)
        await downloadDocx(doc, filename)
      } else {
        downloadPdf(data, label)
      }
    } catch (err) {
      console.error(err)
      setError(`Failed to generate ${docId} document: ${err.message}`)
    } finally {
      setGenerating(prev => ({ ...prev, [`${docId}_${format}`]: false }))
    }
  }

  const handleDownloadAll = async (format) => {
    for (const docId of selectedDocs) {
      await handleDownload(docId, format)
      await new Promise(r => setTimeout(r, 300))
    }
  }

  return (
    <div>
      <div className="page-title">New Client Session</div>
      <p className="page-sub">
        All data entered is processed in-browser only and is never transmitted to a server. POPIA compliant.
      </p>

      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`step-item${step === s.id ? ' active' : i < activeStep ? ' done' : ''}`}
            onClick={() => i <= activeStep && setStep(s.id)}
          >
            <div className="step-num">{i < activeStep ? '✓' : i + 1}</div>
            {s.label}
          </div>
        ))}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* ── Step 1: Select Documents ── */}
      {step === 'docs' && (
        <div className="card">
          <div className="card-header">
            <FileText size={18} color="var(--gold)" />
            <h2>Select Documents to Generate</h2>
          </div>
          <div className="card-body">
            <DocSelector selected={selectedDocs} onChange={setSelectedDocs} />
          </div>
          <div className="card-body" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <div className="flex-row flex-end">
              <button className="btn btn-primary" onClick={() => setStep('client')} disabled={!canProceed.docs}>
                Next: Client Details →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Client Details ── */}
      {step === 'client' && (
        <div className="card">
          <div className="card-header">
            <FileText size={18} color="var(--gold)" />
            <h2>Client Details</h2>
            <span className="badge">Pre-fills all selected documents</span>
          </div>
          <div className="card-body">
            <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
              <span>🔒 <strong>POPIA Notice:</strong> This information is processed in-browser only. It is used solely to populate the compliance documents you download and is never stored on any server.</span>
            </div>
            <ClientDetailsForm
              data={shared}
              onChange={setShared}
              clientType={clientType}
              onTypeChange={setClientType}
            />
          </div>
          <div className="card-body" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <div className="flex-row flex-between">
              <button className="btn btn-outline" onClick={() => setStep('docs')}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep('forms')} disabled={!canProceed.client}>
                Next: Complete Forms →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Forms ── */}
      {step === 'forms' && (
        <div>
          {selectedDocs.includes('onboarding') && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <FileText size={18} color="var(--gold)" />
                <h2>Onboarding Questionnaire</h2>
              </div>
              <div className="card-body">
                <OnboardingForm
                  data={{ ...shared, ...formData.onboarding }}
                  onChange={(val) => setFormData(prev => ({ ...prev, onboarding: val }))}
                />
              </div>
            </div>
          )}

          {selectedDocs.includes('ongoing') && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <RefreshCw size={18} color="var(--gold)" />
                <h2>Ongoing Due Diligence</h2>
              </div>
              <div className="card-body">
                <OngoingDDForm
                  data={{ ...shared, ...formData.ongoing }}
                  onChange={(val) => setFormData(prev => ({ ...prev, ongoing: val }))}
                />
              </div>
            </div>
          )}

          {selectedDocs.includes('transactional') && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <FileText size={18} color="var(--gold)" />
                <h2>Transactional Due Diligence</h2>
              </div>
              <div className="card-body">
                <TransactionalDDForm
                  data={{ ...shared, ...formData.transactional }}
                  onChange={(val) => setFormData(prev => ({ ...prev, transactional: val }))}
                />
              </div>
            </div>
          )}

          {selectedDocs.includes('ra') && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <FileText size={18} color="var(--gold)" />
                <h2>RA Calculation</h2>
              </div>
              <div className="card-body">
                <RAForm
                  data={{ ...shared, ...formData.ra }}
                  onChange={(val) => setFormData(prev => ({ ...prev, ra: val }))}
                />
              </div>
            </div>
          )}

          {selectedDocs.includes('roa') && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <FileText size={18} color="var(--gold)" />
                <h2>Risk Client Advice Record (ROA)</h2>
                <span className="badge">AI-Powered</span>
              </div>
              <div className="card-body">
                <ROAForm
                  data={{ ...shared, ...formData.roa }}
                  onChange={(val) => setFormData(prev => ({ ...prev, roa: val }))}
                />
              </div>
            </div>
          )}

          {selectedDocs.includes('fna') && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <FileText size={18} color="var(--gold)" />
                <h2>FNA Calculator</h2>
              </div>
              <div className="card-body">
                <FNAForm
                  data={{ ...shared, ...formData.fna }}
                  onChange={(val) => setFormData(prev => ({ ...prev, fna: val }))}
                />
              </div>
            </div>
          )}

          <div className="flex-row flex-between" style={{ marginTop: '1rem' }}>
            <button className="btn btn-outline" onClick={() => setStep('client')}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep('download')}>
              Next: Download Documents →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Download ── */}
      {step === 'download' && (
        <div>
          <div className="card">
            <div className="card-header">
              <Download size={18} color="var(--gold)" />
              <h2>Download Documents</h2>
              <span className="badge">Session Only — Nothing Stored</span>
            </div>
            <div className="card-body">
              <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
                <span>✓ All documents are ready. Choose Word (.docx) for editable documents or PDF for a professional locked format.</span>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div className="flex-row" style={{ marginBottom: '1rem' }}>
                  <strong>Download All:</strong>
                  <button className="btn btn-primary btn-sm" onClick={() => handleDownloadAll('docx')}>
                    <Download size={14} /> All as Word (.docx)
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => handleDownloadAll('pdf')}>
                    <Download size={14} /> All as PDF
                  </button>
                </div>
              </div>

              <hr className="divider" />

              {selectedDocs.map(docId => (
                <div key={docId} className="download-bar">
                  <div className="doc-item">
                    <h4>{DOC_MAP[docId].label}</h4>
                    <div className="doc-item btn-group">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleDownload(docId, 'docx')}
                        disabled={generating[`${docId}_docx`]}
                      >
                        <Download size={13} />
                        {generating[`${docId}_docx`] ? 'Generating…' : 'Word (.docx)'}
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleDownload(docId, 'pdf')}
                        disabled={generating[`${docId}_pdf`]}
                      >
                        <Download size={13} />
                        {generating[`${docId}_pdf`] ? 'Generating…' : 'PDF'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <hr className="divider" />
              <div className="alert alert-info" style={{ marginTop: '1rem' }}>
                <span>
                  📋 <strong>Next Steps:</strong> Print the document(s) for physical sign-off by the advisor and, for high-risk clients, the Compliance Officer (Tanya Van Niekerk). Store signed documents in your secure file system.
                </span>
              </div>
            </div>
          </div>

          <div className="flex-row flex-between" style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-outline" onClick={() => setStep('forms')}>← Back to Forms</button>
            <button className="btn btn-gold" onClick={() => {
              setStep('docs')
              setSelectedDocs([])
              setShared({})
              setFormData({})
              setClientType('natural')
            }}>
              <RefreshCw size={15} /> Start New Session
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
