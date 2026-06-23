// ═══════════════════════════════════════════════════════════════════════════
// GJM ULTRA BROKERS — TEMPLATE FILLER
// Opens ACTUAL approved .docx files and fills in client data
// Verified against exact XML structure of each template
// ═══════════════════════════════════════════════════════════════════════════
import PizZip from 'pizzip'
import { saveAs } from 'file-saver'
import {
  onboardingTemplate, ongoingTemplate,
  transactionalTemplate, roaTemplate, raCalculationTemplate,
  investROATemplate, fnaTemplate
} from './templates'

const ADVISOR = 'Dieter Hartig'
const CO      = 'Tanya Van Niekerk'

function today() {
  return new Date().toLocaleDateString('en-ZA', { day:'2-digit', month:'2-digit', year:'numeric' })
}
function fmtDOB(dob) {
  if (!dob) return ''
  // Format as YYYY/MM/DD to match manual template convention
  const d = new Date(dob + 'T12:00:00')
  const yyyy = d.getFullYear()
  const mm   = String(d.getMonth()+1).padStart(2,'0')
  const dd   = String(d.getDate()).padStart(2,'0')
  return `${yyyy}/${mm}/${dd}`
}
function fmtR(val) {
  if (!val) return ''
  // Handle pre-formatted strings like "R2,500,000" or "R2 500 000 (3× salary)"
  const n = Number(String(val).replace(/[^0-9.]/g, '').split('.')[0])
  if (!n || n === 0) return ''
  return `R${n.toLocaleString('en-ZA')}`
}
function cName(data) {
  return (data.fullName || data.registeredName || '').toUpperCase()
}
function clientId(data) {
  return data.idNumber || data.registrationNo || ''
}
function clientAddr(data) {
  return data.clientType === 'legal' ? (data.registeredAddress || '') : (data.residentialAddress || '')
}
function toSentenceCase(text) {
  if (!text) return ''
  // Convert ALL CAPS to sentence case, preserve proper nouns
  const isAllCaps = text === text.toUpperCase() && /[A-Z]{4,}/.test(text)
  if (!isAllCaps) return text
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    .replace(/\.\s+([a-z])/g, (m, c) => '. ' + c.toUpperCase())
    .replace(/(RA|PPS|SARS|FAIS|FSCA|FICA|GJM|SA|RSA|VAT|NB|GP|JSH|OK)/gi,
      m => m.toUpperCase())
}

function xmlEscape(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ── Load base64 template as PizZip ────────────────────────────────────────
function loadTemplate(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new PizZip(bytes.buffer)
}

// ── Set text in a table cell by table/row/col index ───────────────────────
// Finds the Nth table, Mth row, Kth cell and replaces its text content
function setCell(xml, tableIdx, rowIdx, colIdx, text) {
  const val = xmlEscape(text || '')
  const tables = [...xml.matchAll(/<w:tbl[ >]/g)].map(m => m.index)
  if (tableIdx >= tables.length) return xml

  const tStart = tables[tableIdx]
  const tEnd   = xml.indexOf('</w:tbl>', tStart) + 8
  let tXml     = xml.slice(tStart, tEnd)

  const rows = [...tXml.matchAll(/<w:tr[ >]/g)].map(m => m.index)
  if (rowIdx >= rows.length) return xml

  const rStart = rows[rowIdx]
  const rEnd   = tXml.indexOf('</w:tr>', rStart) + 7
  let rXml     = tXml.slice(rStart, rEnd)

  const cells = [...rXml.matchAll(/<w:tc[ >]/g)].map(m => m.index)
  if (colIdx >= cells.length) return xml

  const cStart = cells[colIdx]
  const cEnd   = rXml.indexOf('</w:tc>', cStart) + 7
  const cXml   = rXml.slice(cStart, cEnd)

  // Preserve pPr and rPr formatting from first paragraph/run
  const pPr = (cXml.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/) || ['',''])[1]
  const rPr = (cXml.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/) || ['',''])[1]
  const newCell = cXml.replace(
    /(.*?<w:tc[ >][\s\S]*?<\/w:tcPr>|<w:tc[ >])([\s\S]*?)(<\/w:tc>)/,
    (_, pre, _content, post) => {
      const pPrTag = pPr ? `<w:pPr>${pPr}</w:pPr>` : ''
      const rPrTag = rPr ? `<w:rPr>${rPr}</w:rPr>` : ''
      return `${pre}<w:p>${pPrTag}<w:r>${rPrTag}<w:t xml:space="preserve">${val}</w:t></w:r></w:p>${post}`
    }
  )

  rXml  = rXml.slice(0, cStart) + newCell + rXml.slice(cEnd)
  tXml  = tXml.slice(0, rStart) + rXml    + tXml.slice(rEnd)
  return xml.slice(0, tStart) + tXml + xml.slice(tEnd)
}

// ── Replace a plain text string in the XML ────────────────────────────────
function replaceText(xml, search, replacement) {
  return xml.split(xmlEscape(search)).join(xmlEscape(replacement))
}

// ── Replace cyan-highlighted [placeholder] text ───────────────────────────
// Handles: split runs, proofErr tags between runs, trailing spaces
function replaceCyan(xml, placeholder, value) {
  const inner   = placeholder.replace(/^\[|\]$/g, '')
  const innerRe = inner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const val     = xmlEscape(value)
  const newRun  = `<w:r><w:t xml:space="preserve">${val}</w:t></w:r>`

  // Pattern 1: [ in own run → (proofErr?) → cyan run → (more cyan runs?) → ] run
  let result = xml.replace(
    new RegExp(
      '<w:r(?:[^>]*)>(?:<w:rPr>(?:(?!<w:rPr>).)*?</w:rPr>)?<w:t(?:[^>]*)>\\[</w:t></w:r>' +
      '(?:<w:proofErr[^/]*/?>)*' +
      '<w:r(?:[^>]*)><w:rPr>(?:(?!<w:rPr>).)*?<w:highlight w:val="cyan"/>(?:(?!<w:rPr>).)*?</w:rPr><w:t(?:[^>]*)>' +
      innerRe + '\\s*</w:t></w:r>' +
      '(?:(?:<w:proofErr[^/]*/?>)*<w:r(?:[^>]*)><w:rPr>(?:(?!<w:rPr>).)*?<w:highlight w:val="cyan"/>(?:(?!<w:rPr>).)*?</w:rPr><w:t(?:[^>]*)>[^<]*</w:t></w:r>)*' +
      '(?:<w:proofErr[^/]*/?>)*' +
      '<w:r(?:[^>]*)>(?:<w:rPr>(?:(?!<w:rPr>).)*?</w:rPr>)?<w:t(?:[^>]*)>\\]</w:t></w:r>',
      's'
    ), newRun
  )
  if (result !== xml) return result

  // Pattern 2: [ attached to end of text in preceding run
  result = xml.replace(
    new RegExp(
      '(<w:r(?:[^>]*)>(?:<w:rPr>(?:(?!<w:rPr>).)*?</w:rPr>)?(?:<w:tab/?>)?<w:t(?:[^>]*)>[^<]*)\\[' +
      '(</w:t></w:r>)' +
      '(?:<w:proofErr[^/]*/?>)*' +
      '<w:r(?:[^>]*)><w:rPr>(?:(?!<w:rPr>).)*?<w:highlight w:val="cyan"/>(?:(?!<w:rPr>).)*?</w:rPr><w:t(?:[^>]*)>' +
      innerRe + '\\s*</w:t></w:r>' +
      '(?:(?:<w:proofErr[^/]*/?>)*<w:r(?:[^>]*)><w:rPr>(?:(?!<w:rPr>).)*?<w:highlight w:val="cyan"/>(?:(?!<w:rPr>).)*?</w:rPr><w:t(?:[^>]*)>[^<]*</w:t></w:r>)*' +
      '(?:<w:proofErr[^/]*/?>)*' +
      '<w:r(?:[^>]*)>(?:<w:rPr>(?:(?!<w:rPr>).)*?</w:rPr>)?<w:t(?:[^>]*)>\\]</w:t></w:r>',
      's'
    ),
    (m, g1, g2) => g1 + val + g2
  )
  return result
}

function generateBlob(zip) {
  return zip.generate({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

// ══════════════════════════════════════════════════════════════════════════
// ONBOARDING QUESTIONNAIRE
// Table 0: Client details (R0-R9, col 1)
// Table 1: Nature of business (R0, R0 only — col 1; rows 1-6 pre-filled)
// Table 3: Risk score (R0C1 = score, R1/R2/R3 = band labels — pre-filled)
// P4: New Business ☐ / Existing ☐ checkboxes
// P15,P20,P25,P29: TFS/PEP/PIP Yes ☐ / No ☒ — already marked No in template
// P37/P38: Accept ☒ / Decline ☐ — already marked Accept in template
// P44: Further details (N/A line)
// P46/P52: Full name (pre-filled Dieter/Tanya)
// P48/P54: Date blanks
// P112: Reason paragraph (pre-filled with default text)
// ══════════════════════════════════════════════════════════════════════════
export async function fillOnboardingTemplate(data) {
  const zip = loadTemplate(onboardingTemplate)
  let xml = zip.file('word/document.xml').asText()

  // ── Table 0: Client details ─────────────────────────────────────────
  const details = [
    cName(data),
    fmtDOB(data.dob),
    clientId(data),
    data.citizenship || 'RSA',
    data.passportNo  || 'N/A',
    clientAddr(data),
    data.postalAddress || clientAddr(data),
    data.telephone || '',
    data.mobile    || '',
    data.email     || '',
  ]
  details.forEach((v, i) => { xml = setCell(xml, 0, i, 1, v) })

  // ── Table 1: Occupation (only empty cell — rest have defaults) ───────
  xml = setCell(xml, 1, 0, 1, data.occupation || '')

  // ── Table 3: Risk score ──────────────────────────────────────────────
  const score = ((data.riskFactors || []).reduce((s,v) => s + Number(v), 0)) || 8
  xml = setCell(xml, 3, 0, 1, String(score))

  // ── P4: New Business / Existing Client checkboxes ────────────────────
  // Template: "New Business Relationship ☐  ...  Existing Client ☐"
  // Mark first ☐ as ☑ for new, second for existing
  const isNew = data.isNew !== false
  let checkCount = 0
  xml = xml.replace(/<w:t[^>]*>☐<\/w:t>/g, m => {
    checkCount++
    if (isNew  && checkCount === 1) return m.replace('☐','☑')
    if (!isNew && checkCount === 2) return m.replace('☐','☑')
    return m
  })

  // ── P44: Further details (replace ___N/A___ line) ────────────────────
  xml = xml.replace(
    /(<w:t[^>]*>)___N\/A_+(<\/w:t>)/,
    `$1${xmlEscape(data.furtherDetails || 'N/A')}$2`
  )

  // ── P48: Advisor date ─────────────────────────────────────────────────
  xml = xml.replace(
    /(<w:t[^>]*>Date:\t\t)_+(<\/w:t>)/,
    `$1${today()}$2`
  )

  // ── P112: Reason paragraph — replace default with custom if provided ──
  // ── Accept/Decline SDT checkboxes ────────────────────────────────────
  // Template uses Word content controls with IDs 439962123 (Accept) and 21760691 (Decline)
  // Default: Accept val=1 (checked), Decline val=0 (unchecked)
  if (data.decision === 'decline') {
    xml = xml
      .replace('w:val="439962123"/><w14:checkbox><w14:checked w14:val="1"',
               'w:val="439962123"/><w14:checkbox><w14:checked w14:val="0"')
      .replace('w:val="21760691"/><w14:checkbox><w14:checked w14:val="0"',
               'w:val="21760691"/><w14:checkbox><w14:checked w14:val="1"')
  }
  // (Accept is already checked by default in the template)

  // Sign-off: use AI-generated text if present, else keep template default
  const onbSignoff = data.onboardingSignoff || data.onboardingReason || ''
  if (onbSignoff) {
    xml = xml.replace(
      /(<w:t[^>]*>)The client is a high earner[^<]*/,
      `$1${xmlEscape(onbSignoff)}`
    )
  }

  zip.file('word/document.xml', xml)
  return generateBlob(zip)
}

// ══════════════════════════════════════════════════════════════════════════
// ONGOING DUE DILIGENCE
// Table 0: Client details (R0-R5, col 1)
// Table 1: Months checkboxes (R1: 12/24/36/>36) — add ☑ to selected
// Table 2: Yes/No questions (R1-R8, cols 1-2) — fill ☑
// P17: Risk profile checkboxes (Low ☒ / Medium ☐ / High ☐)
// P19: Last DD date
// P26: Sign-off text (pre-filled with default — update if needed)
// ══════════════════════════════════════════════════════════════════════════
export async function fillOngoingTemplate(data) {
  const zip = loadTemplate(ongoingTemplate)
  let xml = zip.file('word/document.xml').asText()

  // ── Table 0: Client details ─────────────────────────────────────────
  xml = setCell(xml, 0, 0, 1, cName(data))
  xml = setCell(xml, 0, 1, 1, clientId(data))
  xml = setCell(xml, 0, 2, 1, clientAddr(data))
  xml = setCell(xml, 0, 3, 1, data.telephone || '')
  xml = setCell(xml, 0, 4, 1, data.mobile    || '')
  xml = setCell(xml, 0, 5, 1, data.email     || '')

  // ── Table 1: Months — mark selected with ☑ ──────────────────────────
  // Template has plain text "12","24","36",">36"
  // Prepend ☑ to the correct one
  const monthsMap = { '12':0, '24':1, '36':2, '>36':3 }
  const selectedMonth = data.monthsCheckbox || '12'
  const selectedCol = monthsMap[selectedMonth] ?? 0
  ;['12','24','36','>36'].forEach((m, i) => {
    xml = setCell(xml, 1, 1, i, i === selectedCol ? `☑ ${m}` : m)
  })

  // ── Table 2: Yes/No questions ─────────────────────────────────────────
  // Default answers for a clean low-risk client
  const yesNo = [
    data.ddTimeframeConsistent   !== 'no'  ? 'YES' : 'NO',
    data.infoVerified            !== 'no'  ? 'YES' : 'NO',
    data.infoChanged             === 'yes' ? 'YES' : 'NO',
    data.moreThanOneTransaction  === 'yes' ? 'YES' : 'NO',
    data.transactionsConsistent  !== 'no'  ? 'YES' : 'NO',
    data.complexTransaction      === 'yes' ? 'YES' : 'NO',
    data.fundsIdentifiable       !== 'no'  ? 'YES' : 'NO',
    data.suspicionGrounds        === 'yes' ? 'YES' : 'NO',
  ]
  yesNo.forEach((ans, i) => {
    xml = setCell(xml, 2, i+1, 1, ans === 'YES' ? '☑' : '')
    xml = setCell(xml, 2, i+1, 2, ans === 'NO'  ? '☑' : '')
  })

  // ── P17: Risk profile checkboxes — template has ☒ Low ☐ Med ☐ High ──
  // Already defaulted to Low ☒ in template — only change if different
  const risk = data.ongoingRisk || 'low'
  if (risk !== 'low') {
    xml = xml.replace(/☒(\s*Low)/, '☐$1')
    if (risk === 'medium') xml = xml.replace(/(☐\s*Medium)/, '☑ Medium')
    if (risk === 'high')   xml = xml.replace(/(☐\s*High)/,   '☑ High')
  }

  // ── P19: Last DD date ─────────────────────────────────────────────────
  if (data.lastDDDate) {
    xml = xml.replace(
      /When was the last Ongoing Due Diligence Questionnaire completed\?<\/w:t>/,
      `When was the last Ongoing Due Diligence Questionnaire completed? ${xmlEscape(data.lastDDDate)}</w:t>`
    )
  }

  // ── P26: Sign-off — update default text if custom text provided ───────
  // Template already has "The transaction is consistent with GJM Ultra Brokers..."
  // Sign-off: update default text if form has custom/AI-generated content
  const ongSignoff = data.ongoingSignoff || data.ongoingSignoffNote || ''
  if (ongSignoff.trim()) {
    xml = xml.replace(
      /The transaction is consistent with GJM Ultra Brokers knowledge[^<]*/,
      xmlEscape(ongSignoff)
    )
  }

  // ── Date ──────────────────────────────────────────────────────────────
  xml = xml.replace(/Date\.:\s*_+/g, `Date.:\t       ${today()}`)

  zip.file('word/document.xml', xml)
  return generateBlob(zip)
}

// ══════════════════════════════════════════════════════════════════════════
// TRANSACTIONAL DUE DILIGENCE
// Table 0: Client details (R0-R5, col 1)
// P8,P14,P17,P20,P23,P25,P30: Yes/No answers
// P33: Transaction date
// P34: New/Existing client
// P35: Amount
// P36: Parties
// P40 (bookmark _Hlk8823689): Sign-off text
// ══════════════════════════════════════════════════════════════════════════
export async function fillTransactionalTemplate(data) {
  const zip = loadTemplate(transactionalTemplate)
  let xml = zip.file('word/document.xml').asText()

  // ── Table 0: Client details ─────────────────────────────────────────
  xml = setCell(xml, 0, 0, 1, cName(data))
  xml = setCell(xml, 0, 1, 1, clientId(data))
  xml = setCell(xml, 0, 2, 1, clientAddr(data))
  xml = setCell(xml, 0, 3, 1, data.telephone || '')
  xml = setCell(xml, 0, 4, 1, data.mobile    || '')
  xml = setCell(xml, 0, 5, 1, data.email     || '')

  // ── Transaction details ───────────────────────────────────────────────
  const txDate    = data.transactionDate   || today()
  const txAmount  = data.transactionAmount || data.currentPremium || ''
  const isNew     = data.isNew !== false

  xml = xml.replace(
    'Date on which current transaction was concluded:</w:t>',
    `Date on which current transaction was concluded: ${xmlEscape(txDate)}</w:t>`
  )
  xml = xml.replace('NEW CLIENT',      isNew ? '☑ NEW CLIENT'      : '☐ NEW CLIENT')
  xml = xml.replace('EXISTING CLIENT', isNew ? '☐ EXISTING CLIENT' : '☑ EXISTING CLIENT')
  xml = xml.replace(
    'Amount and currency of this transaction: R</w:t>',
    `Amount and currency of this transaction: R${xmlEscape(String(txAmount))}</w:t>`
  )
  xml = xml.replace(
    'Parties to this transaction (advisor, client, provider, etc): </w:t>',
    `Parties to this transaction (advisor, client, provider, etc): ${xmlEscape(ADVISOR)}, ${xmlEscape(cName(data))}</w:t>`
  )

  // ── Months since onboarding ───────────────────────────────────────────
  if (data.monthsSinceOnboarding) {
    xml = xml.replace(
      /Onboarding Questionnaire was completed\?<\/w:t>/,
      `Onboarding Questionnaire was completed?\t${xmlEscape(String(data.monthsSinceOnboarding))}</w:t>`
    )
  }

  // ── Last transaction date ─────────────────────────────────────────────
  if (data.lastTransactionDate) {
    xml = xml.replace(
      /When was the last business transaction concluded\?<\/w:t>/,
      `When was the last business transaction concluded?\t${xmlEscape(data.lastTransactionDate)}</w:t>`
    )
  }

  // ── P40: Sign-off paragraph (empty paragraph with bookmark _Hlk8823689)
  // Sign-off: use AI-generated text (transactionalSignoff from SignoffBlock)
  // or needsObjectives as context, or default compliance text
  const signoff = xmlEscape(
    data.transactionalSignoff ||
    data.transactionalSignoffNote ||
    'The transaction is consistent with GJM Ultra Brokers knowledge of the client. Ongoing customer due diligence has been conducted, and client remains low risk.'
  )
  xml = xml.replace(
    '<w:bookmarkStart w:id="0" w:name="_Hlk8823689"/></w:p>',
    `<w:bookmarkStart w:id="0" w:name="_Hlk8823689"/><w:r><w:t xml:space="preserve">${signoff}</w:t></w:r></w:p>`
  )

  // ── Date ──────────────────────────────────────────────────────────────
  xml = xml.replace(/Date\.:\s*_+/g, `Date.:\t       ${today()}`)

  zip.file('word/document.xml', xml)
  return generateBlob(zip)
}

// ══════════════════════════════════════════════════════════════════════════
// RISK ROA
// Table 0 (5R x 4C): Header — name, ID, contact, email, advisor, date
// Table 1 (5R x 2C): Section A — objectives, situation, client info, product knowledge, other
// Table 2 (11R x 5C): Section B — needs YES/NO, priority, review date (R1-R10)
// Table 3 (4R x 5C): Section C — products (R1-R3, C0-C2 + Y/N in C3/C4)
// Table 4 (26R x 2C): Section D — Death(R1-R6), Disability(R7-R18), Trauma(R19-R25)
// Table 5 (8R x 9C): Financial Planning Needs Summary (R1-R7)
//   Cols: 0=need, 1=quantified, 2=priority, 3=Y, 4=N, 5=P, 6=L, 7=shortfall, 8=reviewDate
// Table 6 (2R x 2C): Section E — products selected, rationale
// Table 7 (1R x 1C): Section F — important information (pre-filled, update if custom)
// Table 8 (2R x 2C): Section G — upfront/ongoing fees
// Table 9 (14R x 5C): Section H — declarations
//   R0=item1(declined prods), R1=item2(reasons), R2=item3(risks)
//   R3=item4(consequences Yes/No in C3/C4), R4=item4b(understands Yes/No)
//   R5=item4c(reasons if no), R6=item5(focused need)
// Table 10 (12R): Section I — pre-filled legal declarations
// Table 12 (3R x 4C): Signatures
// ══════════════════════════════════════════════════════════════════════════
export async function fillROATemplate(data) {
  const zip  = loadTemplate(roaTemplate)
  let xml    = zip.file('word/document.xml').asText()

  const products = data.products       || []
  const recs     = data.recommendations || {}
  const sH       = data.sectionH       || {}
  const needs    = data.needsTable     || {}
  const planN    = data.planNeeds      || {}
  const allInsurers = [...new Set(products.map(p => p.customInsurer || p.insurer).filter(Boolean))].join(', ')

  // ── Table 0: Header ──────────────────────────────────────────────────
  xml = setCell(xml, 0, 0, 1, cName(data))
  xml = setCell(xml, 0, 1, 1, clientId(data))
  xml = setCell(xml, 0, 2, 1, data.mobile || '')
  xml = setCell(xml, 0, 3, 1, data.email  || '')
  xml = setCell(xml, 0, 4, 1, ADVISOR)
  xml = setCell(xml, 0, 4, 3, today())

  // ── Table 1: Section A ───────────────────────────────────────────────
  xml = setCell(xml, 1, 0, 1, toSentenceCase(data.needsObjectives  || ''))
  xml = setCell(xml, 1, 1, 1, toSentenceCase(data.financialSituation || ''))
  xml = setCell(xml, 1, 2, 1,
    `Age: ${data.age||''}, Occupation: ${data.occupation||''}, Dependents: ${data.dependents||'0'}, ` +
    `${data.smokerStatus||'Non-Smoker'}, Premium: ${fmtR(data.premiumConsideration)||'—'}, ` +
    `Debt: ${fmtR(data.currentDebt)||'R0'}, ${data.affordability||'Full affordability confirmed by client'}`
  )
  xml = setCell(xml, 1, 3, 1,
    toSentenceCase(data.productKnowledge ||
    'The client has limited prior experience with long-term risk insurance products. The client has been fully informed of and understands the effects, consequences, benefit definitions, exclusions, waiting periods and premium obligations of all selected products.')
  )
  // Other Information: combine checkbox items + free text note
  const otherItems = (data.otherInfoItems || []).join('. ')
  const otherNote  = data.otherInfo || ''
  const otherText  = [otherItems, otherNote].filter(Boolean).join('. ')
  xml = setCell(xml, 1, 4, 1, otherText)

  // ── Table 2: Section B — needs table (rows 1-10) ─────────────────────
  // Template guideline cell (C2) has the question with R___ blanks
  // We fill it with the full question + the actual amount from entered data
  const needsOrder = ['emergency','death','disability','trauma','retirement','savings','assets','health','will','other']
  const sectionBGuidelines = {
    emergency:  (amount) => `At least 3 times monthly salary. What is currently available? ${amount || 'R_____________'}`,
    death:      (amount) => `What is the monthly income required by family/dependants to maintain standard of living? ${amount || 'R________________'}`,
    disability: (amount) => `What is gross income required in case of permanent or temporary disability? ${amount || 'R________________'}`,
    trauma:     (amount) => `What amount is required for lifestyle adjustments in event of cancer, stroke, and heart attack? ${amount || 'R________________'}`,
    retirement: (amount) => `What reasonable income is required to maintain standard of living on retirement? ${amount || 'R________________'}`,
    savings:    (amount) => `What amount is required for children's studies or other objective? ${amount || 'R_______________'}`,
    assets:     (amount) => `Is there sufficient short term cover for assets in the event of theft, damage or liability? ${amount || '_______'}`,
    health:     (amount) => `Is there sufficient cover for medical expenses? ${amount || '_______'}`,
    will:       (amount) => `Is there an updated will? ${amount || '_________'}`,
    other:      (amount) => amount || '',
  }
  needsOrder.forEach((key, i) => {
    const nd      = needs[key] || {}
    const amount  = nd.amount || ''
    const guidelineFn = sectionBGuidelines[key]
    xml = setCell(xml, 2, i+1, 1, nd.address  || 'NO')
    xml = setCell(xml, 2, i+1, 2, guidelineFn(amount))
    xml = setCell(xml, 2, i+1, 3, nd.priority || 'N/A')
    xml = setCell(xml, 2, i+1, 4, nd.reviewDate || '')
  })

  // ── Table 3: Section C — products (rows 1-3) ─────────────────────────
  products.slice(0, 3).forEach((p, i) => {
    xml = setCell(xml, 3, i+1, 0, p.customInsurer || p.insurer || '')
    xml = setCell(xml, 3, i+1, 1, p.product || '')
    xml = setCell(xml, 3, i+1, 2, p.premium ? `R${Number(p.premium).toLocaleString('en-ZA')}` : '')
    // Quote on file: Y in col 3, N in col 4
    xml = setCell(xml, 3, i+1, 3, p.quoteOnFile !== 'N' ? '☑' : '')
    xml = setCell(xml, 3, i+1, 4, p.quoteOnFile === 'N' ? '☑' : '')
  })

  // ── Table 4: Section D ───────────────────────────────────────────────
  // DEATH: R1=life required, R2=life considered, R3=products considered,
  //        R4=product selected, R6=rationale
  xml = setCell(xml, 4, 1,  1, fmtR(recs.death?.life_cover_required)  || 'R')
  xml = setCell(xml, 4, 2,  1, fmtR(recs.death?.life_cover_considered) || 'R')
  // Auto-populate products considered from products list if not entered
  const deathProducts = products.filter(p => p.insurer && p.product).map(p => `${p.customInsurer||p.insurer} — ${p.product}`).join(', ') || allInsurers
  const deathSelected = recs.death?.selected || products.filter(p=>p.insurer&&p.product).map(p=>`${p.customInsurer||p.insurer} — ${p.product}`).join(', ')

  xml = setCell(xml, 4, 3,  1, recs.death?.considered || deathProducts)
  xml = setCell(xml, 4, 4,  1, deathSelected)
  xml = setCell(xml, 4, 6,  1, recs.death?.rationale  || '')
  // DISABILITY: R8=income req, R9=income cons, R10=products considered,
  //             R13=capital req, R14=capital cons, R15=products considered,
  //             R16=product selected, R18=rationale
  xml = setCell(xml, 4, 8,  1, fmtR(recs.disability?.income_required)   || 'R')
  xml = setCell(xml, 4, 9,  1, fmtR(recs.disability?.income_considered) || 'R')
  const disSelected = recs.disability?.selected || products.filter(p=>p.insurer&&p.product).map(p=>`${p.customInsurer||p.insurer} — ${p.product}`).join(', ')

  xml = setCell(xml, 4, 10, 1, recs.disability?.considered || deathProducts)
  xml = setCell(xml, 4, 13, 1, fmtR(recs.disability?.capital_required)   || 'R')
  xml = setCell(xml, 4, 14, 1, fmtR(recs.disability?.capital_considered) || 'R')
  xml = setCell(xml, 4, 15, 1, recs.disability?.considered || deathProducts)
  xml = setCell(xml, 4, 16, 1, disSelected)
  xml = setCell(xml, 4, 18, 1, recs.disability?.rationale  || '')
  // TRAUMA: R20=req, R21=cons, R22=products, R23=selected, R25=rationale
  xml = setCell(xml, 4, 20, 1, fmtR(recs.trauma?.cover_required)   || 'R')
  xml = setCell(xml, 4, 21, 1, fmtR(recs.trauma?.cover_considered) || 'R')
  const traSelected = recs.trauma?.selected || products.filter(p=>p.insurer&&p.product).map(p=>`${p.customInsurer||p.insurer} — ${p.product}`).join(', ')
  xml = setCell(xml, 4, 22, 1, recs.trauma?.considered || deathProducts)
  xml = setCell(xml, 4, 23, 1, traSelected)
  xml = setCell(xml, 4, 25, 1, recs.trauma?.rationale  || '')

  // ── Table 5: Financial Planning Needs Summary ─────────────────────────
  const planKeys = [
    'Life',
    'Permanent Disability (Income Protection)',
    'Permanent Disability (lump sum)',
    'Temporary Disability',
    'Trauma / Illness',
    'Funeral Cover / Immediate Expenses',
    'Other\n[Physical and/or Functional Impairment, sickness cover, retrenchment benefit etc.]',
  ]
  planKeys.forEach((key, i) => {
    const pn = planN[key] || planN[key.split('\n')[0]] || {}
    // Auto-derive quantified from Section D if not set
    let qty = pn.quantified
    if (!qty || Number(qty) === 0) {
      if (key === 'Life')                                           qty = recs.death?.life_cover_required
      else if (key.includes('Income Protection'))                   qty = recs.disability?.income_required
      else if (key.includes('lump sum'))                            qty = recs.disability?.capital_required
      else if (key === 'Temporary Disability')                      qty = recs.disability?.income_required
      else if (key.includes('Trauma'))                              qty = recs.trauma?.cover_required || recs.trauma?.cover_considered
    }
    const status = pn.status || 'Y'
    const oneYear = (() => { const d = new Date(); d.setFullYear(d.getFullYear()+1); return d.toISOString().slice(0,10) })()
    // Strip formatting if qty is already a formatted string like "R2,500,000 (3× salary)"
    const qtyNum = qty ? Number(String(qty).replace(/[^0-9.]/g,'').split('.')[0]) : 0
    xml = setCell(xml, 5, i+1, 1, qtyNum > 0 ? `R${qtyNum.toLocaleString('en-ZA')}` : 'R')
    xml = setCell(xml, 5, i+1, 2, pn.priority || '1')
    xml = setCell(xml, 5, i+1, 3, status === 'Y' ? '☑' : '')
    xml = setCell(xml, 5, i+1, 4, status === 'N' ? '☑' : '')
    xml = setCell(xml, 5, i+1, 5, status === 'P' ? '☑' : '')
    xml = setCell(xml, 5, i+1, 6, status === 'L' ? '☑' : '')
    xml = setCell(xml, 5, i+1, 7, pn.shortfall ? `R${Number(pn.shortfall).toLocaleString('en-ZA')}` : '')
    xml = setCell(xml, 5, i+1, 8, pn.reviewDate || oneYear)
  })

  // ── Table 6: Section E ───────────────────────────────────────────────
  const selectedProds = (() => {
    if (data.selectedProductsText) return data.selectedProductsText
    const chosen = Object.values(recs).map(r => r.selected).filter(Boolean)
    const unique = [...new Set(chosen)]
    return unique.length > 0 ? unique.join(', ') : products.map(p => `${p.customInsurer||p.insurer} ${p.product}`).join(', ')
  })()
  // Section E — R0 is the header row, R1 is the data row
  xml = setCell(xml, 6, 1, 0, selectedProds)
  xml = setCell(xml, 6, 1, 1, data.sectionE || '')

  // ── Table 7: Section F — replace only if custom content ──────────────
  if (data.sectionF && data.sectionF.length > 50) {
    xml = setCell(xml, 7, 0, 0, data.sectionF)
  }

  // ── Table 8: Section G — fees ─────────────────────────────────────────
  const feesList   = data.feesList || []
  const totUpfront = feesList.reduce((s,f) => s+(Number(f.upfront)||0), 0) + (Number(data.upfrontFee)||0)
  const totOngoing = feesList.reduce((s,f) => s+(Number(f.ongoing)||0), 0) + (Number(data.ongoingFee)||0)
  xml = setCell(xml, 8, 1, 0, totUpfront ? `R${totUpfront.toLocaleString('en-ZA')}` : '')
  xml = setCell(xml, 8, 1, 1, totOngoing ? `R${totOngoing.toLocaleString('en-ZA')} p.a.` : '')

  // ── Table 9: Section H ───────────────────────────────────────────────
  // Auto-populate declined products from non-selected insurers
  const selectedInsurerNames = new Set(
    Object.values(recs).map(r => r.selected?.split(' — ')[0]).filter(Boolean)
  )
  const declinedProds = sH.declinedProducts !== undefined
    ? sH.declinedProducts
    : products.filter(p => !selectedInsurerNames.has(p.customInsurer||p.insurer))
               .map(p => p.customInsurer||p.insurer).filter((v,i,a) => a.indexOf(v)===i).join(' & ')

  xml = setCell(xml, 9, 0,  2, declinedProds)
  xml = setCell(xml, 9, 1,  2, sH.declinedReasons || '')
  xml = setCell(xml, 9, 2,  2, sH.risks || 'NO')
  // R3: C2=Yes, C3=No (consequences explained)
  xml = setCell(xml, 9, 3,  2, sH.consequencesExplained !== 'No' ? '☑' : '')
  xml = setCell(xml, 9, 3,  3, sH.consequencesExplained === 'No' ? '☑' : '')
  // R4: C2=Yes, C3=No (understands — always Yes)
  xml = setCell(xml, 9, 4,  2, '☑')
  xml = setCell(xml, 9, 4,  3, '')
  xml = setCell(xml, 9, 6,  2, sH.focusedNeed || 'N/A')

  // ── Table 12: Signatures ─────────────────────────────────────────────
  xml = setCell(xml, 12, 1, 1, cName(data))
  xml = setCell(xml, 12, 1, 3, ADVISOR.toUpperCase())
  xml = setCell(xml, 12, 2, 1, today())
  xml = setCell(xml, 12, 2, 3, today())

  zip.file('word/document.xml', xml)
  return generateBlob(zip)
}

// ══════════════════════════════════════════════════════════════════════════
// RA CALCULATION
// The template uses cyan-highlighted runs for ALL placeholders, often split
// across multiple runs. The reliable fix: merge all runs in each paragraph,
// do text replacement, then write back to the first run.
// ══════════════════════════════════════════════════════════════════════════
export async function fillRATemplate(data, calc) {
  const zip = loadTemplate(raCalculationTemplate)
  let xml = zip.file('word/document.xml').asText()

  const reqInc  = Number(data.reqIncome || 0)
  const fund    = Number(data.currentFundValue || 0)
  const intPct  = Math.round((calc.interestRate || 0.06) * 100)
  const ret     = calc.retirementAge || 65
  const inc65   = Math.round(calc.incomeAtRetirement   || 0)
  const tfr     = Math.round(calc.totalFundRequired    || 0)
  const fiv     = Math.round(calc.futureInvestmentValue || 0)
  const sf      = Math.round(calc.shortfall            || 0)

  // ── Step 1: Merge all runs within each <w:p> and replace placeholder text ──
  // This handles split cyan runs like 'req' + ' income' in separate runs
  xml = xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, para => {
    // Extract all run texts in order
    const runs = [...para.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    const fullText = runs.map(r => r[1]).join('')

    // Check if this paragraph has any placeholder
    const hasPlaceholder = fullText.includes('[') ||
      fullText.includes('12/8') || fullText.includes('@ 8%') ||
      fullText.includes('growth of 8%') || fullText.includes('Interest Rate of 8%')

    if (!hasPlaceholder) return para

    // Apply all replacements to the merged text
    let replaced = fullText
      .replace(/\[client name\]/g,             xmlEscape(cName(data)))
      .replace(/\[insert date\]/g,             today())
      .replace(/\[req income\]/g,              reqInc.toLocaleString('en-ZA'))
      .replace(/\[65 value\]/g,               inc65.toLocaleString('en-ZA'))
      .replace(/\[fund value req\]/g,          tfr.toLocaleString('en-ZA'))
      .replace(/\[fund value\]/g,              fund.toLocaleString('en-ZA'))
      .replace(/\[future investment value\]/g, fiv.toLocaleString('en-ZA'))
      .replace(/\[shortfall\]/g,               sf.toLocaleString('en-ZA'))
      .replace(/\[broker\]/g,                 xmlEscape(ADVISOR))
      .replace(/12\/8/g,                      `12/${intPct}`)
      .replace(/@ 8%/g,                       `@ ${intPct}%`)
      .replace(/growth of 8%/g,               `growth of ${intPct}%`)
      .replace(/Interest Rate of 8%/g,        `Interest Rate of ${intPct}%`)
      .replace(/Interest Rate of 6%/g,        `Interest Rate of ${intPct}%`)

    if (replaced === fullText) return para

    // Preserve paragraph properties but replace all run content with single run
    const pPrMatch = para.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)
    const pPr = pPrMatch ? pPrMatch[0] : ''
    // Preserve rPr from first run (bold/italic etc)
    const rPrMatch = para.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)
    const rPr = rPrMatch ? rPrMatch[0] : ''

    // Rebuild paragraph with merged content
    const pOpen = para.match(/^<w:p[^>]*>/)?.[0] || '<w:p>'
    return `${pOpen}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(replaced)}</w:t></w:r></w:p>`
  })

  // ── Step 2: Write XML back, then fill tables via second pass ──────────
  zip.file('word/document.xml', xml)
  const blob1 = generateBlob(zip)
  const ab    = await blob1.arrayBuffer()
  const zip2  = new PizZip(ab)
  let xml2    = zip2.file('word/document.xml').asText()

  // ── Table 0: Inflation table (16 rows) ────────────────────────────────
  const inflTable = calc.inflationTable || []
  const total = inflTable.length
  const indices = total <= 16
    ? inflTable.map((_,i) => i)
    : [...new Set([0, ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(i =>
        Math.round(i*(total-1)/14)), total-1])].sort((a,b)=>a-b).slice(0,16)

  indices.forEach((dataIdx, slot) => {
    const row = inflTable[dataIdx]
    const isBold = row.age === ret
    xml2 = setCell(xml2, 0, slot, 0, String(row.age))
    xml2 = setCell(xml2, 0, slot, 1, `R ${Math.round(row.income).toLocaleString('en-ZA')}`)
  })

  // ── Table 1: Proposal blocks ──────────────────────────────────────────
  const blocks = [
    { base:2,  prem: Number(data.currentPremium||0), esc:10, fv: calc.currentFV||0 },
    { base:17, prem: calc.p2Premium||0,               esc:0,  fv: calc.p2FV||0 },
    { base:31, prem: calc.p3Premium||0,               esc:5,  fv: calc.p3FV||0 },
  ]
  blocks.forEach(({ base, prem, esc, fv }) => {
    xml2 = setCell(xml2, 1, base,    1, String(calc.yrs || ''))
    xml2 = setCell(xml2, 1, base+2,  1, `R ${Math.round(prem).toLocaleString('en-ZA')}`)
    xml2 = setCell(xml2, 1, base+4,  1, `${esc}%`)
    xml2 = setCell(xml2, 1, base+6,  1, `${intPct}%`)
    xml2 = setCell(xml2, 1, base+10, 1, `R ${Math.round(fv).toLocaleString('en-ZA')}`)
  })

  zip2.file('word/document.xml', xml2)
  return generateBlob(zip2)
}

function getEvenlySpacedIndices(total, count) {
  const indices = new Set([0])
  for (let i = 1; i < count - 1; i++) {
    indices.add(Math.round(i * (total - 1) / (count - 1)))
  }
  indices.add(total - 1)
  return [...indices].sort((a,b)=>a-b).slice(0, count)
}


// ══════════════════════════════════════════════════════════════════════════
// DOWNLOAD HELPERS
// ══════════════════════════════════════════════════════════════════════════
function safeName(data) {
  return (data.fullName || data.registeredName || 'Client').replace(/\s+/g,'_').toUpperCase()
}

export async function downloadFilledOnboarding(data) {
  saveAs(await fillOnboardingTemplate(data), `${safeName(data)}_Onboarding_Questionnaire.docx`)
}
export async function downloadFilledOngoing(data) {
  saveAs(await fillOngoingTemplate(data), `${safeName(data)}_Ongoing_DD.docx`)
}
export async function downloadFilledTransactional(data) {
  saveAs(await fillTransactionalTemplate(data), `${safeName(data)}_Transactional_DD.docx`)
}
export async function downloadFilledROA(data) {
  saveAs(await fillROATemplate(data), `${safeName(data)}_Risk_ROA_${new Date().toISOString().slice(0,10)}.docx`)
}
// ══════════════════════════════════════════════════════════════════════════
// INVEST ROA (Investment Client Advice Record)
// Table 0 (2Rx4C):  Header — R0C1=client name, R0C3=ID, R1C1=advisor, R1C3=date
// Table 1 (11Rx11C): Section A — R0=needs/obj, R1=fin situation, R3=risk profile tick,
//   R4=product knowledge, R6=investment horizon tick, R8=access to capital tick,
//   R9=other info, R10=amount to invest
// Table 2 (11Rx5C): Section B — needs table (rows 1-10, same as Risk ROA)
// Table 3 (4Rx7C):  Section C — products (rows 1-3)
// Table 4 (3Rx2C):  Like-for-like comparison (R1C0=new, R1C1=old)
// Table 5 (14Rx2C): Section D — Retirement(R1-R7) & Savings(R9-R13)
// Table 6 (20Rx9C): Invest needs summary (rows 2-3 pre-retire, 5-9 post-retire, 11-19 other)
// Table 7 (2Rx2C):  Section E — R1C0=products, R1C1=rationale
// Table 9 (2Rx2C):  Section G fees — R1C0=upfront, R1C1=ongoing
// Table 10 (11Rx12C): Section H — R1-R9 declarations
// Table 13 (3Rx4C): Signatures — R1C1=client name, R1C3=advisor, R2C1/R2C3=dates
// ══════════════════════════════════════════════════════════════════════════
export async function fillInvestROATemplate(data) {
  const zip = loadTemplate(investROATemplate)
  let xml = zip.file('word/document.xml').asText()

  const products = data.products       || []
  const recs     = data.recommendations || {}
  const sH       = data.sectionH       || {}
  const needs    = data.needsTable     || {}
  const planN    = data.planNeeds      || {}
  const investD  = data.investSectionD || {}
  const allInsurers = [...new Set(products.map(p => p.customInsurer || p.insurer).filter(Boolean))].join(', ')

  // ── Table 0: Header ──────────────────────────────────────────────────
  xml = setCell(xml, 0, 0, 1, cName(data))
  xml = setCell(xml, 0, 0, 3, clientId(data))
  xml = setCell(xml, 0, 1, 1, ADVISOR)
  xml = setCell(xml, 0, 1, 3, today())

  // ── Table 1: Section A ────────────────────────────────────────────────
  // Row 0: Needs & objectives (full width — col 0 IS the label+content cell)
  // The label is in C0; text entry is appended after the label
  // Use col 0 and replace the label+answer
  xml = setCell(xml, 1, 0, 0,
    `Client\'s Needs and Objectives:\n${data.needsObjectives || ''}`)
  xml = setCell(xml, 1, 1, 0,
    `Financial Situation:\n${data.financialSituation || ''}`)

  // Row 3: Risk profile tick (cols 1-10 map to Conservative→Aggressive)
  // Risk profile options: Conservative(1), Mod-Conservative(2-4), Moderate(5-6),
  //   Mod-Aggressive(7-9), Aggressive(10)
  const riskMap = {
    'conservative': 1, 'moderate conservative': 2,
    'moderate': 5, 'moderate aggressive': 7, 'aggressive': 10
  }
  const riskProfile = (data.riskProfile || 'moderate').toLowerCase()
  const riskCol = riskMap[riskProfile] || 5
  for (let c = 1; c <= 10; c++) {
    xml = setCell(xml, 1, 3, c, c === riskCol ? '☑' : '')
  }

  // Row 4: Product knowledge
  xml = setCell(xml, 1, 4, 0,
    `Product Knowledge and Experience:\n${data.productKnowledge ||
    'CLIENT HAS LOW LEVEL OF PRODUCT KNOWLEDGE AND EXPERIENCE BUT UNDERSTANDS THE EFFECTS AND CONSEQUENCES OF THE CHOSEN PRODUCT FULLY.'}`)

  // Row 6: Investment horizon tick (cols 1-10 map to 0-2yrs, 0-2, 2-5, 2-5, 2-5, 5-9, 5-9, 5-9, 10+, 10+)
  const horizonMap = { '0-2': 1, '2-5': 3, '5-9': 6, '10+': 9 }
  const horizon = data.investmentHorizon || '5-9'
  const horizonCol = horizonMap[horizon] || 6
  for (let c = 1; c <= 10; c++) {
    xml = setCell(xml, 1, 6, c, c === horizonCol ? '☑' : '')
  }

  // Row 8: Access to capital tick
  // Cols 1-3: Need to draw income, 4-7: Always require access, 8-10: Don't require 5yrs
  const accessMap = { 'income': 1, 'always': 4, 'none': 8 }
  const access = data.capitalAccess || 'always'
  const accessCol = accessMap[access] || 4
  for (let c = 1; c <= 10; c++) {
    xml = setCell(xml, 1, 8, c, c === accessCol ? '☑' : '')
  }

  // Row 9: Other information
  xml = setCell(xml, 1, 9, 0,
    `Other Information:\n${data.otherInfo || ''}`)

  // Row 10: Amount available to invest
  xml = setCell(xml, 1, 10, 0,
    `Amount Available to be Invested:\n${data.investmentAmount
      ? `R${Number(data.investmentAmount).toLocaleString('en-ZA')}${data.investmentFrequency ? ' ' + data.investmentFrequency : ''}`
      : ''}`)

  // ── Table 2: Section B — needs table (same as Risk ROA) ──────────────
  const needsOrder = ['emergency','death','disability','trauma','retirement','savings','assets','health','will','other']
  const sectionBGuidelines = {
    emergency:  (a) => `At least 3 times monthly salary. What is currently available? ${a || 'R_____________'}`,
    death:      (a) => `What is the monthly income required by family/dependants? ${a || 'R________________'}`,
    disability: (a) => `What is gross income required in case of disability? ${a || 'R________________'}`,
    trauma:     (a) => `What amount for lifestyle adjustments (cancer, stroke, heart attack)? ${a || 'R________________'}`,
    retirement: (a) => `What reasonable income is required on retirement? ${a || 'R________________'}`,
    savings:    (a) => `What amount is required for children\'s studies or other objective? ${a || 'R_______________'}`,
    assets:     (a) => `Is there sufficient short term cover for assets? ${a || '_______'}`,
    health:     (a) => `Is there sufficient cover for medical expenses? ${a || '_______'}`,
    will:       (a) => `Is there an updated will? ${a || '_________'}`,
    other:      (a) => a || '',
  }
  const gross = Number(data.grossIncome || 0)
  const reqRet = Number(data.reqIncome || 0)
  needsOrder.forEach((key, i) => {
    const nd = needs[key] || {}
    const amount = nd.amount || (key === 'emergency' && gross ? `R${(gross*3).toLocaleString('en-ZA')}` : '')
    xml = setCell(xml, 2, i+1, 1, nd.address || 'NO')
    xml = setCell(xml, 2, i+1, 2, sectionBGuidelines[key](amount))
    xml = setCell(xml, 2, i+1, 3, nd.priority || 'N/A')
    xml = setCell(xml, 2, i+1, 4, nd.reviewDate || '')
  })

  // ── Table 3: Section C — products (rows 1-3) ─────────────────────────
  products.slice(0, 3).forEach((p, i) => {
    xml = setCell(xml, 3, i+1, 0, p.customInsurer || p.insurer || '')
    xml = setCell(xml, 3, i+1, 1, p.product || '')
    xml = setCell(xml, 3, i+1, 2, p.premium ? `R${Number(p.premium).toLocaleString('en-ZA')}` : '')
    xml = setCell(xml, 3, i+1, 3, p.factSheetOnFile !== 'N' ? '☑' : '')
    xml = setCell(xml, 3, i+1, 4, p.factSheetOnFile === 'N' ? '☑' : '')
    xml = setCell(xml, 3, i+1, 5, p.quoteOnFile !== 'N' ? '☑' : '')
    xml = setCell(xml, 3, i+1, 6, p.quoteOnFile === 'N' ? '☑' : '')
  })

  // ── Table 4: Like-for-like comparison ────────────────────────────────
  xml = setCell(xml, 4, 1, 0, investD.likeForLikeNew || '')
  xml = setCell(xml, 4, 1, 1, investD.likeForLikeOld || '')

  // ── Table 5: Section D — Retirement & Savings ────────────────────────
  xml = setCell(xml, 5, 1, 1, investD.retirementIncomeRequired ? `R${Number(investD.retirementIncomeRequired).toLocaleString('en-ZA')}` : 'R')
  xml = setCell(xml, 5, 2, 1, investD.retirementIncomeConsidered ? `R${Number(investD.retirementIncomeConsidered).toLocaleString('en-ZA')}` : 'R')
  xml = setCell(xml, 5, 3, 1, investD.retirementCapital ? `R${Number(investD.retirementCapital).toLocaleString('en-ZA')}` : 'R')
  xml = setCell(xml, 5, 4, 1, investD.retirementProductsConsidered || allInsurers)
  xml = setCell(xml, 5, 5, 1, investD.retirementProductSelected || '')
  xml = setCell(xml, 5, 7, 0, investD.retirementRationale || '')
  xml = setCell(xml, 5, 9, 1, investD.savingsAmount ? `R${Number(investD.savingsAmount).toLocaleString('en-ZA')}` : 'R')
  xml = setCell(xml, 5, 10, 1, investD.savingsProductsConsidered || allInsurers)
  xml = setCell(xml, 5, 11, 1, investD.savingsProductSelected || '')
  xml = setCell(xml, 5, 13, 0, investD.savingsRationale || '')

  // ── Table 6: Investment needs summary ─────────────────────────────────
  // Pre-Retirement: RA(2), Preservation(3)
  // Post-Retirement: Living Annuity(5), Fixed Annuity(6), Life Annuity(7), Guaranteed(8), Retirement Income(9)
  // Savings: Unit Trust(11), Tax Free(12), Endowment(13), Flexible(14), Guaranteed Term(15)
  // Other: Emergency Fund(17), Education(18), Other(19)
  const investNeeds = data.investNeeds || {}
  const investRows = {
    'Retirement Annuity': 2, 'Preservation': 3,
    'Living Annuity': 5, 'Fixed Annuity': 6, 'Life Annuity': 7,
    'Guaranteed Income Plan': 8, 'Retirement Income Plan': 9,
    'Unit Trust': 11, 'Tax Free': 12, 'Endowment': 13,
    'Flexible': 14, 'Guaranteed Term': 15,
    'Emergency Fund': 17, 'Education Policy': 18, 'Other': 19,
  }
  Object.entries(investRows).forEach(([key, rowIdx]) => {
    const nd = investNeeds[key] || {}
    xml = setCell(xml, 6, rowIdx, 1, nd.quantified ? `R${Number(nd.quantified).toLocaleString('en-ZA')}` : 'R')
    xml = setCell(xml, 6, rowIdx, 2, nd.priority || '')
    const status = nd.status || ''
    xml = setCell(xml, 6, rowIdx, 3, status === 'Y' ? '☑' : '')
    xml = setCell(xml, 6, rowIdx, 4, status === 'N' ? '☑' : '')
    xml = setCell(xml, 6, rowIdx, 5, status === 'P' ? '☑' : '')
    xml = setCell(xml, 6, rowIdx, 6, status === 'L' ? '☑' : '')
    xml = setCell(xml, 6, rowIdx, 7, nd.shortfall ? `R${Number(nd.shortfall).toLocaleString('en-ZA')}` : '')
    xml = setCell(xml, 6, rowIdx, 8, nd.reviewDate || '')
  })

  // ── Table 7: Section E ────────────────────────────────────────────────
  const selectedProds = products.filter(p => p.product).map(p =>
    `${p.customInsurer || p.insurer} ${p.product}`).join(', ')
  xml = setCell(xml, 7, 1, 0, data.selectedProductsText || selectedProds)
  xml = setCell(xml, 7, 1, 1, data.sectionE || '')

  // ── Table 9: Section G fees ──────────────────────────────────────────
  const feesList   = data.feesList || []
  const totUpfront = feesList.reduce((s,f) => s+(Number(f.upfront)||0), 0)
  const totOngoing = feesList.reduce((s,f) => s+(Number(f.ongoing)||0), 0)
  xml = setCell(xml, 9, 1, 0, totUpfront ? `R${totUpfront.toLocaleString('en-ZA')}` : '')
  xml = setCell(xml, 9, 1, 1, totOngoing ? `R${totOngoing.toLocaleString('en-ZA')} p.a.` : '')

  // ── Table 10: Section H ───────────────────────────────────────────────
  // R1=declined products, R2=declined reasons, R3=risks
  // R4=consequences explained Yes/No, R5=understands Yes/No
  const declinedProds = sH.declinedProducts !== undefined ? sH.declinedProducts
    : products.filter(p => {
        const chosen = Object.values(recs).map(r => r.selected).filter(Boolean)
        return p.insurer && !chosen.some(c => c.includes(p.customInsurer||p.insurer))
      }).map(p => p.customInsurer||p.insurer).filter((v,i,a)=>a.indexOf(v)===i).join(' & ') || ''
  xml = setCell(xml, 10, 1, 11, declinedProds)
  xml = setCell(xml, 10, 2, 11, sH.declinedReasons || '')
  xml = setCell(xml, 10, 3, 11, sH.risks || 'NO')
  xml = setCell(xml, 10, 4, 4, sH.consequencesExplained === 'Yes' ? '☑' : '')
  xml = setCell(xml, 10, 4, 6, sH.consequencesExplained === 'No' ? '☑' : '')
  xml = setCell(xml, 10, 5, 3, '☑')  // Understands Yes
  xml = setCell(xml, 10, 7, 11, sH.focusedNeed || 'N/A')

  // ── FNA completion checkbox (Table 10 R0 C10=Yes, C11=No) ────────────
  xml = setCell(xml, 10, 0, 10, '☑')  // FNA was completed - Yes

  // ── Table 13: Signatures ─────────────────────────────────────────────
  xml = setCell(xml, 13, 1, 1, cName(data))
  xml = setCell(xml, 13, 1, 3, ADVISOR.toUpperCase())
  xml = setCell(xml, 13, 2, 1, today())
  xml = setCell(xml, 13, 2, 3, today())

  zip.file('word/document.xml', xml)
  return generateBlob(zip)
}

// ══════════════════════════════════════════════════════════════════════════
// FNA CALCULATOR — EXCEL OUTPUT
// Uses PizZip (already installed) to populate FNA_Calculator.xlsx
// Modifies xl/worksheets/sheet1.xml and sheet3.xml directly
// Input cells: D7=DOB, E9=retAge, E12=grossIncome, E22=rate,
//              E23=fundValue, E36=penalties, B{age-16}=reqIncome
// Calculated overrides: E8,E10,E13,E14,E17-E19,E24,E26,E27,E30-E34
// ══════════════════════════════════════════════════════════════════════════
function setXlsxCellNumeric(xml, cellRef, value, styleOverride) {
  const pattern = new RegExp(`<c r="${cellRef}"[^>]*>[\\s\\S]*?</c>`)
  const m = xml.match(pattern)
  if (!m) return xml
  const sMatch = m[0].match(/s="(\d+)"/)
  const sAttr  = styleOverride ? `s="${styleOverride}"` : (sMatch ? `s="${sMatch[1]}"` : '')
  const newCell = `<c r="${cellRef}" ${sAttr}><v>${value}</v></c>`
  return xml.slice(0, m.index) + newCell + xml.slice(m.index + m[0].length)
}

function excelDateSerial(dateStr) {
  // Convert YYYY-MM-DD to Excel serial number (days since 1899-12-30)
  const d     = new Date(dateStr + 'T12:00:00')
  const epoch = new Date(1899, 11, 30)
  return Math.round((d - epoch) / 86400000)
}

export async function fillFNAExcel(data, calc) {
  const zip = loadTemplate(fnaTemplate)  // PizZip (same as docx)

  let sheet1 = zip.file('xl/worksheets/sheet1.xml').asText()
  let sheet3 = zip.file('xl/worksheets/sheet3.xml').asText()

  const age      = calc.age || 0
  const yrs      = calc.yrs || 0
  const rate     = calc.interestRate || 0.06
  const tax      = calc.tax || {}
  const fees     = calc.fees || {}
  const fund     = Number(data.currentFundValue || 0)
  const gross    = Number(data.grossIncome || 0)
  const retAge   = calc.retirementAge || 65

  // ── Sheet1: FNA Calculator ─────────────────────────────────────────────
  // DOB: convert to Excel date serial, use existing date style (s=49)
  if (data.dob) {
    sheet1 = setXlsxCellNumeric(sheet1, 'D7', excelDateSerial(data.dob), '49')
  }
  sheet1 = setXlsxCellNumeric(sheet1, 'E9',  retAge)
  sheet1 = setXlsxCellNumeric(sheet1, 'E12', gross)
  sheet1 = setXlsxCellNumeric(sheet1, 'E22', rate)
  sheet1 = setXlsxCellNumeric(sheet1, 'E23', fund)
  sheet1 = setXlsxCellNumeric(sheet1, 'E36', Number(data.penalties || 0))
  sheet1 = setXlsxCellNumeric(sheet1, 'E14', gross * 12)

  // Required income at client's current age row (age - 16 = row number)
  const reqRow  = age - 16
  sheet1 = setXlsxCellNumeric(sheet1, `B${reqRow}`, Number(data.reqIncome || 0))

  // Override calculated cells with correct values (primary rebate fix etc.)
  sheet1 = setXlsxCellNumeric(sheet1, 'E8',  age)
  sheet1 = setXlsxCellNumeric(sheet1, 'E10', yrs)
  sheet1 = setXlsxCellNumeric(sheet1, 'E13', tax.netMonthly || 0)
  sheet1 = setXlsxCellNumeric(sheet1, 'E17', tax.maxRAmonthly || 0)
  sheet1 = setXlsxCellNumeric(sheet1, 'E18', tax.sarsRebate || 0)
  sheet1 = setXlsxCellNumeric(sheet1, 'E19', tax.netCostOfContribution || 0)
  sheet1 = setXlsxCellNumeric(sheet1, 'E24', Math.round(calc.futureInvestmentValue || 0))
  sheet1 = setXlsxCellNumeric(sheet1, 'E26', Math.round(calc.totalFundRequired || 0))
  sheet1 = setXlsxCellNumeric(sheet1, 'E27', Math.round(calc.shortfall || 0))
  sheet1 = setXlsxCellNumeric(sheet1, 'E30', Math.round(fees.allanGrayFee || 0))
  sheet1 = setXlsxCellNumeric(sheet1, 'E31', Math.round(fees.existingFee || 0))
  sheet1 = setXlsxCellNumeric(sheet1, 'E33', Math.round(fees.feeSavings || 0))
  sheet1 = setXlsxCellNumeric(sheet1, 'E34', Math.round(fees.feeSavingsToRetirement || 0))

  // ── Sheet3: Liability Calculator ──────────────────────────────────────
  const grossAnnual = gross * 12
  const partnerInc  = Number(data.partnerIncome || 0)
  const available   = Math.max(0, grossAnnual - partnerInc)

  const liabCells = [
    ['G7',  Number(data.mortgages         || 0)],
    ['G8',  Number(data.loans             || 0)],
    ['G9',  Number(data.finalExpenses      || 0)],
    ['G11', Number(data.educationFund      || 0)],
    ['G14', Number(data.childCare          || 0)],
    ['G16', Number(data.otherCashNeeds     || 0)],
    ['G22', grossAnnual],
    ['G23', partnerInc],
    ['G24', available],
    ['G25', available],
    ['G26', Number(data.assumedReturn      || 0)],
    ['G27', 0],
    ['G33', Number(data.cashAssets         || 0)],
    ['G34', Number(data.stocksBonds        || 0)],
    ['G35', Number(data.principalResidence || 0)],
    ['G36', Number(data.secondaryResidence || 0)],
    ['G37', Number(data.totalLifeInsurance || 0)],
    ['G38', Number(data.businessAssets     || 0)],
  ]
  liabCells.forEach(([cell, val]) => {
    sheet3 = setXlsxCellNumeric(sheet3, cell, val)
  })

  zip.file('xl/worksheets/sheet1.xml', sheet1)
  zip.file('xl/worksheets/sheet3.xml', sheet3)

  return zip.generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}


export async function downloadFilledFNA(data, calc) {
  const name = (data.fullName || data.registeredName || 'Client').replace(/\s+/g,'_').toUpperCase()
  saveAs(await fillFNAExcel(data, calc), `${name}_FNA_Calculator.xlsx`)
}

export async function downloadFilledRA(data, calc) {
  saveAs(await fillRATemplate(data, calc), `${safeName(data)}_RA_Calculation.docx`)
}

export async function downloadFilledInvestROA(data) {
  saveAs(await fillInvestROATemplate(data), `${safeName(data)}_Invest_ROA_${new Date().toISOString().slice(0,10)}.docx`)
}
