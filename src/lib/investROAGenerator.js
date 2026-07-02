// ─── Investment ROA AI Generation Engine ─────────────────────────────────────
// Uses investProductKnowledge.js for product-specific rationale generation
import { getInvestmentProductsForInsurer, getInvestProductsByType } from './investProductKnowledge'

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

// ── Section D Retirement Rationale ───────────────────────────────────────────
export async function generateInvestSectionD_Retirement(clientData, products, selectedProduct, needType) {
  const occ    = clientData.occupation || 'professional'
  const age    = clientData.age || ''
  const gross  = Number(clientData.grossIncome || 0)
  const yrs    = clientData.retirementAge ? (Number(clientData.retirementAge) - Number(age)) : ''
  const grossStr = gross > 0 ? `R${gross.toLocaleString('en-ZA')}/pm` : ''

  // Get product notes for all products being considered
  const productsInfo = products
    .filter(p => p.insurer && p.product)
    .map(p => {
      const insurerName = p.customInsurer || p.insurer
      const allProds = getInvestmentProductsForInsurer(insurerName)
      const typeKey = needType.toLowerCase().includes('ra') || needType.toLowerCase().includes('retirement annuity') ? 'ra'
        : needType.toLowerCase().includes('preservation') ? 'preservation'
        : needType.toLowerCase().includes('living') ? 'living_annuity'
        : 'retirement'
      const prod = allProds.find(pr => pr.types.includes(typeKey)) || allProds[0]
      if (!prod) return `${insurerName} — ${p.product}: Standard retirement product`
      return `${insurerName} — ${prod.name}: ${prod.fullNotes.slice(0, 300)} | Exclusions: ${prod.exclusions} | Minimums: ${prod.minimums}`
    }).join('\n\n')

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers writing Section D of an Investment Client Advice Record (ROA).

CLIENT: ${occ}, Age ${age}, gross income ${grossStr}, ${yrs ? yrs + ' years to retirement' : ''}
NEED: ${needType.toUpperCase()}
RECOMMENDED: ${selectedProduct}

PRODUCTS COMPARED (from actual product notes):
${productsInfo || 'Standard market retirement products compared.'}

Write a FAIS-compliant Section D rationale (3-4 sentences) for why ${selectedProduct} was recommended for this client's ${needType} need. Must:
1. Reference this client's specific retirement planning need (age, income, years to retirement)
2. Compare specific features between products considered (tax benefits, access rules, guarantees)
3. Reference product-specific features from the notes (e.g. RA tax deduction, endowment restriction period, living annuity drawdown rules)
4. Confirm client was informed of all terms, conditions and limitations

Write ONLY the rationale paragraph, no heading.`

  const result = await callClaude(prompt, 350)
  return result || `${selectedProduct} was recommended for this client's ${needType} requirement following a comprehensive comparison of available products. The selected product offers the most suitable combination of tax efficiency, investment flexibility and terms appropriate to this client's retirement timeline and income level. All product terms, fees, restrictions and tax implications were fully explained to and accepted by the client.`
}

// ── Section D Savings/Investment Rationale ────────────────────────────────────
export async function generateInvestSectionD_Savings(clientData, products, selectedProduct, needType) {
  const occ    = clientData.occupation || 'professional'
  const age    = clientData.age || ''
  const gross  = Number(clientData.grossIncome || 0)
  const taxBracket = gross > 71667 ? '41%' : gross > 60000 ? '39%' : '36%'  // rough estimate
  const grossStr = gross > 0 ? `R${gross.toLocaleString('en-ZA')}/pm` : ''

  const productsInfo = products
    .filter(p => p.insurer && p.product)
    .map(p => {
      const insurerName = p.customInsurer || p.insurer
      const allProds = getInvestmentProductsForInsurer(insurerName)
      const typeKey = needType.toLowerCase().includes('endowment') ? 'endowment'
        : needType.toLowerCase().includes('unit trust') ? 'unit_trust'
        : needType.toLowerCase().includes('tax free') ? 'tax_free'
        : 'savings'
      const prod = allProds.find(pr => pr.types.includes(typeKey)) ||
                   allProds.find(pr => pr.types.includes('savings')) ||
                   allProds[0]
      if (!prod) return `${insurerName} — ${p.product}: Standard savings product`
      return `${insurerName} — ${prod.name}: ${prod.fullNotes.slice(0, 300)} | Exclusions: ${prod.exclusions} | Min: ${prod.minimums}`
    }).join('\n\n')

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers writing Section D of an Investment ROA.

CLIENT: ${occ}, Age ${age}, gross income ${grossStr}, estimated tax bracket ${taxBracket}
NEED: ${needType.toUpperCase()} (savings/investment goal)
RECOMMENDED: ${selectedProduct}

PRODUCTS COMPARED:
${productsInfo || 'Standard market savings/investment products compared.'}

Write a FAIS-compliant Section D rationale (3-4 sentences) for why ${selectedProduct} was recommended for this client's ${needType} savings/investment need. Must:
1. Reference client's income/tax bracket and why this product is tax-efficient for them
2. Compare specific features (endowment restriction period vs unit trust flexibility, tax treatment, estate benefits, withdrawal access)
3. Reference specific product features from notes (e.g. Discovery boost, Momentum loyalty bonus, Allan Gray 5-year restriction)
4. Confirm product terms, restrictions and investment risks explained to client

Write ONLY the rationale paragraph, no heading.`

  const result = await callClaude(prompt, 350)
  return result || `${selectedProduct} was recommended for this client's savings and investment objective following a comparison of available products. Given this client's income level and tax bracket, the selected product offers meaningful tax efficiency while aligning with the stated investment horizon. All product features, restrictions, fees and the implications of the restriction period were fully explained to and accepted by the client.`
}

// ── Section E: Implementation Motivation ─────────────────────────────────────
export async function generateInvestSectionE(clientData, products, occupation) {
  const occ     = occupation || clientData.occupation || 'professional'
  const gross   = Number(clientData.grossIncome || 0)
  const grossStr = gross > 0 ? `R${gross.toLocaleString('en-ZA')}/pm` : ''
  const investAmt = clientData.investmentAmount
    ? `R${Number(clientData.investmentAmount).toLocaleString('en-ZA')} ${clientData.investmentFrequency || ''}`
    : ''

  const productList = products
    .filter(p => p.product)
    .map(p => {
      const insurerName = p.customInsurer || p.insurer
      const allProds = getInvestmentProductsForInsurer(insurerName)
      const matched = allProds.find(pr => p.product.toLowerCase().includes(pr.id.split('_').slice(1).join(' ')))
      return `${insurerName} ${p.product} (R${p.premium || '?'}/pm)${matched ? ' [' + matched.shortDesc + ']' : ''}`
    }).join(', ')

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers writing Section E of an Investment Client Advice Record.

CLIENT: ${occ}, Age ${clientData.age || ''}, gross income ${grossStr}, investment amount ${investAmt}
PRODUCTS IMPLEMENTED: ${productList}
INVESTMENT HORIZON: ${clientData.investmentHorizon || '5-9'} years
RISK PROFILE: ${clientData.riskProfile || 'moderate'}

Write a FAIS-compliant Section E implementation motivation (4-5 sentences). Must:
- Name each product and its specific purpose for this client's identified investment needs
- Explain tax efficiency benefits relevant to this client's income/bracket
- Reference specific product features (e.g. restriction periods, boosts, loyalty bonuses, tax deductions)
- Confirm client understands all restrictions, fees, tax implications and risk profile alignment
- State all needs were addressed within client's confirmed affordability and risk tolerance

Write ONLY the paragraph, no heading.`

  const result = await callClaude(prompt, 500)
  return result || `${productList} were recommended following a comprehensive financial needs analysis. The selected products address this client's identified savings, retirement and investment planning needs with appropriate tax efficiency given the client's income level and investment horizon of ${clientData.investmentHorizon || '5-9'} years. All product features, restriction periods, fees, tax implications, investment risks and the client's risk profile of ${clientData.riskProfile || 'moderate'} were fully explained and accepted. All identified needs have been addressed within the client's confirmed affordability and risk tolerance constraints.`
}

// ── Section F: Important Information ─────────────────────────────────────────
export async function generateInvestSectionF(selectedInsurers, products = []) {
  const insurerNotes = selectedInsurers.map(insurer => {
    const allProds = getInvestmentProductsForInsurer(insurer)
    if (allProds.length === 0) return `${insurer}: Standard investment product terms apply.`
    return `${insurer}:\n` + allProds.map(p =>
      `${p.name}: Waiting/Restrictions: ${p.waitingPeriods} | Exclusions: ${p.exclusions} | Notes: ${p.fullNotes.slice(0, 200)}`
    ).join('\n')
  }).join('\n\n')

  const prompt = `You are a South African FAIS-compliant financial advisor at GJM Ultra Brokers.

Based on the investment product notes below, write Section F "Important Information Highlighted to the Client" for an Investment Client Advice Record. Cover: Restriction Periods, Withdrawal Rules, Tax Treatment, Fees, Estate/Death Benefits, Product-Specific Features (guarantees, boosts, loyalty bonuses), Risk Disclaimers, Regulatory Notes. Max 400 words.

${insurerNotes}`

  const result = await callClaude(prompt, 500)
  return result || `RESTRICTION PERIODS: Endowment products have a 5-year restriction period during which only one withdrawal is permitted (limited to contributions plus 5% growth). The 120% rule may trigger a new restriction period if contributions exceed 120% of prior year contributions. RETIREMENT ANNUITIES: Access only from age 55. Regulated investment limits (Regulation 28) apply. Up to one-third may be taken as cash at retirement; the balance must purchase an annuity income. RA proceeds do not form part of the estate on pre-retirement death. TAX: Endowments taxed at flat rates (30% growth, 20% dividends, 12% CGT) during the investment term — more tax-efficient for clients in higher brackets. RA contributions are tax-deductible up to 27.5% of taxable income. FEES: Initial adviser fees, ongoing adviser fees, administration fees and investment management fees apply as disclosed in quotations. RISK: Investment returns are not guaranteed. Past performance is not an indicator of future performance. The client bears investment risk on all market-linked products. ESTATE PLANNING: Nominated beneficiaries on endowments receive proceeds outside the estate (no executor fees). Living annuity balance paid to beneficiaries on death.`
}
