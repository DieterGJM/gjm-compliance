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
  const isAnyDoc      = !isPrivateDoc && !isGovtDoc && (o.includes('doctor') || o.includes('gp') || o.includes('physician') || o.includes('practitioner'))
  const isSpecialist  = o.includes('specialist') || o.includes('surgeon') || o.includes('cardiologist') || o.includes('radiologist') || o.includes('anaesth')
  const isDentist     = o.includes('dentist') || o.includes('dental')
  const isChiro       = o.includes('chiro') || o.includes('physio') || o.includes('therapist')
  const isAttorney    = o.includes('attorney') || o.includes('advocate') || o.includes('lawyer') || o.includes('legal')
  const isAccountant  = o.includes('account') || o.includes('auditor') || o.includes('actuar')
  const isEngineer    = o.includes('engineer') || o.includes('architect')

  if (isGovtDoc)    return { type: 'government_doctor',  label: 'government-employed medical doctor (GP)',    incomeType: 'salaried',  practice: 'public hospital / government service', employmentType: 'Employed through a government/public hospital' }
  if (isPrivateDoc) return { type: 'private_doctor',     label: 'private practice medical doctor (GP)',       incomeType: 'variable',  practice: 'private practice', employmentType: 'Self-employed in private medical practice' }
  if (isAnyDoc)     return { type: 'private_doctor',     label: 'medical doctor (GP)',                        incomeType: 'variable',  practice: 'medical practice', employmentType: 'Employed through private hospital / practice' }
  if (isSpecialist) return { type: 'specialist',         label: 'medical specialist',                         incomeType: 'high',      practice: 'specialist practice', employmentType: 'Self-employed specialist in private practice' }
  if (isDentist)    return { type: 'dentist',            label: 'dental practitioner',                        incomeType: 'variable',  practice: 'dental practice', employmentType: 'Self-employed in dental practice' }
  if (isChiro)      return { type: 'allied_health',      label: 'allied health professional',                 incomeType: 'variable',  practice: 'private practice', employmentType: 'Self-employed in private practice' }
  if (isAttorney)   return { type: 'legal',              label: 'legal professional',                         incomeType: 'variable',  practice: 'legal practice', employmentType: 'Employed / self-employed in legal practice' }
  if (isAccountant) return { type: 'finance_prof',       label: 'finance / accounting professional',          incomeType: 'salaried',  practice: 'professional services', employmentType: 'Employed in professional services' }
  if (isEngineer)   return { type: 'engineer',           label: 'engineering professional',                   incomeType: 'salaried',  practice: 'engineering', employmentType: 'Employed in engineering' }
  return { type: 'professional', label: occ || 'professional', incomeType: 'professional', practice: 'professional practice', employmentType: 'Employed / self-employed' }
}

// ── Section A: Needs & Objectives — FSCA-compliant, profession-specific ─────
export async function generateNeedsObjectives(clientData) {
  const occ    = clientData.occupation || 'professional'
  const age    = clientData.age || ''
  const dep    = Number(clientData.dependents || 0)
  const debt   = Number(clientData.currentDebt || 0)
  const gross  = Number(clientData.grossIncome || 0)
  const prof   = professionContext(occ)
  const gender = clientData.gender || ''
  const products = (clientData.products || []).filter(p => p.product).map(p => p.product).join(', ') || 'life, disability and severe illness cover'

  const depStr  = dep > 0 ? `${dep} financial dependant${dep > 1 ? 's' : ''}` : 'estate beneficiaries'
  const debtStr = debt > 0 ? ` Outstanding liabilities of R${debt.toLocaleString('en-ZA')} require capital provision in the event of premature death or disability.` : ''
  const incStr  = gross > 0 ? `R${gross.toLocaleString('en-ZA')} per month` : 'professional-level income'
  const genderPronoun = gender.toLowerCase() === 'female' ? 'her' : gender.toLowerCase() === 'male' ? 'his' : 'their'

  const profGuidance = {
    government_doctor: `This doctor earns a salaried income from government employment but may supplement this with private practice income. Both income streams are at risk in the event of disability or critical illness. Key needs: income protection for both streams, life cover for dependants, lump sum disability capital for lifestyle adaptation, severe illness cover for treatment costs.`,
    private_doctor:    `This doctor's entire professional income of ${incStr} is generated through private practice and is ENTIRELY dependent on their personal ability to practise medicine. Loss of ability to practise due to disability or critical illness would result in TOTAL income loss. Key needs: disability income protection at professional income level, lump sum disability capital, severe illness cover, life cover for dependants.`,
    specialist:        `As a medical specialist, this client's income is exceptionally high and ENTIRELY contingent on their ability to perform specific specialist procedures. Even partial disability affecting ability to perform specialist work represents catastrophic income risk. Key needs: specialist occupation definition for disability income, maximum lump sum disability capital, comprehensive severe illness cover.`,
    professional:      `This ${prof.label}'s income depends on ability to work. Key needs: income protection, life cover for dependants, severe illness cover.`,
  }

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers completing an FSP-licensed Risk Client Advice Record (ROA) for FSCA submission.

CLIENT PROFILE:
- Occupation: ${occ} (${prof.employmentType})
- Age: ${age} | Dependants: ${depStr} | Gross Income: ${incStr}
- Products being recommended: ${products}
${debtStr}

PROFESSIONAL RISK CONTEXT:
${profGuidance[prof.type] || profGuidance.professional}

Write the CLIENT'S NEEDS AND OBJECTIVES for ROA Section A. This is the CLIENT'S statement of WHY they need cover.

STRICT REQUIREMENTS:
1. MUST be FSCA/FAIS-compliant — state GENUINE financial protection needs only
2. Must be SPECIFIC to this client's profession and personal situation
3. Must reference: their dependants, income level, professional vulnerability
4. Must state PURPOSE of cover (protect income, provide for dependants, cover liabilities)
5. UPPERCASE throughout
6. 2-3 sentences MAXIMUM
7. ABSOLUTELY DO NOT mention: reducing premiums, switching insurers, saving money, decreasing costs, moving portfolio
8. Focus on: life cover need, disability income protection, critical illness cover, estate planning

Write ONLY the needs statement — no label, no preamble, no quotation marks.`

  const result = await callClaude(prompt, 300)

  // Fallbacks per profession type
  const depUpper = depStr.toUpperCase()
  const fallbacks = {
    government_doctor: `TO OBTAIN COMPREHENSIVE LIFE, DISABILITY INCOME PROTECTION AND SEVERE ILLNESS COVER TO PROTECT ${genderPronoun.toUpperCase()} PROFESSIONAL INCOME GENERATED THROUGH BOTH GOVERNMENT EMPLOYMENT AND SUPPLEMENTARY PRIVATE PRACTICE, AND TO PROVIDE FINANCIAL SECURITY FOR ${depUpper} IN THE EVENT OF PREMATURE DEATH, PERMANENT OR TEMPORARY DISABILITY OR CRITICAL ILLNESS.${debtStr ? ' TO ENSURE ALL OUTSTANDING FINANCIAL OBLIGATIONS ARE SETTLED IN THE EVENT OF AN INSURED EVENT.' : ''}`,
    private_doctor:    `TO SECURE COMPREHENSIVE RISK COVER COMMENSURATE WITH ${genderPronoun.toUpperCase()} HIGH PROFESSIONAL INCOME GENERATED THROUGH PRIVATE MEDICAL PRACTICE, WHICH IS ENTIRELY DEPENDENT ON ${genderPronoun.toUpperCase().replace('HER','HIS/HER')} PERSONAL ABILITY TO PRACTISE. TO PROVIDE FINANCIALLY FOR ${depUpper} AND PROTECT AGAINST THE FULL LOSS OF PROFESSIONAL INCOME IN THE EVENT OF PREMATURE DEATH, PERMANENT DISABILITY OR CRITICAL ILLNESS.`,
    specialist:        `TO OBTAIN LIFE, SPECIALIST DISABILITY INCOME AND SEVERE ILLNESS COVER APPROPRIATE TO ${genderPronoun.toUpperCase()} HIGH SPECIALIST INCOME LEVEL, RECOGNISING THAT ALL INCOME IS CONTINGENT ON THE ABILITY TO PERSONALLY PERFORM SPECIALIST PROCEDURES. TO PROTECT ${depUpper} AND MAINTAIN ALL FINANCIAL OBLIGATIONS IN THE EVENT OF DEATH, DISABILITY OR CRITICAL ILLNESS.`,
    professional:      `TO OBTAIN COMPREHENSIVE LIFE, DISABILITY AND SEVERE ILLNESS COVER COMMENSURATE WITH ${genderPronoun.toUpperCase()} PROFESSIONAL INCOME AND FINANCIAL OBLIGATIONS, AND TO PROVIDE FINANCIAL SECURITY FOR ${depUpper} IN THE EVENT OF PREMATURE DEATH, DISABILITY OR CRITICAL ILLNESS.`,
  }

  // Validate result - reject if it mentions reducing premiums or switching
  const forbidden = ['reduc', 'premium', 'switch', 'sanlam', 'pps', 'old mutual', 'brightrock', 'saving', 'cheaper', 'decreas', 'portfolio']
  const resultLower = (result || '').toLowerCase()
  const hasForbidden = forbidden.some(f => resultLower.includes(f))

  return (!hasForbidden && result) ? result : (fallbacks[prof.type] || fallbacks.professional)
}

// ── Section A: Financial Situation — specific to employment type ─────────────
export async function generateFinancialSituation(clientData) {
  const occ        = clientData.occupation || 'professional'
  const gross      = Number(clientData.grossIncome || 0)
  const dep        = Number(clientData.dependents || 0)
  const smoker     = clientData.smokerStatus || 'Non-Smoker'
  const age        = clientData.age || ''
  const debt       = Number(clientData.currentDebt || 0)
  const premium    = Number(clientData.premiumConsideration || 0)
  const affordability = clientData.affordability || 'Full affordability confirmed by client'
  const prof       = professionContext(occ)
  const gender     = clientData.gender || ''

  const grossStr   = gross > 0 ? `R${gross.toLocaleString('en-ZA')} per month` : ''
  const depStr     = dep > 0 ? `${dep} financial dependant${dep > 1 ? 's' : ''}` : 'no financial dependants'
  const debtStr    = debt > 0 ? ` with outstanding liabilities of R${debt.toLocaleString('en-ZA')}` : ''
  const premStr    = premium > 0 ? ` Current premium contribution: R${premium.toLocaleString('en-ZA')} per month.` : ''
  const genderPronoun = gender.toLowerCase() === 'female' ? 'her' : gender.toLowerCase() === 'male' ? 'his' : 'their'

  const prompt = `You are a South African FAIS-compliant financial advisor writing Section A of a Risk Client Advice Record.

CLIENT PROFILE:
- Occupation: ${occ} (${prof.employmentType})  
- Age: ${age} | Gross Monthly Income: ${grossStr || 'not disclosed'}
- Dependants: ${depStr}${debtStr}
- Smoker status: ${smoker}
- Affordability: ${affordability}${premStr}

Write the FINANCIAL SITUATION description for ROA Section A. This is a factual summary of the client's financial and employment position.

REQUIREMENTS:
1. Sentence case (not uppercase)
2. 2-3 sentences maximum
3. State their EMPLOYMENT TYPE specifically (government hospital, private practice, self-employed, etc.)
4. Mention income level if provided
5. State that income is ${prof.incomeType === 'salaried' ? 'salaried (more predictable but still at risk from disability)' : 'entirely dependent on personal ability to practise (high income-at-risk exposure)'}
6. Mention dependants, liabilities, smoker status
7. Be SPECIFIC to their profession — NOT generic
8. Professional compliance language

PROFESSION-SPECIFIC CONTEXT:
${prof.type === 'government_doctor' ? `This is a doctor employed through a government/public hospital. They may have a government salary PLUS supplementary private practice income. Both income streams are at risk.` : ''}
${prof.type === 'private_doctor' ? `This doctor earns ALL income through private practice. If they cannot practise (disability/illness), ALL income stops immediately. This is maximum income-at-risk.` : ''}
${prof.type === 'specialist' ? `This medical specialist earns exceptionally high income through specialist procedures. ALL income depends on ability to personally perform these procedures.` : ''}

Write ONLY the financial situation description — no label, no quotation marks.`

  const result = await callClaude(prompt, 250)

  // Fallbacks per type
  const fallbacks = {
    government_doctor: `${prof.employmentType}${grossStr ? ', earning a gross monthly income of ' + grossStr : ''}. Income is generated through government employment, with potential supplementary income from private practice — both of which are at risk in the event of disability or critical illness. The client has ${depStr}${debtStr} and is a ${smoker}.`,
    private_doctor:    `${prof.employmentType}${grossStr ? ', generating a professional income of approximately ' + grossStr : ''}. Income is entirely dependent on the client's personal ability to practise medicine, creating significant exposure to total income loss in the event of disability or critical illness. The client has ${depStr}${debtStr} and is a ${smoker}.`,
    specialist:        `${prof.employmentType}${grossStr ? ', generating a high specialist income of ' + grossStr : ''}, with all income contingent on the ability to personally perform specialist procedures. The client has ${depStr}${debtStr} and is a ${smoker}.`,
    professional:      `${prof.employmentType}${grossStr ? ', earning approximately ' + grossStr : ''}. The client has ${depStr}${debtStr} and is a ${smoker}.`,
  }

  return result || fallbacks[prof.type] || fallbacks.professional
}

// ── Section A: Product Knowledge — profession-specific ───────────────────────
export async function generateProductKnowledge(clientData, products) {
  const occ       = clientData.occupation || 'professional'
  const prof      = professionContext(occ)
  const prodNames = (products || []).filter(p => p.product).map(p => `${p.customInsurer||p.insurer} ${p.product}`).join(', ') || 'long-term risk insurance'

  // Medical professionals generally have moderate awareness but limited specific product knowledge
  const isMedical = ['government_doctor','private_doctor','specialist','dentist','allied_health'].includes(prof.type)
  const knowledgeLevel = isMedical ? 'moderate' : 'limited'

  const prompt = `You are a South African FAIS-compliant financial advisor writing Section A of a Risk Client Advice Record.

CLIENT: ${occ} (${prof.label})
PRODUCTS SELECTED: ${prodNames}
PROFESSION TYPE: ${prof.type}

Write the PRODUCT KNOWLEDGE AND EXPERIENCE statement. This confirms the client's level of product knowledge and that they fully understand what they're purchasing.

REQUIREMENTS:
1. UPPERCASE throughout
2. 2 sentences MAXIMUM
3. First sentence: state actual knowledge level specific to their profession
   - Medical professionals: acknowledge they understand healthcare concepts but long-term insurance products have specific technical features they may not be familiar with
   - Government doctors: note that salaried employment may mean less exposure to self-funded insurance
   - Private practice doctors: note they may have more exposure to professional indemnity/business insurance but long-term personal risk insurance is a specialist field
4. Second sentence: confirm they have been FULLY informed and UNDERSTAND all effects, consequences, benefit definitions, exclusions, waiting periods and premium obligations of the SPECIFIC products selected
5. Must reference the SPECIFIC products (${prodNames})
6. Do NOT use the generic phrase "low level" — be specific to their profession

Write ONLY the statement — no label, no preamble.`

  const result = await callClaude(prompt, 250)

  const fallbacks = {
    government_doctor: `THE CLIENT, AS A GOVERNMENT-EMPLOYED MEDICAL DOCTOR, HAS A GENERAL UNDERSTANDING OF HEALTHCARE AND MEDICAL RISK BUT HAS LIMITED PRIOR EXPERIENCE WITH THE SPECIFIC FEATURES OF LONG-TERM PERSONAL RISK INSURANCE PRODUCTS SUCH AS ${prodNames.toUpperCase()}. THE CLIENT HAS BEEN FULLY INFORMED OF AND CONFIRMS FULL UNDERSTANDING OF THE EFFECTS, CONSEQUENCES, BENEFIT DEFINITIONS, EXCLUSIONS, WAITING PERIODS AND PREMIUM OBLIGATIONS OF ALL SELECTED PRODUCTS.`,
    private_doctor:    `THE CLIENT, AS A PRIVATE PRACTICE MEDICAL DOCTOR, UNDERSTANDS PROFESSIONAL RISK CONCEPTUALLY BUT HAS LIMITED EXPERIENCE WITH THE SPECIFIC PRODUCT STRUCTURES, BENEFIT DEFINITIONS AND CLAIMS PROCESSES OF LONG-TERM PERSONAL RISK INSURANCE SUCH AS ${prodNames.toUpperCase()}. THE CLIENT HAS BEEN FULLY INFORMED OF AND CONFIRMS COMPLETE UNDERSTANDING OF ALL PRODUCT FEATURES, BENEFIT TRIGGERS, EXCLUSIONS, WAITING PERIODS, ESCALATION STRUCTURES AND PREMIUM OBLIGATIONS FOR ALL SELECTED PRODUCTS.`,
    specialist:        `THE CLIENT, AS A MEDICAL SPECIALIST, HAS STRONG AWARENESS OF PROFESSIONAL INCOME RISK BUT REQUIRED COMPREHENSIVE EXPLANATION OF THE SPECIFIC PRODUCT STRUCTURES, OCCUPATION DEFINITIONS AND BENEFIT TRIGGERS APPLICABLE TO ${prodNames.toUpperCase()}. THE CLIENT CONFIRMS FULL UNDERSTANDING OF ALL PRODUCT FEATURES, BENEFIT DEFINITIONS, EXCLUSIONS, WAITING PERIODS AND PREMIUM OBLIGATIONS FOR ALL SELECTED PRODUCTS.`,
    professional:      `THE CLIENT HAS A GENERAL AWARENESS OF INSURANCE CONCEPTS BUT HAS LIMITED PRIOR EXPERIENCE WITH THE SPECIFIC FEATURES, BENEFIT STRUCTURES AND CLAIMS REQUIREMENTS OF LONG-TERM PERSONAL RISK PRODUCTS SUCH AS ${prodNames.toUpperCase()}. THE CLIENT HAS BEEN FULLY INFORMED OF AND CONFIRMS COMPLETE UNDERSTANDING OF THE EFFECTS, CONSEQUENCES, BENEFIT DEFINITIONS, EXCLUSIONS, WAITING PERIODS AND PREMIUM OBLIGATIONS OF ALL SELECTED PRODUCTS.`,
  }

  return result || fallbacks[prof.type] || fallbacks.professional
}

// ── Section D: Need-specific rationale — UNIQUE per death/disability/trauma ──
export async function generateSectionD(clientData, products, selectedProduct, needType) {
  const typeKey = needType.toLowerCase().includes('income') ? 'income'
    : needType.toLowerCase().includes('disab') ? 'disability'
    : needType.toLowerCase().includes('trauma') || needType.toLowerCase().includes('illness') ? 'trauma'
    : 'life'

  const occ    = clientData.occupation || 'professional'
  const age    = clientData.age || ''
  const dep    = Number(clientData.dependents || 0)
  const gross  = Number(clientData.grossIncome || 0)
  const debt   = Number(clientData.currentDebt || 0)
  const prof   = professionContext(occ)
  const smoker = clientData.smokerStatus || 'Non-Smoker'
  const grossStr = gross > 0 ? `R${gross.toLocaleString('en-ZA')}/pm` : ''
  const depStr   = dep > 0 ? `${dep} financial dependant${dep > 1 ? 's' : ''}` : 'estate'

  // Get actual product notes for the relevant need type
  const productsInfo = products
    .filter(p => p.insurer && p.product)
    .map(p => {
      const insurerName = p.customInsurer || p.insurer
      try {
        const allBenefits = getBenefitsForInsurer(insurerName) || []
        const benefit = allBenefits.find(b => b.types && b.types.includes(typeKey)) || allBenefits[0]
        if (!benefit) return `${insurerName} — ${p.product} (R${p.premium || '?'}/pm)`
        return `${insurerName} — ${benefit.name}: Waiting: ${benefit.waitingPeriods}. Exclusions: ${benefit.exclusions}. Key: ${(benefit.fullNotes||'').slice(0,200)}`
      } catch(e) {
        return `${insurerName} — ${p.product}`
      }
    }).join('\n\n')

  // NEED-TYPE-SPECIFIC guidance for each rationale
  const needSpecific = {
    life: {
      focus: `DEATH / LIFE COVER rationale. This paragraph is specifically about WHY this life cover amount was recommended and what it protects against.`,
      points: `- Capital amount selected relative to outstanding liabilities (R${debt.toLocaleString('en-ZA') || '0'}) and income replacement for ${depStr}
- Why THIS product's life cover structure was chosen vs alternatives (immediate cover, terminal illness benefit, occupation class)
- Confirmation that the selected cover amount addresses the specific death-related need
- Do NOT mention disability or trauma here`,
    },
    disability: {
      focus: `DISABILITY rationale. This paragraph is SPECIFICALLY about disability cover — WHY this disability product/amount was recommended.`,
      points: `- The critical importance of disability income protection for a ${prof.label} whose income is entirely dependent on ability to personally practise
- Occupation-specific definition importance (own occupation vs suited occupation for a ${prof.label})
- How the monthly income benefit of ${grossStr} reflects actual income at risk
- Waiting period selection rationale (typically 3 or 6 months for medical professionals)
- Do NOT mention life cover or trauma here`,
    },
    income: {
      focus: `DISABILITY INCOME PROTECTION rationale. Specifically about income replacement during disability.`,
      points: `- Monthly income replacement amount vs actual gross income of ${grossStr}
- Why occupation-specific definition is CRITICAL for a ${prof.label}
- Benefit period choice (typically to age 65)
- How loss of ability to practise immediately stops all income for a ${prof.label}
- Do NOT mention life cover or lump sum or trauma here`,
    },
    trauma: {
      focus: `TRAUMA / CRITICAL ILLNESS rationale. This paragraph is SPECIFICALLY about severe illness / trauma cover.`,
      points: `- Why a lump sum critical illness benefit is needed BEYOND disability income cover
- Specific conditions most relevant to a ${prof.label} (heart attack, cancer, stroke)
- How a critical illness event affects BOTH income AND treatment costs simultaneously
- The complementary role of trauma cover alongside disability income protection
- Do NOT mention life cover or disability income here`,
    },
  }

  const nd = needSpecific[typeKey] || needSpecific.life

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers writing Section D of a Risk Client Advice Record.

CLIENT: ${occ} (${prof.label}), Age ${age}, ${smoker}, ${depStr}, gross income ${grossStr}
NEED TYPE: ${needType.toUpperCase()} — THIS IS THE ${nd.focus}
RECOMMENDED PRODUCT: ${selectedProduct}

PRODUCTS COMPARED:
${productsInfo || 'Standard market products were compared.'}

Write a FAIS-compliant Section D rationale for the ${needType.toUpperCase()} recommendation specifically.

CRITICAL: This paragraph MUST be DISTINCTLY DIFFERENT from rationales for other need types. Focus EXCLUSIVELY on ${needType.toUpperCase()}.

SPECIFIC POINTS TO ADDRESS FOR ${typeKey.toUpperCase()}:
${nd.points}

ADDITIONAL REQUIREMENTS:
- 3-4 sentences
- Reference this client's specific professional vulnerability to THIS particular risk
- Mention specific product features relevant to THIS need type from the product notes above
- Confirm client was informed of waiting periods, exclusions and product terms specific to this benefit
- Professional, FSCA-compliant language
- Do not use generic phrases applicable to all need types

Write ONLY the rationale paragraph — no heading, no label.`

  const result = await callClaude(prompt, 450)

  const fallbacks = {
    life: `${selectedProduct} was recommended to provide life cover of sufficient capital to settle outstanding liabilities and provide ongoing financial support for ${depStr} in the event of premature death. Following a comprehensive comparison of all products considered, this solution provides immediate cover from the date of application, a terminal illness accelerator benefit, and competitive premiums commensurate with the client's occupation class as a ${occ}. The life cover amount was structured to address the full extent of the client's death-related needs, and all benefit definitions, waiting periods and exclusions were fully explained to and accepted by the client.`,
    disability: `${selectedProduct} was recommended to replace the professional income of this ${occ} in the event of permanent or temporary disability, recognising that ${grossStr ? 'the full gross income of ' + grossStr : 'all professional income'} is directly dependent on the personal ability to practise. The occupation-specific definition ensures that the disability income benefit is triggered if the client is unable to perform their specific professional duties — a critical distinction for a ${prof.label} where even partial incapacity represents significant income loss. The waiting period, benefit period and income replacement level were selected to match the client's professional profile and specific disability risk, and all product terms, exclusions and premium obligations were fully explained to and accepted by the client.`,
    income: `${selectedProduct} was recommended to provide monthly income replacement for this ${occ} in the event of disability, with the benefit amount structured to replace ${grossStr ? 'the gross professional income of ' + grossStr : 'the client\'s gross professional income'}. For a ${prof.label} whose income is entirely dependent on personal ability to practise, the loss of this capacity — even temporarily — results in immediate and complete income loss, making disability income protection the single most critical financial planning need. The occupation definition, waiting period and benefit period were carefully selected to ensure maximum relevance to the client's professional risk profile, and all benefit triggers, exclusions and premium obligations were fully explained to and accepted by the client.`,
    trauma: `${selectedProduct} was recommended to provide a lump sum critical illness benefit to fund lifestyle adjustments, specialist treatment costs and income gap coverage following a severe illness event such as cancer, stroke or heart attack — conditions that present elevated risk for a ${prof.label}. Unlike disability income protection, a critical illness event creates immediate large capital requirements for treatment, rehabilitation and practice continuation that cannot be covered by monthly income replacement alone. The comprehensive list of covered conditions, severity thresholds and survival period applicable to this product were fully explained, and the client confirmed full understanding of how this benefit complements existing disability income protection cover.`,
  }

  return result || fallbacks[typeKey] || fallbacks.life
}

// ── Section E: Implementation motivation ─────────────────────────────────────
export async function generateSectionE(clientData, selectedProducts, occupation) {
  const productList = selectedProducts
    .filter(p => p.product)
    .map(p => `${p.customInsurer||p.insurer} ${p.product} at R${p.premium}/pm`)
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
1. Name the specific products and their purpose for THIS client's specific needs
2. Explain why this solution is appropriate specifically for a ${prof.label} (income dependency, professional risk profile)
3. Confirm client's full understanding of features, exclusions, waiting periods and premium obligations
4. State all needs were addressed within confirmed affordability constraints
5. State that risks of underinsurance and financial impact of disability/death/critical illness were explained

Write ONLY the paragraph — no heading. Do not repeat this paragraph in the document.`

  const result = await callClaude(prompt, 500)
  return result || `${productList ? productList.split(',')[0].trim().split(' at ')[0] : 'The selected product'} was recommended following a comprehensive financial needs analysis conducted for this ${occupation || 'professional'} client, addressing all identified financial planning needs within the client's confirmed affordability constraints. The solution provides comprehensive life, disability income protection, lump sum disability capital and severe illness cover commensurate with the client's professional income of ${grossStr} and obligations towards ${depStr}. The client confirmed full understanding of all product features, benefit definitions, exclusions, waiting periods, escalation structures and premium obligations for all selected products. The risks associated with underinsurance, professional income loss and the financial impact of disability, severe illness or premature death were clearly explained and acknowledged by the client.`
}

// ── Section F: Important information from real product notes ──────────────────
// ── Section H: Auto-generate reason client declined other products ────────
export async function generateDeclinedReason(clientData, declinedProducts, selectedProducts) {
  if (!declinedProducts || !declinedProducts.trim()) return ''

  const occ      = clientData.occupation || 'professional'
  const prof     = professionContext(occ)
  const selected = selectedProducts.filter(p=>p.product)
    .map(p => `${p.customInsurer||p.insurer} ${p.product}`).join(', ') || 'the selected product'

  const prompt = `You are a South African FAIS-compliant financial advisor writing Section H of a Risk Client Advice Record.

CLIENT: ${occ} (${prof.label})
PRODUCTS DECLINED: ${declinedProducts}
PRODUCTS SELECTED INSTEAD: ${selected}

Write a brief, FAIS-compliant reason why the client elected not to proceed with the declined products (1-2 sentences).

Requirements:
- Professional compliance language
- State the client's stated preference or reason
- Do NOT say "reduce premiums" — say "client preference for selected provider" or "product features of selected provider better aligned with client needs and affordability"
- Sentence case
- Do NOT mention competitor products negatively

Write ONLY the reason — no label, no preamble.`

  const result = await callClaude(prompt, 150)
  return result || `Client elected to proceed with ${selected} based on product features, premium structure and provider preference. The client confirmed understanding of the products not selected.`
}

export async function generateSectionF(selectedInsurers, selectedBenefits = []) {
  const insurerNotes = (selectedInsurers || []).map(insurer => {
    try {
      const allBenefits = getBenefitsForInsurer(insurer) || []
      const relevant = selectedBenefits.length > 0
        ? allBenefits.filter(b => selectedBenefits.some(sb => sb.insurerName === insurer && sb.benefitId === b.id))
        : allBenefits
      const toUse = relevant.length > 0 ? relevant : allBenefits
      if (toUse.length === 0) return `${insurer}: Standard long-term insurance terms apply.`
      return `${insurer}:\n` + toUse.map(b =>
        `${b.name} — Waiting: ${b.waitingPeriods} | Exclusions: ${b.exclusions} | Notes: ${(b.fullNotes||'').slice(0,300)}`
      ).join('\n')
    } catch(e) {
      return `${insurer}: Standard long-term insurance terms apply.`
    }
  }).join('\n\n')

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers.

Based on the product notes below, write Section F "Important Information Highlighted to the Client" for a Risk Client Advice Record. Structure by: Waiting Periods, Exclusions, Grace Periods, Suicide Exclusions, Free Cover, Lapsing Rules, Commission, Product-Specific Notes. Max 350 words. Professional compliance language.

${insurerNotes}`

  const result = await callClaude(prompt, 500)
  return result || `WAITING PERIODS: No waiting periods on life cover. Standard waiting periods apply to disability and severe illness benefits as per each insurer's policy terms. EXCLUSIONS: Standard exclusions apply including suicide within 2 years, self-inflicted injury, war, terrorism and non-disclosure of material information. GRACE PERIODS: Sanlam 30 days; Old Mutual 45 days; PPS 30 days — policies lapse if a second consecutive premium is missed. FREE COVER: Immediate life cover from date of application receipt. COMMISSION: As per signed quotations provided. Full terms and conditions detailed in all policy documents provided to the client.`
}
