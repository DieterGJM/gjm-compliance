// ═══════════════════════════════════════════════════════════════════════════════
// GJM ULTRA BROKERS — FINANCIAL CALCULATION ENGINE
// Exact replication of FNA_Calculator.xlsx formulas
// 
// ALL FIXED VALUES FROM EXCEL (never need advisor input):
//   B4  = 0.065   → Inflation rate
//   E9  = 65      → Default retirement age
//   E22 = 0.06    → Default interest rate
//   F30 = 0.0115  → Allan Gray fee
//   F31 = 0.03    → Existing fee
//   B11 = 0.10    → Current premium escalation (Financial Calculator)
//   B26 = 0.00    → Proposed 2 escalation
//   B40 = 0.05    → Proposed 3 escalation
//   E17 = MIN(29200, grossMonthly*27.5%) → Max RA contribution
//   Tax brackets H13:L19 → 2024/25 SARS tables
//
// MINIMUM ADVISOR INPUTS:
//   DOB, required monthly income, gross income, current fund value
//   current premium (existing policy), penalties (optional)
//   liability/asset fields (all default 0)
// ═══════════════════════════════════════════════════════════════════════════════

// ── ALL EXCEL FIXED CONSTANTS ──────────────────────────────────────────────────
export const EXCEL = {
  // FNA Calculator sheet
  INFLATION_RATE:          0.065,   // B4
  DEFAULT_RETIREMENT_AGE:  65,      // E9
  DEFAULT_INTEREST_RATE:   0.06,    // E22
  ALLAN_GRAY_FEE:          0.0115,  // F30
  EXISTING_FEE:            0.03,    // F31
  MAX_RA_MONTHLY_CAP:      29200,   // E17 = MIN(29200, ...)
  MAX_RA_PERCENT:          0.275,   // E17 = MIN(29200, E12*27.5%)
  PRIMARY_REBATE:          17235,   // 2024/25

  // Financial Calculator sheet — fixed escalation rates per proposal
  ESC_CURRENT:    0.10,  // B11
  ESC_PROPOSED_2: 0.00,  // B26
  ESC_PROPOSED_3: 0.05,  // B40
  PAYMENT_FREQUENCY: 12, // B15 = Monthly = 12

  // 2024/25 Tax brackets H13:L19
  TAX_BRACKETS: [
    { max: 237100,   rate: 0.18, base: 0      },  // H13, K13
    { max: 370500,   rate: 0.26, base: 42678  },  // H14, K14, L14
    { max: 512800,   rate: 0.31, base: 77362  },  // H15, K15, L15
    { max: 673000,   rate: 0.36, base: 121475 },  // H16, K16, L16
    { max: 857900,   rate: 0.39, base: 179147 },  // H17, K17, L17
    { max: 1817000,  rate: 0.41, base: 251258 },  // H18, K18, L18
    { max: Infinity, rate: 0.45, base: 644489 },  // H19, K19, L19
  ]
}

// ── E8: Age from DOB (Excel: ROUND((TODAY()-D7)/365, 0)) ──────────────────────
export function calcAge(dob) {
  if (!dob) return null
  const d = new Date(dob), t = new Date()
  let age = t.getFullYear() - d.getFullYear()
  const m = t.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--
  return age
}

// ── E10: Years to retirement (Excel: E9-E8) ───────────────────────────────────
export function calcYearsToRetirement(age, retirementAge = EXCEL.DEFAULT_RETIREMENT_AGE) {
  if (age == null) return null
  return Math.max(0, retirementAge - age)
}

// ── B6..B54: Inflation table (Excel: Bn = B(n-1) + B(n-1)*B4) ─────────────────
export function buildInflationTable(currentAge, requiredIncomeNow, retirementAge = EXCEL.DEFAULT_RETIREMENT_AGE) {
  if (!currentAge || !requiredIncomeNow) return []
  const rows = []
  let income = Number(requiredIncomeNow)
  for (let age = currentAge; age <= retirementAge; age++) {
    rows.push({ age, income: Math.round(income) })
    income = income + income * EXCEL.INFLATION_RATE
  }
  return rows
}

// ── Income at retirement age (last row of inflation table) ────────────────────
export function calcIncomeAtRetirement(currentAge, requiredIncomeNow, retirementAge = EXCEL.DEFAULT_RETIREMENT_AGE) {
  const table = buildInflationTable(currentAge, requiredIncomeNow, retirementAge)
  return table.length ? table[table.length - 1].income : 0
}

// ── E26: Total Fund Value Required (Excel: VLOOKUP(E9,Table1,2)*12/E22) ───────
export function calcTotalFundRequired(incomeAtRetirement, interestRate = EXCEL.DEFAULT_INTEREST_RATE) {
  if (!incomeAtRetirement || !interestRate) return 0
  return Math.round((incomeAtRetirement * 12) / interestRate)
}

// ── E24: Future Investment Value (Excel: FV(E22, E10, 0, -E23)) ───────────────
export function calcFutureInvestmentValue(currentFundValue, yearsToRetirement, interestRate = EXCEL.DEFAULT_INTEREST_RATE) {
  if (!currentFundValue || !yearsToRetirement) return 0
  return Math.round(Number(currentFundValue) * Math.pow(1 + interestRate, yearsToRetirement))
}

// ── E27: Shortfall (Excel: E26-E24) ───────────────────────────────────────────
export function calcShortfall(totalFundRequired, futureInvestmentValue) {
  return Math.max(0, Math.round(totalFundRequired - futureInvestmentValue))
}

// ── B17/B32/B46: Future Value of savings (Excel growing annuity formula) ──────
// =ROUND(FV((1+r)^(1/12)-1,12,-pmt,0,1)*FV(r,n-1,0,-1,0)*FV((1+esc)/(1+r)-1,n,-1,0,0),-2)
export function calcFutureValue(annualPremium, escalationRate, yearsToRetirement, interestRate = EXCEL.DEFAULT_INTEREST_RATE) {
  if (!annualPremium || !yearsToRetirement) return 0
  const pmt = Number(annualPremium)
  const r   = Number(interestRate)
  const esc = Number(escalationRate) || 0
  const n   = yearsToRetirement
  const m   = EXCEL.PAYMENT_FREQUENCY // always 12 (Monthly)
  if (n <= 0 || pmt <= 0) return 0
  const mr  = Math.pow(1 + r, 1 / m) - 1
  const mp  = pmt / m
  const fv1 = mp * ((Math.pow(1 + mr, m) - 1) / mr) * (1 + mr)
  const fc  = Math.pow(1 + r, n - 1)
  const gr  = (1 + esc) / (1 + r) - 1
  const gf  = Math.abs(gr) < 1e-10 ? n : (Math.pow(1 + gr, n) - 1) / gr
  return Math.round(fv1 * fc * gf / 100) * 100
}

// ── Back-calculate premium to close shortfall ─────────────────────────────────
export function calcRequiredMonthlyPremium(shortfall, escalationRate, yearsToRetirement, interestRate = EXCEL.DEFAULT_INTEREST_RATE) {
  if (!shortfall || !yearsToRetirement) return 0
  let lo = 0, hi = shortfall / 12
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const fv  = calcFutureValue(mid * 12, escalationRate, yearsToRetirement, interestRate)
    if (fv < shortfall) lo = mid; else hi = mid
    if (Math.abs(hi - lo) < 0.5) break
  }
  return Math.ceil((lo + hi) / 2)
}

// ── E14: Annualised income (Excel: E12*12) ────────────────────────────────────
// ── E13: Net income, E16: Tax bracket, E17: Max RA, E18: SARS rebate, E19: Net cost
export function calcTax(grossMonthly) {
  const gm     = Number(grossMonthly) || 0
  const annual = gm * 12                                       // E14
  if (!annual) return {
    bracket: null, rate: 0, annualTax: 0, netMonthly: 0,
    annualGross: 0, maxRAmonthly: 0, maxRAannual: 0, sarsRebate: 0, netCostOfContribution: 0
  }
  // E13 tax formula
  const b        = EXCEL.TAX_BRACKETS.find(t => annual <= t.max) || EXCEL.TAX_BRACKETS[EXCEL.TAX_BRACKETS.length - 1]
  const annualTax = Math.max(0, b.base + (annual - (b === EXCEL.TAX_BRACKETS[0] ? 0 : EXCEL.TAX_BRACKETS[EXCEL.TAX_BRACKETS.indexOf(b) - 1].max + 1)) * b.rate - EXCEL.PRIMARY_REBATE)

  // Recalculate properly using the exact Excel IF chain
  const tax = calcTaxExact(annual)

  const netMonthly             = Math.round((annual - tax) / 12)                                // E13
  const maxRAmonthly           = Math.min(EXCEL.MAX_RA_MONTHLY_CAP, Math.round(gm * EXCEL.MAX_RA_PERCENT))  // E17
  const maxRAannual            = maxRAmonthly * 12
  const sarsRebate             = Math.round(maxRAmonthly * b.rate)                              // E18
  const netCostOfContribution  = Math.round(maxRAmonthly - sarsRebate)                          // E19

  return {
    bracket: `${(b.rate * 100).toFixed(0)}%`,
    rate:     b.rate,
    annualTax: Math.round(tax),
    netMonthly,
    annualGross: annual,
    maxRAmonthly,
    maxRAannual,
    sarsRebate,
    netCostOfContribution,
  }
}

// Exact Excel E13 tax IF chain
function calcTaxExact(annual) {
  const [t1,t2,t3,t4,t5,t6,t7] = EXCEL.TAX_BRACKETS
  const [k1,k2,k3,k4,k5,k6] = [237100,370500,512800,673000,857900,1817000]
  const [l2,l3,l4,l5,l6,l7] = [42678,77362,121475,179147,251258,644489]
  let tax
  if      (annual <= k1) tax = annual * 0.18
  else if (annual <= k2) tax = l2 + (annual - k1) * 0.26
  else if (annual <= k3) tax = l3 + (annual - k2) * 0.31
  else if (annual <= k4) tax = l4 + (annual - k3) * 0.36
  else if (annual <= k5) tax = l5 + (annual - k4) * 0.39
  else if (annual <= k6) tax = l6 + (annual - k5) * 0.41
  else                   tax = l7 + (annual - k6) * 0.45
  return Math.max(0, tax - EXCEL.PRIMARY_REBATE)
}

// ── E30,E31,E33,E34: Fees (Excel fixed formulas) ─────────────────────────────
export function calcFees(currentFundValue, yearsToRetirement) {
  const fund = Number(currentFundValue) || 0
  const yrs  = Number(yearsToRetirement) || 0
  const allanGrayFee           = Math.round(fund * EXCEL.ALLAN_GRAY_FEE)   // E30
  const existingFee            = Math.round(fund * EXCEL.EXISTING_FEE)     // E31
  const feeSavings             = Math.round(existingFee - allanGrayFee)    // E33
  const feeSavingsToRetirement = Math.round(feeSavings * yrs)              // E34
  return { allanGrayFee, existingFee, feeSavings, feeSavingsToRetirement }
}

// ── G18,G29,G41: Liability Calculator sheet formulas ─────────────────────────
export function calcLiabilities(inputs) {
  // G18 = SUM(G7:G16)
  const totalLiabilities = [
    inputs.mortgages, inputs.loans, inputs.finalExpenses,
    inputs.educationFund, inputs.childCare, inputs.otherCashNeeds
  ].reduce((s, v) => s + (Number(v) || 0), 0)

  // G24 = gross income available
  // grossAnnualIncomeNeeded falls back to grossIncome*12 if not entered
  const grossAnnualIncome = Number(inputs.grossAnnualIncomeNeeded) ||
    (Number(inputs.grossIncome) * 12) || 0
  const grossIncomeAvailable = Math.max(0,
    grossAnnualIncome - (Number(inputs.partnerIncome) || 0)
  )
  // G25 = annual income shortage
  const incomeShortage = Math.max(0,
    grossAnnualIncome - (Number(inputs.partnerIncome) || 0)
  )
  // G27 = amount needed to meet income shortage
  const assumedReturn         = Number(inputs.assumedReturn) || 0
  const amountNeededForIncome = assumedReturn > 0 ? Math.round(incomeShortage / assumedReturn) : 0

  // G29 = G18 + G27
  const totalMoneyRequired = Math.round(totalLiabilities + amountNeededForIncome)

  // G39 = ROUND(FNA!E23,0) — RA fund auto-included as asset
  const totalAssets = [
    inputs.cashAssets, inputs.stocksBonds, inputs.principalResidence,
    inputs.secondaryResidence, inputs.totalLifeInsurance,
    inputs.businessAssets, inputs.otherAssets,
    inputs.currentFundValue   // G39: auto-pulled from FNA E23
  ].reduce((s, v) => s + (Number(v) || 0), 0)

  // G41 = IF(G29-SUM(G33:G39)>0, G29-SUM(G33:G39), 0)
  const liabilityShortfall = Math.max(0, Math.round(totalMoneyRequired - totalAssets))

  return {
    totalLiabilities, grossIncomeAvailable, incomeShortage,
    amountNeededForIncome, totalMoneyRequired, totalAssets, liabilityShortfall
  }
}

// ── Master RA/FNA calculation object (all Excel sheets combined) ──────────────
// INPUTS: dob, reqIncome, grossIncome, currentFundValue, currentPremium, penalties
//         retirementAge (default 65), interestRate (default 6%)
// EVERYTHING ELSE IS AUTO-CALCULATED
export function calcRA(inputs) {
  // inputs.interestRate is stored as a percentage (e.g. 6 meaning 6%) — divide by 100
  const interestRate   = (Number(inputs.interestRate) > 1 ? Number(inputs.interestRate) / 100 : Number(inputs.interestRate)) || EXCEL.DEFAULT_INTEREST_RATE
  const retirementAge  = Number(inputs.retirementAge)  || EXCEL.DEFAULT_RETIREMENT_AGE

  // E8, E10
  const age = calcAge(inputs.dob)
  const yrs = calcYearsToRetirement(age, retirementAge)

  // B6..B54 inflation table
  const inflationTable    = buildInflationTable(age, inputs.reqIncome, retirementAge)
  const incomeAtRetirement = calcIncomeAtRetirement(age, inputs.reqIncome, retirementAge)

  // E26: total fund required
  const totalFundRequired = calcTotalFundRequired(incomeAtRetirement, interestRate)

  // E24: future investment value
  const futureInvestmentValue = calcFutureInvestmentValue(inputs.currentFundValue, yrs, interestRate)

  // E27: shortfall
  const shortfall = calcShortfall(totalFundRequired, futureInvestmentValue)

  // E30,E31,E33,E34: fees
  const fees = calcFees(inputs.currentFundValue, yrs)

  // Back-calculated proposals (Financial Calculator sheet)
  // Proposed 2 uses B26=0% escalation, Proposed 3 uses B40=5%
  const p2Premium = yrs && shortfall
    ? Math.ceil(calcRequiredMonthlyPremium(shortfall, EXCEL.ESC_PROPOSED_2, yrs, interestRate))
    : 0
  const p3Premium = yrs && shortfall
    ? Math.ceil(calcRequiredMonthlyPremium(shortfall, EXCEL.ESC_PROPOSED_3, yrs, interestRate))
    : 0

  // FV calculations using exact Financial Calculator formulas
  const currentFV = calcFutureValue(
    (Number(inputs.currentPremium) || 0) * 12,
    EXCEL.ESC_CURRENT,      // B11 = 0.10 fixed
    yrs, interestRate
  )
  const p2FV = calcFutureValue(p2Premium * 12, EXCEL.ESC_PROPOSED_2, yrs, interestRate)
  const p3FV = calcFutureValue(p3Premium * 12, EXCEL.ESC_PROPOSED_3, yrs, interestRate)

  return {
    age, yrs, retirementAge, interestRate,
    inflationTable, incomeAtRetirement,
    totalFundRequired, futureInvestmentValue,
    shortfall, fees,
    p2Premium, p3Premium,
    currentFV, p2FV, p3FV,
    // Tax calculation (for FNA Excel)
    tax: calcTax(inputs.grossIncome),
    // Excel fixed escalation rates (informational)
    escCurrent:    EXCEL.ESC_CURRENT    * 100,
    escProposed2:  EXCEL.ESC_PROPOSED_2 * 100,
    escProposed3:  EXCEL.ESC_PROPOSED_3 * 100,
  }
}

// ── Formatting helpers ────────────────────────────────────────────────────────
export function fmt(val) {
  if (val == null || val === '' || isNaN(Number(val))) return 'R 0'
  return `R ${Math.round(Number(val)).toLocaleString('en-ZA')}`
}
export function fmtPct(val) {
  if (!val) return '0%'
  return `${Number(val).toFixed(1)}%`
}
