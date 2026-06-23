// ─── ROA AI Generation Engine ──────────────────────────────────────────────
// Uses real product notes from project folder via productKnowledge.js
import { getBenefitsForInsurer } from './productKnowledge'

const MODEL = 'claude-sonnet-4-6'

async function callClaude(prompt, maxTokens = 600) {
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
        max_tokens: maxTokens,
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

function professionContext(occ = '') {
  const o = occ.toLowerCase()
  const isPrivateDoc  = o.includes('private') && (o.includes('doctor') || o.includes('gp') || o.includes('practitioner') || o.includes('physician'))
  const isGovtDoc     = (o.includes('government') || o.includes('public') || o.includes('state') || o.includes('jsh') || o.includes('hospital')) && (o.includes('doctor') || o.includes('gp') || o.includes('practitioner') || o.includes('physician') || o.includes('specialist'))
  const isSpecialist  = o.includes('specialist') || o.includes('surgeon') || o.includes('cardiologist') || o.includes('radiologist') || o.includes('anaesth')
  const isDentist     = o.includes('dentist') || o.includes('dental')
  const isChiro       = o.includes('chiro') || o.includes('physio') || o.includes('therapist')
  const isAttorney    = o.includes('attorney') || o.includes('advocate') || o.includes('lawyer') || o.includes('legal')
  const isAccountant  = o.includes('account') || o.includes('auditor') || o.includes('actuar')
  const isEngineer    = o.includes('engineer') || o.includes('architect')

  if (isGovtDoc)    return { type: 'government_doctor',  label: 'government-employed medical doctor', incomeType: 'salaried', practice: 'public hospital employment' }
  if (isPrivateDoc) return { type: 'private_doctor',     label: 'private practice medical doctor',     incomeType: 'variable', practice: 'private practice' }
  if (isSpecialist) return { type: 'specialist',         label: 'medical specialist',                  incomeType: 'high',     practice: 'specialist practice' }
  if (isDentist)    return { type: 'dentist',            label: 'dental practitioner',                 incomeType: 'variable', practice: 'dental practice' }
  if (isChiro)      return { type: 'allied_health',      label: 'allied health professional',          incomeType: 'variable', practice: 'private practice' }
  if (isAttorney)   return { type: 'legal',              label: 'legal professional',                  incomeType: 'variable', practice: 'legal practice' }
  if (isAccountant) return { type: 'finance_prof',       label: 'finance professional',                incomeType: 'salaried', practice: 'professional services' }
  if (isEngineer)   return { type: 'engineer',           label: 'engineering professional',            incomeType: 'salaried', practice: 'engineering practice' }
  return { type: 'professional', label: occ || 'professional', incomeType: 'professional', practice: 'professional practice' }
}

// ── Section A: Needs & Objectives — FSCA-compliant, client-specific ─────────
export async function generateNeedsObjectives(clientData) {
  const occ    = clientData.occupation || 'professional'
  const age    = clientData.age || ''
  const dep    = Number(clientData.dependents || 0)
  const debt   = Number(clientData.currentDebt || 0)
  const gross  = Number(clientData.grossIncome || 0)
  const prof   = professionContext(occ)
  const products = (clientData.products || []).filter(p => p.product).map(p => p.product).join(', ') || 'life, disability and severe illness cover'

  const depStr  = dep > 0 ? `${dep} financial dependant${dep > 1 ? 's' : ''}` : 'estate beneficiaries'
  const debtStr = debt > 0 ? ` with outstanding liabilities of R${debt.toLocaleString('en-ZA')}` : ''
  const incStr  = gross > 0 ? `R${gross.toLocaleString('en-ZA')}/pm` : 'professional income'

  const profGuidance = prof.type === 'government_doctor'
    ? 'Salaried employment but professional income risk from inability to practise privately. Supplementary private practice income at risk. Personal liability considerations.'
    : prof.type === 'private_doctor'
    ? 'Income entirely dependent on ability to personally perform medical duties. High exposure to disability/critical illness risk. Practice continuity and key person risk.'
    : prof.type === 'specialist'
    ? 'Extremely high professional income at risk if specialist procedures cannot be performed. Critical illness a major risk.'
    : ''

    const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers writing a Risk Client Advice Record (ROA) for submission to the FSCA.

CLIENT: ${occ} (${prof.label}), Age ${age}, ${depStr}${debtStr}, gross income ${incStr}
PRODUCTS BEING RECOMMENDED: ${products}
PRACTICE TYPE: ${prof.practice}

Write a "Client's Needs and Objectives" statement for ROA Section A. This MUST:
- Be FSCA-compliant — state the CLIENT'S genuine financial protection needs, NOT advisor/product benefits
- Be SPECIFIC to this client's profession and life situation
- Reference their dependants, income level, and professional vulnerability to disability/illness
- State the PURPOSE of the cover (protect income, provide for dependants, cover liabilities, estate planning)
- Be in UPPERCASE, 2-3 sentences maximum
- NOT mention reducing premiums, switching providers, or saving money
- NOT mention specific insurer names

${profGuidance}

Write ONLY the needs statement, no preamble, no label.`

  const result = await callClaude(prompt, 250)
  const fallbacks = {
    government_doctor: `TO OBTAIN COMPREHENSIVE LIFE, DISABILITY INCOME PROTECTION AND SEVERE ILLNESS COVER TO PROTECT PROFESSIONAL INCOME EARNED THROUGH BOTH GOVERNMENT EMPLOYMENT AND PRIVATE PRACTICE, AND TO PROVIDE FINANCIAL SECURITY FOR ${depStr.toUpperCase()} IN THE EVENT OF PREMATURE DEATH, PERMANENT DISABILITY OR CRITICAL ILLNESS. TO ENSURE CONTINUITY OF FINANCIAL OBLIGATIONS AND OUTSTANDING LIABILITIES IN THE EVENT OF AN INSURED EVENT.`,
    private_doctor:    `TO SECURE COMPREHENSIVE RISK COVER COMMENSURATE WITH HIGH PROFESSIONAL INCOME GENERATED THROUGH PRIVATE MEDICAL PRACTICE, WHICH IS ENTIRELY DEPENDENT ON THE CLIENT'S PERSONAL ABILITY TO PRACTISE. TO PROVIDE FOR ${depStr.toUpperCase()} AND COVER OUTSTANDING LIABILITIES IN THE EVENT OF PREMATURE DEATH, TOTAL DISABILITY OR CRITICAL ILLNESS, AND TO PROTECT AGAINST THE FINANCIAL IMPACT OF INABILITY TO GENERATE PROFESSIONAL INCOME.`,
    specialist:        `TO OBTAIN LIFE, SPECIALIST DISABILITY INCOME AND SEVERE ILLNESS COVER APPROPRIATE TO HIGH SPECIALIST INCOME LEVELS, RECOGNISING THAT INCOME IS ENTIRELY DEPENDENT ON THE ABILITY TO PERFORM SPECIFIC SPECIALIST PROCEDURES. TO PROTECT ${depStr.toUpperCase()} AND MAINTAIN FINANCIAL OBLIGATIONS IN THE EVENT OF DEATH, DISABILITY OR CRITICAL ILLNESS, AND TO FUND LIFESTYLE ADJUSTMENTS FOLLOWING A SEVERE ILLNESS EVENT.`,
    professional:      `TO OBTAIN COMPREHENSIVE LIFE, DISABILITY AND SEVERE ILLNESS COVER COMMENSURATE WITH PROFESSIONAL INCOME AND FINANCIAL OBLIGATIONS, AND TO PROVIDE FINANCIAL SECURITY FOR ${depStr.toUpperCase()} IN THE EVENT OF PREMATURE DEATH, DISABILITY OR CRITICAL ILLNESS.`,
  }
  return result || fallbacks[prof.type] || fallbacks.professional
}

// ── Section A: Financial Situation — highly specific to profession/context ───
export async function generateFinancialSituation(clientData) {
  const occ        = clientData.occupation || 'professional'
  const gross      = Number(clientData.grossIncome || 0)
  const dep        = Number(clientData.dependents || 0)
  const smoker     = clientData.smokerStatus || 'Non-Smoker'
  const age        = clientData.age || ''
  const debt       = Number(clientData.currentDebt || 0)
  const prof       = professionContext(occ)

  const grossStr   = gross > 0 ? `R${gross.toLocaleString('en-ZA')}/pm` : ''
  const depStr     = dep > 0 ? `${dep} financial dependant${dep > 1 ? 's' : ''}` : 'no dependants'
  const debtStr    = debt > 0 ? ` with outstanding liabilities/bond of R${debt.toLocaleString('en-ZA')}` : ''

  const profDetails = {
    government_doctor: `This client is employed through a government/public hospital as a medical doctor${grossStr ? ', earning a salaried income of ' + grossStr : ''}. The client supplements government employment with private practice income, creating a dual income structure that is partially at risk from disability or critical illness. The client has ${depStr}${debtStr} and is a ${smoker}.`,
    private_doctor:    `This client is a medical doctor in private practice${grossStr ? ', generating a professional income of approximately ' + grossStr : ''}. Income is entirely dependent on the client's personal ability to practise medicine, creating significant exposure to disability and critical illness risk. The client has ${depStr}${debtStr} and is a ${smoker}.`,
    specialist:        `This client is a medical specialist${grossStr ? ' generating a high professional income of ' + grossStr : ''}, with income entirely contingent on the ability to personally perform specialist procedures. The client has ${depStr}${debtStr} and is a ${smoker}. Given the highly specialised nature of the work, disability or critical illness presents a severe income risk.`,
    legal:             `This client is a legal professional${grossStr ? ' earning ' + grossStr : ''} whose income is generated through active professional practice. Income is directly dependent on the client's personal capacity to work, making disability and critical illness significant financial risks. The client has ${depStr}${debtStr} and is a ${smoker}.`,
    professional:      `This client is a ${occ}${grossStr ? ' earning approximately ' + grossStr : ''} with professional-level income. The client has ${depStr}${debtStr} and is a ${smoker}.`,
  }

  const context = profDetails[prof.type] || profDetails.professional

  const prompt = `You are a South African FAIS-compliant financial advisor. Write a "Financial Situation" description for an ROA Section A based on this client profile:

${context}

Requirements:
- 2-3 sentences, sentence case, professional compliance language
- State their employment type (government/private practice/self-employed)  
- Mention income level and its dependency on ability to work
- Mention dependants and any liabilities if relevant
- Mention smoker status
- Be SPECIFIC to their profession — not generic

Write ONLY the description, no label or preamble.`

  const result = await callClaude(prompt, 200)
  return result || context
}

// ── Section A: Product Knowledge ─────────────────────────────────────────────
export async function generateProductKnowledge(clientData, products) {
  const occ       = clientData.occupation || 'professional'
  const prof      = professionContext(occ)
  const prodNames = (products || []).filter(p => p.product).map(p => p.product).join(', ') || 'long-term risk insurance'

  // Medical professionals generally have higher baseline knowledge
  const knowledgeLevel = ['government_doctor','private_doctor','specialist','dentist','allied_health'].includes(prof.type)
    ? 'moderate'
    : 'limited'

  const prompt = `You are a South African FAIS-compliant financial advisor writing a Risk Client Advice Record.

CLIENT: ${occ} (${prof.label}), Products: ${prodNames}

Write the "Product Knowledge and Experience" statement for ROA Section A.
- ${knowledgeLevel === 'moderate' ? 'Medical professionals have general awareness of insurance concepts but limited specific product experience' : 'Client has limited prior experience with long-term risk insurance products'}
- Must confirm the client FULLY UNDERSTANDS the effects, consequences, benefit definitions, exclusions, waiting periods and premium obligations
- Must be SPECIFIC to their profession (not generic)
- UPPERCASE
- 2 sentences maximum

Write ONLY the statement, no label.`

  const result = await callClaude(prompt, 200)
  const fallbacks = {
    moderate: `THE CLIENT HAS A ${knowledgeLevel.toUpperCase()} UNDERSTANDING OF LONG-TERM INSURANCE CONCEPTS DUE TO THEIR PROFESSIONAL BACKGROUND AS A ${occ.toUpperCase()}. THE CLIENT HAS BEEN FULLY INFORMED OF AND UNDERSTANDS THE EFFECTS, CONSEQUENCES, BENEFIT DEFINITIONS, EXCLUSIONS, WAITING PERIODS AND PREMIUM OBLIGATIONS OF ALL SELECTED PRODUCTS.`,
    limited:  `THE CLIENT HAS LIMITED PRIOR EXPERIENCE WITH LONG-TERM RISK INSURANCE PRODUCTS. THE CLIENT HAS BEEN FULLY INFORMED OF AND UNDERSTANDS THE EFFECTS, CONSEQUENCES, BENEFIT DEFINITIONS, EXCLUSIONS, WAITING PERIODS AND PREMIUM OBLIGATIONS OF ALL SELECTED PRODUCTS.`,
  }
  return result || fallbacks[knowledgeLevel]
}

// ── Section D: Need-specific rationale ───────────────────────────────────────
export async function generateSectionD(clientData, products, selectedProduct, needType) {
  const typeKey = needType.toLowerCase().includes('income') ? 'income'
    : needType.toLowerCase().includes('disab') ? 'disability'
    : needType.toLowerCase().includes('trauma') || needType.toLowerCase().includes('illness') ? 'trauma'
    : 'life'

  const occ    = clientData.occupation || 'professional'
  const age    = clientData.age || ''
  const dep    = Number(clientData.dependents || 0)
  const gross  = Number(clientData.grossIncome || 0)
  const prof   = professionContext(occ)
  const smoker = clientData.smokerStatus || 'Non-Smoker'
  const grossStr = gross > 0 ? `R${gross.toLocaleString('en-ZA')}/pm` : ''
  const depStr   = dep > 0 ? `${dep} dependant${dep > 1 ? 's' : ''}` : 'estate'

  const needContext = {
    life:       `provide death benefit of sufficient capital to settle outstanding liabilities and provide income for ${depStr} following premature death`,
    disability: `replace professional income of ${grossStr} in the event of permanent or temporary inability to perform ${prof.label} duties`,
    income:     `replace professional income of ${grossStr} during disability or illness, critical for a ${prof.label} whose earnings depend entirely on ability to practise`,
    trauma:     `fund lifestyle adjustments, treatment costs and income replacement following a critical illness event such as cancer, stroke or heart attack`,
  }[typeKey] || needType

  const productsInfo = products
    .filter(p => p.insurer && p.product)
    .map(p => {
      const insurerName = p.customInsurer || p.insurer
      const allBenefits = getBenefitsForInsurer(insurerName)
      const benefit = allBenefits.find(b => b.types.includes(typeKey)) || allBenefits[0]
      if (!benefit) return `${insurerName} — ${p.product} (R${p.premium || '?'}/pm)`
      return `${insurerName} — ${benefit.name}: Waiting periods: ${benefit.waitingPeriods}. Exclusions: ${benefit.exclusions}. Key features: ${benefit.fullNotes.slice(0,200)}`
    }).join('\n\n')

  const needSpecificGuidance = {
    life:       `Focus on: capital amount vs liabilities + dependant provision, occupation class for life cover, immediate cover availability, terminal illness rider, premium escalation`,
    disability: `Focus on: occupation-specific definition (own occupation vs suited occupation), benefit period, waiting period (3 or 6 months), income replacement percentage, specific relevance to medical/professional practice vulnerability`,
    income:     `Focus on: monthly benefit amount vs actual gross income, occupation definition critical for ${prof.label}, waiting period choice, benefit period to age 65, how income fluctuation is handled`,
    trauma:     `Focus on: list of covered conditions (relevance to ${prof.label} risk profile), severity requirements, payout structure (lump sum), survival period, how it complements disability cover`,
  }[typeKey] || ''

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers writing Section D of a Risk Client Advice Record.

CLIENT: ${occ} (${prof.label}), Age ${age}, ${smoker}, ${depStr}, gross income ${grossStr}
NEED: ${needType.toUpperCase()} — to ${needContext}
RECOMMENDED: ${selectedProduct}

PRODUCTS COMPARED:
${productsInfo || 'Standard market products were compared.'}

Write a FAIS-compliant Section D rationale (3-4 sentences) for the ${needType.toUpperCase()} recommendation. 

${needSpecificGuidance}

CRITICAL REQUIREMENTS:
1. Be SPECIFIC to ${needType.toUpperCase()} — this paragraph must read DIFFERENTLY from death/disability/trauma paragraphs
2. Reference this client's specific vulnerability as a ${prof.label} to this particular risk
3. Mention specific product features relevant to ${typeKey} cover from the product notes above
4. Reference the amounts involved if available
5. Confirm client was informed of waiting periods, exclusions and product terms

Write ONLY the rationale paragraph, no heading.`

  const result = await callClaude(prompt, 400)

  const fallbacks = {
    life:       `${selectedProduct} was recommended to provide comprehensive life cover for this ${occ} client with ${depStr}. Following a comparison of all products considered, this solution provides immediate cover from application date, a terminal illness accelerator benefit, and competitive premiums commensurate with the client's occupation class. The benefit amount was structured to settle outstanding liabilities and provide for dependants, and the selected product's benefit definitions, waiting periods and exclusions were fully explained to and accepted by the client.`,
    disability: `${selectedProduct} was recommended to protect the professional income of this ${occ} in the event of disability. The occupation-specific definition ensures that the income replacement benefit is triggered if the client is unable to perform their specific professional duties — a critical distinction for a ${prof.label} whose earning capacity is entirely dependent on personal ability to practise. The selected benefit amount of ${grossStr} reflects the client's actual gross income requirement, and all waiting periods, benefit period terms and exclusions were fully explained to and accepted by the client.`,
    income:     `${selectedProduct} was recommended to replace the professional income of this ${occ} in the event of temporary or permanent disability. For a ${prof.label} whose income is entirely dependent on personal ability to practise, disability income protection is a critical financial planning need. The waiting period, occupation definition and benefit period were selected to match the client's professional profile, and all product terms, exclusions and premium obligations were fully explained to and accepted by the client.`,
    trauma:     `${selectedProduct} was recommended to provide a lump sum benefit to fund lifestyle adjustments, additional medical costs and income recovery following a critical illness event such as cancer, stroke or heart attack. For a ${prof.label}, a critical illness event not only creates significant treatment costs but directly impacts professional income through inability to practise. The comprehensive list of covered conditions, severity requirements and survival period were fully explained to and accepted by the client.`,
  }
  return result || fallbacks[typeKey] || fallbacks.life
}

// ── Section E: Implementation motivation ─────────────────────────────────────
export async function generateSectionE(clientData, selectedProducts, occupation) {
  const productList = selectedProducts
    .filter(p => p.product)
    .map(p => `${p.customInsurer||p.insurer} ${p.product} (R${p.premium}/pm)`)
    .join(', ')

  const dep    = Number(clientData.dependents || 0)
  const gross  = Number(clientData.grossIncome || 0)
  const prof   = professionContext(occupation || clientData.occupation)
  const grossStr = gross > 0 ? `R${gross.toLocaleString('en-ZA')}/pm` : 'professional income level'
  const depStr   = dep > 0 ? `${dep} financial dependant${dep > 1 ? 's' : ''}` : 'estate planning obligations'

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers writing Section E of a Risk Client Advice Record.

CLIENT: ${occupation || 'professional'} (${prof.label}), Age ${clientData.age||''}, ${depStr}, gross income ${grossStr}
PRODUCTS IMPLEMENTED: ${productList}

Write a FAIS-compliant Section E implementation motivation (4-5 sentences). Must:
- Name the specific products and state their purpose for THIS client's specific needs
- Explain why this solution is appropriate for a ${prof.label} specifically (income dependency, professional risk profile)
- Confirm client's understanding of features, exclusions, waiting periods and premium obligations
- State that all needs were addressed within confirmed affordability constraints  
- State that the risks of underinsurance and consequences of disability/death/critical illness were explained and acknowledged

Write ONLY the paragraph, no heading.`

  const result = await callClaude(prompt, 500)
  return result || `${productList} ${productList.includes(',') ? 'were' : 'was'} recommended following a comprehensive financial needs analysis conducted for this ${occupation || 'professional'} client. The solution addresses all identified financial planning needs including life, disability income protection, lump sum disability capital and severe illness cover commensurate with the client's professional income of ${grossStr} and obligations towards ${depStr}. The client confirmed full understanding of all product features, benefit definitions, exclusions, waiting periods, premium obligations and the consequences of non-disclosure for all selected products. All identified needs have been addressed within the client's confirmed affordability constraints, and the risks associated with underinsurance, professional income loss and the financial impact of disability, severe illness or premature death were clearly explained and acknowledged.`
}

// ── Section F: Important information from real product notes ──────────────────
export async function generateSectionF(selectedInsurers, selectedBenefits = []) {
  const insurerNotes = selectedInsurers.map(insurer => {
    const allBenefits = getBenefitsForInsurer(insurer)
    const relevant = selectedBenefits.length > 0
      ? allBenefits.filter(b => selectedBenefits.some(sb => sb.insurerName === insurer && sb.benefitId === b.id))
      : allBenefits
    const toUse = relevant.length > 0 ? relevant : allBenefits
    if (toUse.length === 0) return `${insurer}: Standard long-term insurance terms apply.`
    return `${insurer}:\n` + toUse.map(b =>
      `${b.name} — Waiting: ${b.waitingPeriods} | Exclusions: ${b.exclusions} | Notes: ${b.fullNotes.slice(0,300)}`
    ).join('\n')
  }).join('\n\n')

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers.

Based on the product notes below, write Section F "Important Information Highlighted to the Client" for a Risk Client Advice Record. Structure by: Waiting Periods, Exclusions, Grace Periods, Suicide Exclusions, Free Cover, Lapsing Rules, Commission, Product-Specific Notes. Max 350 words. Professional compliance language.

${insurerNotes}`

  const result = await callClaude(prompt, 500)
  return result || `WAITING PERIODS: No waiting periods on life cover. Standard waiting periods apply to disability and severe illness benefits as per each insurer's policy terms. EXCLUSIONS: Standard exclusions apply including suicide within 2 years, self-inflicted injury, war, terrorism and non-disclosure of material information. GRACE PERIODS: Sanlam 30 days; Old Mutual 45 days; PPS 30 days — policies lapse if a second consecutive premium is missed. FREE COVER: Immediate life cover from date of application receipt. COMMISSION: As per signed quotations provided. Full terms and conditions detailed in all policy documents provided to the client.`
}
