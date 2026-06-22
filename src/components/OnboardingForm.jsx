import { AlertTriangle } from 'lucide-react'
import SignoffBlock from './SignoffBlock'

// Default values exactly as per the uploaded template
const DEFAULTS = {
  isNew:           true,
  sourceOfIncome:  'Salary',
  sourceOfWealth:  'Income',
  services:        'Advice and intermediary services.',
  frequency:       'Annually and Adhoc',
  transactionSize: 'Small',
  products:        'investments',
  furtherDetails:  'N/A',
  tfs:             'no',
  foreignPep:      'no',
  domesticPep:     'no',
  pip:             'no',
  citizenship:     'RSA',
  decision:        'accept',
  decisionReason:  'The client is a high earner with a good understanding of risk or investment products. Due diligence was done on the client, who was accessed as low risk.',
}

const RISK_FACTORS = [
  'Interaction with client (e.g. face-to-face)',
  'Client co-operation and behaviour',
  "Transaction within the client's financial means",
  'Size of Transaction',
  'Product selection',
  "Client's geographical location",
  'Client type (e.g. Foreign national, SA Citizen)',
  'Client activities/occupation (source of income/wealth)',
]

export default function OnboardingForm({ data, onChange }) {
  // Merge defaults so fields are pre-filled unless advisor changes them
  const d = { ...DEFAULTS, ...data }
  const set = f => e => onChange({ ...d, [f]: e.target.value })
  const setVal = (f, v) => onChange({ ...d, [f]: v })

  const setRisk = (i, val) => {
    const factors = [...(d.riskFactors || Array(8).fill(1))]
    factors[i] = Number(val)
    onChange({ ...d, riskFactors: factors })
  }

  const factors = d.riskFactors || Array(8).fill(1)
  const score   = factors.reduce((s, v) => s + Number(v), 0)
  const band    = score <= 8 ? 'LOW' : score <= 16 ? 'MEDIUM' : 'HIGH'
  const bandClass = score <= 8 ? 'risk-low' : score <= 16 ? 'risk-medium' : 'risk-high'

  return (
    <div>
      {/* ── 1. New or Existing ── */}
      <div className="section-title">1. New or Existing Client</div>
      <div style={{ display:'flex', gap:'2rem' }}>
        {[['true','New Business Relationship'],['false','Existing Client']].map(([val, label]) => (
          <label key={val} style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', fontWeight: String(d.isNew) === val ? 700 : 400 }}>
            <input type="radio" name="isNew" checked={String(d.isNew) === val}
              onChange={() => setVal('isNew', val === 'true')}
              style={{ width:'auto', accentColor:'var(--gold)' }} />
            {label}
          </label>
        ))}
      </div>

      {/* ── 3. Nature of Business ── */}
      <div className="section-title">3. Nature of Business Relationship</div>
      <div className="form-grid">
        <div className="form-group span-2">
          <label>Client's Occupation *</label>
          <input value={d.occupation || ''} onChange={set('occupation')}
            placeholder="e.g. Neurosurgeon, Paediatrician, Civil Engineer" />
          {d.occupation && <span style={{fontSize:'0.78rem',color:'var(--success)',marginTop:'0.2rem'}}>✓ Pre-filled from client details</span>}
        </div>
        <div className="form-group">
          <label>Source of Income</label>
          <select value={d.sourceOfIncome} onChange={set('sourceOfIncome')}>
            <option>Salary</option><option>Business Income</option>
            <option>Investment Returns</option><option>Rental Income</option>
            <option>Pension</option><option>Other</option>
          </select>
        </div>
        <div className="form-group">
          <label>Source of Wealth</label>
          <select value={d.sourceOfWealth} onChange={set('sourceOfWealth')}>
            <option>Income</option><option>Inheritance</option>
            <option>Business Sale</option><option>Property Sale</option>
            <option>Savings / Investments</option><option>Other</option>
          </select>
        </div>
        <div className="form-group span-2">
          <label>Services to be provided to client</label>
          <input value={d.services} onChange={set('services')} />
        </div>
        <div className="form-group">
          <label>Anticipated frequency of transactions</label>
          <select value={d.frequency} onChange={set('frequency')}>
            <option>Annually and Adhoc</option><option>Once-off</option>
            <option>Monthly</option><option>Quarterly</option><option>Ad hoc</option>
          </select>
        </div>
        <div className="form-group">
          <label>Expected size of transaction</label>
          <select value={d.transactionSize} onChange={set('transactionSize')}>
            <option>Small</option><option>Medium</option><option>Large</option>
          </select>
        </div>
        <div className="form-group span-2">
          <label>Type of financial products</label>
          <input value={d.products} onChange={set('products')}
            placeholder="e.g. RA, Endowment, shares etc." />
        </div>
        <div className="form-group span-2">
          <label>Further Details</label>
          <textarea value={d.furtherDetails} onChange={set('furtherDetails')} />
        </div>
      </div>

      {/* ── 4. Client Screening ── */}
      <div className="section-title">4. Client Screening</div>
      <div className="form-grid">
        {[
          { f:'tfs',         label:"Does the client's name appear on the TFS list?",             warn:true  },
          { f:'foreignPep',  label:'Is the client a Foreign Politically Exposed Person (PEP)?',  warn:true  },
          { f:'domesticPep', label:'Is the client a Domestic PEP?',                              warn:false },
          { f:'pip',         label:'Is the client a Prominent Influential Person (PIP)?',        warn:false },
        ].map(({ f, label, warn }) => (
          <div className="form-group span-2" key={f}>
            <label>{label}</label>
            <div style={{ display:'flex', gap:'2rem', marginTop:'0.25rem' }}>
              {['yes','no'].map(v => (
                <label key={v} style={{ display:'flex', alignItems:'center', gap:'0.4rem',
                  textTransform:'none', fontWeight: d[f]===v ? 700 : 400, cursor:'pointer' }}>
                  <input type="radio" name={f} value={v} checked={d[f]===v}
                    onChange={set(f)} style={{ width:'auto', accentColor:'var(--gold)' }} />
                  {v === 'yes' ? 'Yes' : 'No'}
                </label>
              ))}
            </div>
            {warn && d[f] === 'yes' && (
              <div className="alert alert-warn" style={{marginTop:'0.5rem'}}>
                <AlertTriangle size={15} />
                <span><strong>NB.:</strong> If the answer to this question is YES, immediately refer this matter to the FICA Compliance Officer.</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── 8. Risk Profile ── */}
      <div className="section-title">8. Client Risk Profile</div>
      <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'0.75rem' }}>
        <span className="text-sm">Total: <strong>{score}</strong></span>
        <span className={`risk-badge ${bandClass}`}>{band} RISK</span>
        <span className="text-muted text-sm">Low: 0–8 | Medium: 9–16 | High: 17+</span>
      </div>
      <table className="risk-table" style={{marginBottom:'1rem'}}>
        <thead>
          <tr>
            <th style={{width:'55%'}}></th>
            <th style={{textAlign:'center'}}>LOW</th>
            <th style={{textAlign:'center'}}>MEDIUM</th>
            <th style={{textAlign:'center'}}>HIGH</th>
          </tr>
        </thead>
        <tbody>
          {RISK_FACTORS.map((factor, i) => (
            <tr key={i}>
              <td>{factor}</td>
              {[1,2,3].map(v => (
                <td key={v} className="risk-radio">
                  <input type="radio" name={`risk_${i}`} value={v}
                    checked={factors[i] === v} onChange={() => setRisk(i, v)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.5rem',marginBottom:'1rem',fontSize:'0.82rem'}}>
        {[['LOW RISK','0 – 8','risk-low'],['MEDIUM RISK','9 – 16','risk-medium'],['HIGH RISK','17+','risk-high']].map(([b,r,c])=>(
          <div key={b} style={{textAlign:'center',padding:'0.4rem',borderRadius:'6px'}} className={c}>{b}: {r}</div>
        ))}
      </div>

      {/* ── 9. Acceptance ── */}
      <div className="section-title">9. Acceptance and Sign-Off Process</div>
      <div className="form-grid">
        <div className="form-group">
          <label>Decision</label>
          <div style={{ display:'flex', gap:'2rem', marginTop:'0.25rem' }}>
            {[['accept','Accept'],['decline','Decline']].map(([val,label])=>(
              <label key={val} style={{ display:'flex',alignItems:'center',gap:'0.4rem',
                textTransform:'none',fontWeight:d.decision===val?700:400,cursor:'pointer'}}>
                <input type="radio" name="decision" value={val} checked={d.decision===val}
                  onChange={set('decision')} style={{width:'auto',accentColor:'var(--gold)'}} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="form-group span-2">
          <label>Reason client was accepted or declined</label>
          <textarea value={d.decisionReason} onChange={set('decisionReason')} style={{minHeight:'70px'}} />
        </div>
        <SignoffBlock
          occupation={d.occupation}
          docType="onboarding"
          value={d.onboardingSignoff}
          onChange={val => onChange({ ...d, onboardingSignoff: val })}
          label="Compliance Sign-Off Note (AI-generated per profession)"
        />
      </div>
    </div>
  )
}
