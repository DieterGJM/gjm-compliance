import { FileText, RefreshCw, ArrowRightLeft, Calculator, BarChart2 } from 'lucide-react'

const DOCS = [
  { id: 'onboarding', icon: <FileText size={22} />, name: 'Onboarding Questionnaire', desc: 'New / existing client FICA onboarding', category: 'new' },
  { id: 'ongoing', icon: <RefreshCw size={22} />, name: 'Ongoing Due Diligence', desc: 'Periodic DD review for existing clients', category: 'existing' },
  { id: 'transactional', icon: <ArrowRightLeft size={22} />, name: 'Transactional DD', desc: 'Per-transaction due diligence review', category: 'existing' },
  { id: 'ra', icon: <Calculator size={22} />, name: 'RA Calculation', desc: 'Retirement annuity shortfall & proposals', category: 'financial' },
  { id: 'fna', icon: <BarChart2 size={22} />, name: 'FNA Calculator', desc: 'Full financial needs analysis', category: 'financial' },
  { id: 'roa', icon: <BarChart2 size={22} />, name: 'Risk ROA', desc: 'Risk Client Advice Record — AI product comparison', category: 'risk' },
  { id: 'investroa', icon: <BarChart2 size={22} />, name: 'Invest ROA', desc: 'Investment Client Advice Record' },
]

export default function DocSelector({ selected, onChange }) {
  const toggle = (id) => {
    onChange(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div>
      <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>
        Select all documents to generate for this client session. Shared fields (name, ID, address) will pre-fill across all selected forms.
      </p>
      <div className="doc-grid">
        {DOCS.map(d => (
          <div
            key={d.id}
            className={`doc-card${selected.includes(d.id) ? ' selected' : ''}`}
            onClick={() => toggle(d.id)}
          >
            <div className="doc-icon" style={{ color: selected.includes(d.id) ? 'var(--navy)' : 'var(--slate-light)' }}>{d.icon}</div>
            <div className="doc-name">{d.name}</div>
            <div className="doc-desc">{d.desc}</div>
            {selected.includes(d.id) && (
              <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', background: 'var(--navy)', color: 'var(--white)', borderRadius: '20px', padding: '0.15em 0.6em', fontWeight: 600 }}>✓ Selected</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export { DOCS }
