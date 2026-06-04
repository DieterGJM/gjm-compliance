import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType } from 'docx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { saveAs } from 'file-saver'
import { calcRA, calcAge, calcYearsToRetirement, calcTax, calcFees,
  calcIncomeAtRetirement, calcTotalFundRequired, calcFutureInvestmentValue,
  calcShortfall, calcLiabilities, buildInflationTable, fmt } from './calculations'

const FIRM         = 'GJM Ultra Brokers'
const ADVISOR_NAME = 'Dieter Hartig'
const CO_NAME      = 'Tanya Van Niekerk'
// GJM brand colours
const NAVY  = '1a3a5c'
const GOLD  = 'C9A84C'
const LIGHT = 'F0F4F8'
const WHITE = 'FFFFFF'

function todayStr() {
  return new Date().toLocaleDateString('en-ZA', { day:'2-digit', month:'2-digit', year:'numeric' })
}

// ── DOCX primitives ───────────────────────────────────────────────────────────
const B  = t => new TextRun({ text: String(t ?? ''), bold:true,  font:'Calibri', size:22 })
const N  = t => new TextRun({ text: String(t ?? ''), bold:false, font:'Calibri', size:22 })
const BL = t => new TextRun({ text: String(t ?? ''), bold:true,  font:'Calibri', size:22, color:NAVY })

const sp = () => new Paragraph({ children:[N('')], spacing:{after:80} })

const BORDERS = {
  top:     {style:BorderStyle.SINGLE, size:1, color:'AAAAAA'},
  bottom:  {style:BorderStyle.SINGLE, size:1, color:'AAAAAA'},
  left:    {style:BorderStyle.SINGLE, size:1, color:'AAAAAA'},
  right:   {style:BorderStyle.SINGLE, size:1, color:'AAAAAA'},
  insideH: {style:BorderStyle.SINGLE, size:1, color:'AAAAAA'},
  insideV: {style:BorderStyle.SINGLE, size:1, color:'AAAAAA'},
}

function hdr(text) {
  return new Paragraph({
    children: [new TextRun({text, bold:true, font:'Calibri', size:24, color:NAVY})],
    spacing: {before:280, after:100},
    border: {bottom:{style:BorderStyle.SINGLE, size:8, color:GOLD, space:2}}
  })
}

function titleBar(text) {
  return new Paragraph({
    children: [new TextRun({text, bold:true, font:'Calibri', size:26, color:WHITE})],
    alignment: AlignmentType.CENTER,
    shading: {type:ShadingType.SOLID, fill:NAVY},
    spacing: {before:0, after:200}
  })
}

function twoCol(rows, labelWidth = 40) {
  return new Table({
    width: {size:100, type:WidthType.PERCENTAGE},
    borders: BORDERS,
    rows: rows.map(([label, value, bold]) =>
      new TableRow({ children: [
        new TableCell({
          children: [new Paragraph({children:[B(label)]})],
          width: {size:labelWidth, type:WidthType.PERCENTAGE},
          shading: {type:ShadingType.SOLID, fill:LIGHT},
        }),
        new TableCell({
          children: [new Paragraph({children:[bold ? B(value) : N(value)]})],
          shading: bold ? {type:ShadingType.SOLID, fill:'FFF5F5'} : undefined,
        }),
      ]})
    )
  })
}

function sigBlock(showCO = false) {
  return [
    sp(),
    new Paragraph({children:[B('EMPLOYEE WHO COMPLETED THE QUESTIONNAIRE')], spacing:{before:280}}),
    new Paragraph({children:[N(`Full name: ${ADVISOR_NAME}`)]}),
    new Paragraph({children:[N('Signature:\t_____________________________________________')]}),
    new Paragraph({children:[N(`Date:\t\t${todayStr()}`)]}),
    ...(showCO ? [
      sp(),
      new Paragraph({children:[B('FICA COMPLIANCE OFFICER (HIGH-RISK CLIENTS ONLY)')], spacing:{before:180}}),
      new Paragraph({children:[N(`Full name: ${CO_NAME}`)]}),
      new Paragraph({children:[N('Signature:\t_____________________________________________')]}),
      new Paragraph({children:[N('Date:\t\t_____________________________________________')]}),
    ] : [])
  ]
}

function makeDoc(children) {
  return new Document({
    sections: [{
      properties: { page: {
        size: {width:12240, height:15840},
        margin: {top:1080, right:1080, bottom:1080, left:1080}
      }},
      children
    }]
  })
}

function clientName(data) {
  return data.fullName || data.registeredName || '[Client Name]'
}
function clientId(data) {
  return data.clientType === 'legal' ? data.registrationNo : data.idNumber
}
function clientAddr(data) {
  return data.clientType === 'legal' ? data.registeredAddress : data.residentialAddress
}

// ─── ONBOARDING ────────────────────────────────────────────────────────────────
export function buildOnboardingDoc(data) {
  const factors = data.riskFactors || Array(8).fill(1)
  const score   = factors.reduce((s,v) => s + Number(v), 0)
  const band    = score <= 8 ? 'LOW RISK' : score <= 16 ? 'MEDIUM RISK' : 'HIGH RISK'
  const bandFill= score <= 8 ? 'F0FFF4'  : score <= 16 ? 'FEFCBF'      : 'FFF5F5'

  return makeDoc([
    titleBar(`${FIRM} — ONBOARDING QUESTIONNAIRE (${data.clientType === 'legal' ? 'LEGAL ENTITY' : 'NATURAL PERSON'})`),

    hdr('1. NEW OR EXISTING CLIENT'),
    new Paragraph({children:[N(data.isNew
      ? '☑  New Business Relationship\t\t\t☐  Existing Client'
      : '☐  New Business Relationship\t\t\t☑  Existing Client')]}),
    sp(),

    hdr('2. CLIENT DETAILS'),
    data.clientType === 'legal'
      ? twoCol([
          ['Registered Name', data.registeredName],
          ['Registration No.', data.registrationNo],
          ['VAT No.', data.vatNo],
          ['Registered Address', data.registeredAddress],
          ['Postal Address', data.postalAddress],
          ['Telephone No.', data.telephone],
          ['Mobile No.', data.mobile],
          ['Email Address', data.email],
          ['Contact Person', data.contactPerson],
          ['Contact Person ID No.', data.contactPersonId],
        ])
      : twoCol([
          ['Full Names', data.fullName],
          ['Date of Birth', data.dob],
          ['Identity No.', data.idNumber],
          ['Citizenship', data.citizenship || 'RSA'],
          ['Passport No.', data.passportNo || 'N/A'],
          ['Residential Address', data.residentialAddress],
          ['Postal Address', data.postalAddress || data.residentialAddress],
          ['Telephone No.', data.telephone],
          ['Mobile No.', data.mobile],
          ['Email Address', data.email],
        ]),
    sp(),

    hdr('3. NATURE OF BUSINESS RELATIONSHIP'),
    twoCol([
      ["Client's Occupation / Business Activity", data.occupation],
      ['Source of Income',  data.sourceOfIncome  || 'Salary'],
      ['Source of Wealth',  data.sourceOfWealth  || 'Income'],
      ['Services to be Provided to Client', data.services || 'Advice and intermediary services.'],
      ['Anticipated Frequency of Transactions', data.frequency || 'Annually and Ad hoc'],
      ['Expected Size of Transaction', data.transactionSize || 'Small'],
      ['Type of Financial Products', data.products || 'Investments'],
    ]),
    new Paragraph({children:[B('Further Details:')], spacing:{before:140}}),
    new Paragraph({children:[N(data.furtherDetails || 'N/A')]}),
    sp(),

    hdr('4. CLIENT SCREENING'),
    new Paragraph({children:[N(`Does the client's name appear on the TFS list?\t\t\t${data.tfs === 'yes' ? '☑  Yes\t        ☐  No' : '☐  Yes\t        ☑  No'}`)]}),
    new Paragraph({children:[N('(NB.: If YES, immediately refer to the FICA Compliance Officer)')], spacing:{before:60}}),
    sp(),

    hdr('5. FOREIGN POLITICALLY EXPOSED PERSON (PEP)'),
    new Paragraph({children:[N(`Is the client a Foreign PEP?\t\t\t\t\t${data.foreignPep === 'yes' ? '☑  Yes\t        ☐  No' : '☐  Yes\t        ☑  No'}`)]}),
    new Paragraph({children:[N('(NB.: If YES, immediately refer to the FICA Compliance Officer)')], spacing:{before:60}}),
    sp(),

    hdr('6. DOMESTIC POLITICALLY EXPOSED PERSON (PEP)'),
    new Paragraph({children:[N(`Is the client a Domestic PEP?\t\t\t\t\t${data.domesticPep === 'yes' ? '☑  Yes\t        ☐  No' : '☐  Yes\t        ☑  No'}`)]}),
    sp(),

    hdr('7. PROMINENT INFLUENTIAL PERSON (PIP)'),
    new Paragraph({children:[N(`Is the client a PIP?\t\t\t\t\t\t${data.pip === 'yes' ? '☑  Yes\t        ☐  No' : '☐  Yes\t        ☑  No'}`)]}),
    sp(),

    hdr('8. CLIENT RISK PROFILE'),
    new Table({
      width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[
        new TableRow({ tableHeader:true, children:[
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Factor',bold:true,font:'Calibri',size:22,color:WHITE})]})], width:{size:55,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'LOW (1)',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'MEDIUM (2)',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'HIGH (3)',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
        ]}),
        ...RISK_FACTORS.map((factor, i) => {
          const v = Number(factors[i] ?? 1)
          return new TableRow({ children:[
            new TableCell({children:[new Paragraph({children:[N(factor)]})]}),
            new TableCell({children:[new Paragraph({children:[N(v===1?'☑':'☐')], alignment:AlignmentType.CENTER})]}),
            new TableCell({children:[new Paragraph({children:[N(v===2?'☑':'☐')], alignment:AlignmentType.CENTER})]}),
            new TableCell({children:[new Paragraph({children:[N(v===3?'☑':'☐')], alignment:AlignmentType.CENTER})]}),
          ]})
        }),
        new TableRow({ children:[
          new TableCell({children:[new Paragraph({children:[B(`TOTAL: ${score}`)]})] , columnSpan:2, shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[B(band)]})], columnSpan:2, shading:{type:ShadingType.SOLID,fill:bandFill}}),
        ]}),
        new TableRow({ children:[
          new TableCell({children:[new Paragraph({children:[N('LOW RISK: 0 – 8')]})],    shading:{type:ShadingType.SOLID,fill:'F0FFF4'}}),
          new TableCell({children:[new Paragraph({children:[N('MEDIUM RISK: 9 – 16')]})], shading:{type:ShadingType.SOLID,fill:'FEFCBF'}}),
          new TableCell({children:[new Paragraph({children:[N('HIGH RISK: 17+')]})],       shading:{type:ShadingType.SOLID,fill:'FFF5F5'}}),
          new TableCell({children:[new Paragraph({children:[N('')]})]}),
        ]}),
      ]
    }),
    sp(),

    hdr('9. ACCEPTANCE AND SIGN-OFF'),
    new Paragraph({children:[N(data.decision === 'decline' ? '☐  Accept\t\t☑  Decline' : '☑  Accept\t\t☐  Decline')]}),
    new Paragraph({children:[B('Reason: ')], spacing:{before:100}}),
    new Paragraph({children:[N(data.decisionReason || 'The client is a high earner with a good understanding of risk or investment products. Due diligence was done on the client, who was assessed as low risk.')]}),
    sp(),
    ...(data.onboardingSignoff ? [
      new Paragraph({children:[N(data.onboardingSignoff)], spacing:{before:100, after:120}}),
    ] : []),
    ...sigBlock(true)
  ])
}

// ─── ONGOING DD ────────────────────────────────────────────────────────────────
export function buildOngoingDDDoc(data) {
  const answers = data.ongoingAnswers || []
  const ONGOING_Q = [
    {q:"Was the time-frame for completing the Ongoing DD consistent with your RMPC and the client's risk profile.  If NO, please provide reasons:", n:"(Complete a new Client Onboarding Questionnaire)"},
    {q:"Have you verified the client's information against the information on record?", n:"(If NO please do so before continuing with this Questionnaire)"},
    {q:"Has any of the client's circumstances or information changed since the last Questionnaire?", n:"(If YES, please complete a new Client Onboarding Questionnaire)"},
    {q:"Has the client completed more than 1 transaction during the business relationship?", n:""},
    {q:"If YES, were the transactions conducted consistent with your knowledge of the client, the client's business, etc?", n:""},
    {q:"If NO, were any transactions complex, unusual or unusually large without any apparent business or lawful purpose?", n:"(If YES, please complete a new Client Onboarding Questionnaire)"},
    {q:"If Yes, were the funds/Income easily identifiable and traceable?", n:""},
    {q:"If NO, are there grounds to report a suspicion of money laundering, terrorist financing or proliferation financing?", n:"(Immediately refer the matter to the FICA Compliance Officer)"},
  ]
  return makeDoc([
    titleBar(`${FIRM} — ONGOING DUE DILIGENCE QUESTIONNAIRE`),
    hdr('1. CLIENT DETAILS'),
    twoCol([
      ['Full Names / Registration Name', clientName(data)],
      ['Identity / Passport / Registration / Trust / Other', clientId(data)],
      ['Address', clientAddr(data)],
      ['Telephone No.', data.telephone],
      ['Mobile No.', data.mobile],
      ['Email Address', data.email],
    ]),
    sp(),
    hdr('2. ONGOING DUE DILIGENCE'),
    new Paragraph({children:[N(`What was your client's risk profile?		${
      data.ongoingRisk==='high'   ? '☐ Low			☐ Medium			☑ High'
      : data.ongoingRisk==='medium' ? '☐ Low			☑ Medium			☐ High'
      : '☑ Low			☐ Medium			☐ High'
    }`)]}),
    sp(),
    new Paragraph({children:[N('When was the last Ongoing Due Diligence Questionnaire completed?')], spacing:{before:100, after:80}}),
    new Table({
      width:{size:45, type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[
        new TableRow({tableHeader:true, children:[
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'MONTHS',bold:true,font:'Calibri',size:22,color:WHITE})]})], columnSpan:4, shading:{type:ShadingType.SOLID,fill:NAVY}})
        ]}),
        new TableRow({children:[
          ...['12','24','36','>36'].map(m => new TableCell({
            children:[new Paragraph({children:[data.monthsCheckbox===m ? B('☑ '+m) : N('☐ '+m)], alignment:AlignmentType.CENTER})],
          }))
        ]})
      ]
    }),
    new Paragraph({children:[new TextRun({text:'(If longer than 36 months, please complete a new Client Onboarding Questionnaire)', italics:true, font:'Calibri', size:20})], spacing:{before:60, after:160}}),
    new Table({
      width:{size:100, type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[
        new TableRow({tableHeader:true, children:[
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'',bold:true,font:'Calibri',size:22,color:WHITE})]})], width:{size:76,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'YES',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'NO',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
        ]}),
        ...ONGOING_Q.map(({q,n}, i) => new TableRow({children:[
          new TableCell({children:[
            new Paragraph({children:[N(q)]}),
            ...(n ? [new Paragraph({children:[new TextRun({text:n, bold:true, font:'Calibri', size:20})], spacing:{before:40}})] : [])
          ]}),
          new TableCell({children:[new Paragraph({children:[N(answers[i]==='yes'?'☑':'☐')], alignment:AlignmentType.CENTER})]}),
          new TableCell({children:[new Paragraph({children:[N(answers[i]==='no'?'☑':'☐')], alignment:AlignmentType.CENTER})]}),
        ]}))
      ]
    }),
    sp(),
    hdr('3. SIGN-OFF PROCESS'),
    new Paragraph({children:[B('Provide additional details/reasons for proceeding with the business relationship:')], spacing:{before:80, after:80}}),
    new Paragraph({children:[N(data.ongoingSignoffNote || `The transaction is consistent with ${FIRM} knowledge of the client. Ongoing customer due diligence has been conducted, and client remains low risk`)]}),
    sp(),
    ...sigBlock(true)
  ])
}

// ─── TRANSACTIONAL DD ──────────────────────────────────────────────────────────
export function buildTransactionalDDDoc(data) {
  const yn = v => v === 'yes' ? '☑  Yes	        ☐  No' : '☐  Yes	        ☑  No'
  return makeDoc([
    titleBar(`${FIRM} — TRANSACTIONAL DUE DILIGENCE QUESTIONNAIRE`),
    hdr('1. CLIENT DETAILS'),
    twoCol([
      ['Full Names / Registration Name', clientName(data)],
      ['Identity / Passport / Registration / Trust / Other', clientId(data)],
      ['Address', clientAddr(data)],
      ['Telephone No.', data.telephone],
      ['Mobile No.', data.mobile],
      ['Email Address', data.email],
    ]),
    sp(),
    hdr('2. REVIEW QUESTIONS'),
    new Paragraph({children:[N(`How many months have passed since the initial Client Onboarding Questionnaire was completed?		${data.monthsSinceOnboarding || ''}`)], spacing:{before:100}}),
    new Paragraph({children:[new TextRun({text:'(If longer than 36 months, please complete a new Client Onboarding Questionnaire)', italics:true, font:'Calibri', size:20})], spacing:{after:120}}),
    new Paragraph({children:[N(`When was the last business transaction concluded?		${data.lastTransactionDate || ''}`)], spacing:{before:80, after:80}}),
    sp(),
    ...[
      {l:'Has any information changed since the initial Client Onboarding Questionnaire was completed?',                                                                                      v:data.infoChanged,     n:'(If YES, please complete a new Client Onboarding Questionnaire)'},
      {l:'Is the frequency of transactions consistent with your knowledge of the client?',                                                                                                    v:data.freqConsistent,  n:'(If NO, please complete a new Client Onboarding Questionnaire)'},
      {l:'Is the size of the transaction consistent with your knowledge of the client?',                                                                                                      v:data.sizeConsistent,  n:'(If NO, please complete a new Client Onboarding Questionnaire)'},
      {l:'Is the transaction complex, unusual or unusually large or without any apparent business or lawful purposes?',                                                                       v:data.unusual,         n:'(If YES, please complete a new Client Onboarding Questionnaire and refer to the FICA Compliance Officer or Senior Manager)'},
      {l:'Are there any behavioural risk indicators present?',                                                                                                                                v:data.behaviouralRisk, n:'(If YES, please complete a new Client Onboarding Questionnaire)'},
      {l:'Has there been any material change in the way in which you interact with your client, e.g. instruction channelled through third-party or non-face-to-face vs face-to-face etc.?',  v:data.materialChange,  n:'(If YES, please complete a new Client Onboarding Questionnaire)'},
      {l:"Since the last interaction, has there been any change to the client's status as a Foreign or Domestic PEP or PIP?",                                                                 v:data.pepChange,       n:'(If YES, please complete a new Client Onboarding Questionnaire)'},
    ].flatMap(({l,v,n}) => [
      new Paragraph({children:[N(`${l}		${yn(v)}`)], spacing:{before:120}}),
      new Paragraph({children:[new TextRun({text:n, italics:true, font:'Calibri', size:20})], spacing:{after:60}}),
    ]),
    sp(),
    twoCol([
      ['Date on which current transaction was concluded', data.transactionDate || ''],
      ['Nature of the relationship', data.isNew ? '☐ NEW CLIENT	        ☑ EXISTING CLIENT' : '☑ NEW CLIENT	        ☐ EXISTING CLIENT'],
      ['Amount and currency of this transaction', data.transactionAmount ? `R ${Number(data.transactionAmount).toLocaleString('en-ZA')}` : 'R'],
      ['Parties to this transaction (advisor, client, provider, etc)', data.transactionParties || `Dieter Hartig, ${clientName(data)}`],
      ['The nature of this transaction', data.transactionNature || 'Business Relationship'],
    ]),
    sp(),
    hdr('3. SIGN-OFF PROCESS'),
    new Paragraph({children:[B('Provide additional details/reasons for proceeding with the business relationship:')], spacing:{before:80, after:80}}),
    new Paragraph({children:[N(data.transactionalSignoffNote || '')]}),
    sp(),
    ...(data.transactionalSignoff ? [
      new Paragraph({children:[N(data.transactionalSignoff)], spacing:{before:100, after:120}}),
    ] : []),
    ...sigBlock(true)
  ])
}

// ─── RA CALCULATION ────────────────────────────────────────────────────────────
// Matches the real manually-completed document exactly
export function buildRADoc(data) {
  const calc     = calcRA(data)
  const cName    = clientName(data)
  const reqInc   = Number(data.reqIncome) || 0
  const intRate  = calc.interestRate
  const intPct   = (intRate * 100).toFixed(0)

  // Build a single FV proposal block matching the real doc layout
  function fvBlock(label, premium, escalation, fv) {
    const annualPrem = (Number(premium) || 0) * 12
    return [
      new Paragraph({children:[B(`Calculation of future value\t\t\t${label}`)], spacing:{before:200, after:80}}),
      new Table({
        width:{size:70, type:WidthType.PERCENTAGE}, borders:BORDERS,
        rows:[
          new TableRow({ tableHeader:true, children:[
            new TableCell({children:[new Paragraph({children:[new TextRun({text:'',bold:true,font:'Calibri',size:22,color:WHITE})]})], width:{size:65,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:NAVY}}),
            new TableCell({children:[new Paragraph({children:[new TextRun({text:label,bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
          ]}),
          twoColInner('Savings Term', `${calc.yrs}`),
          twoColInner('Initial savings amount in first year', premium ? `R ${Number(premium).toLocaleString('en-ZA')},00` : ''),
          twoColInner('Annual increase in savings', escalation ? `${escalation}%` : '0%'),
          twoColInner('Assumed annual effective investment return', `${intPct}%`),
          twoColInner('Payment frequency', 'Monthly'),
          twoColInner('Future Value at assumed rates', fv ? `${fmt(fv)},00` : '', true),
        ]
      }),
      sp(),
    ]
  }

  return makeDoc([
    // Header line matching real doc
    new Paragraph({
      children: [
        B(`Client: ${cName}`),
        new TextRun({text:`\t\t\t\t\tDate calculated: ${todayStr()}`, font:'Calibri', size:22}),
      ],
      spacing:{after:160}
    }),

    // Intro paragraph — exactly matching real doc wording
    new Paragraph({
      children:[N(`With reference to a required income of R${reqInc.toLocaleString('en-ZA')} per month at age ${calc.retirementAge} for retirement purposes, we have used an inflationary factor of 6.5% in conjunction with an estimated growth of ${intPct}%. These, we believe are highly realistic and achievable factors.`)],
      spacing:{after:200}
    }),

    // Inflation table heading
    new Paragraph({children:[B(`R${reqInc.toLocaleString('en-ZA')} compounded at 6.5% Inflationary Rate`)], spacing:{after:80}}),

    // Inflation table — current age to retirement age only
    new Table({
      width:{size:45, type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows: calc.inflationTable.map(row =>
        new TableRow({ children:[
          new TableCell({children:[new Paragraph({children:[row.age===calc.retirementAge?B(String(row.age)):N(String(row.age))]})], shading: row.age===calc.retirementAge?{type:ShadingType.SOLID,fill:LIGHT}:undefined}),
          new TableCell({children:[new Paragraph({children:[row.age===calc.retirementAge?B(fmt(row.income)):N(fmt(row.income))]})], shading: row.age===calc.retirementAge?{type:ShadingType.SOLID,fill:LIGHT}:undefined}),
        ]})
      )
    }),
    sp(),

    // Total fund required
    new Paragraph({children:[B('Total Fund Value Required:')], spacing:{before:200, after:80}}),
    new Paragraph({children:[N(`${fmt(calc.incomeAtRetirement)} x 12/${intPct} (%) = ${fmt(calc.totalFundRequired)}`)]}, ),
    sp(),

    // Less current capital
    new Paragraph({children:[B(`Less current capital of R${Number(data.currentFundValue||0).toLocaleString('en-ZA')} compounded at an Interest Rate of ${intPct}%`)], spacing:{before:160, after:80}}),
    new Paragraph({children:[N(`R${Number(data.currentFundValue||0).toLocaleString('en-ZA')} compounded to age ${calc.retirementAge} @ ${intPct}% = ${fmt(calc.futureInvestmentValue)}`)]}),
    sp(),

    // Shortfall
    new Paragraph({children:[B('Shortfall:')], spacing:{before:160, after:80}}),
    new Paragraph({children:[B(fmt(calc.shortfall))]}),
    new Paragraph({children:[new TextRun({text:`Suggested minimum monthly premium to cover shortfall (0% escalation @ ${(calc.interestRate*100).toFixed(0)}%): ${fmt(calc.suggestedMonthlyPremium)} p/m`, italics:true, font:'Calibri', size:20, color:'666666'})], spacing:{before:60, after:200}}),

    // Proposals header
    new Paragraph({children:[B('Initial:')], spacing:{before:160}}),
    new Paragraph({children:[B(`R${reqInc.toLocaleString('en-ZA')} p/m at ${calc.retirementAge}:`), N(`\t\tShortfall ${fmt(calc.shortfall)}`)], spacing:{before:80, after:80}}),

    // Three FV proposal blocks (Current, Proposed 2, Proposed 3) matching real doc
    ...fvBlock('Current',    data.currentPremium, data.currentEscalation, calc.currentFV),
    ...fvBlock('Proposed 2', data.p2Premium,      data.p2Escalation,      calc.p2FV),
    ...fvBlock('Proposed 3', data.p3Premium,       data.p3Escalation,      calc.p3FV),

    sp(), sp(),
    new Paragraph({children:[B(`${cName}: `), N('________________________'), B('\t\tDate: '), N('__________________')]}),
    sp(),
    new Paragraph({children:[B(`${ADVISOR_NAME}: `), N('_______________________'), B('\t\tDate: '), N('__________________')]}),
  ])
}

// Helper for inner two-col rows in the FV tables
function twoColInner(label, value, highlight = false) {
  return new TableRow({ children:[
    new TableCell({children:[new Paragraph({children:[B(label)]})], width:{size:65,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:LIGHT}}),
    new TableCell({children:[new Paragraph({children:[highlight ? B(value) : N(value)]})], shading: highlight?{type:ShadingType.SOLID,fill:'EEF2F7'}:undefined}),
  ]})
}

// ─── FNA CALCULATOR ────────────────────────────────────────────────────────────
export function buildFNADoc(data) {
  const age    = calcAge(data.dob)
  const retAge = Number(data.retirementAge) || 65
  const yrs    = calcYearsToRetirement(age, retAge)
  const tax    = calcTax(data.grossIncome)
  const inc65  = calcIncomeAtRetirement(age, data.reqIncome, retAge)
  const tfr    = calcTotalFundRequired(inc65, Number(data.interestRate)/100 || 0.06)
  const fiv    = calcFutureInvestmentValue(data.currentFundValue, yrs, Number(data.interestRate)/100 || 0.06)
  const sf     = calcShortfall(tfr, fiv)
  const fees   = calcFees(data.currentFundValue, yrs)
  const liab   = calcLiabilities(data)
  const cName  = clientName(data)

  return makeDoc([
    titleBar(`${FIRM} — FINANCIAL NEEDS ANALYSIS`),

    hdr('CLIENT DETAILS'),
    twoCol([
      ['Client Name', cName],
      ['Date of Birth', data.dob || ''],
      ['Current Age', String(age || '')],
      ['Retirement Age', String(retAge)],
      ['Years to Retirement', String(yrs || '')],
      ['Gross Monthly Income', fmt(data.grossIncome)],
      ['Net Monthly Income', fmt(tax.netMonthly)],
      ['Tax Bracket', tax.bracket || ''],
      ['Max RA Contribution (p/m)', fmt(tax.maxRAmonthly)],
      ['SARS Rebate on RA Contribution', fmt(tax.sarsRebate)],
      ['Net Cost of RA Contribution', fmt(tax.netCostOfContribution)],
      ['Date Calculated', todayStr()],
    ]),
    sp(),

    hdr('RETIREMENT ANNUITY CALCULATION'),
    twoCol([
      ['Required Monthly Income at Retirement', fmt(data.reqIncome)],
      ['Inflation Rate', '6.5% p.a.'],
      ['Investment Return Rate', `${(Number(data.interestRate)||6).toFixed(0)}%`],
      ['Inflation-Adjusted Income at Retirement Age', fmt(inc65)],
      ['Total Fund Value Required (income × 12 / rate)', fmt(tfr)],
      ['Current RA Fund Value', fmt(data.currentFundValue)],
      ['Future Investment Value', fmt(fiv)],
      ['SHORTFALL', fmt(sf), true],
      ['Penalties', fmt(data.penalties || 0)],
    ]),
    sp(),

    hdr('FEES & PENALTY ANALYSIS'),
    twoCol([
      ['Allan Gray Fee (1.15% of fund)', fmt(fees.allanGrayFee)],
      ['Estimated Existing Fee (3% of fund)', fmt(fees.existingFee)],
      ['Annual Fee Saving', fmt(fees.feeSavings)],
      ['Fee Saving to Retirement', fmt(fees.feeSavingsToRetirement)],
    ]),
    sp(),

    hdr('LIFE INSURANCE FNA — LIABILITIES & CASH NEEDS'),
    twoCol([
      ['Mortgages', fmt(data.mortgages || 0)],
      ['Loans and Other Debts', fmt(data.loans || 0)],
      ['Final Expenses (burial, probate, taxes, legal fees)', fmt(data.finalExpenses || 0)],
      ['Education Fund (R120 000 × years × children)', fmt(data.educationFund || 0)],
      ['Child / Home Care (Spouse and Children)', fmt(data.childCare || 0)],
      ['Other Cash Needs (emergency fund, bequests etc.)', fmt(data.otherCashNeeds || 0)],
      ['TOTAL LIABILITIES & CASH NEEDS', fmt(liab.totalLiabilities), true],
    ]),
    sp(),

    hdr('INCOME ANALYSIS'),
    twoCol([
      ['Gross Annual Income Needed', fmt(data.grossAnnualIncomeNeeded || 0)],
      ["Partner's Income", fmt(data.partnerIncome || 0)],
      ['Gross Income Available', fmt(liab.grossIncomeAvailable)],
      ['Annual Income Shortage / Surplus', fmt(liab.incomeShortage)],
      ['Assumed Rate of Return', `${data.assumedReturn || 0}%`],
      ['Amount Needed to Meet Income Shortage', fmt(liab.amountNeededForIncome)],
      ['TOTAL AMOUNT OF MONEY REQUIRED', fmt(liab.totalMoneyRequired), true],
    ]),
    sp(),

    hdr('ASSETS (USABLE BY FAMILY / PARTNER)'),
    twoCol([
      ['Cash Assets (Cash / Unit Trust / Savings)', fmt(data.cashAssets || 0)],
      ['Stocks or Bonds', fmt(data.stocksBonds || 0)],
      ['Principal Residence', fmt(data.principalResidence || 0)],
      ['Secondary Residence', fmt(data.secondaryResidence || 0)],
      ['Total Life Insurance (group / personal / mortgage / credit)', fmt(data.totalLifeInsurance || 0)],
      ['Business / Farm Assets', fmt(data.businessAssets || 0)],
      ['Other Assets (e.g. pension / investments)', fmt(data.otherAssets || 0)],
      ['RA Fund Value', fmt(data.currentFundValue || 0)],
      ['TOTAL SHORTFALL', fmt(liab.liabilityShortfall), true],
    ]),
    sp(),

    hdr('EXISTING COVER SUMMARY'),
    new Paragraph({
      children:[N(`Based on the client's current risk cover needs, client has existing Life cover: ${fmt(data.lifeCover || 0)}; Disability: ${fmt(data.disabilityCover || 0)}; Dread Disease: ${fmt(data.dreadDiseaseCover || 0)} and income benefits of ${fmt(data.incomeBenefits || 0)} monthly. Based on the above calculation, the cover provided will be sufficient in terms of the client's current needs and liabilities.`)],
      spacing:{after:200}
    }),
    sp(), sp(),
    new Paragraph({children:[B(`${cName}: `), N('____________________________'), B('   Date: '), N('__________________')]}),
    sp(),
    new Paragraph({children:[B(`${ADVISOR_NAME}: `), N('____________________________'), B('   Date: '), N('__________________')]}),
  ])
}

// ─── PDF ──────────────────────────────────────────────────────────────────────
export function downloadPdf(data, docType) {
  const pdf   = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'})
  const pageW = pdf.internal.pageSize.getWidth()
  const M     = 15
  let y       = 20

  // Header bar
  pdf.setFillColor(26, 58, 92)
  pdf.rect(0, 0, pageW, 18, 'F')
  pdf.setFillColor(201, 168, 76)
  pdf.rect(0, 18, pageW, 2, 'F')
  pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold'); pdf.setFontSize(11)
  pdf.text(`${FIRM} — ${docType.toUpperCase()}`, pageW/2, 12, {align:'center'})
  pdf.setTextColor(0,0,0); y = 28

  const sec = title => {
    if (y > 255) { pdf.addPage(); y = 20 }
    pdf.setFont('helvetica','bold'); pdf.setFontSize(10); pdf.setTextColor(26,58,92)
    pdf.text(title, M, y)
    pdf.setDrawColor(201,168,76); pdf.setLineWidth(0.5)
    pdf.line(M, y+2, pageW-M, y+2)
    y += 8; pdf.setTextColor(0,0,0)
  }

  const tbl = rows => {
    if (!rows?.length) return
    autoTable(pdf, {
      startY: y, head:[], body: rows.map(([k,v]) => [k, String(v||'')]),
      margin:{left:M, right:M},
      styles:{fontSize:9, cellPadding:2},
      columnStyles:{0:{fontStyle:'bold', fillColor:[240,244,248], cellWidth:85}, 1:{cellWidth:'auto'}},
      didDrawPage: () => {}
    })
    y = pdf.lastAutoTable.finalY + 5
  }

  if (docType === 'RA Calculation') {
    const calc  = calcRA(data)
    const cName = clientName(data)
    const intPct = (calc.interestRate * 100).toFixed(0)
    pdf.setFont('helvetica','bold'); pdf.setFontSize(10)
    pdf.text(`Client: ${cName}`, M, y)
    pdf.text(`Date: ${todayStr()}`, pageW-M, y, {align:'right'}); y += 8
    pdf.setFont('helvetica','normal'); pdf.setFontSize(9)
    const intro = `With reference to a required income of R${Number(data.reqIncome||0).toLocaleString('en-ZA')} per month at age ${calc.retirementAge} for retirement purposes, we have used an inflationary factor of 6.5% in conjunction with an estimated growth of ${intPct}%.`
    const lines = pdf.splitTextToSize(intro, pageW - M*2)
    pdf.text(lines, M, y); y += lines.length * 5 + 4

    sec(`R${Number(data.reqIncome||0).toLocaleString('en-ZA')} COMPOUNDED AT 6.5% — AGE ${calc.age} TO ${calc.retirementAge}`)
    tbl(calc.inflationTable.map(r => [String(r.age), fmt(r.income)]))

    sec('FUND CALCULATION')
    tbl([
      [`Income at age ${calc.retirementAge} (inflation adjusted)`, fmt(calc.incomeAtRetirement)],
      [`Total Fund Value Required (×12/${intPct}%)`, fmt(calc.totalFundRequired)],
      [`Current Fund compounded @ ${intPct}% for ${calc.yrs} years`, fmt(calc.futureInvestmentValue)],
      ['SHORTFALL', fmt(calc.shortfall)],
      ['Penalties', fmt(data.penalties||0)],
      ['Annual Fee Saving (Allan Gray)', fmt(calc.fees.feeSavings)],
      ['Total Fee Saving to Retirement', fmt(calc.fees.feeSavingsToRetirement)],
    ])

    for (const [label, prem, esc, fv] of [
      ['Current',    data.currentPremium, data.currentEscalation, calc.currentFV],
      ['Proposed 2', data.p2Premium,      data.p2Escalation,      calc.p2FV],
      ['Proposed 3', data.p3Premium,      data.p3Escalation,      calc.p3FV],
    ]) {
      sec(`CALCULATION OF FUTURE VALUE — ${label.toUpperCase()}`)
      tbl([
        ['Savings Term (yrs)', String(calc.yrs)],
        ['Initial Savings Amount (annual)', fmt((Number(prem)||0)*12)],
        ['Monthly Premium', fmt(prem)],
        ['Annual Increase in Savings', `${esc||0}%`],
        ['Assumed Annual Effective Investment Return', `${intPct}%`],
        ['Payment Frequency', 'Monthly'],
        ['Future Value at Assumed Rates', fmt(fv)],
      ])
    }

  } else if (docType === 'FNA Calculator') {
    const age2  = calcAge(data.dob)
    const retAge2 = Number(data.retirementAge) || 65
    const yrs2  = calcYearsToRetirement(age2, retAge2)
    const tax   = calcTax(data.grossIncome)
    const liab  = calcLiabilities(data)
    const intR  = Number(data.interestRate)/100 || 0.06
    const inc65 = calcIncomeAtRetirement(age2, data.reqIncome, retAge2)
    const tfr   = calcTotalFundRequired(inc65, intR)
    const fiv   = calcFutureInvestmentValue(data.currentFundValue, yrs2, intR)
    const sf    = calcShortfall(tfr, fiv)
    const fees  = calcFees(data.currentFundValue, yrs2)

    sec('CLIENT & INCOME DETAILS')
    tbl([
      ['Client', clientName(data)],
      ['Age', String(age2||'')],
      ['Retirement Age', String(retAge2)],
      ['Years to Retirement', String(yrs2||'')],
      ['Gross Monthly Income', fmt(data.grossIncome)],
      ['Net Monthly Income', fmt(tax.netMonthly)],
      ['Tax Bracket', tax.bracket||''],
      ['Max RA Contribution (p/m)', fmt(tax.maxRAmonthly)],
      ['Net Cost of RA Contribution', fmt(tax.netCostOfContribution)],
    ])
    sec('RA SHORTFALL ANALYSIS')
    tbl([
      ['Inflation-Adjusted Income at Retirement', fmt(inc65)],
      ['Total Fund Value Required', fmt(tfr)],
      ['Future Investment Value', fmt(fiv)],
      ['SHORTFALL', fmt(sf)],
      ['Annual Fee Saving', fmt(fees.feeSavings)],
      ['Fee Saving to Retirement', fmt(fees.feeSavingsToRetirement)],
    ])
    sec('LIABILITIES & CASH NEEDS')
    tbl([
      ['Mortgages', fmt(data.mortgages||0)],
      ['Loans & Other Debts', fmt(data.loans||0)],
      ['Final Expenses', fmt(data.finalExpenses||0)],
      ['Education Fund', fmt(data.educationFund||0)],
      ['Child / Home Care', fmt(data.childCare||0)],
      ['Other Cash Needs', fmt(data.otherCashNeeds||0)],
      ['TOTAL LIABILITIES', fmt(liab.totalLiabilities)],
    ])
    sec('ASSETS & FINAL SHORTFALL')
    tbl([
      ['Cash Assets', fmt(data.cashAssets||0)],
      ['Stocks or Bonds', fmt(data.stocksBonds||0)],
      ['Principal Residence', fmt(data.principalResidence||0)],
      ['Life Insurance', fmt(data.totalLifeInsurance||0)],
      ['Other Assets', fmt(data.otherAssets||0)],
      ['RA Fund Value', fmt(data.currentFundValue||0)],
      ['TOTAL SHORTFALL', fmt(liab.liabilityShortfall)],
    ])
    sec('EXISTING COVER')
    tbl([
      ['Life Cover', fmt(data.lifeCover||0)],
      ['Disability', fmt(data.disabilityCover||0)],
      ['Dread Disease', fmt(data.dreadDiseaseCover||0)],
      ['Income Benefit (p/m)', fmt(data.incomeBenefits||0)],
    ])

  } else if (docType === 'Onboarding Questionnaire') {
    const score = (data.riskFactors||Array(8).fill(1)).reduce((s,v)=>s+Number(v),0)
    sec('CLIENT DETAILS')
    tbl(data.clientType==='legal'
      ? [['Registered Name',data.registeredName],['Reg No.',data.registrationNo],['Address',data.registeredAddress],['Email',data.email]]
      : [['Full Names',data.fullName],['ID No.',data.idNumber],['DOB',data.dob],['Address',data.residentialAddress],['Mobile',data.mobile],['Email',data.email]])
    sec('NATURE OF BUSINESS')
    tbl([['Occupation',data.occupation],['Source of Income',data.sourceOfIncome],['Source of Wealth',data.sourceOfWealth],['Products',data.products]])
    sec('SCREENING & RISK PROFILE')
    tbl([
      ['TFS List', data.tfs==='yes'?'YES ⚠ REFER TO CO':'No'],
      ['Foreign PEP', data.foreignPep==='yes'?'YES ⚠ REFER TO CO':'No'],
      ['Domestic PEP', data.domesticPep==='yes'?'YES':'No'],
      ['PIP', data.pip==='yes'?'YES':'No'],
      ['Risk Score', `${score} — ${score<=8?'LOW':score<=16?'MEDIUM':'HIGH'} RISK`],
      ['Decision', data.decision==='decline'?'Decline':'Accept'],
      ['Reason', data.decisionReason||''],
    ])
  } else if (docType === 'Ongoing Due Diligence') {
    sec('CLIENT DETAILS')
    tbl([['Full Names', clientName(data)],['ID / Reg No.',clientId(data)],['Address',clientAddr(data)],['Mobile',data.mobile],['Email',data.email]])
    sec('ONGOING DUE DILIGENCE')
    tbl([['Risk Profile',(data.ongoingRisk||'low').toUpperCase()],['Months since last DD',data.monthsSinceLastDD||''],
      ...ONGOING_QUESTIONS.map((q,i) => [q.substring(0,55)+'…', (data.ongoingAnswers?.[i]||'').toUpperCase()])])
  } else if (docType === 'Transactional DD') {
    sec('CLIENT DETAILS')
    tbl([['Full Names',clientName(data)],['ID / Reg No.',clientId(data)],['Mobile',data.mobile],['Email',data.email]])
    sec('TRANSACTION DETAILS')
    tbl([
      ['Months since Onboarding', data.monthsSinceOnboarding||''],
      ['Transaction Date', data.transactionDate||''],
      ['Amount', data.transactionAmount ? `R ${Number(data.transactionAmount).toLocaleString('en-ZA')}` : ''],
      ['Nature', data.transactionNature||''],
      ['Unusual transaction', data.unusual==='yes'?'YES':'No'],
      ['Behavioural risk indicators', data.behaviouralRisk==='yes'?'YES':'No'],
    ])
  }

  // Footer
  if (y > 255) { pdf.addPage(); y = 20 }
  y += 10
  pdf.setFont('helvetica','bold'); pdf.setFontSize(9)
  pdf.text(`Advisor: ${ADVISOR_NAME}`, M, y)
  pdf.text(`Date: ${todayStr()}`, pageW-M, y, {align:'right'}); y += 6
  pdf.text(`CO: ${CO_NAME}`, M, y); y += 12
  pdf.setDrawColor(180,180,180); pdf.setLineWidth(0.3)
  pdf.line(M, y, M+60, y); pdf.text('Advisor Signature', M, y+4)
  pdf.line(pageW-M-60, y, pageW-M, y); pdf.text('CO Signature', pageW-M-60, y+4)

  pdf.save(`${clientName(data).replace(/\s+/g,'_')}_${docType.replace(/\s+/g,'_')}.pdf`)
}

// ─── Export helpers ───────────────────────────────────────────────────────────
export async function downloadDocx(doc, filename) {
  const buffer = await Packer.toBlob(doc)
  saveAs(buffer, `${filename}.docx`)
}

// ─── Constants ────────────────────────────────────────────────────────────────
export const RISK_FACTORS = [
  'Interaction with client (e.g. face-to-face)',
  'Client co-operation and behaviour',
  "Transaction within the client's financial means",
  'Size of transaction',
  'Product selection',
  "Client's geographical location",
  'Client type (e.g. Foreign national, SA Citizen)',
  'Client activities / occupation (source of income / wealth)',
]

export const ONGOING_QUESTIONS = [
  "Was the time-frame for completing the Ongoing DD consistent with your RMCP and the client's risk profile?",
  "Have you verified the client's information against the information on record?",
  "Has any of the client's circumstances or information changed since the last Questionnaire?",
  'Has the client completed more than 1 transaction during the business relationship?',
  'If YES above, were the transactions consistent with your knowledge of the client?',
  'Were any transactions complex, unusual or unusually large without any apparent business or lawful purpose?',
  'Were the funds / income easily identifiable and traceable?',
  'Are there grounds to report a suspicion of money laundering, terrorist financing or proliferation financing?',
]

export { calcRA, calcAge }
