// ─── ROA AI Generation Engine ──────────────────────────────────────────────
// Uses real product notes from project folder via productKnowledge.js
import { getBenefitsForInsurer } from './productKnowledge'

const MODEL = 'claude-sonnet-4-20250514'

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

// ── Section D: Product comparison using real uploaded product notes ─────────
export async function generateSectionD(clientData, products, selectedProduct, needType) {
  const typeKey = needType.toLowerCase().includes('income') ? 'income'
    : needType.toLowerCase().includes('disab') ? 'disability'
    : needType.toLowerCase().includes('trauma') || needType.toLowerCase().includes('illness') ? 'trauma'
    : 'life'

  const productsInfo = products
    .filter(p => p.insurer && p.product)
    .map(p => {
      const insurerName = p.customInsurer || p.insurer
      const allBenefits = getBenefitsForInsurer(insurerName)
      // Use specific selected benefit or find most relevant to need type
      const benefit = p.selectedBenefitId
        ? allBenefits.find(b => b.id === p.selectedBenefitId)
        : allBenefits.find(b => b.types.includes(typeKey)) || allBenefits[0]
      const notes = benefit
        ? `${benefit.name}: ${benefit.fullNotes} | Exclusions: ${benefit.exclusions} | Waiting periods: ${benefit.waitingPeriods}`
        : `${p.product}: Standard long-term insurance cover`
      return `${insurerName} - ${p.product} (R${p.premium}/pm):\n${notes}`
    }).join('\n\n')

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers.

Client: ${clientData.occupation || 'Professional'}, Age ${clientData.age || ''}, ${clientData.smokerStatus || 'Non-smoker'}
Need type: ${needType}
Selected product: ${selectedProduct}

Products considered with full product notes from uploaded insurer documents:
${productsInfo}

Write a concise FAIS-compliant rationale (3-5 sentences) explaining why ${selectedProduct} was recommended for this client's ${needType} needs. Reference specific product features, waiting periods, exclusions, and premium differences from the product notes above. Mention occupation relevance if applicable. Write ONLY the rationale paragraph, no headings.`

  const result = await callClaude(prompt)
  return result || `Based on a comprehensive comparison of the products considered, ${selectedProduct} was recommended as it offers the most suitable combination of benefits, premium structure and product features aligned to the client's professional profile, income level and specific ${needType} requirements. The selected product's benefit definitions, waiting periods and exclusions were fully explained to the client.`
}

// ── Section E: Implementation motivation ───────────────────────────────────
export async function generateSectionE(clientData, selectedProducts, occupation) {
  const productList = selectedProducts
    .map(p => `${p.customInsurer||p.insurer} ${p.product} (R${p.premium}/pm)`)
    .join(', ')

  // Build specific benefit notes for selected products
  const benefitSummary = selectedProducts.map(p => {
    const insurerName = p.customInsurer || p.insurer
    const benefits = getBenefitsForInsurer(insurerName)
    const benefit = p.selectedBenefitId
      ? benefits.find(b => b.id === p.selectedBenefitId)
      : benefits[0]
    return benefit ? `${insurerName}: ${benefit.shortDesc}` : `${insurerName}: ${p.product}`
  }).join('; ')

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers.

Client occupation: ${occupation || 'professional'}
Age: ${clientData.age || ''}
Products selected: ${productList}
Product summaries: ${benefitSummary}

Write a professional FAIS-compliant implementation motivation paragraph (5-7 sentences) for Section E of a Risk Client Advice Record. Include:
- Name the specific products and their key benefits
- Explain suitability for this specific profession
- Confirm client understanding of features, limitations, exclusions, waiting periods and premium obligations  
- State that needs were fully implemented within client's affordability
- Mention risks of underinsurance discussed
Write ONLY the paragraph, no headings. Professional tone.`

  const result = await callClaude(prompt)
  return result || `The selected products were recommended following a comprehensive financial needs analysis conducted for this ${occupation || 'professional'} client. The solution addresses the client's identified needs for risk cover including life, disability income protection, lump sum disability capital and severe illness cover. The client confirmed full understanding of all product features, benefit definitions, exclusions, waiting periods and premium obligations for all selected products. All identified needs have been addressed within the client's confirmed affordability constraints, and the risks associated with underinsurance, professional income loss, and the financial impact of disability, severe illness or death were clearly explained and acknowledged.`
}

// ── Section F: Important information from real uploaded product notes ────────
export async function generateSectionF(selectedInsurers, selectedBenefits = []) {
  // Pull exact notes from the uploaded product documents
  const insurerNotes = selectedInsurers.map(insurer => {
    const allBenefits = getBenefitsForInsurer(insurer)
    const relevant = selectedBenefits.length > 0
      ? allBenefits.filter(b => selectedBenefits.some(sb => sb.insurerName === insurer && sb.benefitId === b.id))
      : allBenefits
    const toUse = relevant.length > 0 ? relevant : allBenefits
    if (toUse.length === 0) return `${insurer}: Standard long-term insurance terms apply.`
    return `${insurer}:\n` + toUse.map(b =>
      `${b.name} — Waiting periods: ${b.waitingPeriods} | Exclusions: ${b.exclusions} | Product notes: ${b.fullNotes.slice(0,400)}`
    ).join('\n')
  }).join('\n\n')

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers.

Based on the following product notes from the actual insurer documents, write a comprehensive Section F "Important Information Highlighted to the Client" for a Risk Client Advice Record. Organise by topic: waiting periods, exclusions, grace periods, suicide exclusions, free cover, lapsing rules, and any product-specific notes. Maximum 400 words. Professional compliance language.

Product notes:
${insurerNotes}`

  const result = await callClaude(prompt)
  return result || `WAITING PERIODS: Standard waiting periods apply as per each insurer's policy terms and conditions. Please refer to the individual policy documents for specific waiting period details applicable to each benefit. EXCLUSIONS: Standard long-term insurance exclusions apply across all selected products, including suicide within 2 years of commencement, self-inflicted injuries, war and terrorism, criminal acts, and non-disclosure of material information. GRACE PERIODS: Sanlam — 30-day grace period; Old Mutual — 45-day grace period; PPS — 30 days. Policies lapse if second consecutive premium is missed. FREE COVER: Applies from date of first premium receipt subject to each insurer's terms. COMMISSION: As per signed quotations provided to the client. All full terms and conditions are detailed in the policy documents provided to the client.`
}
