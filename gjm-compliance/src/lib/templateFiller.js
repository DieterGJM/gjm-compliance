// ═══════════════════════════════════════════════════════════════════════════
// GJM ULTRA BROKERS — TEMPLATE FILLER
// Opens the ACTUAL approved .docx templates and fills in client data
// Output is IDENTICAL to the approved templates with data filled in
// Uses PizZip for XML manipulation of the .docx zip structure
// ═══════════════════════════════════════════════════════════════════════════
import PizZip from 'pizzip'
import { saveAs } from 'file-saver'
import { onboardingTemplate, ongoingTemplate, transactionalTemplate, roaTemplate, raCalculationTemplate } from './templates'

const ADVISOR = 'Dieter Hartig'
const CO      = 'Tanya Van Niekerk'

function today() {
  return new Date().toLocaleDateString('en-ZA', { day:'2-digit', month:'2-digit', year:'numeric' })
}
function fmtDOB(dob) {
  if (!dob) return ''
  return new Date(dob + 'T12:00:00').toLocaleDateString('en-ZA', { day:'2-digit', month:'2-digit', year:'numeric' })
}
function fmtR(val) {
  if (!val || Number(val) === 0) return ''
  return `R${Number(val).toLocaleString('en-ZA')}`
}
function cName(data) {
  return (data.fullName || data.registeredName || '').toUpperCase()
}
function clientId(data) {
  return data.idNumber || data.registrationNo || ''
}
function clientAddr(data) {
  return data.clientType === 'legal' ? data.registeredAddress : data.residentialAddress || ''
}

// ── Core: load base64 template, manipulate XML, return blob ───────────────
function loadTemplate(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new PizZip(bytes.buffer)
}

// ── XML text replacement helpers ──────────────────────────────────────────
// Replaces the CONTENT of a cell identified by searching for a label
// Works by finding the cell XML and replacing the value in the next cell

// ── XML placeholder replacement (handles split runs & cyan highlights) ────
function xmlEscape(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function replaceCyanPlaceholders(xml, replacements) {
  let result = xml
  for (const [placeholder, value] of Object.entries(replacements)) {
    const inner = placeholder.replace(/^\[|\]$/g, '')
    const innerEsc = inner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const val = xmlEscape(value)
    const newRun = `<w:r><w:t xml:space="preserve">${val}</w:t></w:r>`

    // Pattern 1: [ in own run, optional proofErr, cyan run(s), ] run
    const p1 = new RegExp(
      '<w:r(?:[^>]*)>(?:<w:rPr>(?:(?!<w:rPr>).)*?<\/w:rPr>)?<w:t(?:[^>]*)>\\[<\/w:t><\/w:r>' +
      '(?:<w:proofErr[^/]*/?>)*' +
      '<w:r(?:[^>]*)><w:rPr>(?:(?!<w:rPr>).)*?<w:highlight w:val="cyan\"/>(?:(?!<w:rPr>).)*?<\/w:rPr><w:t(?:[^>]*)>' +
      innerEsc + '\\s*<\/w:t><\/w:r>' +
      '(?:(?:<w:proofErr[^/]*/?>)*<w:r(?:[^>]*)><w:rPr>(?:(?!<w:rPr>).)*?<w:highlight w:val="cyan\"/>(?:(?!<w:rPr>).)*?<\/w:rPr><w:t(?:[^>]*)>[^<]*<\/w:t><\/w:r>)*' +
      '(?:<w:proofErr[^/]*/?>)*' +
      '<w:r(?:[^>]*)>(?:<w:rPr>(?:(?!<w:rPr>).)*?<\/w:rPr>)?<w:t(?:[^>]*)>\\]<\/w:t><\/w:r>',
      's'
    )
    let r2 = result.replace(p1, newRun)
    if (r2 !== result) { result = r2; continue }

    // Pattern 2: [ at end of text in preceding run
    const p2 = new RegExp(
      '(<w:r(?:[^>]*)>(?:<w:rPr>(?:(?!<w:rPr>).)*?<\/w:rPr>)?(?:<w:tab\/?>)?<w:t(?:[^>]*)>[^<]*)\\[' +
      '(<\/w:t><\/w:r>)' +
      '(?:<w:proofErr[^/]*/?>)*' +
      '<w:r(?:[^>]*)><w:rPr>(?:(?!<w:rPr>).)*?<w:highlight w:val="cyan\"/>(?:(?!<w:rPr>).)*?<\/w:rPr><w:t(?:[^>]*)>' +
      innerEsc + '\\s*<\/w:t><\/w:r>' +
      '(?:(?:<w:proofErr[^/]*/?>)*<w:r(?:[^>]*)><w:rPr>(?:(?!<w:rPr>).)*?<w:highlight w:val="cyan\"/>(?:(?!<w:rPr>).)*?<\/w:rPr><w:t(?:[^>]*)>[^<]*<\/w:t><\/w:r>)*' +
      '(?:<w:proofErr[^/]*/?>)*' +
      '<w:r(?:[^>]*)>(?:<w:rPr>(?:(?!<w:rPr>).)*?<\/w:rPr>)?<w:t(?:[^>]*)>\\]<\/w:t><\/w:r>',
      's'
    )
    r2 = result.replace(p2, (m, g1, g2) => g1 + val + g2)
    if (r2 !== result) { result = r2 }
  }
  return result
}

// ── Fill a table's rows with [col0, col1] text pairs ──────────────────────
function fillTableRows(xml, tableIndex, rows) {
  // Parse and fill table cells using position-based approach
  let result = xml
  const tableRegex = /<w:tbl[ >]/g
  const tablePositions = []
  let match
  while ((match = tableRegex.exec(xml)) !== null) tablePositions.push(match.index)
  if (tableIndex >= tablePositions.length) return xml
  const tblStart = tablePositions[tableIndex]
  const tblEnd = xml.indexOf('</w:tbl>', tblStart) + 8
  let tblXml = xml.slice(tblStart, tblEnd)
  
  const rowRegex = /<w:tr[ >]/g
  const rowPositions = []
  while ((match = rowRegex.exec(tblXml)) !== null) rowPositions.push(match.index)
  
  rows.forEach((cols, rowIdx) => {
    if (rowIdx >= rowPositions.length) return
    const rowStart = rowPositions[rowIdx]
    const rowEnd = tblXml.indexOf('</w:tr>', rowStart) + 7
    let rowXml = tblXml.slice(rowStart, rowEnd)
    
    const cellRegex = /<w:tc[ >]/g
    const cellPositions = []
    while ((match = cellRegex.exec(rowXml)) !== null) cellPositions.push(match.index)
    
    cols.forEach((text, colIdx) => {
      if (colIdx >= cellPositions.length) return
      const cellStart = cellPositions[colIdx]
      const cellEnd = rowXml.indexOf('</w:tc>', cellStart) + 7
      const cellXml = rowXml.slice(cellStart, cellEnd)
      const newCellXml = setCellText(cellXml, xmlEscape(text))
      rowXml = rowXml.slice(0, cellStart) + newCellXml + rowXml.slice(cellEnd)
      // Recalculate cell positions after modification
      cellPositions.length = 0
      const cr = /<w:tc[ >]/g
      while ((match = cr.exec(rowXml)) !== null) cellPositions.push(match.index)
    })
    tblXml = tblXml.slice(0, rowStart) + rowXml + tblXml.slice(rowEnd)
    // Recalculate row positions
    rowPositions.length = 0
    const rr = /<w:tr[ >]/g
    while ((match = rr.exec(tblXml)) !== null) rowPositions.push(match.index)
  })
  return xml.slice(0, tblStart) + tblXml + xml.slice(tblEnd)
}

function setTableCell(xml, tableIndex, rowIndex, colIndex, text) {
  return fillTableRows(xml, tableIndex, 
    Array(rowIndex + 1).fill(null).map((_, i) => 
      i === rowIndex ? Array(colIndex + 1).fill(null).map((_, j) => j === colIndex ? text : null) : []
    ).filter((r, i) => i === rowIndex)
  )
}

function setCellText(cellXml, newText) {
  const pStart = Math.min(
    cellXml.includes('<w:p ') ? cellXml.indexOf('<w:p ') : Infinity,
    cellXml.includes('<w:p>') ? cellXml.indexOf('<w:p>') : Infinity
  )
  if (pStart === Infinity) return cellXml
  const pEnd = cellXml.indexOf('</w:p>', pStart) + 6
  const paraXml = cellXml.slice(pStart, pEnd)
  const pPrMatch = paraXml.match(/<w:pPr>.*?<\/w:pPr>/s)
  const pPr = pPrMatch ? pPrMatch[0].replace(/<\/?w:pPr>/g, '') : ''
  const rPrMatch = paraXml.match(/<w:rPr>.*?<\/w:rPr>/s)
  const rPr = rPrMatch ? rPrMatch[0] : ''
  const newPara = `<w:p><w:pPr>${pPr}</w:pPr><w:r>${rPr}<w:t xml:space="preserve">${newText}</w:t></w:r></w:p>`
  return cellXml.slice(0, pStart) + newPara + cellXml.slice(pEnd)
}

function xmlEscape(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Replace text in a paragraph that contains a specific string
function replaceInPara(xml, search, replacement) {
  // This replaces the ENTIRE text content of a <w:p> that contains the search string
  const escaped = xmlEscape(replacement)
  // Match w:p elements containing the search text (may be split across runs)
  // Simple approach: find the cell containing the label, get next cell, replace its content
  return xml
}

// Fill an entire cell's text content by finding cells after a label cell
// Strategy: parse the XML table structure and fill empty cells based on position
function fillTableCell(xml, tableIndex, row, col, value) {
  const escaped = xmlEscape(value)
  // We need to navigate the XML structure
  // Each table is <w:tbl>, each row is <w:tr>, each cell is <w:tc>
  // We find the Nth table, Mth row, Kth cell and replace its text runs
  
  let tblCount = -1
  let result = xml
  
  // Simple regex-based approach: find table blocks
  const tableRegex = /<w:tbl[ >]/g
  const tablePositions = []
  let match
  while ((match = tableRegex.exec(xml)) !== null) {
    tablePositions.push(match.index)
  }
  
  if (tableIndex >= tablePositions.length) return xml
  
  const tblStart = tablePositions[tableIndex]
  // Find end of this table
  const tblEnd = xml.indexOf('</w:tbl>', tblStart) + 8
  const tblXml = xml.slice(tblStart, tblEnd)
  
  // Find rows
  const rowRegex = /<w:tr[ >]/g
  const rowPositions = []
  while ((match = rowRegex.exec(tblXml)) !== null) {
    rowPositions.push(match.index)
  }
  
  if (row >= rowPositions.length) return xml
  
  const rowStart = rowPositions[row]
  const rowEndRaw = tblXml.indexOf('</w:tr>', rowStart) + 7
  const rowXml = tblXml.slice(rowStart, rowEndRaw)
  
  // Find cells
  const cellRegex = /<w:tc[ >]/g
  const cellPositions = []
  while ((match = cellRegex.exec(rowXml)) !== null) {
    cellPositions.push(match.index)
  }
  
  if (col >= cellPositions.length) return xml
  
  const cellStart = cellPositions[col]
  const cellEndRaw = rowXml.indexOf('</w:tc>', cellStart) + 7
  const cellXml = rowXml.slice(cellStart, cellEndRaw)
  
  // Find the paragraph in the cell and replace all run text
  const newCellXml = replaceCellContent(cellXml, escaped)
  
  const newRowXml = rowXml.slice(0, cellStart) + newCellXml + rowXml.slice(cellEndRaw)
  const newTblXml = tblXml.slice(0, rowStart) + newRowXml + tblXml.slice(rowEndRaw)
  
  return xml.slice(0, tblStart) + newTblXml + xml.slice(tblEnd)
}

function replaceCellContent(cellXml, newText) {
  // Find the first paragraph in the cell
  const paraStart = cellXml.indexOf('<w:p ')
  if (paraStart === -1) {
    const paraStart2 = cellXml.indexOf('<w:p>')
    if (paraStart2 === -1) return cellXml
  }
  const pStart = Math.min(
    cellXml.indexOf('<w:p ') >= 0 ? cellXml.indexOf('<w:p ') : Infinity,
    cellXml.indexOf('<w:p>') >= 0 ? cellXml.indexOf('<w:p>') : Infinity
  )
  const pEnd = cellXml.indexOf('</w:p>', pStart) + 6
  const paraXml = cellXml.slice(pStart, pEnd)
  
  // Extract paragraph properties (pPr) to preserve formatting
  const pPrMatch = paraXml.match(/<w:pPr>.*?<\/w:pPr>/s)
  const pPr = pPrMatch ? pPrMatch[0] : ''
  
  // Extract run properties from first run to preserve font/size/bold
  const rPrMatch = paraXml.match(/<w:rPr>.*?<\/w:rPr>/s)
  const rPr = rPrMatch ? rPrMatch[0] : ''
  
  // Build new paragraph with preserved formatting
  const newPara = `<w:p><w:pPr>${pPr ? pPr.replace(/<\/?w:pPr>/g,'') : ''}</w:pPr><w:r>${rPr ? rPr : ''}<w:t xml:space="preserve">${newText}</w:t></w:r></w:p>`
  
  return cellXml.slice(0, pStart) + newPara + cellXml.slice(pEnd)
}

// ── Append text to a paragraph containing a specific search string ────────
function appendToParagraph(xml, searchText, appendText) {
  // Find paragraph containing searchText and append to its last run
  const escaped = xmlEscape(appendText)
  const searchIdx = xml.indexOf(xmlEscape(searchText))
  if (searchIdx === -1) return xml
  
  // Find the enclosing </w:p>
  const paraEnd = xml.indexOf('</w:p>', searchIdx)
  if (paraEnd === -1) return xml
  
  const insertion = `<w:r><w:t xml:space="preserve"> ${escaped}</w:t></w:r>`
  return xml.slice(0, paraEnd) + insertion + xml.slice(paraEnd)
}

// ── ONBOARDING QUESTIONNAIRE ──────────────────────────────────────────────
export async function fillOnboardingTemplate(data) {
  const zip = loadTemplate(onboardingTemplate)
  let xml = zip.file('word/document.xml').asText()
  
  const score  = (data.riskFactors || Array(8).fill(1)).reduce((s,v) => s + Number(v), 0)
  const band   = score <= 8 ? 'LOW RISK' : score <= 16 ? 'MEDIUM RISK' : 'HIGH RISK'
  const isNew  = data.isNew !== false

  // Table 0: Client Details (rows 0-9, col 1)
  const clientDetails = [
    cName(data),
    fmtDOB(data.dob),
    clientId(data),
    data.citizenship || 'RSA',
    data.passportNo || 'N/A',
    clientAddr(data),
    data.postalAddress || clientAddr(data),
    data.telephone || '',
    data.mobile || '',
    data.email || '',
  ]
  clientDetails.forEach((val, i) => {
    xml = fillTableCell(xml, 0, i, 1, val)
  })

  // Table 1: Nature of Business (col 1, rows 0-6)
  xml = fillTableCell(xml, 1, 0, 1, data.occupation || '')
  xml = fillTableCell(xml, 1, 1, 1, data.sourceOfIncome || 'Salary')
  xml = fillTableCell(xml, 1, 2, 1, data.sourceOfWealth || 'Income')
  xml = fillTableCell(xml, 1, 3, 1, data.services || 'Advice and intermediary services.')
  xml = fillTableCell(xml, 1, 4, 1, data.frequency || 'Annually and Adhoc')
  xml = fillTableCell(xml, 1, 5, 1, data.transactionSize || 'Small')
  xml = fillTableCell(xml, 1, 6, 1, data.products || 'investments')

  // Table 3: Risk total
  xml = fillTableCell(xml, 3, 0, 1, String(score))

  // New/Existing — update paragraph checkboxes
  // The template has checkboxes as text characters
  if (!isNew) {
    xml = xml.replace(/New Business Relationship(\s+)Existing Client/, 'New Business Relationship$1☑ Existing Client')
  } else {
    xml = xml.replace(/New Business Relationship(\s+)Existing Client/, '☑ New Business Relationship$1Existing Client')
  }

  // Screening — TFS/PEP/PIP checkboxes
  // Template uses "Yes" / "No" text near checkboxes
  // Mark the appropriate one
  const tfsYes = data.tfs === 'yes'
  const pepForeignYes = data.foreignPep === 'yes'
  const pepDomesticYes = data.domesticPep === 'yes'
  const pipYes = data.pip === 'yes'

  // Decision
  const accepted = data.decision !== 'decline'

  // Add further details paragraph content
  // Find the N/A line and replace
  xml = xml.replace(
    /___N\/A______________________________________________________________________________________________/,
    xmlEscape(data.furtherDetails || 'N/A')
  )

  // Add advisor name and date
  xml = xml.replace(/Full name: Dieter Hartig/g, `Full name: ${ADVISOR}`)
  xml = xml.replace(/Full name: Tanya Van Niekerk/g, `Full name: ${CO}`)
  
  // Add today's date to date fields
  const dateRegex = /Date:\s*_+/g
  let firstDate = true
  xml = xml.replace(dateRegex, (match) => {
    if (firstDate) { firstDate = false; return `Date:\t\t${today()}` }
    return match
  })

  // Add sign-off paragraph
  if (data.onboardingSignoff) {
    xml = appendToParagraph(xml, 'Due diligence was done on the client', data.onboardingSignoff)
  }

  zip.file('word/document.xml', xml)
  return zip.generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

// ── ONGOING DD ────────────────────────────────────────────────────────────
export async function fillOngoingTemplate(data) {
  const zip = loadTemplate(ongoingTemplate)
  let xml = zip.file('word/document.xml').asText()

  // Table 0: Client details
  xml = fillTableCell(xml, 0, 0, 1, cName(data))
  xml = fillTableCell(xml, 0, 1, 1, clientId(data))
  xml = fillTableCell(xml, 0, 2, 1, clientAddr(data))
  xml = fillTableCell(xml, 0, 3, 1, data.telephone || '')
  xml = fillTableCell(xml, 0, 4, 1, data.mobile || '')
  xml = fillTableCell(xml, 0, 5, 1, data.email || '')

  // Table 1: Months checkbox (mark the selected one)
  const months = data.monthsCheckbox || '12'
  const monthMap = { '12': 0, '24': 1, '36': 2, '>36': 3 }
  const monthCol = monthMap[months] ?? 0
  xml = fillTableCell(xml, 1, 1, monthCol, `☑ ${months}`)

  // Risk profile - find paragraph and mark checkbox
  const risk = data.ongoingRisk || 'low'
  // Sign-off note
  if (data.ongoingSignoffNote) {
    const noteEsc = xmlEscape(data.ongoingSignoffNote)
    // Find the sign-off area and add note
  }

  // Advisor details
  xml = xml.replace(/Full name: Dieter Hartig/g, `Full name: ${ADVISOR}`)
  xml = xml.replace(/Full name: Tanya Van Niekerk/g, `Full name: ${CO}`)
  const dateRegex = /Date:\s*_+/g
  let firstDate = true
  xml = xml.replace(dateRegex, (m) => { if(firstDate){firstDate=false;return `Date:\t\t${today()}`}return m })

  zip.file('word/document.xml', xml)
  return zip.generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

// ── TRANSACTIONAL DD ──────────────────────────────────────────────────────
export async function fillTransactionalTemplate(data) {
  const zip = loadTemplate(transactionalTemplate)
  let xml = zip.file('word/document.xml').asText()

  // Table 0: Client details
  xml = fillTableCell(xml, 0, 0, 1, cName(data))
  xml = fillTableCell(xml, 0, 1, 1, clientId(data))
  xml = fillTableCell(xml, 0, 2, 1, clientAddr(data))
  xml = fillTableCell(xml, 0, 3, 1, data.telephone || '')
  xml = fillTableCell(xml, 0, 4, 1, data.mobile || '')
  xml = fillTableCell(xml, 0, 5, 1, data.email || '')

  // Transaction details in paragraphs
  xml = xml.replace(
    'Date on which current transaction was concluded:</w:t>',
    `Date on which current transaction was concluded: ${data.transactionDate || today()}</w:t>`
  )
  xml = xml.replace(
    'Amount and currency of this transaction: R</w:t>',
    `Amount and currency of this transaction: R${data.transactionAmount || ''}</w:t>`
  )
  xml = xml.replace(
    'Parties to this transaction (advisor, client, provider, etc): </w:t>',
    `Parties to this transaction (advisor, client, provider, etc): ${ADVISOR}, ${cName(data)}</w:t>`
  )

  // New/Existing client
  const isNew = data.isNew !== false
  xml = xml.replace('NEW CLIENT', isNew ? '☑ NEW CLIENT' : '☐ NEW CLIENT')
  xml = xml.replace('EXISTING CLIENT', !isNew ? '☑ EXISTING CLIENT' : '☐ EXISTING CLIENT')

  // P40: Sign-off text — inject into the empty paragraph after "Provide additional details..."
  // This paragraph has bookmarkStart with name="_Hlk8823689"
  const signoffText = xmlEscape(
    data.needsObjectives ||
    'The transaction is consistent with GJM Ultra Brokers knowledge of the client. Ongoing customer due diligence has been conducted, and client remains low risk.'
  )
  // Replace the EXACT empty paragraph XML (identified by its paraId)
  xml = xml.replace(
    '<w:p w14:paraId="3324A063" w14:textId="77777777" w:rsidR="001E09D6" w:rsidRDefault="001E09D6" w:rsidP="00380619"><w:bookmarkStart w:id="0" w:name="_Hlk8823689"/></w:p>',
    `<w:p w14:paraId="3324A063" w14:textId="77777777" w:rsidR="001E09D6" w:rsidRDefault="001E09D6" w:rsidP="00380619"><w:bookmarkStart w:id="0" w:name="_Hlk8823689"/><w:r><w:t xml:space="preserve">${signoffText}</w:t></w:r></w:p>`
  )

  // Advisor name and date
  xml = xml.replace(/Full name\.: Dieter Hartig/g, `Full name.: ${ADVISOR}`)
  xml = xml.replace(/Full name\.: Tanya Van Niekerk/g, `Full name.: ${CO}`)
  xml = xml.replace(/Date\.:\s*_+/g, `Date.:\t       ${today()}`)

  zip.file('word/document.xml', xml)
  return zip.generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}


export async function fillROATemplate(data) {
  const zip = loadTemplate(roaTemplate)
  let xml = zip.file('word/document.xml').asText()
  const products = data.products || []
  const recs = data.recommendations || {}
  const sH = data.sectionH || {}

  // Table 0: Header
  xml = fillTableCell(xml, 0, 0, 1, cName(data))
  xml = fillTableCell(xml, 0, 1, 1, clientId(data))
  xml = fillTableCell(xml, 0, 1, 3, data.mobile || '')
  xml = fillTableCell(xml, 0, 3, 1, data.email || '')
  xml = fillTableCell(xml, 0, 4, 1, ADVISOR)
  xml = fillTableCell(xml, 0, 4, 3, today())

  // Table 1: Section A
  xml = fillTableCell(xml, 1, 0, 1, data.needsObjectives || '')
  xml = fillTableCell(xml, 1, 1, 1, data.financialSituation || '')
  xml = fillTableCell(xml, 1, 2, 1, `${data.age||''}, ${data.occupation||''}, ${data.dependents||'0'}, ${data.smokerStatus||'Non-Smoker'}, ${fmtR(data.premiumConsideration)}, ${fmtR(data.currentDebt)||'R0'}, ${data.affordability||'Full affordability confirmed by client'}`)
  xml = fillTableCell(xml, 1, 3, 1, data.productKnowledge || 'CLIENT HAS LOW LEVEL OF PRODUCT KNOWLEDGE AND EXPERIENCE WITH LONG TERM INSURANCE BUT UNDERSTANDS THE EFFECTS AND CONSEQUENCES OF THE CHOSEN PRODUCT FULLY.')
  xml = fillTableCell(xml, 1, 4, 1, data.otherInfo || '')

  // Table 2: Section B — needs table (rows 1-10, col 1=address, col 3=priority, col 4=reviewDate)
  const needsConfig = [
    {key:'emergency'},{key:'death'},{key:'disability'},{key:'trauma'},
    {key:'retirement'},{key:'savings'},{key:'assets'},{key:'health'},{key:'will'},{key:'other'}
  ]
  const needs = data.needsTable || {}
  needsConfig.forEach(({key}, i) => {
    const nd = needs[key] || {}
    xml = fillTableCell(xml, 2, i+1, 1, nd.address || 'NO')
    xml = fillTableCell(xml, 2, i+1, 3, nd.priority || 'N/A')
    xml = fillTableCell(xml, 2, i+1, 4, nd.reviewDate || '')
  })

  // Table 3: Section C — Products (rows 1-3)
  products.slice(0,3).forEach((p, i) => {
    xml = fillTableCell(xml, 3, i+1, 0, p.customInsurer || p.insurer || '')
    xml = fillTableCell(xml, 3, i+1, 1, p.product || '')
    xml = fillTableCell(xml, 3, i+1, 2, p.premium ? `R${Number(p.premium).toLocaleString('en-ZA')}` : '')
    xml = fillTableCell(xml, 3, i+1, p.quoteOnFile === 'N' ? 4 : 3, '☑')
  })

  // Table 4: Section D — Death, Disability, Trauma
  const allInsurers = [...new Set(products.map(p=>p.customInsurer||p.insurer).filter(Boolean))].join(', ')
  // DEATH
  xml = fillTableCell(xml, 4, 1, 1, fmtR(recs.death?.life_cover_required) || 'R')
  xml = fillTableCell(xml, 4, 2, 1, fmtR(recs.death?.life_cover_considered) || 'R')
  xml = fillTableCell(xml, 4, 3, 1, recs.death?.considered || allInsurers)
  xml = fillTableCell(xml, 4, 4, 1, recs.death?.selected || '')
  xml = fillTableCell(xml, 4, 6, 1, recs.death?.rationale || '')
  // DISABILITY
  xml = fillTableCell(xml, 4, 8, 1, fmtR(recs.disability?.income_required) || 'R')
  xml = fillTableCell(xml, 4, 9, 1, fmtR(recs.disability?.income_considered) || 'R')
  xml = fillTableCell(xml, 4, 10, 1, recs.disability?.considered || allInsurers)
  xml = fillTableCell(xml, 4, 13, 1, fmtR(recs.disability?.capital_required) || 'R')
  xml = fillTableCell(xml, 4, 14, 1, fmtR(recs.disability?.capital_considered) || 'R')
  xml = fillTableCell(xml, 4, 15, 1, recs.disability?.considered || allInsurers)
  xml = fillTableCell(xml, 4, 16, 1, recs.disability?.selected || '')
  xml = fillTableCell(xml, 4, 18, 1, recs.disability?.rationale || '')
  // TRAUMA
  xml = fillTableCell(xml, 4, 20, 1, fmtR(recs.trauma?.cover_required) || 'R')
  xml = fillTableCell(xml, 4, 21, 1, fmtR(recs.trauma?.cover_considered) || 'R')
  xml = fillTableCell(xml, 4, 22, 1, recs.trauma?.considered || allInsurers)
  xml = fillTableCell(xml, 4, 23, 1, recs.trauma?.selected || '')
  xml = fillTableCell(xml, 4, 25, 1, recs.trauma?.rationale || '')

  // Table 5: Financial Planning Needs Summary
  const planNeeds = data.planNeeds || {}
  const planKeys = ['Life','Permanent Disability (Income Protection)','Permanent Disability (lump sum)',
    'Temporary Disability','Trauma / Illness','Funeral Cover / Immediate Expenses',
    'Other [Physical and/or Functional Impairment, sickness cover, retrenchment benefit etc.]']
  planKeys.forEach((key, i) => {
    const pn = planNeeds[key] || {}
    const quantified = pn.quantified || (key === 'Life' ? recs.death?.life_cover_required
      : key.includes('Income Protection') ? recs.disability?.income_required
      : key.includes('lump sum') ? recs.disability?.capital_required
      : key.includes('Temporary') ? recs.disability?.income_required
      : key.includes('Trauma') ? (recs.trauma?.cover_required || recs.trauma?.cover_considered)
      : '') || ''
    xml = fillTableCell(xml, 5, i+1, 1, quantified ? `R${Number(quantified).toLocaleString('en-ZA')}` : 'R')
    xml = fillTableCell(xml, 5, i+1, 2, pn.priority || '1')
    // Mark Y/N/P/L checkbox
    const status = pn.status || 'Y'
    const statusCols = { 'Y': 3, 'N': 4, 'P': 5, 'L': 6 }
    const statusCol = statusCols[status] || 3
    xml = fillTableCell(xml, 5, i+1, statusCol, '☑')
    xml = fillTableCell(xml, 5, i+1, 7, pn.shortfall ? `R${Number(pn.shortfall).toLocaleString('en-ZA')}` : '')
    xml = fillTableCell(xml, 5, i+1, 8, pn.reviewDate || '')
  })

  // Table 6: Section E
  const selectedProductsText = data.selectedProductsText ||
    (() => {
      const chosen = Object.values(recs).map(r=>r.selected).filter(Boolean)
      return [...new Set(chosen)].join(', ') || products.map(p=>`${p.customInsurer||p.insurer} ${p.product}`).join(', ')
    })()
  xml = fillTableCell(xml, 6, 0, 0, selectedProductsText)
  xml = fillTableCell(xml, 6, 0, 1, data.sectionE || '')

  // Table 7: Section F — leave as-is (template already has standard text)
  // Only replace if user has custom content
  if (data.sectionF && data.sectionF.length > 50) {
    xml = fillTableCell(xml, 7, 0, 0, data.sectionF)
  }

  // Table 8: Section G — Fees
  const feesList = data.feesList || []
  const totalUpfront = feesList.reduce((s,f) => s + (Number(f.upfront)||0), 0)
  const totalOngoing = feesList.reduce((s,f) => s + (Number(f.ongoing)||0), 0)
  xml = fillTableCell(xml, 8, 1, 0, totalUpfront ? `R${totalUpfront.toLocaleString('en-ZA')}` : '')
  xml = fillTableCell(xml, 8, 1, 1, totalOngoing ? `R${totalOngoing.toLocaleString('en-ZA')} p.a.` : '')

  // Table 9: Section H
  xml = fillTableCell(xml, 9, 0, 2, sH.declinedProducts || '')
  xml = fillTableCell(xml, 9, 1, 2, sH.declinedReasons || '')
  xml = fillTableCell(xml, 9, 2, 2, sH.risks || 'NO')
  if (sH.consequencesExplained === 'Yes') {
    xml = fillTableCell(xml, 9, 3, 3, '☑')
  } else {
    xml = fillTableCell(xml, 9, 3, 4, '☑')
  }
  xml = fillTableCell(xml, 9, 6, 2, sH.focusedNeed || 'N/A')

  // Table 12: Signatures
  xml = fillTableCell(xml, 12, 1, 0, cName(data))
  xml = fillTableCell(xml, 12, 1, 2, ADVISOR.toUpperCase())
  xml = fillTableCell(xml, 12, 2, 1, today())
  xml = fillTableCell(xml, 12, 2, 3, today())

  zip.file('word/document.xml', xml)
  return zip.generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

// ── RA CALCULATION ───────────────────────────────────────────────────────
// Placeholders in template use cyan highlight: [client name], [insert date] etc.
// XML splits them across multiple runs — requires pattern-matching replacement
export async function fillRATemplate(data, calc) {
  const zip = loadTemplate(raCalculationTemplate)
  let xml = zip.file('word/document.xml').asText()

  const reqInc  = Number(data.reqIncome || 0)
  const fund    = Number(data.currentFundValue || 0)
  const n       = calc.yrs || 0
  const r       = calc.interestRate || 0.06
  const intPct  = Math.round(r * 100)
  const ret     = calc.retirementAge || 65

  // Replace all cyan-highlighted placeholders
  const replacements = {
    '[client name]':             cName(data),
    '[insert date]':             today(),
    '[req income]':              reqInc.toLocaleString('en-ZA'),
    '[65 value]':                Math.round(calc.incomeAtRetirement || 0).toLocaleString('en-ZA'),
    '[fund value req]':          Math.round(calc.totalFundRequired || 0).toLocaleString('en-ZA'),
    '[fund value]':              fund.toLocaleString('en-ZA'),
    '[future investment value]': Math.round(calc.futureInvestmentValue || 0).toLocaleString('en-ZA'),
    '[shortfall]':               Math.round(calc.shortfall || 0).toLocaleString('en-ZA'),
    '[broker]':                  ADVISOR,
  }

  xml = replaceCyanPlaceholders(xml, replacements)

  // Also update the interest rate text (8% → actual rate)
  xml = xml.replace(/growth of 8%/g, `growth of ${intPct}%`)
  xml = xml.replace(/Interest Rate of 8%/g, `Interest Rate of ${intPct}%`)
  xml = xml.replace(/@ 8%/g, `@ ${intPct}%`)
  xml = xml.replace(/12\/8/g, `12/${intPct}`)

  zip.file('word/document.xml', xml)

  // Now fill the tables using docxtemplater approach via re-parsing
  // We generate the modified zip, then use it for table filling
  const blob1 = zip.generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

  // Re-open to fill tables
  const ab = await blob1.arrayBuffer()
  const zip2 = new PizZip(ab)
  let xml2 = zip2.file('word/document.xml').asText()

  // Fill inflation table (Table 0, 16 rows) and proposal tables (Table 1)
  // via direct XML table cell replacement
  const inflationRows = calc.inflationTable || []
  const indices = getEvenlySpacedIndices(inflationRows.length, 16)
  
  xml2 = fillTableRows(xml2, 0, indices.map(i => {
    const row = inflationRows[i]
    return [String(row.age), `R ${Math.round(row.income).toLocaleString('en-ZA')}`]
  }))

  // Table 1: proposal blocks at exact row offsets
  const blocks = [
    { base: 2,  prem: data.currentPremium || 0, esc: 10, fv: calc.currentFV || 0 },
    { base: 17, prem: calc.p2Premium || 0,       esc: 0,  fv: calc.p2FV || 0 },
    { base: 31, prem: calc.p3Premium || 0,       esc: 5,  fv: calc.p3FV || 0 },
  ]
  for (const { base, prem, esc, fv } of blocks) {
    xml2 = setTableCell(xml2, 1, base,    1, String(n))
    xml2 = setTableCell(xml2, 1, base+2,  1, `R ${Math.round(prem).toLocaleString('en-ZA')}`)
    xml2 = setTableCell(xml2, 1, base+4,  1, `${esc}%`)
    xml2 = setTableCell(xml2, 1, base+6,  1, `${intPct}%`)
    xml2 = setTableCell(xml2, 1, base+10, 1, `R ${Math.round(fv).toLocaleString('en-ZA')}`)
  }

  zip2.file('word/document.xml', xml2)
  return zip2.generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

function getEvenlySpacedIndices(total, count) {
  const indices = new Set([0])
  for (let i = 1; i < count - 1; i++) {
    indices.add(Math.round(i * (total - 1) / (count - 1)))
  }
  indices.add(total - 1)
  return [...indices].sort((a,b)=>a-b).slice(0, count)
}

export async function downloadFilledRA(data, calc) {
  const blob = await fillRATemplate(data, calc)
  const name = (data.fullName || data.registeredName || 'Client').replace(/\s+/g, '_').toUpperCase()
  saveAs(blob, `${name}_RA_Calculation.docx`)
}

export async function downloadFilledOnboarding(data) {
  const blob = await fillOnboardingTemplate(data)
  const name = (data.fullName || data.registeredName || 'Client').replace(/\s+/g, '_').toUpperCase()
  saveAs(blob, `${name}_Onboarding_Questionnaire.docx`)
}

export async function downloadFilledOngoing(data) {
  const blob = await fillOngoingTemplate(data)
  const name = (data.fullName || data.registeredName || 'Client').replace(/\s+/g, '_').toUpperCase()
  saveAs(blob, `${name}_Ongoing_DD.docx`)
}

export async function downloadFilledTransactional(data) {
  const blob = await fillTransactionalTemplate(data)
  const name = (data.fullName || data.registeredName || 'Client').replace(/\s+/g, '_').toUpperCase()
  saveAs(blob, `${name}_Transactional_DD.docx`)
}

export async function downloadFilledROA(data) {
  const blob = await fillROATemplate(data)
  const name = (data.fullName || data.registeredName || 'Client').replace(/\s+/g, '_').toUpperCase()
  saveAs(blob, `${name}_Risk_ROA_${new Date().toISOString().slice(0,10)}.docx`)
}
