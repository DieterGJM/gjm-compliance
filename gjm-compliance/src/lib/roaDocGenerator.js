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
  const clientName   = (data.fullName || data.registeredName || '[Client Name]').toUpperCase()
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
    'Other [Physical and/or Functional Impairment, sickness cover, retrenchment benefit etc.]'
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
          new TableCell({children:[new Paragraph({children:[N(data.productKnowledge || 'CLIENT HAS LOW LEVEL OF PRODUCT KNOWLEDGE AND EXPERIENCE WITH LONG TERM INSURANCE BUT UNDERSTANDS THE EFFECTS AND CONSEQUENCES OF THE CHOSEN PRODUCT FULLY.')]})]}),
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
          const recs = data.recommendations || {}
          // Auto-derive quantified amount from Section D if not set in planNeeds
          let quantified = pn.quantified
          if (!quantified || Number(quantified) === 0) {
            if (need === 'Life') quantified = recs.death?.life_cover_required || ''
            if (need === 'Permanent Disability (Income Protection)') quantified = recs.disability?.income_required || ''
            if (need === 'Permanent Disability (lump sum)') quantified = recs.disability?.capital_required || ''
            if (need === 'Temporary Disability') quantified = recs.disability?.income_required || ''
            if (need === 'Trauma / Illness') quantified = recs.trauma?.cover_required || recs.trauma?.cover_considered || ''
          }
          const reviewDate = pn.reviewDate || (() => { const d = new Date(); d.setFullYear(d.getFullYear()+1); return d.toISOString().slice(0,10) })()
          return new TableRow({children:[
            new TableCell({children:[new Paragraph({children:[N(need)]})]}),
            new TableCell({children:[new Paragraph({children:[N(quantified ? `R${Number(quantified).toLocaleString('en-ZA')}` : '')]})]}),
            new TableCell({children:[new Paragraph({children:[N(pn.priority || '1')], alignment:AlignmentType.CENTER})]}),
            new TableCell({children:[new Paragraph({children:[N(pn.status || 'Y')]})]}),
            new TableCell({children:[new Paragraph({children:[N(pn.shortfall ? `R${Number(pn.shortfall).toLocaleString('en-ZA')}` : '')]})]}),
            new TableCell({children:[new Paragraph({children:[N(reviewDate)]})]}),
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
        new TableCell({children:[new Paragraph({children:[N(data.selectedProductsText || 
          (() => {
            const chosen = Object.values(data.recommendations||{}).map(r=>r.selected).filter(Boolean)
            const unique = [...new Set(chosen)]
            return unique.length > 0 ? unique.join(', ') : products.filter(p=>p.insurer&&p.product).map(p=>`${p.insurer} ${p.product}`).join(', ')
          })()
        )]})]}),
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

    // Annexures — Assets & Liabilities + Capital Analysis
    secHdr('Annexures: Assets & Liabilities'),
    new Table({
      width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[
        new TableRow({tableHeader:true, children:[
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'ASSETS',bold:true,font:'Calibri',size:22,color:WHITE})]})], width:{size:35,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'R',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'LIABILITIES',bold:true,font:'Calibri',size:22,color:WHITE})]})], width:{size:35,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:NAVY}}),
          new TableCell({children:[new Paragraph({children:[new TextRun({text:'R',bold:true,font:'Calibri',size:22,color:WHITE})]})], shading:{type:ShadingType.SOLID,fill:NAVY}}),
        ]}),
        ...['Property (House)','Other property','House contents','Vehicles','Cash','Investments','Business interests','Life cover'].map((asset, i) => {
          const assetKeys = ['propertyHouse','otherProperty','houseContents','vehicles','cashAssets','investments','businessInterests','lifeCoverAsset']
          const liabLabels = ['Bond','Other','Hire purchase','Hire purchase (vehicle)','Hire purchase (cash)','Overdrawn accounts','Loans','']
          const liabKeys = ['bond','otherLiability','hirePurchase','hirePurchaseVehicle','hirePurchaseCash','overdrawnAccounts','loans','']
          const ann = data.annexures || {}
          return new TableRow({children:[
            new TableCell({children:[new Paragraph({children:[N(asset)]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
            new TableCell({children:[new Paragraph({children:[N(ann[assetKeys[i]] ? `R${Number(ann[assetKeys[i]]).toLocaleString('en-ZA')}` : 'R 0')]})]}),
            new TableCell({children:[new Paragraph({children:[N(liabLabels[i])]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
            new TableCell({children:[new Paragraph({children:[N(liabKeys[i] && ann[liabKeys[i]] ? `R${Number(ann[liabKeys[i]]).toLocaleString('en-ZA')}` : liabKeys[i] ? 'R 0' : '')]})]}),
          ]})
        }),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('GROSS VALUE OF ESTATE')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[B(`R${['propertyHouse','otherProperty','houseContents','vehicles','cashAssets','investments','businessInterests','lifeCoverAsset'].reduce((s,k)=>s+(Number((data.annexures||{})[k])||0),0).toLocaleString('en-ZA')}`)]})]  }),
          new TableCell({children:[new Paragraph({children:[B('TOTAL LIABILITIES')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[B(`R${['bond','otherLiability','hirePurchase','hirePurchaseVehicle','hirePurchaseCash','overdrawnAccounts','loans'].reduce((s,k)=>s+(Number((data.annexures||{})[k])||0),0).toLocaleString('en-ZA')}`)]})]  }),
        ]}),
      ]
    }),
    sp(),

    secHdr('Capital Needs Analysis on Death (Section 4)'),
    twoCol([
      ['Annual income required on death', fmt((data.annexures||{}).incomeOnDeath)],
      ['Less: Annual income provided for', fmt((data.annexures||{}).incomeProvided)],
      ['Income Shortfall', fmt(Math.max(0,(Number((data.annexures||{}).incomeOnDeath)||0)-(Number((data.annexures||{}).incomeProvided)||0)))],
      ['Less: Capital available to dependants', fmt((data.annexures||{}).capitalAvailable)],
      ['Other capital needs (funeral etc.)', fmt((data.annexures||{}).otherCapital)],
    ]),
    sp(),

    secHdr('Capital Needs Analysis on Disability (Section 5)'),
    twoCol([
      ['Annual income required on disability', fmt((data.annexures||{}).incomeOnDisability)],
      ['Less: Disability pension / provision', fmt((data.annexures||{}).disabilityProvision)],
      ['Income Shortfall', fmt(Math.max(0,(Number((data.annexures||{}).incomeOnDisability)||0)-(Number((data.annexures||{}).disabilityProvision)||0)))],
      ['Lump sum disability capital available', fmt((data.annexures||{}).disabilityCapital)],
      ['Outstanding liabilities / alterations', fmt((data.annexures||{}).disabilityOther)],
    ]),
    sp(),

    secHdr('Capital Needs Analysis on Retirement (Section 6)'),
    twoCol([
      ['Annual income required on retirement', fmt((data.annexures||{}).incomeOnRetirement)],
      ['Less: Pension / other provision', fmt((data.annexures||{}).retirementProvision)],
      ['Income Shortfall', fmt(Math.max(0,(Number((data.annexures||{}).incomeOnRetirement)||0)-(Number((data.annexures||{}).retirementProvision)||0)))],
      ['Years to retirement', String((data.annexures||{}).yearsToRetirement||'')],
      ['Existing investments available', fmt((data.annexures||{}).existingInvestments)],
    ]),
    sp(),

    // Section H
    secHdr("Section H: Financial Advisor's Declaration"),
    new Table({
      width:{size:100,type:WidthType.PERCENTAGE}, borders:BORDERS,
      rows:[
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('1')]})], width:{size:5,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[B('The client has elected not to accept the following product recommendations:')]})], width:{size:50,type:WidthType.PERCENTAGE}, shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(
          sH.declinedProducts !== undefined && sH.declinedProducts !== ''
            ? sH.declinedProducts
            : (() => {
                const chosen = Object.values(data.recommendations||{}).map(r=>r.selected).filter(Boolean)
                const declined = (data.products||[])
                  .filter(p => p.insurer && !chosen.some(c => c.includes(p.customInsurer||p.insurer)))
                  .map(p => p.customInsurer||p.insurer)
                  .filter((v,i,a) => a.indexOf(v)===i)
                return declined.join(' & ') || ''
              })()
        )]})]})],
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
          new TableCell({children:[new Paragraph({children:[B('Where there is only a focussed need being addressed, the following was discussed and agreed with the Client:')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[N(sH.focusedNeed || 'N/A')]})]}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('6')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[B('Where there is only a focussed need being addressed or where the Client explicitly declined to provide any information requested by the Advisor, the Advisor confirms that he/she has alerted the client that:')]})], columnSpan:2, shading:{type:ShadingType.SOLID,fill:LIGHT}}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[N('')]})]  }),
          new TableCell({children:[new Paragraph({children:[N('a) There may be limitations on the appropriateness of the advice provided, and')]})], columnSpan:2}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[N('')]})]  }),
          new TableCell({children:[new Paragraph({children:[N('b) The client should take particular care to consider on its own whether the advice is appropriate considering the client\'s financial objectives, financial position and particular needs.')]})], columnSpan:2}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[B('7')]})], shading:{type:ShadingType.SOLID,fill:LIGHT}}),
          new TableCell({children:[new Paragraph({children:[B('Where the Advisor does not have a suitable product that is appropriate for the client\'s needs, the Advisor confirms that:')]})], columnSpan:2, shading:{type:ShadingType.SOLID,fill:LIGHT}}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[N('')]})]  }),
          new TableCell({children:[new Paragraph({children:[N('a) This has been clearly explained to the Client')]})], columnSpan:2}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[N('')]})]  }),
          new TableCell({children:[new Paragraph({children:[N('b) He/she has declined to recommend a product or transaction')]})], columnSpan:2}),
        ]}),
        new TableRow({children:[
          new TableCell({children:[new Paragraph({children:[N('')]})]  }),
          new TableCell({children:[new Paragraph({children:[N('c) He/she suggested to the client that the client should seek advice from another appropriately authorised provider.')]})], columnSpan:2}),
        ]}),
      ]
    }),
    sp(),

    // Section I — Standard legal declarations (exact template wording)
    secHdr('Section I: Client Declarations'),
    new Paragraph({children:[new TextRun({text:'Please note that it is of utmost importance that you read this section carefully and understand it fully before acceptance.', italics:true, font:'Calibri', size:20})], spacing:{after:80}}),
    ...[
      'I confirm that a Contact Stage Disclosure letter, setting out the Financial Advisor\'s full particulars, his/her experience and services offered, has been provided to me.',
      'I confirm that I required the Financial Advisor to render the financial services set out in the Service Level Agreement, a copy of which has been provided to me.',
      'Where I elected not to take up the Financial Advisor\'s recommendation of a Full Financial Needs Analysis, or where I explicitly declined to provide any information requested by the Financial Advisor, I confirm that: I clearly understand that there may be limitations on the appropriateness of the advice provided, and I will take particular care to consider on my own whether the advice is appropriate considering my own financial objectives, financial position and particular needs, particularly any aspects of such objectives, situation or needs that were not considered in light of the circumstances.',
      'Where I elected to conclude a transaction that differs from that recommended by the Financial Advisor, or otherwise elected not to follow the advice furnished, or elected to receive more limited information or advice than what the Financial Advisor was able to provide, I was alerted of the clear existence of any risks to myself and was advised to take particular care to consider whether any product selected is appropriate to my needs, objectives and circumstances.',
      'I understand that the accuracy of a Needs Analysis is dependent on the information provided to or obtained by the Financial Advisor. The advice furnished and product recommendations made by the Financial Advisor are based on the information I provided to the Financial Advisor. I understand that material non-disclosures and misrepresentations could result in inappropriate product(s) being recommended and purchased by me.',
      'I confirm that I was provided with copies of quote(s), marketing brochures, rates and benefit sheets for the product(s) selected. All material terms and conditions of the product(s) selected were explained to me prior to any decision made.',
      'I have been informed of and understand all costs, charges, penalties, and tax implications where applicable. I understand the risks / guarantees (or absence thereof) associated with the product(s) selected.',
      'I confirm that all documents signed by me were fully completed prior to my signing them.',
      'I confirm that where I provided the Financial Advisor with the information required for any risk benefit application forms on my behalf, the Financial Advisor warned me verbally of the risks and consequences of non-disclosure and misrepresentation of such information.',
      'I confirm that the Financial Advisor has made enquiries to ascertain whether the product(s) selected is intended to replace any existing financial products held by me and where applicable, has informed me of the financial implications, costs and consequences of replacement.',
      'Notwithstanding the information provided by the Financial Advisor, I acknowledge that I have an obligation to familiarise myself with the terms and conditions of the product(s) that I have purchased.',
      'I confirm having received a copy of this Client Advice Record.',
    ].map((text, i) => new Paragraph({children:[B(`${i+1}. `), N(text)], spacing:{before:60, after:40}})),
    sp(),

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
