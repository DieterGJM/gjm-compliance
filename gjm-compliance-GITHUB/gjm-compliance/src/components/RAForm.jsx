import { useMemo, useEffect } from 'react'
import { calcRA, calcAge, fmt, EXCEL } from '../lib/calculations'

export default function RAForm({ data, onChange }) {
  const set = f => e => onChange({ ...data, [f]: e.target.value })

  // Calculate everything from just: DOB + reqIncome + currentFundValue
  // interestRate defaults to Excel E22=6%, retirementAge defaults to Excel E9=65
  const calc = useMemo(() => {
    if (!data.dob || !data.reqIncome) return null
    return calcRA(data)
  }, [data.dob, data.reqIncome, data.currentFundValue,
      data.interestRate, data.retirementAge, data.currentPremium, data.penalties])

  const age    = data.dob ? calcAge(data.dob) : null
  const retAge = Number(data.retirementAge) || EXCEL.DEFAULT_RETIREMENT_AGE
  const yrs    = age ? Math.max(0, retAge - age) : null

  // Auto-populate P2 and P3 premiums from Excel back-calculation
  // P2 at 0% escalation (Excel B26), P3 at 5% escalation (Excel B40)
  useEffect(() => {
    if (!calc || !calc.shortfall || calc.shortfall <= 0) return
    const updates = {}
    if (calc.p2Premium && data.p2Premium !== calc.p2Premium) updates.p2Premium = calc.p2Premium
    if (calc.p3Premium && data.p3Premium !== calc.p3Premium) updates.p3Premium = calc.p3Premium
    if (Object.keys(updates).length > 0) onChange({ ...data, ...updates })
  }, [calc?.shortfall, calc?.yrs, calc?.interestRate])

  const coverBg = fv => {
    if (!calc?.shortfall) return 'var(--white)'
    if (fv >= calc.shortfall) return '#f0fff4'
    if (fv >= calc.shortfall * 0.8) return '#fefcbf'
    return '#fff5f5'
  }

  const StatBox = ({ label, value, danger, cols }) => (
    <div style={{
      background: danger ? '#fff5f5' : 'var(--off-white)',
      border: `1.5px solid ${danger ? '#fc8181' : 'var(--border-light)'}`,
      borderRadius: '8px', padding: '0.85rem 1rem',
      gridColumn: cols ? `span ${cols}` : undefined
    }}>
      <div style={{fontSize:'0.7rem',color:'var(--slate-light)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'0.3rem'}}>{label}</div>
      <div style={{fontSize:'1rem',fontWeight:700,color:danger?'var(--danger)':'var(--black)'}}>{value}</div>
    </div>
  )

  return (
    <div>
      {/* ── Minimum Inputs ── */}
      <div className="section-title">Client Inputs</div>
      <div className="alert alert-info" style={{marginBottom:'1rem',fontSize:'0.82rem'}}>
        Enter the 4 values below. <strong>Everything else calculates automatically</strong> using Excel formulas —
        inflation (6.5%), interest rate (6% default), retirement age (65 default), fees (1.15%/3%), tax brackets, and all proposal premiums.
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label>Client Date of Birth *</label>
          <input type="date" value={data.dob || ''} onChange={set('dob')} />
          {age && (
            <span style={{fontSize:'0.78rem',color:'var(--slate-light)',marginTop:'0.3rem',display:'block'}}>
              Age: <strong>{age}</strong> · Years to retirement: <strong>{yrs}</strong> · Retirement at: <strong>{retAge}</strong>
            </span>
          )}
        </div>
        <div className="form-group">
          <label>Required Monthly Income at Retirement (R) *</label>
          <input type="number" value={data.reqIncome || ''} onChange={set('reqIncome')} placeholder="e.g. 100 000" />
          <span style={{fontSize:'0.78rem',color:'var(--slate-light)',marginTop:'0.2rem',display:'block'}}>
            In today's value — app inflates at 6.5% p.a. to retirement age
          </span>
        </div>
        <div className="form-group">
          <label>Current RA / Total Fund Value (R) *</label>
          <input type="number" value={data.currentFundValue || ''} onChange={set('currentFundValue')} placeholder="e.g. 734 608" />
        </div>
        <div className="form-group">
          <label>Current Monthly Premium — existing policy (R)</label>
          <input type="number" value={data.currentPremium || ''} onChange={set('currentPremium')} placeholder="e.g. 10 307" />
          <span style={{fontSize:'0.78rem',color:'var(--slate-light)',marginTop:'0.2rem',display:'block'}}>
            Excel uses 10% escalation for current policy (fixed)
          </span>
        </div>
        <div className="form-group">
          <label>Penalties (R) — leave blank if none</label>
          <input type="number" value={data.penalties || ''} onChange={set('penalties')} placeholder="0" />
        </div>
      </div>

      {/* Optional overrides — collapsed by default feel */}
      <div style={{marginTop:'0.5rem',padding:'0.75rem 1rem',background:'var(--off-white)',borderRadius:'8px',border:'1px solid var(--border-light)'}}>
        <div style={{fontSize:'0.78rem',fontWeight:600,color:'var(--slate)',marginBottom:'0.5rem',textTransform:'uppercase',letterSpacing:'0.04em'}}>
          Override Excel Defaults (optional — leave blank to use Excel values)
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
          <div className="form-group" style={{margin:0}}>
            <label>Interest Rate % <span style={{fontWeight:400,textTransform:'none',color:'var(--slate-light)'}}>(Excel default: 6%)</span></label>
            <input type="number" step="0.5" value={data.interestRate ?? ''} onChange={set('interestRate')} placeholder="6" />
          </div>
          <div className="form-group" style={{margin:0}}>
            <label>Retirement Age <span style={{fontWeight:400,textTransform:'none',color:'var(--slate-light)'}}>(Excel default: 65)</span></label>
            <input type="number" value={data.retirementAge ?? ''} onChange={set('retirementAge')} placeholder="65" min="50" max="80" />
          </div>
        </div>
      </div>

      {/* ── Live Calculation Preview ── */}
      {calc && (
        <>
          <div className="section-title">Auto-Calculated Results (Excel Formulas)</div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.75rem',marginBottom:'0.75rem'}}>
            <StatBox label={`Income at ${calc.retirementAge} (6.5% inflation)`} value={fmt(calc.incomeAtRetirement)} />
            <StatBox label={`Total Fund Required (÷${(calc.interestRate*100).toFixed(0)}%)`} value={fmt(calc.totalFundRequired)} />
            <StatBox label={`Current Fund @ ${(calc.interestRate*100).toFixed(0)}% × ${calc.yrs}yrs`} value={fmt(calc.futureInvestmentValue)} />
            <StatBox label="SHORTFALL" value={fmt(calc.shortfall)} danger />
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.75rem',marginBottom:'1.25rem'}}>
            <StatBox label="Allan Gray Fee (1.15%)" value={fmt(calc.fees.allanGrayFee)} />
            <StatBox label="Existing Fee (3%)"      value={fmt(calc.fees.existingFee)} />
            <StatBox label="Annual Fee Saving"       value={fmt(calc.fees.feeSavings)} />
            <StatBox label="Fee Saving to Retirement" value={fmt(calc.fees.feeSavingsToRetirement)} />
          </div>

          {/* Inflation table */}
          <div className="section-title">Inflation Table — Age {age} to {calc.retirementAge} (6.5% p.a. · Excel B4)</div>
          <div style={{maxHeight:'200px',overflowY:'auto',border:'1px solid var(--border-light)',borderRadius:'8px',marginBottom:'1.5rem'}}>
            <table className="risk-table" style={{margin:0}}>
              <thead style={{position:'sticky',top:0,background:'var(--black)'}}>
                <tr>
                  <th style={{color:'var(--gold)'}}>Age</th>
                  <th style={{color:'var(--gold)'}}>Required Monthly Income</th>
                </tr>
              </thead>
              <tbody>
                {calc.inflationTable.map(row => (
                  <tr key={row.age} style={{background:row.age===calc.retirementAge?'#eef2f9':'inherit'}}>
                    <td style={{fontWeight:row.age===calc.retirementAge?700:400}}>{row.age}</td>
                    <td style={{fontWeight:row.age===calc.retirementAge?700:400}}>{fmt(row.income)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Proposals — all auto-calculated ── */}
      <div className="section-title">Premium Proposals — Auto-Calculated (Excel Financial Calculator)</div>
      {!calc && (
        <div className="alert alert-warn">Enter DOB, required income and fund value above — proposals will calculate automatically.</div>
      )}
      {calc && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem'}}>

          {/* Current — only manual input needed */}
          <div style={{background:coverBg(calc.currentFV),border:'1.5px solid var(--border-light)',borderRadius:'10px',padding:'1.1rem'}}>
            <div style={{fontWeight:700,fontSize:'0.9rem',borderBottom:'2px solid var(--gold)',paddingBottom:'0.4rem',marginBottom:'0.75rem',color:'var(--black)'}}>
              Current (Existing Policy)
            </div>
            <div style={{fontSize:'0.75rem',color:'var(--slate-light)',marginBottom:'0.5rem'}}>
              Excel uses <strong>10% escalation</strong> for current policy (B11 fixed)
            </div>
            <div style={{padding:'0.75rem',background:'white',borderRadius:'6px',border:'1px solid var(--border-light)',marginBottom:'0.5rem'}}>
              <div style={{fontSize:'0.7rem',color:'var(--slate-light)',textTransform:'uppercase',marginBottom:'0.2rem'}}>Monthly Premium</div>
              <div style={{fontWeight:700,fontSize:'1rem',color:'var(--black)'}}>{data.currentPremium ? fmt(data.currentPremium) : <span style={{color:'var(--slate-light)',fontStyle:'italic',fontSize:'0.82rem'}}>Enter above</span>}</div>
            </div>
            {data.currentPremium && (
              <div style={{padding:'0.6rem',background:'white',borderRadius:'6px',border:'1px solid var(--border-light)'}}>
                <div style={{fontSize:'0.7rem',color:'var(--slate-light)',textTransform:'uppercase',marginBottom:'0.2rem'}}>Future Value @ {(calc.interestRate*100).toFixed(0)}% / 10% esc</div>
                <div style={{fontWeight:700,color:'var(--black)',fontSize:'0.95rem'}}>{fmt(calc.currentFV)}</div>
                <div style={{fontSize:'0.75rem',marginTop:'0.25rem',fontWeight:600,color:calc.currentFV>=calc.shortfall?'var(--success)':'var(--danger)'}}>
                  {calc.currentFV>=calc.shortfall ? `✓ Covers (+${fmt(calc.currentFV-calc.shortfall)})` : `✗ Gap: ${fmt(calc.shortfall-calc.currentFV)}`}
                </div>
              </div>
            )}
          </div>

          {/* Proposed 2 — fully auto-calculated */}
          {[
            { label:'Proposed 2', pf:'p2Premium', esc:'0%', escLabel:'Excel B26=0%', fv:calc.p2FV },
            { label:'Proposed 3', pf:'p3Premium', esc:'5%', escLabel:'Excel B40=5%', fv:calc.p3FV },
          ].map(p => (
            <div key={p.label} style={{background:coverBg(p.fv),border:`1.5px solid ${p.fv>=calc.shortfall?'#68d391':'var(--border-light)'}`,borderRadius:'10px',padding:'1.1rem'}}>
              <div style={{fontWeight:700,fontSize:'0.9rem',borderBottom:'2px solid var(--gold)',paddingBottom:'0.4rem',marginBottom:'0.75rem',display:'flex',justifyContent:'space-between',alignItems:'center',color:'var(--black)'}}>
                {p.label}
                <span style={{fontSize:'0.7rem',background:'var(--gold)',color:'var(--black)',borderRadius:'4px',padding:'0.1em 0.5em',fontWeight:700}}>Auto</span>
              </div>
              <div style={{fontSize:'0.75rem',color:'var(--slate-light)',marginBottom:'0.5rem'}}>
                Escalation: <strong>{p.escLabel}</strong> — back-calculated to cover shortfall
              </div>
              <div style={{padding:'0.75rem',background:'white',borderRadius:'8px',border:'1px solid var(--border-light)',marginBottom:'0.5rem'}}>
                <div style={{fontSize:'0.7rem',color:'var(--slate-light)',textTransform:'uppercase',marginBottom:'0.2rem'}}>Required Monthly Premium</div>
                <div style={{fontWeight:700,color:'var(--black)',fontSize:'1.15rem'}}>{fmt(data[p.pf])}<span style={{fontSize:'0.78rem',fontWeight:400,color:'var(--slate-light)'}}>/pm</span></div>
              </div>
              <div style={{padding:'0.6rem',background:'white',borderRadius:'6px',border:'1px solid var(--border-light)'}}>
                <div style={{fontSize:'0.7rem',color:'var(--slate-light)',textTransform:'uppercase',marginBottom:'0.2rem'}}>Future Value @ {(calc.interestRate*100).toFixed(0)}% / {p.esc} esc</div>
                <div style={{fontWeight:700,color:'var(--black)',fontSize:'0.95rem'}}>{fmt(p.fv)}</div>
                <div style={{fontSize:'0.75rem',marginTop:'0.25rem',fontWeight:600,color:p.fv>=calc.shortfall?'var(--success)':'var(--danger)'}}>
                  {p.fv>=calc.shortfall ? `✓ Covers shortfall (+${fmt(p.fv-calc.shortfall)})` : `✗ Gap: ${fmt(calc.shortfall-p.fv)}`}
                </div>
              </div>
              <div style={{marginTop:'0.5rem',fontSize:'0.72rem',color:'var(--slate-light)',fontStyle:'italic'}}>
                Override: <input type="number" value={data[p.pf]||''} onChange={set(p.pf)}
                  style={{width:'110px',fontSize:'0.78rem',padding:'0.2rem 0.5rem',display:'inline-block',marginLeft:'0.4rem'}} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
