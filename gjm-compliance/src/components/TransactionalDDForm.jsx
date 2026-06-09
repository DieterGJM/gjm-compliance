import SignoffBlock from './SignoffBlock'

// Default values exactly as per uploaded Transactional DD template
const DEFAULTS = {
  infoChanged:      'no',
  freqConsistent:   'yes',
  sizeConsistent:   'yes',
  unusual:          'no',
  behaviouralRisk:  'no',
  materialChange:   'no',
  pepChange:        'no',
  transactionNature:'Business Relationship',
  isNew:            false,
}

export default function TransactionalDDForm({ data, onChange }) {
  const d = { ...DEFAULTS, ...data }
  const set  = f => e => onChange({ ...d, [f]: e.target.value })
  const setV = (f, v) => onChange({ ...d, [f]: v })

  const months = Number(d.monthsSinceOnboarding || 0)

  const yesNoRow = (f, label, note = '') => (
    <div key={f} style={{marginBottom:'0.85rem'}}>
      <div style={{fontSize:'0.88rem', marginBottom:'0.3rem', fontWeight:500}}>{label}</div>
      {note && <div style={{fontSize:'0.76rem',color:'var(--gold-dark)',fontStyle:'italic',marginBottom:'0.3rem'}}>{note}</div>}
      <div style={{ display:'flex', gap:'2rem' }}>
        {['yes','no'].map(v => (
          <label key={v} style={{ display:'flex',alignItems:'center',gap:'0.4rem',
            textTransform:'none',fontWeight:d[f]===v?700:400,cursor:'pointer'}}>
            <input type="radio" name={f} value={v} checked={d[f]===v}
              onChange={set(f)} style={{width:'auto',accentColor:'var(--gold)'}} />
            {v === 'yes' ? 'Yes' : 'No'}
          </label>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      {/* ── 1. Client Details (pre-filled) ── */}
      <div className="section-title">1. Client Details</div>
      <div className="alert alert-info" style={{marginBottom:'1rem'}}>
        Client details are pre-filled from the Client Details step above.
      </div>

      {/* ── 2. Review Questions ── */}
      <div className="section-title">2. Review Questions</div>

      <div className="form-grid" style={{marginBottom:'1.25rem'}}>
        <div className="form-group">
          <label>How many months have passed since the initial Client Onboarding Questionnaire?</label>
          <input type="number" min={0} value={d.monthsSinceOnboarding || ''}
            onChange={set('monthsSinceOnboarding')} placeholder="e.g. 12" />
          {months > 36 && <span className="text-warn text-sm" style={{marginTop:'0.25rem',display:'block'}}>⚠ Over 36 months — complete a new Client Onboarding Questionnaire.</span>}
        </div>
        <div className="form-group">
          <label>When was the last business transaction concluded?</label>
          <input type="date" value={d.lastTransactionDate || ''} onChange={set('lastTransactionDate')} />
        </div>
      </div>

      <div style={{background:'var(--off-white)',border:'1px solid var(--border-light)',borderRadius:'8px',padding:'1.25rem',marginBottom:'1.25rem'}}>
        {yesNoRow('infoChanged',   'Has any information changed since the initial Client Onboarding Questionnaire was completed?', '(If YES, please complete a new Client Onboarding Questionnaire)')}
        {yesNoRow('freqConsistent','Is the frequency of transactions consistent with your knowledge of the client?', '(If NO, please complete a new Client Onboarding Questionnaire)')}
        {yesNoRow('sizeConsistent','Is the size of the transaction consistent with your knowledge of the client?', '(If NO, please complete a new Client Onboarding Questionnaire)')}
        {yesNoRow('unusual',       'Is the transaction complex, unusual or unusually large or without any apparent business or lawful purposes?', '(If YES, please complete a new Client Onboarding Questionnaire and refer to the FICA Compliance Officer or Senior Manager)')}
        {yesNoRow('behaviouralRisk','Are there any behavioural risk indicators present?', '(If YES, please complete a new Client Onboarding Questionnaire)')}
        {yesNoRow('materialChange', 'Has there been any material change in the way in which you interact with your client, e.g. instruction channelled through third-party or non-face-to-face vs face-to-face etc.?', '(If YES, please complete a new Client Onboarding Questionnaire)')}
        {yesNoRow('pepChange',      "Since the last interaction, has there been any change to the client's status as a Foreign or Domestic PEP or PIP?", '(If YES, please complete a new Client Onboarding Questionnaire)')}
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>Date on which current transaction was concluded</label>
          <input type="date" value={d.transactionDate || ''} onChange={set('transactionDate')} />
        </div>
        <div className="form-group">
          <label>Nature of the relationship</label>
          <div style={{ display:'flex', gap:'2rem', marginTop:'0.25rem' }}>
            {[['false','New Client'],['true','Existing Client']].map(([val,label]) => (
              <label key={val} style={{ display:'flex',alignItems:'center',gap:'0.4rem',
                textTransform:'none',fontWeight:String(!d.isNew)===val?700:400,cursor:'pointer'}}>
                <input type="radio" name="txnRelType" checked={String(!d.isNew)===val}
                  onChange={() => setV('isNew', val === 'false')}
                  style={{width:'auto',accentColor:'var(--gold)'}} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Amount and currency of this transaction (R)</label>
          <input type="number" value={d.transactionAmount || ''} onChange={set('transactionAmount')} placeholder="e.g. 500 000" />
        </div>
        <div className="form-group">
          <label>Parties to this transaction (advisor, client, provider, etc)</label>
          <input value={d.transactionParties || `Dieter Hartig, ${d.fullName || d.registeredName || ''}`}
            onChange={set('transactionParties')} />
        </div>
        <div className="form-group span-2">
          <label>The nature of this transaction</label>
          <input value={d.transactionNature} onChange={set('transactionNature')} />
        </div>
      </div>

      {/* ── 3. Sign-Off ── */}
      <div className="section-title">3. Sign-Off Process</div>
      <div className="form-grid">
        <div className="form-group span-2">
          <label>Provide additional details / reasons for proceeding with the business relationship</label>
          <textarea value={d.transactionalSignoffNote || ''} onChange={set('transactionalSignoffNote')}
            placeholder="Additional details..." style={{minHeight:'70px'}} />
        </div>
        <SignoffBlock
          occupation={d.occupation}
          docType="transactional"
          value={d.transactionalSignoff}
          onChange={val => onChange({ ...d, transactionalSignoff: val })}
          label="Compliance Sign-Off Note (AI-generated per profession)"
        />
      </div>
    </div>
  )
}
