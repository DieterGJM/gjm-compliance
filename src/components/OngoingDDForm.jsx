import SignoffBlock from './SignoffBlock'
// Default values exactly as per uploaded Ongoing DD template
const DEFAULTS = {
  ongoingRisk:       'low',
  monthsCheckbox:    '12',
  ongoingSignoffNote:'The transaction is consistent with GJM Ultra Brokers knowledge of the client. Ongoing customer due diligence has been conducted, and client remains low risk',
}

// Exact questions from uploaded template (in order)
const QUESTIONS = [
  { q: 'Was the time-frame for completing the Ongoing DD consistent with your RMPC and the client\'s risk profile. If NO, please provide reasons:', note: '(Complete a new Client Onboarding Questionnaire)' },
  { q: 'Have you verified the client\'s information against the information on record?', note: '(If NO please do so before continuing with this Questionnaire)' },
  { q: 'Has any of the client\'s circumstances or information changed since the last Questionnaire?', note: '(If YES, please complete a new Client Onboarding Questionnaire)' },
  { q: 'Has the client completed more than 1 transaction during the business relationship?', note: '' },
  { q: 'If YES, were the transactions conducted consistent with your knowledge of the client, the client\'s business, etc?', note: '' },
  { q: 'If NO, were any transactions complex, unusual or unusually large without any apparent business or lawful purpose?', note: '(If YES, please complete a new Client Onboarding Questionnaire)' },
  { q: 'If Yes, were the funds/Income easily identifiable and traceable?', note: '' },
  { q: 'If NO, are there grounds to report a suspicion of money laundering, terrorist financing or proliferation financing?', note: '(Immediately refer the matter to the FICA Compliance Officer)' },
]

export default function OngoingDDForm({ data, onChange }) {
  const d = { ...DEFAULTS, ...data }
  const set = f => e => onChange({ ...d, [f]: e.target.value })
  const setAnswer = (i, val) => {
    const answers = [...(d.ongoingAnswers || Array(QUESTIONS.length).fill(''))]
    answers[i] = val
    onChange({ ...d, ongoingAnswers: answers })
  }

  const answers = d.ongoingAnswers || Array(QUESTIONS.length).fill('')
  const months  = Number(d.monthsSinceLastDD || 0)

  return (
    <div>
      {/* ── 1. Client Details (pre-filled from shared) ── */}
      <div className="section-title">1. Client Details</div>
      <div className="alert alert-info" style={{marginBottom:'1rem'}}>
        Client details are pre-filled from the Client Details step above.
      </div>

      {/* ── 2. Ongoing Due Diligence ── */}
      <div className="section-title">2. Ongoing Due Diligence</div>
      <div className="form-grid">
        <div className="form-group">
          <label>What was your client's risk profile?</label>
          <div style={{ display:'flex', gap:'1.5rem', marginTop:'0.25rem' }}>
            {[['low','Low'],['medium','Medium'],['high','High']].map(([val,label]) => (
              <label key={val} style={{ display:'flex',alignItems:'center',gap:'0.4rem',
                textTransform:'none',fontWeight:d.ongoingRisk===val?700:400,cursor:'pointer'}}>
                <input type="radio" name="ongoingRisk" value={val} checked={d.ongoingRisk===val}
                  onChange={set('ongoingRisk')} style={{width:'auto',accentColor:'var(--gold)'}} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>When was the last Ongoing DD completed? (months)</label>
          <div style={{ display:'flex', gap:'1rem', marginTop:'0.25rem' }}>
            {['12','24','36','>36'].map(val => (
              <label key={val} style={{ display:'flex',alignItems:'center',gap:'0.4rem',
                textTransform:'none',fontWeight:d.monthsCheckbox===val?700:400,cursor:'pointer'}}>
                <input type="radio" name="monthsCheckbox" value={val} checked={d.monthsCheckbox===val}
                  onChange={set('monthsCheckbox')} style={{width:'auto',accentColor:'var(--gold)'}} />
                {val}
              </label>
            ))}
          </div>
          {d.monthsCheckbox === '>36' && (
            <span className="text-warn text-sm" style={{marginTop:'0.3rem',display:'block'}}>
              ⚠ Longer than 36 months — please complete a new Client Onboarding Questionnaire.
            </span>
          )}
        </div>
      </div>

      {/* Questions table */}
      <table className="risk-table" style={{marginBottom:'1.5rem', marginTop:'1rem'}}>
        <thead>
          <tr>
            <th style={{width:'72%'}}></th>
            <th style={{textAlign:'center'}}>YES</th>
            <th style={{textAlign:'center'}}>NO</th>
          </tr>
        </thead>
        <tbody>
          {QUESTIONS.map(({ q, note }, i) => (
            <tr key={i}>
              <td>
                <div style={{fontSize:'0.85rem'}}>{q}</div>
                {note && <div style={{fontSize:'0.76rem',color:'var(--gold-dark)',fontStyle:'italic',marginTop:'0.2rem'}}>{note}</div>}
              </td>
              {['yes','no'].map(v => (
                <td key={v} className="risk-radio">
                  <input type="radio" name={`odd_${i}`} value={v}
                    checked={answers[i]===v} onChange={() => setAnswer(i, v)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── 3. Sign-Off ── */}
      <div className="section-title">3. Sign-Off Process</div>
      <div className="form-group">
        <label>Provide additional details / reasons for proceeding with the business relationship</label>
        <SignoffBlock
          occupation={d.occupation}
          docType="transactional"
          value={d.ongoingSignoffNote}
          onChange={val => onChange({ ...d, ongoingSignoffNote: val })}
          label="Sign-Off Compliance Note"
        />
      </div>
    </div>
  )
}
