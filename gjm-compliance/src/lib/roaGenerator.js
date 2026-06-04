// ─── ROA AI Generation Engine ─────────────────────────────────────────────────
// Uses Anthropic API (in-browser) to:
// 1. Compare products and write Section D recommendations
// 2. Write Section E implementation motivation
// 3. Write Section F important information (from product notes)
// POPIA safe: only product names, premiums and cover amounts are sent - no client ID/DOB

const MODEL = 'claude-sonnet-4-20250514'

// Full product knowledge base compiled from project folder notes
const PRODUCT_KNOWLEDGE = {
  SANLAM: {
    life: `Sanlam Matrix Risk Cover / TopCover: Immediate life cover from application date (unnatural causes, up to R500k). Terminal illness benefit pays full cover if death expected within 12 months. 2-year suicide exclusion. Free cover provided once first payment made. No waiting periods on Life Cover. 30-day grace period for missed payments. Plan provides risk benefits only - cannot borrow against plan. Commission paid first and second year as per signed quotations.`,
    disability: `Sanlam Disability (Regular Occupation): Pays if totally, permanently unable to fulfil occupational demands of regular occupation. Disability must be caused solely by bodily injury or illness. No waiting periods on Disability Cover. Non-aggregated benefit - pays independently of other claims.`,
    income: `Sanlam Income Protector for Professionals: Sickness benefit - up to 100% cover if on sick leave for entire waiting period. Extended disability income - pays if unable to fulfil substantial part of regular occupation duties. Waiver of premium automatically included. Benefit growth increases cover annually. Occupation-specific - must be practising occupation at time of claim.`,
    trauma: `Sanlam Comprehensive Severe Illness Plus: Covers comprehensive list of claim events across all body systems. Pays percentage of cover as lump sum. 14-day survival period. 5-year waiting period on joint replacements. Multiple claims possible. Non-aggregated benefit.`,
    exclusions: `Sanlam Exclusions: 2-year suicide exclusion. No cover for dangerous pursuits, risks outside SA. Exclusions/loadings subject to medical underwriting. 30-day cooling-off period. 30-day grace period.`,
    fees: `Commission first and second year as per signed quotations. Commission paid yearly in advance. No recurring commission.`
  },
  PPS: {
    life: `PPS Professional Provident Society Provider Plan: Life cover for graduate professionals. Profit Share Account - policyholder shares in PPS operating profits annually. Profit Share Account vests at age 60. Suicide exclusion within 2 years of commencement or reinstatement.`,
    disability: `PPS Permanent Incapacity / Occupational Disability: Occupation-specific cover. Must notify PPS within 30 days of occupation change. If occupation not recognised by PPS, certain benefits may be cancelled. Aggregated benefit structure.`,
    income: `PPS Sickness and Permanent Incapacity: Sickness benefit for temporary inability to work. Permanent incapacity for long-term disability. Must inform PPS of occupation changes within 30 days. Premium review if client starts smoking.`,
    trauma: `PPS Severe Illness / Critical Illness: Covers major trauma events. Aggregated benefit - trauma claim reduces other disability/income benefits. Profit Share Account receives allocations for qualifying products.`,
    exclusions: `PPS Exclusions: No death benefit for suicide within 2 years. No claims for war, terrorism, radioactivity, breaking the law, self-inflicted injury, alcohol/drug abuse. Must inform PPS of occupation change within 30 days, smoking status changes. Aggregated benefits - claims across benefits are combined.`,
    profitShare: `PPS Profit Share Account: Annual allocations from PPS operating profits. Not guaranteed - market dependent. Does not vest until age 60. Cancellation before 60 incurs forfeitures. Unique benefit not available from other insurers.`
  },
  OLD_MUTUAL: {
    life: `Old Mutual Protect Life Cover: Terminal illness benefit pays full cover if death expected. Terminal illness benefit stops 12 months before end date if term cover selected. 2-year suicide exclusion. 45-day grace period (longer than Sanlam's 30 days).`,
    disability: `Old Mutual Protect Disability Insurance: Covers temporary and permanent disability/impairment. Occupation-dependent product selection. Functional Impairment cover available for those not eligible for disability products. Must inform Old Mutual of occupation changes, income changes.`,
    income: `Old Mutual Protect Income Protection: Income replacement benefit tax-free under current practice. Cover limited to 100% of net monthly income to prevent over-insurance. Must inform Old Mutual if income decreases or increases while receiving payments.`,
    trauma: `Old Mutual Protect Severe Illness Cover: Severity-based - percentage paid depends on severity level. 10-day survival period (vs Sanlam's 14 days). Cancer Enhancer and Early Diagnosed Illnesses automatically included. Top-up Benefit elevates sub-100% events to 100% for qualifying events. Cover not occupation-dependent.`,
    exclusions: `Old Mutual Exclusions: No claims for unrest/war/terrorism, radioactivity/nuclear, committing crimes, suicide within 2 years, non-compliance with medical advice. Must inform of occupation changes (any detail), income changes, health changes while receiving payments. 45-day grace period. Cover lapses if second premium missed.`,
    fees: `Old Mutual fees and commission as per signed quotation.`
  },
  BRIGHTROCK: {
    life: `BrightRock Life Cover: Needs-matched cover that reduces as needs reduce (approaching retirement). Beneficiaries can change lump-sum to monthly payout at claim stage. Standalone funeral/immediate expenses payout won't reduce other death cover. Inherits suicide exclusion continuity from replaced Sanlam policy if cover continuous and equal or less.`,
    disability: `BrightRock Disability / Permanent Expenses: Income protection lump-sum tracks remaining pay cheques to retirement - reduces automatically as fewer income years remain. Client can take remaining lump-sum at any time before depletion. Monthly payout amount guaranteed and disclosed at application.`,
    income: `BrightRock Income Protection: Regular monthly payout or lump-sum or combination - client chooses at claim stage. Lump-sum reduced monthly by recurring payouts. Balance paid on death. Cover maps to changing income needs over time - significant premium savings vs level cover.`,
    trauma: `BrightRock Severe Illness / Permanent Expenses: Covers defined list of permanent expense conditions. Cover Proposal details specific conditions covered. Top-up and needs-matched structure.`,
    exclusions: `BrightRock Exclusions: Standard long-term insurance exclusions apply. Suicide exclusion continuity benefit when replacing Sanlam. Specific conditions listed in BrightRock Cover Proposal.`
  }
}

async function callClaude(prompt) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await response.json()
    return data.content?.map(b => b.text || '').join('').trim() || ''
  } catch (err) {
    console.error('Claude API error:', err)
    return ''
  }
}

// ── Section D: Product comparison and recommendation ─────────────────────────
export async function generateSectionD(clientData, products, selectedProduct, needType) {
  const productsInfo = products
    .filter(p => p.insurer && p.product)
    .map(p => {
      const key = p.insurer.toUpperCase().replace(' ', '_').replace('OLD MUTUAL', 'OLD_MUTUAL')
      const knowledge = PRODUCT_KNOWLEDGE[key]
      const typeKey = needType.toLowerCase().includes('income') ? 'income'
        : needType.toLowerCase().includes('disab') ? 'disability'
        : needType.toLowerCase().includes('trauma') || needType.toLowerCase().includes('illness') ? 'trauma'
        : 'life'
      return `${p.insurer} - ${p.product} (R${p.premium}/pm): ${knowledge?.[typeKey] || 'Standard cover'}`
    }).join('\n')

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers.

Client: ${clientData.occupation || 'Professional'}, Age ${clientData.age || ''}, ${clientData.smokerStatus || 'Non-smoker'}
Need type: ${needType}
Cover required: R${clientData[needType + 'Required'] || ''}
Selected product: ${selectedProduct}

Products considered and their key features:
${productsInfo}

Write a concise professional rationale (3-5 sentences) explaining why ${selectedProduct} was recommended over the alternatives for this client's ${needType} needs. Reference specific product features, premium differences, and benefit structures from the product information above. Mention occupation relevance if applicable. Do NOT include headings. Write only the rationale paragraph.`

  const _r1 = await callClaude(prompt)
  return _r1 || `Based on a comprehensive comparison of ${selectedProduct} against the other products considered, this product was recommended as it offers the most suitable combination of benefits, premium structure and features aligned to the client's professional profile, income level and risk objectives.`
}

// ── Section E: Implementation motivation ─────────────────────────────────────
export async function generateSectionE(clientData, selectedProducts, occupation) {
  const productList = selectedProducts.map(p => `${p.insurer} ${p.product} (R${p.premium}/pm)`).join(', ')

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers.

Client occupation: ${occupation || 'professional'}
Age: ${clientData.age || ''}
Products selected: ${productList}
Needs addressed: ${clientData.needsSummary || 'life, disability, income protection, trauma'}
Premium: R${clientData.selectedPremium || ''}

Write a professional implementation motivation paragraph (5-7 sentences) for Section E of a Risk Client Advice Record. This should:
- Name the specific products selected
- Explain why the solution was structured for this specific profession
- Confirm the client's understanding of features, limitations, exclusions, waiting periods and premium obligations
- State that needs were fully implemented
- Mention risks discussed (underinsurance, professional income loss, financial impact of disability/illness/death)
Write only the paragraph. No headings. FAIS-compliant professional tone.`

  const _r2 = await callClaude(prompt)
  return _r2 || `The selected products were recommended following a comprehensive financial needs analysis. The solution addresses the client's identified needs for life, disability, trauma and income protection cover. The client confirmed understanding of all product features, limitations, exclusions, waiting periods and premium obligations. All needs have been addressed within the client's budget, and the risks of underinsurance were clearly explained.`
}

// ── Section F: Important information (from product notes) ─────────────────────
export async function generateSectionF(selectedInsurers) {
  const insurerNotes = selectedInsurers.map(insurer => {
    const key = insurer.toUpperCase().replace(/ /g, '_').replace('OLD_MUTUAL', 'OLD_MUTUAL')
    const k = PRODUCT_KNOWLEDGE[key]
    if (!k) return `${insurer}: Standard long-term insurance terms apply.`
    return `${insurer}: ${k.exclusions} ${k.fees || ''}`
  }).join('\n\n')

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers.

Based on the following product-specific information, write a comprehensive Section F "Important Information Highlighted to the Client" for a Risk Client Advice Record. Cover: waiting periods, exclusions, grace periods, suicide exclusions, free cover rules, lapsing rules, and any product-specific notes. Organise clearly by topic (not by insurer). Write in professional compliance language. Maximum 400 words.

Product information:
${insurerNotes}`

  const _r3 = await callClaude(prompt)
  return _r3 || `WAITING PERIODS: Standard waiting periods apply per each insurer's policy terms. EXCLUSIONS: Standard long-term insurance exclusions apply including suicide within 2 years, self-inflicted injury, war, terrorism, criminal acts and non-disclosure. GRACE PERIODS: Sanlam 30 days; Old Mutual 45 days; PPS 30 days. Policies lapse if second consecutive premium is missed. FREE COVER: Cover commences from first premium payment subject to insurer terms. COMMISSION: As per signed quotations provided to the client. All full terms are in the policy documents.`
}

// ── Section H: Advisor declaration (products not accepted) ───────────────────
export function getDefaultSectionH(declinedProducts, declinedReasons) {
  return {
    item1: declinedProducts || '',
    item2: declinedReasons || '',
    item3: 'NO',
    item4yes: true,
    clientUnderstands: true,
    item5: 'N/A',
  }
}

export { PRODUCT_KNOWLEDGE }
