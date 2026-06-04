import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType } from 'docx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { saveAs } from 'file-saver'

const FIRM         = 'GJM Ultra Brokers'
const ADVISOR_NAME = 'Dieter Hartig'
const NAVY  = '1a3a5c'
const GOLD  = 'C9A84C'
const WHITE = 'FFFFFF'
const LIGHT = 'F0F4F8'

function todayStr() {
  return new Date().toLocaleDateString('en-ZA', { day:'2-digit', month:'2-digit', year:'numeric' })
}

const B  = t => new TextRun({ text: String(t ?? ''), bold:true,  font:'Calibri', size:22 })
const N  = t => new TextRun({ text: String(t ?? ''), bold:false, font:'Calibri', size:22 })
const sp = () => new Paragraph({ children:[N('')], spacing:{after:80} })

const BORDERS = {
  top:{style:BorderStyle.SINGLE,size:1,color:'AAAAAA'}, bottom:{style:BorderStyle.SINGLE,size:1,color:'AAAAAA'},
  left:{style:BorderStyle.SINGLE,size:1,color:'AAAAAA'}, right:{style:BorderStyle.SINGLE,size:1,color:'AAAAAA'},
  insideH:{style:BorderStyle.SINGLE,size:1,color:'AAAAAA'}, insideV:{style:BorderStyle.SINGLE,size:1,color:'AAAAAA'},
}

function titleBar(text) {
  return new Paragraph({
    children:[new TextRun({text, bold:true, font:'Calibri', size:26, color:WHITE})],
    alignment:AlignmentType.CENTER,
    shading:{type:ShadingType.SOLID, fill:NAVY},
    spacing:{before:0, after:160}
  })
}

function secHdr(text) {
  return new Paragraph({
    children:[new TextRun({text, bold:true, font:'Calibri', size:22, color:NAVY})],
    shading:{type:ShadingType.SOLID, fill:'E8F0F8'},
    spacing:{before:200, after:80},
    border:{bottom:{style:BorderStyle.SINGLE,size:6,color:GOLD,space:1}}
  })
}

function twoCol(rows, w1=40) {
  return new Table({
    width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
    rows: rows.map(([l,v,bold]) => new TableRow({children:[
      new TableCell({children:[new Paragraph({children:[B(l)]})], width:{size:w1,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:LIGHT}}),
      new TableCell({children:[new Paragraph({children:[bold?B(v):N(v)]})]})
    ]}))
  })
}

function makeDoc(children) {
  return new Document({
    sections:[{
      properties:{page:{size:{width:12240,height:15840},margin:{top:720,right:900,bottom:720,left:900}}},
      children
    }]
  })
}

const NEEDS_KEYS = [
  {key:'emergency',   label:'Provision for emergency'},
  {key:'death',       label:'Responsibilities in event of death'},
  {key:'disability',  label:'Inability to work'},
  {key:'trauma',      label:'Effect of trauma'},
  {key:'retirement',  label:'Income and Capital for retirement'},
  {key:'savings',     label:'Invest or Save for specific need'},
  {key:'assets',      label:'Protection of assets'},
  {key:'health',      label:'Health cost cover'},
  {key:'will',        label:'Will'},
  {key:'other',       label:'Other'},
]

const GUIDELINES = {
  emergency:  'At least 3 times monthly salary. What is currently available?',
  death:      'Monthly income required by family/dependants + capital to pay off debt.',
  disability: 'Gross income required in case of permanent or temporary disability.',
  trauma:     'Amount required for lifestyle adjustments — cancer, stroke, heart attack.',
  retirement: 'Reasonable income to maintain standard of living on retirement.',
  savings:    'Amount required for children\'s studies or other objective.',
  assets:     'Is there sufficient short term cover for assets?',
  health:     'Is there sufficient cover for medical expenses?',
  will:       'Is there an updated will?',
  other:      '',
}

export function buildROADoc(data) {
  const clientName   = data.fullName   || data.registeredName || '[Client Name]'
  const clientId     = data.idNumber   || data.registrationNo || ''
  const clientEmail  = data.email      || ''
  const clientMobile = data.mobile     || data.telephone      || ''
  const needs        = data.needsTable || {}
  const recs         = data.recommendations || {}
  const planNeeds    = data.planNeeds  || {}
  const sH           = data.sectionH   || {}
  const products     = data.products   || []
  const date         = todayStr()

  const PLAN_NEEDS_KEYS = [
    'Life','Permanent Disability (Income Protection)','Permanent Disability (lump sum)',
    'Temporary Disability','Trauma / Illness','Funeral Cover / Immediate Expenses',
    'Other (Physical/Functional Impairment, sickness cover, retrenchment etc.)'
  ]

  const children = [
    titleBar('RISK CLIENT ADVICE RECORD'),

    // Header table
    new Table({
      width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('Client Full Names & Surname')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(clientName.toUpperCase())]})], columnSpan:3}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('ID / Passport No.')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(clientId)]})]}),
          new TableCell({children:[new Paragraph({children:[B('Contact Details')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(clientMobile)]})]}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('Email Address')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(clientEmail)]})], columnSpan:3}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('Financial Advisor')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(ADVISOR_NAME)]})]}),
          new TableCell({children:[new Paragraph({children:[B('Date')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(date)]})]}),
        ]}),
      ]
    }),
    sp(),

    // Section A
    secHdr('Section A: Summary of Information obtained from the Client'),
    new Table({
      width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B("Client's Needs and Objectives:")]})], width:{size:30,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(data.needsObjectives || '')]})]}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('Financial Situation:')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(data.financialSituation || '')]})]}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('Client Information:'), new TextRun({text:" [age, occupation, dependents, smoker status, premium consideration, debt, affordability]", italics:true, font:'Calibri', size:20})]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(`${data.age || ''}, ${data.occupation || ''}, ${data.dependents || '0'}, ${data.smokerStatus || 'Non-Smoker'}, R${data.premiumConsideration || ''}, R${data.currentDebt || ''}, ${data.affordability || 'Full affordability confirmed by client'}`)]})]}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('Product Knowledge and Experience:')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(data.productKnowledge || '')]})]}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('Other Information:')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(data.otherInfo || '')]})]}),
        ]}),
      ]
    }),
    sp(),

    // Section B
    secHdr('Section B: Description and Prioritising of Financial Needs'),
    new Table({
      width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[
        new TableRow({tableHeader:true, children:[
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Financial needs',bold:true,font:'Calibri',size:22,color:WHITE})]})], width:{size:20,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Address YES/NO',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'General guidelines',bold:true,font:'Calibri',size:22,color:WHITE})]})], width:{size:40,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Priority',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Review Date',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
        ]}),
        ...NEEDS_KEYS.map(({key,label}) => {
          const nd = needs[key] || {}
          return new TableRow({children:[
            new TableCell({children:[new Paragraph({children:[B(label)]})]}),
            new TableCell({children:[new Paragraph({children:[N(nd.address || 'NO')], alignment:AlignmentType.CENTER})]}),
            new TableCell({children:[new Paragraph({children:[N(`${GUIDELINES[key] || ''} ${nd.amount ? `R${nd.amount}` : ''}`)]})]}),
            new TableCell({children:[new Paragraph({children:[N(nd.priority || 'N/A')], alignment:AlignmentType.CENTER})]}),
            new TableCell({children:[new Paragraph({children:[N(nd.reviewDate || '')]})]}),
          ]})
        })
      ]
    }),
    sp(),

    // Section C
    secHdr('Section C: Products Considered'),
    new Table({
      width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[
        new TableRow({tableHeader:true, children:[
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Company',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Product',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Premium Amount (R)',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Quote on File?',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
        ]}),
        ...products.filter(p => p.insurer || p.product).map(p => new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[N(p.customInsurer || p.insurer)]})]}),
          new TableCell({children:[new Paragraph({children:[N(p.product)]})]}),
          new TableCell({children:[new Paragraph({children:[N(p.premium ? `R${Number(p.premium).toLocaleString('en-ZA')}` : '')]})]}),
          new TableCell({children:[new Paragraph({children:[N(p.quoteOnFile || 'Y')], alignment:AlignmentType.CENTER})]}),
        ]}))
      ]
    }),
    sp(),

    // Section D
    secHdr('Section D: Initial Recommendation / Advice and Motivation'),
    ...[
      {key:'death',     label:'DEATH',      fields:[['Life cover required','life_cover_required'],['Life cover considered','life_cover_considered']]},
      {key:'disability',label:'DISABILITY', fields:[['Income required','income_required'],['Income considered','income_considered'],['Capital required','capital_required'],['Capital considered','capital_considered']]},
      {key:'trauma',    label:'TRAUMA',     fields:[['Cover required','cover_required'],['Cover considered','cover_considered']]},
    ].flatMap(({key,label,fields}) => {
      const rec = recs[key] || {}
      const selectedInsurers = [...new Set(products.map(p=>p.insurer).filter(Boolean))].join(', ')
      return [
        new Table({
          width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
          rows:[
            new TableRow({children:[new TableCell({children:[new Paragraph({children:[B(label)]})], columnSpan:2, shading:{type:ShadingType.SOLID,fill:LIGHT}})]}),
            ...fields.map(([l,k]) => new TableRow({children:[
              new TableCell({children:[new Paragraph({children:[B(l)]})], width:{size:35,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:'F8F8F8'}}),
              new TableCell({children:[new Paragraph({children:[rec[k] ? B(`R${Number(rec[k]).toLocaleString('en-ZA')}`) : N('')]})]})
            ]})),
            new TableRow({children:[
              new TableCell({children:[new Paragraph({children:[B('Products considered:')]})], shading:{type:ShadingType.SOLID,fill:'F8F8F8'}}),
              new TableCell({children:[new Paragraph({children:[N(rec.considered || selectedInsurers)]})]}),
            ]}),
            new TableRow({children:[
              new TableCell({children:[new Paragraph({children:[B('Product selected and motivation:')]})], shading:{type:ShadingType.SOLID,fill:'F8F8F8'}}),
              new TableCell({children:[new Paragraph({children:[B(rec.selected || '')]})]}),
            ]}),
            new TableRow({children:[
              new TableCell({children:[new Paragraph({children:[B('Rationale:')]})], shading:{type:ShadingType.SOLID,fill:'F8F8F8'}}),
              new TableCell({children:[new Paragraph({children:[N(rec.rationale || '')]})]}),
            ]}),
          ]
        }),
        sp(),
      ]
    }),

    // Financial Planning Needs Summary
    new Table({
      width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[
        new TableRow({tableHeader:true, children:[
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Financial Planning Need',bold:true,font:'Calibri',size:22,color:WHITE})]})], width:{size:28,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Needs Quantified',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Priority',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Addressed',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Shortfall',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Review Date',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
        ]}),
        ...PLAN_NEEDS_KEYS.map(need => {
          const pn = planNeeds[need] || {}
          return new TableRow({children:[
            new TableCell({children:[new Paragraph({children:[N(need)]})]}),
            new TableCell({children:[new Paragraph({children:[N(pn.quantified ? `R${Number(pn.quantified).toLocaleString('en-ZA')}` : '')]})]}),
            new TableCell({children:[new Paragraph({children:[N(pn.priority || '')], alignment:AlignmentType.CENTER})]}),
            new TableCell({children:[new Paragraph({children:[N(pn.status || '')]})]}),
            new TableCell({children:[new Paragraph({children:[N(pn.shortfall ? `R${Number(pn.shortfall).toLocaleString('en-ZA')}` : '')]})]}),
            new TableCell({children:[new Paragraph({children:[N(pn.reviewDate || '')]})]}),
          ]})
        })
      ]
    }),
    sp(),

    // Section E
    secHdr('Section E: Implementation Motivation'),
    new Table({
      width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[new TableRow({children:[
        new TableCell({children:[new Paragraph({children:[B('Product(s) selected by the client')]})], width:{size:30,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:LIGHT}}),
        new TableCell({children:[new Paragraph({children:[N(data.selectedProductsText || products.filter(p=>p.insurer).map(p=>`${p.insurer} ${p.product}`).join(', '))]})]}),
      ]}),
      new TableRow({children:[
        new TableCell({children:[new Paragraph({children:[B('Rationale for Product(s) selected:')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
        new TableCell({children:[new Paragraph({children:[N(data.sectionE || '')]})]}),
      ]})]
    }),
    sp(),

    // Section F
    secHdr('Section F: Important Information Highlighted to Client'),
    new Table({
      width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[new TableRow({children:[
        new TableCell({children:[new Paragraph({children:[N(data.sectionF || '')]})]})
      ]})]
    }),
    sp(),

    // Section G — Multiple fees
    secHdr('Section G: Fees & Commission'),
    new Table({
      width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[
        new TableRow({tableHeader:true, children:[
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Product / Insurer',bold:true,font:'Calibri',size:22,color:WHITE})]})], width:{size:50,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Upfront / Commission (R)',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'Ongoing Fee (R p.a.)',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
        ]}),
        ...(data.feesList || [{ product:'', upfront: data.upfrontFee||'', ongoing: data.ongoingFee||'' }]).map(f =>
          new TableRow({children:[
            new TableCell({children:[new Paragraph({children:[N(f.product||'')]})] }),
            new TableCell({children:[new Paragraph({children:[N(f.upfront ? `R${Number(f.upfront).toLocaleString('en-ZA')}` : '')]})]}),
            new TableCell({children:[new Paragraph({children:[N(f.ongoing ? `R${Number(f.ongoing).toLocaleString('en-ZA')} p.a.` : '')]})]}),
          ]})
        ),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('TOTAL')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[B(`R${((data.feesList||[]).reduce((s,f)=>s+(Number(f.upfront)||0),0)+(Number(data.upfrontFee)||0)).toLocaleString('en-ZA')}`)]})]  }),
          new TableCell({children:[new Paragraph({children:[B(`R${((data.feesList||[]).reduce((s,f)=>s+(Number(f.ongoing)||0),0)+(Number(data.ongoingFee)||0)).toLocaleString('en-ZA')} p.a.`)]})]  }),
        ]}),
      ]
    }),
    sp(),

    // Section H
    secHdr("Section H: Financial Advisor's Declaration"),
    new Table({
      width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('1')]})], width:{size:5,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[B('The client has elected not to accept the following product recommendations:')]})], width:{size:50,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(sH.declinedProducts || '')]})]}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('2')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[B('Reasons that the client elected not to accept the product recommendations above:')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(sH.declinedReasons || '')]})]}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('3')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[B('Existence of any risks to the client for not concluding the transaction recommended:')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(sH.risks || 'NO')]})]}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('4')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[B('The consequences thereof have been clearly explained to the Client:')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(`Yes: ${sH.consequencesExplained==='Yes'?'☑':'☐'}     No: ${sH.consequencesExplained==='No'?'☑':'☐'}`)]})] }),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('5')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[B('Where there is only a focused need being addressed, the following was discussed and agreed with the Client:')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(sH.focusedNeed || 'N/A')]})]}),
        ]}),
      ]
    }),
    sp(),

    // Section I — Standard legal declarations (fixed text, pre-filled)
    secHdr('Section I: Client Declarations'),
    new Paragraph({children:[new TextRun({text:'Please note that it is of utmost importance that you read this section carefully and understand it fully before acceptance.', italics:true, font:'Calibri', size:20})], spacing:{after:80}}),
    ...[
      'I confirm that a Contact Stage Disclosure letter, setting out the Financial Advisor\'s full particulars, his/her experience and services offered, has been provided to me.',
      'I confirm that I required the Financial Advisor to render the financial services set out in the Service Level Agreement, a copy of which has been provided to me.',
      'Where I elected not to take up the Financial Advisor\'s recommendation of a Full Financial Needs Analysis, or where I explicitly declined to provide any information requested by the Financial Advisor, I confirm that I clearly understand that there may be limitations on the appropriateness of the advice provided.',
      'Where I elected to conclude a transaction that differs from that recommended by the Financial Advisor, or otherwise elected not to follow the advice furnished, I was alerted of the clear existence of any risks to myself.',
      'I understand that the accuracy of a Needs Analysis is dependent on the information provided to or obtained by the Financial Advisor. Material non-disclosures and misrepresentations could result in inappropriate product(s) being recommended.',
      'I confirm that I was provided with copies of quote(s), marketing brochures, rates and benefit sheets for the product(s) selected. All material terms and conditions of the product(s) selected were explained to me prior to any decision made.',
      'I have been informed of and understand all costs, charges, penalties, and tax implications where applicable.',
      'I confirm that all documents signed by me were fully completed prior to my signing them.',
      'I confirm that where I provided the Financial Advisor with the information required for any risk benefit application forms on my behalf, the Financial Advisor warned me verbally of the risks and consequences of non-disclosure and misrepresentation.',
      'I confirm that the Financial Advisor has made enquiries to ascertain whether the product(s) selected is intended to replace any existing financial products held by me and where applicable, has informed me of the financial implications, costs and consequences of replacement.',
      'Notwithstanding the information provided by the Financial Advisor, I acknowledge that I have an obligation to familiarise myself with the terms and conditions of the product(s) that I have purchased.',
      'I confirm having received a copy of this Client Advice Record.',
    ].map((text, i) => new Paragraph({children:[B(`${i+1}. `), N(text)], spacing:{before:60, after:40}})),
    sp(),

    // General Comments
    new Paragraph({children:[B('General Comments:')], spacing:{before:160, after:80}}),
    new Table({
      width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[new TableRow({children:[new TableCell({children:[new Paragraph({children:[N(data.generalComments || '')]})], shading:{type:ShadingType.SOLID,fill:'FAFAFA'}})]})]
    }),
    sp(),

    // Signatures
    new Table({
      width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('Client\'s Signature')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N('_________________________________')]})]}),
          new TableCell({children:[new Paragraph({children:[B('Financial Advisor Signature')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N('_________________________________')]})]}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B("Client's Name")]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(clientName.toUpperCase())]})]}),
          new TableCell({children:[new Paragraph({children:[B("Financial Advisor's Name")]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(ADVISOR_NAME.toUpperCase())]})]}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('Date')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(date)]})]}),
          new TableCell({children:[new Paragraph({children:[B('Date')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(date)]})]}),
        ]}),
      ]
    }),
  ]

  return makeDoc(children)
}

export async function downloadROADocx(data) {
  const doc = buildROADoc(data)
  const blob = await Packer.toBlob(doc)
  const name = (data.fullName || data.registeredName || 'Client').replace(/\s+/g,'_')
  saveAs(blob, `${name}_Risk_ROA_${new Date().toISOString().slice(0,10)}.docx`)
}
