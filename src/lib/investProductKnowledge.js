// ─── Investment Product Knowledge Base ──────────────────────────────────────
// Used by InvestROA generator for Section D rationale, Section E, Section F

export const INVESTMENT_CATALOGUE = {

  'Allan Gray': {
    products: [
      {
        id: 'ag_ra',
        name: 'Allan Gray Retirement Annuity',
        types: ['retirement', 'ra'],
        shortDesc: 'Tax-deductible RA with Regulation 28 compliance',
        fullNotes: `Allan Gray Retirement Annuity — tax-effective retirement investment. Contributions are tax-deductible up to 27.5% of taxable income (max R350,000/year). Investment growth and income are tax-free within the fund. Access only from age 55. Regulation 28 compliant (max 75% equities, 25% property, 30% foreign). Fund protected from creditors. At retirement: up to one-third as cash lump sum (portion tax-free per SARS tables); remainder transferred to Living Annuity. Pre-retirement death: Board of Trustees allocates to dependants/nominees — does not form part of estate. Section 14 transfer available to/from other approved retirement funds. Cannot be used as loan security.`,
        exclusions: 'No access before age 55. Cannot secure loans. Regulation 28 investment limits apply. Surrender penalties may apply on transfer.',
        waitingPeriods: 'No waiting period. Immediate investment from first contribution.',
        minimums: 'R500/pm recurring or lump sum',
      },
      {
        id: 'ag_endowment',
        name: 'Allan Gray Endowment',
        types: ['endowment', 'savings'],
        shortDesc: 'Tax-efficient medium-to-long-term savings with estate benefits',
        fullNotes: `Allan Gray Endowment — tax-efficient savings plan for individuals with marginal tax rate above 30%. Tax on growth capped at 30% (growth), 20% (dividends), 12% (CGT). Estate planning benefit: nominate beneficiaries for proceeds (bypasses estate). Five-year restriction period on withdrawals — only one withdrawal permitted during restriction period. 120% rule: contributions in any year exceeding 120% of prior two years triggers new five-year restriction period. Loan facility available during restriction period (one interest-free loan). No tax at end of investment term — SARS obligations settled by Allan Gray during the term.`,
        exclusions: 'Limited to one withdrawal during restriction period. 120% rule may trigger new restriction period. Not suitable for short-term savings.',
        waitingPeriods: '5-year restriction period on withdrawals from inception.',
        minimums: 'R500/pm recurring or lump sum per fund minimums',
      },
      {
        id: 'ag_living_annuity',
        name: 'Allan Gray Living Annuity',
        types: ['living_annuity', 'retirement_income'],
        shortDesc: 'Flexible post-retirement income with investment choice',
        fullNotes: `Allan Gray Living Annuity — purchased with retirement fund proceeds or from another living annuity. Income drawdown: minimum 2.5%, maximum 17.5% of fund value per year. Income reviewed annually on policy anniversary. Payment frequency: monthly, quarterly, biannually or annually. Client carries longevity and investment risk — income not guaranteed. Fund value may fluctuate. Policy may be transferred to another insurer. If fund value falls below prescribed minimum, may be commuted to cash. On death: remaining fund value paid to nominated beneficiaries (not estate). Underlying funds of client's choice (not Regulation 28 limited post-retirement).`,
        exclusions: 'Income not guaranteed. Client bears investment risk. Cannot contribute new money from non-retirement sources.',
        waitingPeriods: 'No waiting period. Income commences from policy start date.',
        minimums: 'Purchase with retirement fund lump sum',
      },
      {
        id: 'ag_preservation',
        name: 'Allan Gray Preservation Fund',
        types: ['preservation', 'pension_preservation', 'provident_preservation'],
        shortDesc: 'Preserve pension/provident fund savings with tax continuity',
        fullNotes: `Allan Gray Pension/Provident Preservation Fund — accepts transfer from employer pension or provident fund. Preserves tax benefits of original fund. One-off pre-retirement withdrawal permitted (before any withdrawal made). Investment return tax-free within fund. Regulation 28 compliant. No further contributions permitted — start separate RA for ongoing savings. At retirement (from age 55): pension preservation allows 1/3 cash lump sum + 2/3 annuity; provident preservation (pre-March 2021 benefits) may allow full cash. Post-March 2021 provident contributions: same annuity rules as pension. Death benefit paid to dependants/nominees via Board of Trustees — does not form part of estate. No creditor protection for pre-retirement withdrawals.`,
        exclusions: 'No further contributions. One pre-retirement withdrawal only. Cannot secure loans against this fund.',
        waitingPeriods: 'No waiting period for transfer. Immediate investment.',
        minimums: 'Transfer of existing retirement fund proceeds',
      },
      {
        id: 'ag_unit_trust',
        name: 'Allan Gray Unit Trust',
        types: ['unit_trust', 'savings', 'investment'],
        shortDesc: 'Flexible investment with professional fund management',
        fullNotes: `Allan Gray Unit Trust — access to professional asset management through pooled investment. Full flexibility: lump sum, regular monthly debit orders, additional contributions, withdrawals at any time. No restriction period. Tax: client taxed annually on investment income (dividends and interest) regardless of whether reinvested — Dividend Withholding Tax (DWT) 20%, Interest Withholding Tax (IWT) where applicable. Capital gains realised on disposal of units subject to CGT. Allan Gray platform (LISP) gives access to Allan Gray and other fund managers' unit trusts. Offshore investment options available. Full liquidity — no penalties for withdrawal. Investment can be transferred or made on behalf of another party.`,
        exclusions: 'No tax deductions on contributions. Full income tax on distributions. CGT on unit disposal. No creditor protection.',
        waitingPeriods: 'No waiting period. Full liquidity at all times.',
        minimums: 'R500/pm or lump sum per fund minimums',
      },
    ],
  },

  'Discovery': {
    products: [
      {
        id: 'discovery_endowment_lumpsum',
        name: 'Discovery Local Endowment (Lump Sum)',
        types: ['endowment', 'savings'],
        shortDesc: 'Endowment with up to 20% investment boost + Vitality rewards',
        fullNotes: `Discovery Local Endowment (Lump Sum) — minimum R75,000 (R100,000 for Cogence models). Investment boost of up to 20% on initial investment for qualifying Discovery funds invested for 5+ years. Additional Vitality boost: up to 15% fund value boost on accidental death if living healthy lifestyle. Boost held separately and grows at guaranteed 4.2% p.a. Tax efficiency: 30% on growth, 20% dividends, 12% CGT — deducted during term, no tax on maturity. 200+ investment fund options (Discovery and external managers). Five-year restriction period — limited withdrawals in first 5 years. No performance guarantee on investment funds. Estate benefit: nominate beneficiaries. Fees: Discovery Invest admin fee + investment manager fee + adviser fee.`,
        exclusions: 'Boost only applies to qualifying Discovery funds. Limited access in first 5 years. No guarantee of investment performance.',
        waitingPeriods: '5-year restriction period. Boosts paid out at 5 and 10 years.',
        minimums: 'R75,000 lump sum (R100,000 for Cogence)',
      },
      {
        id: 'discovery_endowment_recurring',
        name: 'Discovery Local Endowment (Recurring)',
        types: ['endowment', 'savings'],
        shortDesc: 'Monthly endowment with fee refunds and disability protection',
        fullNotes: `Discovery Local Endowment (Recurring) — minimum R850/pm. Up to 45% of yearly admin fees paid back as rewards for continued investment. Contribution Waiver available (additional premium): pays contributions if client becomes severely ill or disabled during investment term. Protection for beneficiaries: boost to fund value if client dies while invested. Tax efficiency: 30% growth, 20% dividends, 12% CGT — deducted during term. Five-year restriction period. 200+ fund options. Fees: Discovery Invest admin fees + investment manager fees + adviser fees. Suitable for medium- to long-term savings goals.`,
        exclusions: 'Contribution Waiver requires additional premium. Limited withdrawals in first 5 years. Not suitable for short-term needs.',
        waitingPeriods: '5-year restriction period. Contribution Waiver subject to disability claim terms.',
        minimums: 'R850/pm recurring',
      },
    ],
  },

  'Momentum': {
    products: [
      {
        id: 'momentum_investo',
        name: 'Momentum Investo Endowment',
        types: ['endowment', 'savings'],
        shortDesc: 'Endowment with loyalty bonus, contribution holidays and guarantees',
        fullNotes: `Momentum Investo Endowment — medium to long-term savings with tax and estate planning benefits. Enhanced allocation on recurring contributions above threshold. Loyalty bonus at end of product term AND every 5 years — pays back most admin fees. Contribution Replacer: pays contributions if client cannot due to qualifying disability events or dies before term end. Contribution holidays: skip contributions for a few months if financial difficulties (recurring only). Guarantees available: minimum growth certainty. Withdrawal during restriction period limited to contributions plus 5% growth. Interest-free loan during first five years. Can be used as loan security. Minimum term 5 years. On death: nominated beneficiaries receive proceeds. Suitable for individuals, trusts, companies, CCs.`,
        exclusions: '120% rule on contributions triggers new restriction period. One withdrawal during restriction period. Not suitable if full access needed in first 5 years.',
        waitingPeriods: '5-year restriction period. Contribution Replacer subject to disability claim terms.',
        minimums: 'R500/pm (internal funds), R750/pm (external funds), R5,000 lump sum top-up',
      },
    ],
  },

  'Liberty': {
    products: [
      {
        id: 'liberty_ra',
        name: 'Liberty Retirement Annuity',
        types: ['retirement', 'ra'],
        shortDesc: 'Tax-effective RA with High-Water Mark Guarantee option',
        fullNotes: `Liberty Retirement Annuity — tax-effective retirement savings. Contributions partially or fully tax-deductible. Investment growth tax-free within fund. Access from age 55. Fund protected from creditors. High-Water Mark Guarantee (optional): protects 80% of best quarterly portfolio performance over a 5-year guarantee period — locks in new investment highs, top-up if portfolio falls below guaranteed level at period end. Wide investment choice from leading South African asset managers. Invest via monthly debit order, lump sum, or combination. Minimums: R15,000 lump sum or R500/pm recurring. Exact Income Fund has no platform or portfolio fees. Other portfolios incur portfolio fees, platform fees, guarantee charges (if selected), plus initial and ongoing adviser fees.`,
        exclusions: 'No access before age 55. High-Water Mark Guarantee is optional at additional cost. Regulation 28 investment limits apply.',
        waitingPeriods: 'No waiting period. Immediate investment.',
        minimums: 'R15,000 lump sum or R500/pm recurring',
      },
    ],
  },

  'BrightRock': {
    products: [
      {
        id: 'brightrock_life',
        name: 'BrightRock Life Cover',
        types: ['life'],
        shortDesc: 'Needs-matched life cover with cover conversion facility',
        fullNotes: `BrightRock Life Cover — premium certainty with defined increases. Cover Conversion Facility: after 3 years in force, client can convert premiums from cover no longer needed to cover for new or underinsured needs (available if medical loading ≤75%; death-to-death conversion if loading 75-200%). Extra Cover Buy-Up and Yearly Secured Cover: qualify for more cover without new underwriting. Child death cover: R10,000 for newborns dying within 3 months; R5,000 automatic child cover; doubled if childcare needs listed on policy.`,
        exclusions: 'Cover conversion subject to terms in BrightRock Product Guide. Medical loading >200% restricts conversion. Claims post-policy-start may remove conversion facility for certain covers.',
        waitingPeriods: 'No waiting period on life cover. Cover Conversion Facility available after 3 years.',
        minimums: 'Per quotation',
      },
      {
        id: 'brightrock_income',
        name: 'BrightRock Income Protection',
        types: ['income', 'disability'],
        shortDesc: 'Flexible income protection with needs-matched benefits',
        fullNotes: `BrightRock Income Protection — designed to match changing client needs over time. Cover Conversion Facility allows premium reallocation from redundant cover to new needs. Yearly Secured Cover and Extra Cover Buy-Up available without medical underwriting for qualifying clients. Premium increases and guarantees clearly defined.`,
        exclusions: 'Standard BrightRock exclusions apply. Conversion facility subject to medical loading and claim history.',
        waitingPeriods: 'Per policy terms and waiting period selected.',
        minimums: 'Per quotation',
      },
      {
        id: 'brightrock_severe',
        name: 'BrightRock Severe Illness',
        types: ['trauma'],
        shortDesc: 'Severe illness cover with needs-matched lump sum benefit',
        fullNotes: `BrightRock Severe Illness Cover — lump sum on diagnosis of qualifying severe illness. Needs-matched benefit structure. Cover Conversion Facility available for reallocation of premiums to other needs after 3 years.`,
        exclusions: 'Standard BrightRock exclusions. Survival period applies.',
        waitingPeriods: '3-month waiting period for certain conditions per policy terms.',
        minimums: 'Per quotation',
      },
    ],
  },

  'PPS': {
    products: [
      {
        id: 'pps_ra',
        name: 'PPS Retirement Annuity',
        types: ['retirement', 'ra'],
        shortDesc: 'Tax-efficient RA exclusively for graduate professionals with PPS Profit Share',
        fullNotes: `PPS Retirement Annuity — exclusively for graduate professionals. Tax-deductible contributions (claimed back from SARS, reinvested). Investment growth and income tax-exempt within fund. Two sections: (1) insurance company policy section; (2) unit trust based section (lower fees, greater flexibility, transparency). Intra-Fund Conversion: move from policy-based to unit trust section without losing retirement savings continuity. Access from age 55 minimum. At retirement: up to one-third as cash (prescribed amount tax-free); balance must purchase post-retirement income (minimum two-thirds as annuity). Insolvency protection for retirement savings. PPS Profit Share Allocation: qualifying members receive annual profit allocations based on investment portfolio — allocated at age 60. Adjust debit order amounts and unit trust selection without transaction fees. PPS Mutual organisation — 100% profits shared with qualifying members.`,
        exclusions: 'Access only from age 55. Two-thirds must purchase annuity income at retirement. Regulation 28 investment limits apply. Suicide exclusion within 2 years of commencement.',
        waitingPeriods: 'No waiting period on contributions. Intra-Fund Conversion available at any time.',
        minimums: 'Per individual contribution amount',
      },
      {
        id: 'pps_personal_pension',
        name: 'PPS Personal Pension Plan (OPN)',
        types: ['retirement', 'ra', 'pension'],
        shortDesc: 'OPN Personal Pension — tax-efficient retirement savings for graduate professionals',
        fullNotes: `PPS OPN Personal Pension Plan — tax-efficient retirement investment vehicle for graduate professionals. Tax exemptions on capital gains, interest and dividends within investment. SARS tax deduction on contributions can be reinvested. Savings remain invested until age 55 minimum. Flexibility: adjust monthly contributions and unit trust selection without transaction fees. Access to focused range of unit trusts from selected asset managers plus PPS Managed Share Portfolio (with professional stockbroker). PPS Profit Share Allocation based on all assets with PPS — qualifying members earn profit allocations. Can link family members (children, spouse, parent) OPN investment solutions to PPS member number for additional profit share. Best suited to graduate professionals seeking tax benefits, insolvency protection and disciplined long-term retirement savings. Must be comfortable with requirement to purchase post-retirement income with at least two-thirds of proceeds.`,
        exclusions: 'No access before age 55. Two-thirds minimum must purchase post-retirement income. Not suitable if access to savings required before retirement.',
        waitingPeriods: 'No waiting period. Immediate investment from first contribution.',
        minimums: 'Per individual contribution amount',
      },
      {
        id: 'pps_preservation',
        name: 'PPS Preservation Fund (Pension/Provident)',
        types: ['preservation', 'pension_preservation', 'provident_preservation'],
        shortDesc: 'PPS Preservation Fund — preserve retirement savings when changing employers',
        fullNotes: `PPS Preservation Fund (Pension and Provident) — specifically designed to preserve and grow retirement savings from a pension or provident fund when changing employers. No tax on transfer from pension/provident fund into preservation fund. Tax exemptions on capital gains, interest and dividends within investment. Portion of investment proceeds tax-free. Savings remain invested until age 55. One pre-retirement withdrawal permitted (if no withdrawal made prior to preservation). Access to PPS Funds and premium selection of local asset managers. PPS Managed Share Portfolio available (with professional stockbroker). PPS Profit Share Allocation: qualifying members receive profit allocation based on all assets. Can link family members for additional profit share allocations. Must be comfortable with single pre-retirement withdrawal restriction and requirement to purchase post-retirement income with at least two-thirds of proceeds at retirement.`,
        exclusions: 'One pre-retirement withdrawal only (if none made prior). No additional contributions. Two-thirds must purchase annuity at retirement. Access only from age 55.',
        waitingPeriods: 'No waiting period. Immediate investment on transfer.',
        minimums: 'Transfer of existing pension/provident fund proceeds',
      },
      {
        id: 'pps_endowment',
        name: 'PPS Endowment Plan',
        types: ['endowment', 'savings'],
        shortDesc: 'Tax-efficient endowment for graduate professionals with marginal tax rate above 30%',
        fullNotes: `PPS Endowment Plan — tax-efficient savings for investors with marginal tax rate above 30%. All taxes payable levied within the investment — no personal tax reporting responsibility. Investment proceeds are tax-free in your hands. Disciplined investing: commit to remain invested for minimum 5 years, limited access during this period. Flexibility: adjust contributions and unit trust selection at any time without fees. Direct payment to beneficiaries on death — bypasses estate, saves executor fees, immediate access for loved ones. PPS Mutual: 100% profits shared among qualifying members. Profit Share Allocation when linking family OPN investment solutions to PPS member number. Best suited to investors with marginal tax rate above 30% willing to remain invested for at least 5 years who seek tax-efficient lifestyle savings without unrestricted access.`,
        exclusions: 'Limited access during 5-year restriction period. Not suitable for investors requiring unrestricted access. Not suitable for marginal tax rates below 30%.',
        waitingPeriods: '5-year restriction period. Limited withdrawals during restriction period.',
        minimums: 'Per individual contribution amount',
      },
    ],
  },

  'Sanlam': {
    products: [
      {
        id: 'sanlam_cumulus_ra',
        name: 'Sanlam Cumulus Echo Retirement Annuity',
        types: ['retirement', 'ra'],
        shortDesc: 'RA with tax deduction on contributions and tax-free growth within fund',
        fullNotes: `Sanlam Cumulus Echo Retirement Annuity — contributions reduce taxable income up to prescribed limits (27.5% of taxable income, max R350,000/year). Excess contributions carried forward. Investment returns not taxed within fund. At retirement: up to one-third as tax-free cash lump sum (within prescribed limits); balance provides monthly income (taxed as income). Retirement savings protected from personal financial loss/creditors. Wide range of leading investment funds carefully selected by Sanlam. Lifetime Investment Option: managed by leading asset managers at very low cost. Minimum retirement age 55. Flexibility to adjust contributions and switch investment funds.`,
        exclusions: 'No access before age 55. Two-thirds minimum must purchase annuity income. Regulation 28 investment limits. Standard Sanlam exclusions apply.',
        waitingPeriods: 'No waiting period. Immediate investment.',
        minimums: 'Per Sanlam quotation',
      },
      {
        id: 'sanlam_cumulus_preservation',
        name: 'Sanlam Cumulus Echo Preservation Fund',
        types: ['preservation', 'pension_preservation', 'provident_preservation'],
        shortDesc: 'Preservation fund with Wealth Bonus reward for staying invested until retirement',
        fullNotes: `Sanlam Cumulus Echo Preservation Fund — continues growing retirement savings when changing jobs. Wealth Bonus: additional amount added to savings as reward for remaining invested until retirement — the longer invested, the larger the bonus. Minimum one-off payment R25,000 (ad hoc payments from R5,000). Freedom to switch between investment funds — 4 free switches per plan year. Wide range of leading investment funds. Lifetime Investment Option available. Investment grows based on underlying fund choice. At retirement: receive savings plus Wealth Bonus. Minimum retirement age 55.`,
        exclusions: 'One pre-retirement withdrawal permitted. No additional contributions from new employment. Minimum retirement age 55. Two-thirds must purchase annuity at retirement.',
        waitingPeriods: 'No waiting period on transfer. Immediate investment.',
        minimums: 'R25,000 one-off transfer (R5,000 ad hoc)',
      },
      {
        id: 'sanlam_topcov_risk',
        name: 'Sanlam TopCover for Professionals (Risk)',
        types: ['life', 'disability', 'income', 'trauma'],
        shortDesc: 'Comprehensive risk cover — life, disability, income protection, severe illness',
        fullNotes: `Sanlam TopCover for Professionals — comprehensive risk cover product. Life cover: immediate life cover from application date for unnatural death (up to R500,000 or cover amount). 2-year suicide exclusion. Free cover: immediate cover from first premium payment. No waiting periods on life cover and disability cover. Severe illness: 14-day survival period; 5-year waiting period on joint replacements. Income Protector for Professionals: sickness benefit (up to 100% cover, waiver of payment automatic during claim); extended disability income (occupation-specific definition — inability to fulfil substantial and material duties of regular occupation). Grace period: 30-day cooling-off period. Commission per signed quotation. Plan benefits tax-free to recipient.`,
        exclusions: '2-year suicide exclusion. 14-day survival period (severe illness). 5-year waiting period for joint replacements. Dangerous pursuits excluded from immediate cover. Occupation change must be notified within 30 days.',
        waitingPeriods: 'No waiting period on life and disability. Sickness benefit: from start of sick leave. Extended disability: continuous for entire waiting period chosen.',
        minimums: 'Per Sanlam quotation',
      },
    ],
  },


}

export function getInvestmentProductsForInsurer(insurerName) {
  if (!insurerName) return []
  try {
    // Try exact match first, then partial
    const exact = INVESTMENT_CATALOGUE[insurerName]
    if (exact) return exact.products || []
    const key = Object.keys(INVESTMENT_CATALOGUE).find(k =>
      k.toLowerCase().includes(insurerName.toLowerCase()) ||
      insurerName.toLowerCase().includes(k.toLowerCase())
    )
    return key ? (INVESTMENT_CATALOGUE[key].products || []) : []
  } catch (e) {
    return []
  }
}

export function getInvestProductsByType(productType) {
  const all = []
  Object.entries(INVESTMENT_CATALOGUE).forEach(([insurer, data]) => {
    (data.products || []).forEach(p => {
      if (p.types.includes(productType)) all.push({ insurer, ...p })
    })
  })
  return all
}
