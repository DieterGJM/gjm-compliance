import { useMemo } from 'react'
import { calcAge, calcTax, calcFees, calcYearsToRetirement,
         calcIncomeAtRetirement, calcTotalFundRequired,
         calcFutureInvestmentValue, calcShortfall,
         calcLiabilities, fmt, EXCEL } from '../lib/calculations'

export default function FNAForm({ data, onChange }) {
  const set = f => e => onChange({ ...data, [f]: e.target.value })

  // Pull from shared/RA data — everything flows through session
  const retirementAge = Number(data.retirementAge)  || EXCEL.DEFAULT_RETIREMENT_AGE
  const interestRate  = Number(data.interestRate)   / 100 || EXCEL.DEFAULT_INTEREST_RATE
  const age           = data.dob ? calcAge(data.dob) : null
  const yrs           = age != null ? calcYearsToRetirement(age, retirementAge) : null

  // E14, E13, E17, E18, E19 — all from gross income, all Excel fixed formulas
  const tax = useMemo(() => calcTax(data.grossIncome), [data.grossIncome])

  // E26, E24, E27, E30-E34 — all from RA section, all auto
  const raCalc = useMemo(() => {
    if (!age || !yrs || !data.reqIncome) return null
    const incomeAtRetirement    = calcIncomeAtRetirement(age, data.reqIncome, retirementAge)
    const totalFundRequired     = calcTotalFundRequired(incomeAtRetirement, interestRate)
    const futureInvestmentValue = calcFutureInvestmentValue(data.currentFundValue, yrs, interestRate)
    const shortfall             = calcShortfall(totalFundRequired, futureInvestmentValue)
    const fees                  = calcFees(data.currentFundValue, yrs)
    return { incomeAtRetirement, totalFundRequired, futureInvestmentValue, shortfall, fees }
  }, [age, yrs, retirementAge, interestRate, data.reqIncome, data.currentFundValue])

  // G18, G29, G41 — Liability Calculator sheet formulas
  const liabCalc = useMemo(() => calcLiabilities({ ...data }), [
    data.mortgages, data.loans, data.finalExpenses, data.educationFund,
    data.childCare, data.otherCashNeeds, data.grossAnnualIncomeNeeded,
    data.partnerIncome, data.assumedReturn, data.cashAssets, data.stocksBonds,
    data.principalResidence, data.secondaryResidence, data.totalLifeInsurance,
    data.businessAssets, data.otherAssets, data.currentFundValue
  ])

  const StatBox = ({ label, value, danger, success, cols }) => (
    <div style={{
      background: danger ? '#fff5f5' : success ? '#f0fff4' : 'var(--off-white)',
      border: `1.5px solid ${danger ? '#fc8181' : success ? '#68d391' : 'var(--border-light)'}`,
      borderRadius: '8px', padding: '0.75rem 1rem',
      gridColumn: cols ? `span ${cols}` : undefined
    }}>
      <div style={{fontSize:'0.7rem',color:'var(--slate-light)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'0.25rem'}}>{label}</div>
      <div style={{fontSize:'0.95rem',fontWeight:700,color:danger?'var(--danger)':success?'var(--success)':'var(--black)'}}>{value}</div>
    </div>
  )

  return (
    <div>
      {/* ── Income & Tax — E12, E13, E14, E16, E17, E18, E19 all auto ── */}
      <div className="section-title">Income & Tax (Excel E12–E19 — Auto-Calculated)</div>
      <div className="alert alert-info" style={{marginBottom:'1rem',fontSize:'0.82rem'}}>
        Enter gross income only. Tax bracket, net income, max RA contribution and SARS rebate are <strong>auto-calculated</strong> from 2024/25 SARS tables (Excel H13:L19).
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label>Gross Monthly Income (R) * <span style={{fontWeight:400,textTransform:'none',color:'var(--slate-light)'}}>(Excel E12)</span></label>
          <input type="number" value={data.grossIncome || ''} onChange={set('grossIncome')} placeholder="e.g. 160 000" />
        </div>
        <div className="form-group">
          <label>Required Monthly Income at Retirement (R)</label>
          <input type="number" value={data.reqIncome || ''} onChange={set('reqIncome')}
            placeholder="Pre-filled from RA section" />
          {!data.reqIncome && <span style={{fontSize:'0.78rem',color:'var(--slate-light)',marginTop:'0.2rem',display:'block'}}>Auto-pulled from RA Calculation section</span>}
        </div>
      </div>

      {data.grossIncome && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'0.6rem',marginBottom:'1.25rem'}}>
          <StatBox label="Tax Bracket (E16)"           value={tax.bracket || '—'} />
          <StatBox label="Annual Tax (E13)"             value={fmt(tax.annualTax)} />
          <StatBox label="Net Monthly Income"           value={fmt(tax.netMonthly)} />
          <StatBox label="Max RA p/m (E17 = MIN(R29200, 27.5%))" value={fmt(tax.maxRAmonthly)} />
          <StatBox label="Net Cost of Contribution (E19)" value={fmt(tax.netCostOfContribution)} />
        </div>
      )}

      {/* ── RA — all pulled from RA section ── */}
      <div className="section-title">Retirement Annuity (Excel E22–E34 — Auto from RA Section)</div>

      {(!age || !data.reqIncome) && (
        <div className="alert alert-warn" style={{marginBottom:'1rem'}}>
          ⚠ Complete the <strong>RA Calculation</strong> section first — all RA figures auto-populate here.
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label>Current RA / Total Fund Value (R) <span style={{fontWeight:400,textTransform:'none',color:'var(--slate-light)'}}>(Excel E23)</span></label>
          <input type="number" value={data.currentFundValue || ''} onChange={set('currentFundValue')}
            placeholder="Auto-pulled from RA section" />
        </div>
        <div className="form-group">
          <label>Penalties (R) <span style={{fontWeight:400,textTransform:'none',color:'var(--slate-light)'}}>(Excel E36)</span></label>
          <input type="number" value={data.penalties || ''} onChange={set('penalties')} placeholder="0" />
        </div>
        {age && (
          <>
            <div className="form-group">
              <label>Retirement Age (from RA section · Excel E9)</label>
              <input value={retirementAge} disabled style={{background:'var(--off-white)',color:'var(--slate)'}} />
            </div>
            <div className="form-group">
              <label>Interest Rate (from RA section · Excel E22)</label>
              <input value={`${(interestRate*100).toFixed(0)}%`} disabled style={{background:'var(--off-white)',color:'var(--slate)'}} />
            </div>
          </>
        )}
      </div>

      {raCalc && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.6rem',marginBottom:'0.75rem'}}>
            <StatBox label={`Income at ${retirementAge} — 6.5% inflation (E26 VLOOKUP)`} value={fmt(raCalc.incomeAtRetirement)} />
            <StatBox label={`Total Fund Required (E26 × 12 ÷ ${(interestRate*100).toFixed(0)}%)`} value={fmt(raCalc.totalFundRequired)} />
            <StatBox label={`Future Value @ ${(interestRate*100).toFixed(0)}% (E24 FV formula)`} value={fmt(raCalc.futureInvestmentValue)} />
            <StatBox label="SHORTFALL (E27)" value={fmt(raCalc.shortfall)} danger={raCalc.shortfall>0} success={raCalc.shortfall===0} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.6rem',marginBottom:'1.25rem'}}>
            <StatBox label="Allan Gray Fee 1.15% (E30 · F30 fixed)" value={fmt(raCalc.fees.allanGrayFee)} />
            <StatBox label="Existing Fee 3% (E31 · F31 fixed)"       value={fmt(raCalc.fees.existingFee)} />
            <StatBox label="Annual Fee Saving (E33)"                   value={fmt(raCalc.fees.feeSavings)} />
            <StatBox label="Fee Saving to Retirement (E34)"            value={fmt(raCalc.fees.feeSavingsToRetirement)} />
          </div>
        </>
      )}

      {/* ── Liability Calculator Sheet — G7:G41 ── */}
      <div className="section-title">Life Insurance FNA — Liabilities & Cash Needs (Excel G7:G16)</div>
      <div className="alert alert-info" style={{marginBottom:'1rem',fontSize:'0.82rem'}}>
        All fields default to 0 (Excel default). Total, shortfall and RA fund asset (G39) are <strong>auto-calculated</strong>.
      </div>
      <div className="form-grid">
        {[
          ['mortgages',     'Mortgages (G7)'],
          ['loans',         'Loans & Other Debts (G8)'],
          ['finalExpenses', 'Final Expenses — burial, probate, taxes, legal (G9)'],
          ['educationFund', 'Education Fund — R120k × yrs × children (G11)'],
          ['childCare',     'Child / Home Care — spouse & children (G13)'],
          ['otherCashNeeds','Other Cash Needs — emergency fund, bequests (G16)'],
        ].map(([field, label]) => (
          <div className="form-group" key={field}>
            <label>{label}</label>
            <input type="number" value={data[field] || ''} onChange={set(field)} placeholder="0" />
          </div>
        ))}
      </div>
      <StatBox label="Total Liabilities & Cash Needs (G18 = SUM(G7:G16))" value={fmt(liabCalc.totalLiabilities)} />

      {/* G22–G27 Income Analysis */}
      <div className="section-title">Income Analysis (Excel G22–G27)</div>
      <div className="form-grid">
        <div className="form-group">
          <label>Gross Annual Income Needed (G22)</label>
          <input type="number" value={data.grossAnnualIncomeNeeded || ''} onChange={set('grossAnnualIncomeNeeded')} placeholder="0" />
        </div>
        <div className="form-group">
          <label>Partner's Annual Income (G23)</label>
          <input type="number" value={data.partnerIncome || ''} onChange={set('partnerIncome')} placeholder="0" />
        </div>
        <div className="form-group">
          <label>Assumed Rate of Return % (G26)</label>
          <input type="number" step="0.5" value={data.assumedReturn || ''} onChange={set('assumedReturn')} placeholder="e.g. 8" />
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.6rem',marginBottom:'1.25rem'}}>
        <StatBox label="Gross Income Available (G24)"         value={fmt(liabCalc.grossIncomeAvailable)} />
        <StatBox label="Annual Income Shortage (G25)"          value={fmt(liabCalc.incomeShortage)} />
        <StatBox label="Capital Needed for Income Gap (G27)"   value={fmt(liabCalc.amountNeededForIncome)} />
      </div>
      <StatBox label="TOTAL MONEY REQUIRED (G29 = G18 + G27)" value={fmt(liabCalc.totalMoneyRequired)} danger={liabCalc.totalMoneyRequired > 0} />

      {/* G33–G41 Assets */}
      <div className="section-title">Assets — usable by family/partner (Excel G33:G39)</div>
      <div className="alert alert-info" style={{marginBottom:'0.75rem',fontSize:'0.82rem'}}>
        RA fund value is <strong>auto-included</strong> as G39 (Excel: =ROUND(FNA!E23,0)). Total shortfall auto-calculated as G41.
      </div>
      <div className="form-grid">
        {[
          ['cashAssets',         'Cash Assets — cash, unit trust, savings (G33)'],
          ['stocksBonds',        'Stocks or Bonds (G34)'],
          ['principalResidence', 'Principal Residence (G35)'],
          ['secondaryResidence', 'Secondary Residence (G36)'],
          ['totalLifeInsurance', 'Total Life Insurance — group, personal, mortgage, credit (G37)'],
          ['businessAssets',     'Business / Farm Assets (G38)'],
          ['otherAssets',        'Other Assets — pension, investments (G39 override)'],
        ].map(([field, label]) => (
          <div className="form-group" key={field}>
            <label>{label}</label>
            <input type="number" value={data[field] || ''} onChange={set(field)} placeholder="0" />
          </div>
        ))}
      </div>
      {data.currentFundValue && (
        <div className="alert alert-success" style={{marginBottom:'0.75rem',fontSize:'0.82rem'}}>
          ✓ RA Fund Value {fmt(data.currentFundValue)} auto-included as G39 (Excel formula: =ROUND(FNA!E23,0))
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.6rem',marginBottom:'1.25rem'}}>
        <StatBox label="Total Assets incl. RA fund (SUM G33:G39)" value={fmt(liabCalc.totalAssets)} success />
        <StatBox label="LIFE INSURANCE SHORTFALL (G41 = G29 - SUM(G33:G39))"
          value={fmt(liabCalc.liabilityShortfall)}
          danger={liabCalc.liabilityShortfall > 0}
          success={liabCalc.liabilityShortfall === 0} />
      </div>

      {/* Existing Cover */}
      <div className="section-title">Existing Cover</div>
      <div className="form-grid">
        {[
          ['lifeCover',        'Life Cover (R)'],
          ['disabilityCover',  'Disability Cover (R)'],
          ['dreadDiseaseCover','Dread Disease Cover (R)'],
          ['incomeBenefits',   'Monthly Income Benefit (R p/m)'],
        ].map(([field, label]) => (
          <div className="form-group" key={field}>
            <label>{label}</label>
            <input type="number" value={data[field] || ''} onChange={set(field)} placeholder="0" />
          </div>
        ))}
      </div>
    </div>
  )
}
