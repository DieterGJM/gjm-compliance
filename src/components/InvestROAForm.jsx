import { useState, useEffect } from 'react'
import { generateSectionD, generateSectionE, generateSectionF } from '../lib/roaGenerator'
import { getBenefitsForInsurer } from '../lib/productKnowledge'
import { generateInvestSectionD_Retirement, generateInvestSectionD_Savings, generateInvestSectionE, generateInvestSectionF } from '../lib/investROAGenerator'
import { getInvestmentProductsForInsurer } from '../lib/investProductKnowledge'
import { Sparkles, Plus, Trash2 } from 'lucide-react'
import SignoffBlock from './SignoffBlock'

const INSURERS = ['Allan Gray', 'Discovery', 'Momentum', 'Liberty', 'Sanlam', 'Old Mutual', 'PPS', 'BrightRock', 'Coronation', 'Ninety One', 'Nedbank', 'Absa', 'FNB', 'Standard Bank', 'Other']
const RISK_PROFILES = ['Conservative', 'Moderate Conservative', 'Moderate', 'Moderate Aggressive', 'Aggressive']
const HORIZONS = ['0-2', '2-5', '5-9', '10+']
const ACCESS_OPTS = [
  { val: 'income', label: 'Need to draw an income' },
  { val: 'always', label: 'Always require access to capital' },
  { val: 'none',   label: 'Do not require access to capital for 5+ years' },
]
const NEEDS_CONFIG = [
  { key:'emergency',  label:'Provision for emergency',              defaultAddress:'NO',  defaultPriority:'N/A' },
  { key:'death',      label:'Responsibilities in event of death',   defaultAddress:'YES', defaultPriority:'1' },
  { key:'disability', label:'Inability to work',                    defaultAddress:'YES', defaultPriority:'1' },
  { key:'trauma',     label:'Effect of trauma',                     defaultAddress:'YES', defaultPriority:'2' },
  { key:'retirement', label:'Income and Capital for retirement',    defaultAddress:'YES', defaultPriority:'3' },
  { key:'savings',    label:'Invest or Save for specific need',     defaultAddress:'NO',  defaultPriority:'N/A' },
  { key:'assets',     label:'Protection of assets',                 defaultAddress:'YES', defaultPriority:'4' },
  { key:'health',     label:'Health cost cover',                    defaultAddress:'NO',  defaultPriority:'N/A' },
  { key:'will',       label:'Will',                                 defaultAddress:'NO',  defaultPriority:'N/A' },
  { key:'other',      label:'Other',                                defaultAddress:'NO',  defaultPriority:'N/A' },
]
const INVEST_NEEDS_ROWS = [
  { group:'Pre-Retirement', items:['Retirement Annuity','Preservation'] },
  { group:'Post-Retirement', items:['Living Annuity','Fixed Annuity','Life Annuity','Guaranteed Income Plan','Retirement Income Plan'] },
  { group:'Savings', items:['Unit Trust','Tax Free','Endowment','Flexible','Guaranteed Term'] },
  { group:'Other', items:['Emergency Fund','Education Policy','Other'] },
]

function oneYear() {
  const d = new Date(); d.setFullYear(d.getFullYear()+1)
  return d.toISOString().slice(0,10)
}

export default function InvestROAForm({ data, onChange }) {
  const [generating, setGenerating] = useState({})
  const setGen = (k,v) => setGenerating(g => ({...g,[k]:v}))
  const setV  = (k,v) => onChange({ ...data, [k]: v })
  const set   = k => e => setV(k, e.target.value)

  const products    = data.products    || [{ insurer:'', product:'', premium:'', quoteOnFile:'Y', factSheetOnFile:'Y', selectedBenefits:[] }]
  const setProducts = prods => setV('products', prods)
  const setProduct  = (i,k,v) => { const p=[...products]; p[i]={...p[i],[k]:v}; setProducts(p) }
  const addProduct  = () => setProducts([...products, { insurer:'', product:'', premium:'', quoteOnFile:'Y', factSheetOnFile:'Y', selectedBenefits:[] }])
  const removeProduct = i => setProducts(products.filter((_,j)=>j!==i))

  const fees    = data.feesList || [{ product:'', upfront:'', ongoing:'' }]
  const setFees = list => setV('feesList', list)
  const setFee  = (i,k,v) => { const f=[...fees]; f[i]={...f[i],[k]:v}; setFees(f) }
  const addFee  = () => setFees([...fees, { product:'', upfront:'', ongoing:'' }])
  const removeFee = i => setFees(fees.filter((_,j)=>j!==i))

  const needs   = data.needsTable || {}
  const setNeed = (key,field,val) => setV('needsTable', { ...needs, [key]: { ...(needs[key]||{}), [field]:val } })

  const investNeeds   = data.investNeeds || {}
  const setInvestNeed = (key,field,val) => setV('investNeeds', { ...investNeeds, [key]: { ...(investNeeds[key]||{}), [field]:val } })

  const sD  = data.investSectionD || {}
  const setSd = (k,v) => setV('investSectionD', { ...sD, [k]:v })
  const sH  = data.sectionH || {}
  const setSH = (k,v) => setV('sectionH', { ...sH, [k]:v })

  const allInsurers = [...new Set(products.map(p=>p.customInsurer||p.insurer).filter(Boolean))]

  const genSectionD = async (needType) => {
    setGen('sectionD_'+needType, true)
    try {
      if (needType === 'retirement') {
        const text = await generateInvestSectionD_Retirement(data, products, sD.retirementProductSelected||'the selected product', 'Retirement Annuity / Preservation Fund')
        if (text) setSd('retirementRationale', text)
      } else {
        const text = await generateInvestSectionD_Savings(data, products, sD.savingsProductSelected||'the selected product', 'Savings / Investment / Endowment')
        if (text) setSd('savingsRationale', text)
      }
    } catch(e) { console.error(e) }
    setGen('sectionD_'+needType, false)
  }

  const genSectionE = async () => {
    setGen('sectionE', true)
    try {
      const text = await generateInvestSectionE(data, products, data.occupation)
      if (text) setV('sectionE', text)
    } catch(e) { console.error(e) }
    setGen('sectionE', false)
  }

  const genSectionF = async () => {
    setGen('sectionF', true)
    try {
      const text = await generateInvestSectionF(allInsurers, products)
      if (text) setV('sectionF', text)
    } catch(e) { console.error(e) }
    setGen('sectionF', false)
  }

  // Auto-populate needs table
  useEffect(() => {
    if (data.needsTable && Object.keys(data.needsTable).length > 0) return
    const rev = oneYear()
    const nd = {}
    NEEDS_CONFIG.forEach(n => {
      nd[n.key] = { address: n.defaultAddress, priority: n.defaultPriority,
        reviewDate: n.defaultAddress==='YES' ? rev : '', amount:'' }
    })
    onChange({ ...data, needsTable: nd })
  }, [])

  const AIButton = ({ label, loading, onClick }) => (
    <button type="button" onClick={onClick} disabled={loading}
      className="btn btn-sm" style={{ display:'flex', alignItems:'center', gap:'0.3rem',
        background:'var(--gold)', color:'var(--black)', border:'none', fontWeight:700,
        fontSize:'0.75rem', padding:'0.3rem 0.75rem' }}>
      <Sparkles size={12}/>{loading ? 'Generating…' : label}
    </button>
  )

  return (
    <div>
      {/* ── Section A ── */}
      <div className="section-title">Section A: Client Information</div>
      <div className="form-group">
        <label>Needs & Objectives</label>
        <textarea value={data.needsObjectives||''} onChange={set('needsObjectives')} style={{minHeight:'80px'}} />
      </div>
      <div className="form-group">
        <label>Financial Situation</label>
        <textarea value={data.financialSituation||''} onChange={set('financialSituation')} style={{minHeight:'70px'}} />
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label>Risk Profile</label>
          <select value={data.riskProfile||'moderate'} onChange={set('riskProfile')}>
            {RISK_PROFILES.map(r=><option key={r} value={r.toLowerCase()}>{r}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Investment Horizon</label>
          <select value={data.investmentHorizon||'5-9'} onChange={set('investmentHorizon')}>
            {HORIZONS.map(h=><option key={h}>{h} Years</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Access to Capital</label>
          <select value={data.capitalAccess||'always'} onChange={set('capitalAccess')}>
            {ACCESS_OPTS.map(a=><option key={a.val} value={a.val}>{a.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Investment Amount (R)</label>
          <input type="number" value={data.investmentAmount||''} onChange={set('investmentAmount')} />
        </div>
        <div className="form-group">
          <label>Frequency</label>
          <select value={data.investmentFrequency||'Monthly'} onChange={set('investmentFrequency')}>
            {['Lump sum','Monthly','Quarterly','Annually'].map(f=><option key={f}>{f}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Product Knowledge</label>
        <textarea value={data.productKnowledge||''} onChange={set('productKnowledge')} style={{minHeight:'60px'}}
          placeholder="Describe client product knowledge and experience..." />
      </div>
      <div className="form-group">
        <label>Other Information</label>
        <textarea value={data.otherInfo||''} onChange={set('otherInfo')} style={{minHeight:'60px'}} />
      </div>

      {/* ── Section B — needs table ── */}
      <div className="section-title">Section B: Financial Needs</div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem',minWidth:'600px'}}>
          <thead><tr style={{background:'var(--navy)',color:'white'}}>
            <th style={{padding:'0.5rem',textAlign:'left',width:'22%'}}>Need</th>
            <th style={{padding:'0.5rem',textAlign:'center',width:'9%'}}>Address?</th>
            <th style={{padding:'0.5rem',textAlign:'center',width:'9%'}}>Priority</th>
            <th style={{padding:'0.5rem',width:'16%'}}>Review Date</th>
          </tr></thead>
          <tbody>
            {NEEDS_CONFIG.map(n => {
              const nd = needs[n.key] || {}
              return (
                <tr key={n.key} style={{borderBottom:'1px solid var(--border-light)',background:nd.address==='YES'?'var(--off-white)':'white'}}>
                  <td style={{padding:'0.4rem 0.75rem',fontWeight:500}}>{n.label}</td>
                  <td style={{padding:'0.4rem',textAlign:'center'}}>
                    <select value={nd.address||n.defaultAddress} onChange={e=>setNeed(n.key,'address',e.target.value)}
                      style={{fontSize:'0.78rem',padding:'0.2rem',width:'100%',background:nd.address==='YES'?'#d1fae5':'white'}}>
                      <option>YES</option><option>NO</option>
                    </select>
                  </td>
                  <td style={{padding:'0.4rem',textAlign:'center'}}>
                    <select value={nd.priority||n.defaultPriority} onChange={e=>setNeed(n.key,'priority',e.target.value)}
                      style={{fontSize:'0.78rem',padding:'0.2rem',width:'100%'}}>
                      {['1','2','3','4','5','6','N/A'].map(p=><option key={p}>{p}</option>)}
                    </select>
                  </td>
                  <td style={{padding:'0.4rem 0.5rem'}}>
                    <input type="date" value={nd.reviewDate||''} onChange={e=>setNeed(n.key,'reviewDate',e.target.value)}
                      style={{width:'100%',fontSize:'0.78rem',padding:'0.2rem'}} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Section C — Products ── */}
      <div className="section-title">Section C: Products Considered</div>
      {products.map((p,i) => {
        let availableBenefits = []
        try {
          // Use investment product catalogue for Invest ROA
          const investProds = getInvestmentProductsForInsurer(p.customInsurer||p.insurer)
          if (investProds.length > 0) {
            availableBenefits = investProds.map(ip => ({ id: ip.id, name: ip.name, shortDesc: ip.shortDesc }))
          } else if (p.insurer && p.insurer !== 'Other') {
            availableBenefits = getBenefitsForInsurer(p.insurer) || []
          }
        } catch(e) { availableBenefits = [] }
        return (
          <div key={i} style={{background:'var(--off-white)',border:'1px solid var(--border-light)',borderRadius:'8px',padding:'0.85rem',marginBottom:'0.75rem'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1.5fr 1fr 0.5fr 0.5fr auto',gap:'0.75rem',alignItems:'end',marginBottom:availableBenefits.length?'0.75rem':0}}>
              <div className="form-group" style={{margin:0}}>
                <label>Insurer</label>
                <select value={p.insurer} onChange={e=>setProduct(i,'insurer',e.target.value)}>
                  <option value="">Select...</option>
                  {INSURERS.map(ins=><option key={ins}>{ins}</option>)}
                </select>
                {p.insurer==='Other' && <input value={p.customInsurer||''} onChange={e=>setProduct(i,'customInsurer',e.target.value)} placeholder="Insurer name" style={{marginTop:'0.35rem'}} />}
              </div>
              <div className="form-group" style={{margin:0}}>
                <label>Product / Fund</label>
                <input value={p.product} onChange={e=>setProduct(i,'product',e.target.value)} placeholder="e.g. Allan Gray RA" />
              </div>
              <div className="form-group" style={{margin:0}}>
                <label>Amount (R/pm)</label>
                <input type="number" value={p.premium} onChange={e=>setProduct(i,'premium',e.target.value)} />
              </div>
              <div className="form-group" style={{margin:0}}>
                <label>Fund Sheet</label>
                <select value={p.factSheetOnFile||'Y'} onChange={e=>setProduct(i,'factSheetOnFile',e.target.value)}>
                  <option>Y</option><option>N</option>
                </select>
              </div>
              <div className="form-group" style={{margin:0}}>
                <label>Quote</label>
                <select value={p.quoteOnFile||'Y'} onChange={e=>setProduct(i,'quoteOnFile',e.target.value)}>
                  <option>Y</option><option>N</option>
                </select>
              </div>
              <button type="button" onClick={()=>removeProduct(i)} className="btn btn-sm btn-danger" style={{alignSelf:'flex-end'}} disabled={products.length===1}>
                <Trash2 size={13}/>
              </button>
            </div>
            {availableBenefits.length > 0 && (
              <div>
                <div style={{fontSize:'0.74rem',fontWeight:600,color:'var(--slate)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'0.4rem'}}>Benefits / Funds selected:</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:'0.4rem'}}>
                  {availableBenefits.map(b => {
                    const selected = (p.selectedBenefits||[]).includes(b.id)
                    return (
                      <button key={b.id} type="button"
                        onClick={() => { const curr=p.selectedBenefits||[]; setProduct(i,'selectedBenefits',selected?curr.filter(id=>id!==b.id):[...curr,b.id]) }}
                        style={{padding:'0.3rem 0.7rem',fontSize:'0.75rem',borderRadius:'20px',cursor:'pointer',
                          background:selected?'var(--gold)':' var(--white)',color:selected?'var(--black)':'var(--slate)',
                          border:selected?'1.5px solid var(--gold)':' 1.5px solid var(--border-light)',fontWeight:selected?700:400}}>
                        {b.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
      <button type="button" onClick={addProduct} className="btn btn-sm btn-outline" style={{marginTop:'0.5rem'}}>
        <Plus size={13}/> Add Product
      </button>

      {/* ── Section D ── */}
      <div className="section-title">Section D: Recommendation & Motivation</div>
      <div style={{background:'var(--off-white)',border:'1px solid var(--border-light)',borderRadius:'8px',padding:'1rem',marginBottom:'1rem'}}>
        <div style={{fontWeight:700,marginBottom:'0.75rem',color:'var(--navy)'}}>RETIREMENT</div>
        <div className="form-grid">
          <div className="form-group"><label>Income Required on Retirement (R)</label>
            <input type="number" value={sD.retirementIncomeRequired||''} onChange={e=>setSd('retirementIncomeRequired',e.target.value)} />
          </div>
          <div className="form-group"><label>Income Considered (R)</label>
            <input type="number" value={sD.retirementIncomeConsidered||''} onChange={e=>setSd('retirementIncomeConsidered',e.target.value)} />
          </div>
          <div className="form-group"><label>Capital Required (R)</label>
            <input type="number" value={sD.retirementCapital||''} onChange={e=>setSd('retirementCapital',e.target.value)} />
          </div>
        </div>
        <div className="form-group"><label>Products Considered</label>
          <input value={sD.retirementProductsConsidered||allInsurers.join(', ')||''} onChange={e=>setSd('retirementProductsConsidered',e.target.value)} />
        </div>
        <div className="form-group"><label>Product Selected & Motivation</label>
          <input value={sD.retirementProductSelected||''} onChange={e=>setSd('retirementProductSelected',e.target.value)} />
        </div>
        <div className="form-group">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.4rem'}}>
            <label style={{margin:0}}>Rationale</label>
            <AIButton label="Generate" loading={generating['sectionD_retirement']} onClick={()=>genSectionD('retirement')} />
          </div>
          <textarea value={sD.retirementRationale||''} onChange={e=>setSd('retirementRationale',e.target.value)} style={{minHeight:'80px'}} />
        </div>
      </div>
      <div style={{background:'var(--off-white)',border:'1px solid var(--border-light)',borderRadius:'8px',padding:'1rem',marginBottom:'1rem'}}>
        <div style={{fontWeight:700,marginBottom:'0.75rem',color:'var(--navy)'}}>SAVINGS / INVESTMENT</div>
        <div className="form-group"><label>Amount Required (R)</label>
          <input type="number" value={sD.savingsAmount||''} onChange={e=>setSd('savingsAmount',e.target.value)} />
        </div>
        <div className="form-group"><label>Products Considered</label>
          <input value={sD.savingsProductsConsidered||allInsurers.join(', ')||''} onChange={e=>setSd('savingsProductsConsidered',e.target.value)} />
        </div>
        <div className="form-group"><label>Product Selected & Motivation</label>
          <input value={sD.savingsProductSelected||''} onChange={e=>setSd('savingsProductSelected',e.target.value)} />
        </div>
        <div className="form-group">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.4rem'}}>
            <label style={{margin:0}}>Rationale</label>
            <AIButton label="Generate" loading={generating['sectionD_savings']} onClick={()=>genSectionD('savings')} />
          </div>
          <textarea value={sD.savingsRationale||''} onChange={e=>setSd('savingsRationale',e.target.value)} style={{minHeight:'80px'}} />
        </div>
      </div>

      {/* ── Investment Needs Summary ── */}
      <div className="section-title">Investment Needs Summary</div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem',minWidth:'700px'}}>
          <thead><tr style={{background:'var(--navy)',color:'white'}}>
            <th style={{padding:'0.4rem 0.6rem',textAlign:'left',width:'20%'}}>Investment Need</th>
            <th style={{padding:'0.4rem',textAlign:'center',width:'14%'}}>Quantified (R)</th>
            <th style={{padding:'0.4rem',textAlign:'center',width:'8%'}}>Priority</th>
            <th style={{padding:'0.4rem',textAlign:'center',width:'20%'}}>Addressed</th>
            <th style={{padding:'0.4rem',textAlign:'center',width:'14%'}}>Shortfall (R)</th>
            <th style={{padding:'0.4rem 0.6rem',width:'16%'}}>Review Date</th>
          </tr></thead>
          <tbody>
            {INVEST_NEEDS_ROWS.map(({group,items}) => (
              <>
                <tr key={group} style={{background:'var(--navy)',color:'var(--gold)'}}>
                  <td colSpan={6} style={{padding:'0.3rem 0.6rem',fontWeight:700,fontSize:'0.75rem'}}>{group}</td>
                </tr>
                {items.map(need => {
                  const nd = investNeeds[need] || {}
                  const rev = oneYear()
                  return (
                    <tr key={need} style={{borderBottom:'1px solid var(--border-light)'}}>
                      <td style={{padding:'0.35rem 0.6rem',fontWeight:500,fontSize:'0.78rem'}}>{need}</td>
                      <td style={{padding:'0.35rem 0.4rem'}}>
                        <input type="number" value={nd.quantified||''} onChange={e=>setInvestNeed(need,'quantified',e.target.value)}
                          style={{width:'100%',fontSize:'0.78rem',padding:'0.2rem 0.4rem'}} placeholder="R" />
                      </td>
                      <td style={{padding:'0.35rem 0.4rem',textAlign:'center'}}>
                        <select value={nd.priority||''} onChange={e=>setInvestNeed(need,'priority',e.target.value)}
                          style={{width:'100%',fontSize:'0.78rem',padding:'0.2rem'}}>
                          <option value=""></option>
                          {['1','2','3','4','5','N/A'].map(p=><option key={p}>{p}</option>)}
                        </select>
                      </td>
                      <td style={{padding:'0.35rem 0.4rem'}}>
                        <div style={{display:'flex',gap:'0.3rem',justifyContent:'center',flexWrap:'wrap'}}>
                          {['Y','N','P','L'].map(s=>(
                            <label key={s} style={{display:'flex',alignItems:'center',gap:'0.2rem',fontSize:'0.75rem',cursor:'pointer',fontWeight:nd.status===s?700:400}}>
                              <input type="radio" name={`investNeed_${need}`} value={s} checked={nd.status===s}
                                onChange={()=>setInvestNeed(need,'status',s)} style={{width:'auto',accentColor:'var(--gold)'}} />
                              {s==='Y'?'Yes':s==='N'?'No':s==='P'?'Part.':'Later'}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td style={{padding:'0.35rem 0.4rem'}}>
                        <input type="number" value={nd.shortfall||''} onChange={e=>setInvestNeed(need,'shortfall',e.target.value)}
                          style={{width:'100%',fontSize:'0.78rem',padding:'0.2rem 0.4rem'}} placeholder="R" />
                      </td>
                      <td style={{padding:'0.35rem 0.6rem'}}>
                        <input type="date" value={nd.reviewDate||rev} onChange={e=>setInvestNeed(need,'reviewDate',e.target.value)}
                          style={{width:'100%',fontSize:'0.78rem',padding:'0.2rem'}} />
                      </td>
                    </tr>
                  )
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Section E ── */}
      <div className="section-title">Section E: Implementation Motivation</div>
      <div className="form-group">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.4rem'}}>
          <label style={{margin:0}}>Product(s) implemented</label>
          <AIButton label="Generate" loading={generating.sectionE} onClick={genSectionE} />
        </div>
        <input value={data.selectedProductsText||''} onChange={set('selectedProductsText')} placeholder="Products selected" style={{marginBottom:'0.5rem'}} />
        <textarea value={data.sectionE||''} onChange={set('sectionE')} style={{minHeight:'100px'}} />
      </div>

      {/* ── Section F ── */}
      <div className="section-title">Section F: Important Information</div>
      <div className="form-group">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.4rem'}}>
          <label style={{margin:0}}>Important information highlighted to client</label>
          <AIButton label="Generate" loading={generating.sectionF} onClick={genSectionF} />
        </div>
        <textarea value={data.sectionF||''} onChange={set('sectionF')} style={{minHeight:'100px'}} />
      </div>

      {/* ── Section G — Fees ── */}
      <div className="section-title">Section G: Fees</div>
      {fees.map((f,i) => (
        <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:'0.75rem',
          background:'var(--off-white)',padding:'0.75rem',borderRadius:'8px',border:'1px solid var(--border-light)',marginBottom:'0.5rem'}}>
          <div className="form-group" style={{margin:0}}>
            <label>Product / Insurer</label>
            <input value={f.product||''} onChange={e=>setFee(i,'product',e.target.value)} />
          </div>
          <div className="form-group" style={{margin:0}}>
            <label>Upfront (R)</label>
            <input type="number" value={f.upfront||''} onChange={e=>setFee(i,'upfront',e.target.value)} />
          </div>
          <div className="form-group" style={{margin:0}}>
            <label>Ongoing (R p.a.)</label>
            <input type="number" value={f.ongoing||''} onChange={e=>setFee(i,'ongoing',e.target.value)} />
          </div>
          <button type="button" onClick={()=>removeFee(i)} className="btn btn-sm btn-danger" style={{alignSelf:'flex-end'}} disabled={fees.length===1}>
            <Trash2 size={13}/>
          </button>
        </div>
      ))}
      <button type="button" onClick={addFee} className="btn btn-sm btn-outline">
        <Plus size={13}/> Add Fee
      </button>

      {/* ── Section H ── */}
      <div className="section-title">Section H: Advisor Declaration</div>
      <div className="form-group"><label>Declined Products</label>
        <input value={sH.declinedProducts||''} onChange={e=>setSH('declinedProducts',e.target.value)} />
      </div>
      <div className="form-group"><label>Reasons for Declining</label>
        <input value={sH.declinedReasons||''} onChange={e=>setSH('declinedReasons',e.target.value)} />
      </div>
      <div className="form-group"><label>Risks if Not Proceeding</label>
        <select value={sH.risks||'NO'} onChange={e=>setSH('risks',e.target.value)}>
          <option>NO</option><option>YES</option>
        </select>
      </div>
      <div className="form-group"><label>Focused Need (if applicable)</label>
        <input value={sH.focusedNeed||'N/A'} onChange={e=>setSH('focusedNeed',e.target.value)} />
      </div>

      {/* ── General Comments ── */}
      <div className="section-title">General Comments</div>
      <div className="form-group">
        <textarea value={data.generalComments||''} onChange={set('generalComments')} style={{minHeight:'80px'}} />
      </div>
    </div>
  )
}
