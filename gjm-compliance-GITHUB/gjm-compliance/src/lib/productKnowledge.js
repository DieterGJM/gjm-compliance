// ═══════════════════════════════════════════════════════════════════════════
// GJM ULTRA BROKERS — PRODUCT KNOWLEDGE BASE
// Sourced directly from project folder notes:
//   Sanlam_ROA_notes.docx, Life_cover_notes.docx, Income_Protection_notes.docx
//   PPS_ROA_notes.docx, OM_ROA_Notes.docx, Brightrock_ROA_notes.docx
// ═══════════════════════════════════════════════════════════════════════════

export const PRODUCT_CATALOGUE = {
  Sanlam: {
    benefits: [
      {
        id: 'sanlam_topcov',
        name: 'TopCover for Professionals',
        types: ['life'],
        shortDesc: 'Life cover with immediate cover from application date',
        fullNotes: `Topcover for Professionals: Immediate life cover from application — applies from date Sanlam receives fully signed application, for unnatural causes, limited to R500,000 or cover amount. 2-year suicide exclusion. Terminal illness benefit pays full cover amount if death expected within 12 months. Free cover from first premium. 30-day grace period — plan lapses if payment not received within 30 days of due date. Plan provides risk benefits only — cannot borrow against plan. Commission first and second year as per signed quotations, paid yearly in advance, no recurring commission. Tax: plan benefits tax-free to beneficiaries; subject to estate duty on death.`,
        exclusions: `2-year suicide exclusion. No immediate cover for dangerous pursuits or risks outside SA. Exclusions/loadings subject to medical underwriting. 30-day cooling-off period.`,
        waitingPeriods: `No waiting periods on Life Cover.`,
      },
      {
        id: 'sanlam_disability',
        name: 'Disability for Regular Occupation',
        types: ['disability'],
        shortDesc: 'Permanent disability cover — own occupation definition',
        fullNotes: `Disability for Regular Occupation: Pays cover amount if life insured is totally, permanently and continuously unable to fulfil the occupational demands of the occupation practised for income immediately before disability. Claim admitted only if disability caused directly and solely by bodily injury or illness. No waiting periods on Disability Cover.`,
        exclusions: `Claim must be caused directly and solely by bodily injury or illness. Total and permanent disability required.`,
        waitingPeriods: `No waiting periods on Disability Cover.`,
      },
      {
        id: 'sanlam_income',
        name: 'Income Protector for Professionals',
        types: ['income', 'disability'],
        shortDesc: 'Sickness + extended disability income — occupation specific',
        fullNotes: `Income Protector for Professionals: Waiver of payment automatically included — premiums waived while income claim is active (except sickness benefit). SICKNESS BENEFIT: pays up to 100% of cover if life insured is on sick leave for entire waiting period; benefit growth increases cover annually. Claim admitted only if insured practices occupation at time of claim event. EXTENDED DISABILITY INCOME: pays if unable to fulfil substantial and material part of duties of regular occupation practised for income, resulting in loss of income. Disability must be caused directly and solely by bodily injury or illness and must last continuously for entire waiting period.`,
        exclusions: `Must be practising occupation at time of sickness claim. Disability must be caused by bodily injury or illness. Continuous waiting period required.`,
        waitingPeriods: `Waiting period applies — sick leave or disability must last continuously for entire waiting period.`,
      },
      {
        id: 'sanlam_severe',
        name: 'Comprehensive Severe Illness Plus',
        types: ['trauma'],
        shortDesc: 'Comprehensive severe illness — all body systems, multiple claims',
        fullNotes: `Comprehensive Severe Illness Plus: Covers comprehensive list of claim events across all body systems — serious and relatively milder illnesses, common and rare diseases. Pays percentage of cover amount as lump sum based on claim event. Multiple claims possible subject to multiple claim rules. 14-day survival period required. 5-year waiting period on joint replacements. Non-aggregated — pays independently.`,
        exclusions: `14-day survival period. 5-year waiting period on joint replacements. Percentage payout depends on severity of claim event.`,
        waitingPeriods: `14-day survival period. 5-year waiting period on joint replacements.`,
      },
    ],
  },

  PPS: {
    benefits: [
      {
        id: 'pps_provider',
        name: 'Professional Provident Society Provider Plan',
        types: ['life', 'disability', 'income', 'trauma'],
        shortDesc: 'Comprehensive risk cover for graduate professionals + Profit Share Account',
        fullNotes: `PPS Provider Plan: Designed exclusively for graduate professionals. PROFIT SHARE ACCOUNT: Policyholders share in PPS operating profits annually — allocated in proportion to level of cover and premium on qualifying products. Allocations not guaranteed and may be positive or negative. PPS Profit Share Account does not vest until age 60 — cancellation before 60 incurs forfeitures. STANDARD EXCLUSIONS: No death benefit for suicide within 2 years of commencement or reinstatement. No claims where illness/injury linked to war/terrorism, radioactivity/nuclear, breaking the law, self-inflicted injury, alcohol/drug abuse. OCCUPATION CHANGES: Must notify PPS within 30 days of any occupation change. If new occupation not recognised by PPS, certain benefits (sickness, permanent incapacity, occupational disability) may be cancelled. SMOKING: Must inform PPS if starting to smoke — premium may be reviewed upward.`,
        exclusions: `2-year suicide exclusion. War, terrorism, radioactivity, criminal acts, self-inflicted injury, alcohol/drug abuse excluded. Must notify PPS of occupation changes within 30 days or benefits may be cancelled. Profit Share Account subject to forfeitures if cancelled before age 60.`,
        waitingPeriods: `Standard waiting periods apply per policy terms.`,
      },
    ],
  },

  'Old Mutual': {
    benefits: [
      {
        id: 'om_life',
        name: 'Old Mutual Protect Life Cover',
        types: ['life'],
        shortDesc: 'Life cover with 45-day grace period and terminal illness benefit',
        fullNotes: `Old Mutual Protect Life Cover: Terminal illness benefit pays full cover amount if death expected within 12 months — not available in last 12 months of term cover. 2-year suicide exclusion. 45-day grace period (longer than Sanlam's 30 days) — cover continues during grace period. Cover lapses if missed premium not paid before end of grace period OR if second premium becomes due and is missed. Restart allowed within 6 months of lapse — updated health/lifestyle information required. 31-day cool-off period. Tax: death benefit tax-free to beneficiaries, subject to estate duty.`,
        exclusions: `2-year suicide exclusion. Unrest, war, terrorism, radioactivity, criminal acts excluded. Must inform Old Mutual of occupation changes, income changes, health changes while receiving payments. 45-day grace period then cover lapses.`,
        waitingPeriods: `No specific waiting period on life cover.`,
      },
      {
        id: 'om_disability',
        name: 'Old Mutual Protect Disability Insurance',
        types: ['disability'],
        shortDesc: 'Temporary and permanent disability — occupation dependent',
        fullNotes: `Old Mutual Protect Disability Insurance: Covers temporary and permanent disability or impairment. Product choice depends on occupation eligibility. Functional Impairment products available for those not eligible for disability products (students, housewives, unemployed). Must inform Old Mutual of occupation changes, income decreases, income increases while receiving payments, and health/medical status changes while receiving payments.`,
        exclusions: `Occupation must be eligible for disability product. Must notify of occupation changes, income changes, health changes. General and specific exclusions apply.`,
        waitingPeriods: `Waiting periods apply per policy terms.`,
      },
      {
        id: 'om_income',
        name: 'Old Mutual Protect Income Protection',
        types: ['income'],
        shortDesc: 'Income replacement — tax-free benefit, limited to 100% net income',
        fullNotes: `Old Mutual Protect Income Protection: Income replacement benefit is tax-free under current revenue practice. Cover limited to 100% of insured person's average net monthly income to prevent over-insurance. Must inform Old Mutual if income decreases or increases while receiving payments.`,
        exclusions: `Cover capped at 100% of net monthly income. Must notify of income changes. General exclusions apply.`,
        waitingPeriods: `Waiting periods apply per policy terms.`,
      },
      {
        id: 'om_severe',
        name: 'Old Mutual Protect Severe Illness Cover',
        types: ['trauma'],
        shortDesc: 'Severity-based severe illness — Cancer Enhancer, Top-up Benefit included',
        fullNotes: `Old Mutual Protect Severe Illness Cover: Severity-based — percentage of cover amount paid depends on severity level. 10-day survival period (shorter than Sanlam's 14 days). Automatically includes Cancer Enhancer and Early Diagnosed Illnesses. Top-up Benefit elevates qualifying events below 100% up to full 100% cover amount. Mild Illness Benefit available — pays 30% of cover amount. Cover not occupation-dependent. Exclusion discounts may apply where insured has previously suffered a severe illness — may restrict cover for those conditions.`,
        exclusions: `10-day survival period. Severity-based payouts — less severe events receive lower percentage. Exclusion discounts possible for prior severe illness history. Top-up Benefit does not apply to Child Illness, Mild Illness, For Women, or Returning Illness benefits.`,
        waitingPeriods: `10-day survival period.`,
      },
    ],
  },

  BrightRock: {
    benefits: [
      {
        id: 'brightrock_life',
        name: 'BrightRock Life Cover (Needs-matched)',
        types: ['life'],
        shortDesc: 'Needs-matched life cover — reduces as needs reduce, beneficiaries choose payout at claim',
        fullNotes: `BrightRock Life Cover: Needs-matched — cover reduces appropriately as client's needs reduce approaching retirement, delivering premium savings throughout the policy. Beneficiaries can change lump-sum to monthly pay-out at claim stage. Hospital costs pay-out: additional R50,000 if life insured admitted to hospital for 20+ consecutive days in 3 months before death (for cover >R200,000) — standalone payout, won't reduce other death cover. Child death cover: R5,000 automatic, R10,000 if child listed on policy. Suicide exclusion continuity: if replacing Sanlam policy with continuous cover at same or lesser amount, BrightRock credits the Sanlam suicide exclusion period. Extra cover buy-up facility: add cover later free of medical underwriting. Yearly secured cover facility: extend death cover annually.`,
        exclusions: `Suicide exclusion continuity only if cover continuous and equal to or less than Sanlam cover being replaced. Cover conversion facility subject to 3-year minimum, medical loading limits, and terms/conditions.`,
        waitingPeriods: `Standard long-term insurance waiting periods apply.`,
      },
      {
        id: 'brightrock_income',
        name: 'BrightRock Income Protection (Needs-matched)',
        types: ['income', 'disability'],
        shortDesc: 'Lump-sum tracks remaining pay cheques to retirement — reduces automatically',
        fullNotes: `BrightRock Income Protection: Where lump-sum chosen, cover for income protection needs tracks client's income needs over time — as number of pay cheques to protect reduces, cover reduces appropriately. Clients benefit from premium savings from day one. Clients can change initial lump-sum choice to monthly pay-out or combination at claim stage. Monthly value is clearly disclosed at application and is guaranteed. Lump-sum reduced monthly by recurring pay-outs. Balance of lump-sum paid if client dies before depletion. Client can take remaining lump-sum (or portion) at any time before depletion. Cover Proposal indicates which permanent expenses option selected.`,
        exclusions: `Conditions for permanent expenses cover listed in BrightRock Cover Proposal and available at specified URL. Claims that happen after policy start date may result in cover conversion facility falling away.`,
        waitingPeriods: `Waiting periods per policy terms.`,
      },
      {
        id: 'brightrock_severe',
        name: 'BrightRock Permanent Expenses (Severe Illness)',
        types: ['trauma'],
        shortDesc: 'Defined list of permanent expense conditions — needs-matched structure',
        fullNotes: `BrightRock Permanent Expenses: Covers defined list of permanent expense conditions (full list in Cover Proposal and at BrightRock website). Heart and blood vessels group: claims deemed unrelated to previous claim in same group if event dates more than 6 months apart. Cover conversion facility available — move premiums between benefits without medical underwriting after 3 years in force (subject to medical loading limits).`,
        exclusions: `Only defined conditions in Cover Proposal covered. Cover conversion facility requires 3+ years in force and medical loading ≤200%.`,
        waitingPeriods: `Waiting periods per policy terms.`,
      },
    ],
  },
}

// ── Map benefit types to Section D need types ─────────────────────────────
export const BENEFIT_TYPE_MAP = {
  life:       'death',
  disability: 'disability',
  income:     'disability',
  trauma:     'trauma',
}

// ── Get all benefits for an insurer ──────────────────────────────────────
export function getBenefitsForInsurer(insurerName) {
  if (!insurerName || typeof insurerName !== 'string') return []
  try {
    const name = insurerName.toLowerCase().trim()
    const key = Object.keys(PRODUCT_CATALOGUE).find(k =>
      k.toLowerCase() === name ||
      name.includes(k.toLowerCase()) ||
      k.toLowerCase().includes(name)
    )
    return key ? (PRODUCT_CATALOGUE[key].benefits || []) : []
  } catch (e) {
    return []
  }
}

// ── Get all benefit notes for selected products (for Section F / AI) ─────
export function getProductNotesForAI(selectedBenefits) {
  const notes = []
  for (const { insurerName, benefitId } of selectedBenefits) {
    const benefits = getBenefitsForInsurer(insurerName)
    const benefit  = benefits.find(b => b.id === benefitId)
    if (benefit) {
      notes.push({
        insurer:  insurerName,
        benefit:  benefit.name,
        types:    benefit.types,
        notes:    benefit.fullNotes,
        excl:     benefit.exclusions,
        waiting:  benefit.waitingPeriods,
      })
    }
  }
  return notes
}
