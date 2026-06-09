import { useState, useEffect } from 'react'
import { generateSectionD, generateSectionE, generateSectionF } from '../lib/roaGenerator'
import { Sparkles, Plus, Trash2 } from 'lucide-react'

const INSURERS = ['Sanlam', 'PPS', 'Old Mutual', 'BrightRock', 'Other']

const NEEDS_CONFIG = [
  { key:'emergency',  label:'Provision for emergency',            guideline:'At least 3 times monthly salary.',                                       defaultAddress:'NO',  defaultPriority:'N/A' },
  { key:'death',      label:'Responsibilities in event of death', guideline:'Monthly income for family + capital to pay off debt.',                    defaultAddress:'YES', defaultPriority:'1'   },
  { key:'disability', label:'Inability to work',                  guideline:'Gross income required in case of permanent or temporary disability.',     defaultAddress:'YES', defaultPriority:'1'   },
  { key:'trauma',     label:'Effect of trauma',                   guideline:'Amount required for lifestyle adjustments — cancer, stroke, heart attack.',defaultAddress:'YES', defaultPriority:'2'   },
  { key:'retirement', label:'Income and capital for retirement',  guideline:'Reasonable income to maintain standard of living on retirement.',         defaultAddress:'YES', defaultPriority:'3'   },
  { key:'savings',    label:'Invest or Save for specific need',   guideline:"Amount required for children's studies or other objective.",              defaultAddress:'NO',  defaultPriority:'N/A' },
  { key:'assets',     label:'Protection of assets',               guideline:'Sufficient short term cover for assets.',                                 defaultAddress:'YES', defaultPriority:'4'   },
  { key:'health',     label:'Health cost cover',                  guideline:'Sufficient cover for medical expenses.',                                  defaultAddress:'NO',  defaultPriority:'N/A' },
  { key:'will',       label:'Will',                               guideline:'Is there an updated will?',                                               defaultAddress:'NO',  defaultPriority:'N/A' },
  { key:'other',      label:'Other',                              guideline:'',                                                                        defaultAddress:'NO',  defaultPriority:'N/A' },
]

const PLAN_NEEDS_KEYS = [
  'Life',
  'Permanent Disability (Income Protection)',
  'Permanent Disability (lump sum)',
  'Temporary Disability',
  'Trauma / Illness',
  'Funeral Cover / Immediate Expenses',
  'Other [Physical and/or Functional Impairment, sickness cover, retrenchment benefit etc.]',
]

const PRIORITY_OPTS = ['1','2','3','4','5','6','N/A']
const STATUS_OPTS   = ['Y','N','P','L']

function oneYearFromToday() {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0,10)
}

// Extract age from SA ID number
function ageFromId(idNumber) {
  if (!idNumber || idNumber.length < 6) return null
  const yy = parseInt(idNumber.substring(0,2))
  const mm = parseInt(idNumber.substring(2,4))
  const dd = parseInt(idNumber.substring(4,6))
  if (isNaN(yy)||isNaN(mm)||isNaN(dd)) return null
  const currentYear = new Date().getFullYear()
  const century = yy + 2000 > currentYear ? 1900 : 2000
  const fullYear = century + yy
  const birth = new Date(`${fullYear}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m===0 && today.getDate() < birth.getDate())) age--
  return isNaN(age) ? null : age
}

function AIButton({ onClick, loading, label }) {
  return (
    <button type="button" className="btn btn-sm btn-outline" onClick={onClick} disabled={loading}
      style={{display:'flex',alignItems:'center',gap:'0.4rem',fontSize:'0.78rem',borderColor:'var(--gold)',color:'var(--gold-dark)'}}>
      <Sparkles size={13} style={{color:'var(--gold)'}} />
      {loading ? 'Generating…' : label}
    </button>
  )
}

export default function ROAForm({ data, onChange }) {
  const set  = f => e => onChange({ ...data, [f]: e.target.value })
  const setV = (f,v) => onChange({ ...data, [f]: v })
  const [generating, setGenerating] = useState({})
  const setGen = (k,v) => setGenerating(prev => ({...prev,[k]:v}))

  // Auto-calculate age from ID number if not set
  const derivedAge = data.age || ageFromId(data.idNumber) || ''
  const reviewDate = oneYearFromToday()

  // Auto-initialise needs table on first load
  useEffect(() => {
    if (data.needsTable && Object.keys(data.needsTable).length > 0) return
    const defaultNeeds = {}
    NEEDS_CONFIG.forEach(n => {
      defaultNeeds[n.key] = {
        address:    n.defaultAddress,
        priority:   n.defaultPriority,
        reviewDate: n.defaultAddress === 'YES' ? reviewDate : '',
        amount:     '',
      }
    })
    onChange({ ...data, needsTable: defaultNeeds, age: derivedAge })
  }, [])

  // Auto-populate Section D cover amounts from shared FNA/ROA data
  useEffect(() => {
    if (!data.liabilityShortfall && !data.currentDebt) return
    const recs = { ...(data.recommendations || {}) }
    let changed = false
    // Auto-fill death cover from debt if not set
    if (!recs.death?.life_cover_required && data.currentDebt) {
      recs.death = { ...recs.death, life_cover_required: data.currentDebt, life_cover_considered: data.currentDebt }
      changed = true
    }
    if (changed) onChange({ ...data, recommendations: recs })
  }, [data.currentDebt])

  // Auto-populate planNeeds summary from recommendations
  useEffect(() => {
    const recs = data.recommendations || {}
    const planNeeds = { ...(data.planNeeds || {}) }
    let changed = false
    if (recs.death?.life_cover_required && !planNeeds['Life']?.quantified) {
      planNeeds['Life'] = { quantified: recs.death.life_cover_required, priority:'1', reviewDate, status:'Y' }
      planNeeds['Funeral Cover / Immediate Expenses'] = { quantified:'', priority:'2', reviewDate, status:'Y' }
      changed = true
    }
    if (recs.disability?.income_required && !planNeeds['Permanent Disability (Income Protection)']?.quantified) {
      planNeeds['Permanent Disability (Income Protection)'] = { quantified: recs.disability.income_required, priority:'1', reviewDate, status:'Y' }
      planNeeds['Permanent Disability (lump sum)']          = { quantified: recs.disability.capital_required || '', priority:'1', reviewDate, status:'Y' }
      planNeeds['Temporary Disability']                      = { quantified: recs.disability.income_required, priority:'2', reviewDate, status:'Y' }
      changed = true
    }
    if (recs.trauma?.cover_required && !planNeeds['Trauma / Illness']?.quantified) {
      planNeeds['Trauma / Illness'] = { quantified: recs.trauma.cover_required, priority:'2', reviewDate, status:'Y' }
      changed = true
    }
    if (changed) onChange({ ...data, planNeeds })
  }, [data.recommendations])

  // Products
  const products    = data.products || [{ insurer:'', product:'', premium:'', quoteOnFile:'Y' }]
  const setProducts = prods => setV('products', prods)
  const addProduct  = () => setProducts([...products, { insurer:'', product:'', premium:'', quoteOnFile:'Y' }])
  const removeProduct = i => setProducts(products.filter((_,idx)=>idx!==i))
  const setProduct  = (i,f,v) => { const p=[...products]; p[i]={...p[i],[f]:v}; setProducts(p) }
  const selectedProducts = products.filter(p=>p.insurer&&p.product)
  const allInsurers = [...new Set(selectedProducts.map(p=>p.customInsurer||p.insurer))]

  // Fees — multiple per product
  const fees    = data.feesList || [{ product:'', upfront:'', ongoing:'' }]
  const setFees = list => setV('feesList', list)
  const addFee  = () => setFees([...fees, { product:'', upfront:'', ongoing:'' }])
  const removeFee = i => setFees(fees.filter((_,idx)=>idx!==i))
  const setFee  = (i,f,v) => { const fl=[...fees]; fl[i]={...fl[i],[f]:v}; setFees(fl) }

  // Needs table
  const needs   = data.needsTable || {}
  const setNeed = (key,field,val) => {
    const updated = { ...needs, [key]: { ...needs[key], [field]: val } }
    if (field==='address' && val==='YES' && !needs[key]?.reviewDate)
      updated[key].reviewDate = reviewDate
    onChange({ ...data, needsTable: updated })
  }

  // Recommendations
  const recs   = data.recommendations || {}
  const setRec = (key,field,val) => setV('recommendations', { ...recs, [key]: { ...recs[key], [field]: val } })

  // Plan needs
  const planNeeds   = data.planNeeds || {}
  const setPlanNeed = (key,field,val) => setV('planNeeds', { ...planNeeds, [key]: { ...planNeeds[key], [field]: val } })

  // Section H
  const sH    = data.sectionH || {}
  const setSH = (f,v) => setV('sectionH', { ...sH, [f]: v })

  // AI handlers
  const genRationale = async (needType) => {
    setGen(needType, true)
    try {
      const rec  = recs[needType] || {}
      const text = await generateSectionD(
        { ...data, age: derivedAge },
        products, rec.selected || '', needType
      )
      if (text) setRec(needType, 'rationale', text)
    } catch(e) { console.error('Generate error:', e) }
    setGen(needType, false)
  }

  const genSectionE = async () => {
    setGen('sectionE', true)
    try {
      const text = await generateSectionE({ ...data, age: derivedAge }, selectedProducts, data.occupation)
      if (text) setV('sectionE', text)
    } catch(e) { console.error('Generate error:', e) }
    setGen('sectionE', false)
  }

  const genSectionF = async () => {
    setGen('sectionF', true)
    try {
      const insurers = [...new Set(products.map(p=>p.customInsurer||p.insurer).filter(Boolean))]
      const text = await generateSectionF(insurers)
      if (text) setV('sectionF', text)
    } catch(e) { console.error('Generate error:', e) }
    setGen('sectionF', false)
  }

  return (
    <div>
      {/* ── Section A ── */}
      <div className="section-title">Section A — Summary of Information Obtained from the Client</div>
      <div className="form-grid">
        <div className="form-group span-2">
          <label>Client's Needs and Objectives</label>
          <textarea value={data.needsObjectives||''} onChange={set('needsObjectives')} style={{minHeight:'55px'}}
            placeholder="TO CONSOLIDATE POLICY PORTFOLIO WITH ONE ADVISOR AND TO ACQUIRE LIFE, DISABILITY, CRITICAL ILLNESS AND SICKNESS COVER" />
        </div>
        <div className="form-group span-2">
          <label>Financial Situation</label>
          <input value={data.financialSituation||''} onChange={set('financialSituation')} placeholder="e.g. EMPLOYED THROUGH PRIVATE AND GOVERNMENT" />
        </div>
        <div className="form-group">
          <label>Age <span style={{fontWeight:400,textTransform:'none',color:'var(--slate-light)'}}>(auto from ID number)</span></label>
          <input type="number" value={derivedAge} onChange={set('age')} placeholder="Auto-calculated from ID" />
          {!data.age && ageFromId(data.idNumber) && (
            <span style={{fontSize:'0.78rem',color:'var(--success)',marginTop:'0.2rem',display:'block'}}>✓ Auto from ID: {ageFromId(data.idNumber)}</span>
          )}
        </div>
        <div className="form-group"><label>Number of Dependents</label><input type="number" value={data.dependents||'0'} onChange={set('dependents')} /></div>
        <div className="form-group">
          <label>Smoker Status</label>
          <select value={data.smokerStatus||'Non-Smoker'} onChange={set('smokerStatus')}>
            <option>Non-Smoker</option><option>Smoker</option>
          </select>
        </div>
        <div className="form-group"><label>Monthly Premium Consideration (R)</label><input type="number" value={data.premiumConsideration||''} onChange={set('premiumConsideration')} /></div>
        <div className="form-group"><label>Current Debt (R)</label><input type="number" value={data.currentDebt||''} onChange={set('currentDebt')} /></div>
        <div className="form-group">
          <label>Affordability</label>
          <select value={data.affordability||'Full affordability confirmed by client'} onChange={set('affordability')}>
            <option>Full affordability confirmed by client</option>
            <option>Partial affordability</option>
            <option>Client to review budget</option>
          </select>
        </div>
        <div className="form-group span-2">
          <label>Product Knowledge and Experience</label>
          <textarea value={data.productKnowledge||'CLIENT HAS LOW LEVEL OF PRODUCT KNOWLEDGE AND EXPERIENCE WITH LONG TERM INSURANCE BUT UNDERSTANDS THE EFFECTS AND CONSEQUENCES OF THE CHOSEN PRODUCT FULLY.'} onChange={set('productKnowledge')} style={{minHeight:'50px'}} />
        </div>
        <div className="form-group span-2">
          <label>Other Information (Will, estate planning, tax)</label>
          <textarea value={data.otherInfo||''} onChange={set('otherInfo')} style={{minHeight:'45px'}} placeholder="e.g. CLIENT HAS A WILL, HAS TAX PLANNING IN PLACE..." />
        </div>
      </div>

      {/* ── Section B ── */}
      <div className="section-title">Section B — Description and Prioritising of Financial Needs</div>
      <div className="alert alert-info" style={{marginBottom:'0.75rem',fontSize:'0.82rem'}}>
        Pre-populated with standard defaults. Review dates auto-set to 1 year from today for all YES needs.
      </div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem',minWidth:'700px'}}>
          <thead>
            <tr style={{background:'var(--black)',color:'var(--gold)'}}>
              <th style={{padding:'0.5rem 0.75rem',textAlign:'left',width:'22%'}}>Financial Need</th>
              <th style={{padding:'0.5rem',textAlign:'center',width:'9%'}}>Address?</th>
              <th style={{padding:'0.5rem 0.75rem',textAlign:'left',width:'38%'}}>Guidelines / Amount (R)</th>
              <th style={{padding:'0.5rem',textAlign:'center',width:'9%'}}>Priority</th>
              <th style={{padding:'0.5rem',width:'16%'}}>Review Date</th>
            </tr>
          </thead>
          <tbody>
            {NEEDS_CONFIG.map((n,i) => {
              const nd = needs[n.key] || { address:n.defaultAddress, priority:n.defaultPriority }
              const isYes = (nd.address||n.defaultAddress) === 'YES'
              return (
                <tr key={n.key} style={{borderBottom:'1px solid var(--border-light)',background:i%2===0?'var(--white)':'var(--off-white)'}}>
                  <td style={{padding:'0.4rem 0.75rem',fontWeight:500}}>{n.label}</td>
                  <td style={{padding:'0.4rem',textAlign:'center'}}>
                    <select value={nd.address||n.defaultAddress} onChange={e=>setNeed(n.key,'address',e.target.value)}
                      style={{fontSize:'0.78rem',padding:'0.2rem',width:'100%',
                        background:isYes?'#f0fff4':'var(--white)',fontWeight:isYes?700:400}}>
                      <option>YES</option><option>NO</option>
                    </select>
                  </td>
                  <td style={{padding:'0.4rem 0.5rem'}}>
                    <div style={{fontSize:'0.74rem',color:'var(--slate-light)',marginBottom:'0.15rem'}}>{n.guideline}</div>
                    <input value={nd.amount||''} onChange={e=>setNeed(n.key,'amount',e.target.value)}
                      placeholder="R amount" style={{fontSize:'0.78rem',padding:'0.2rem 0.5rem',width:'100%'}} />
                  </td>
                  <td style={{padding:'0.4rem',textAlign:'center'}}>
                    <select value={nd.priority||n.defaultPriority} onChange={e=>setNeed(n.key,'priority',e.target.value)}
                      style={{fontSize:'0.78rem',padding:'0.2rem',width:'100%'}}>
                      {PRIORITY_OPTS.map(p=><option key={p}>{p}</option>)}
                    </select>
                  </td>
                  <td style={{padding:'0.4rem 0.5rem'}}>
                    <input type="date" value={nd.reviewDate||(isYes?reviewDate:'')}
                      onChange={e=>setNeed(n.key,'reviewDate',e.target.value)}
                      style={{fontSize:'0.78rem',padding:'0.2rem',width:'100%'}} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Section C ── */}
      <div className="section-title">Section C — Products Considered</div>
      {products.map((p,i) => (
        <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1.5fr 1fr 0.5fr auto',gap:'0.75rem',marginBottom:'0.75rem',alignItems:'end'}}>
          <div className="form-group" style={{margin:0}}>
            <label>Insurer</label>
            <select value={p.insurer} onChange={e=>setProduct(i,'insurer',e.target.value)}>
              <option value="">Select...</option>
              {INSURERS.map(ins=><option key={ins}>{ins}</option>)}
            </select>
            {p.insurer==='Other' && <input value={p.customInsurer||''} onChange={e=>setProduct(i,'customInsurer',e.target.value)} placeholder="Insurer name" style={{marginTop:'0.35rem'}} />}
          </div>
          <div className="form-group" style={{margin:0}}>
            <label>Product Name</label>
            <input value={p.product} onChange={e=>setProduct(i,'product',e.target.value)} placeholder="e.g. Matrix Risk Cover & Income Protector" />
          </div>
          <div className="form-group" style={{margin:0}}>
            <label>Premium (R/pm)</label>
            <input type="number" value={p.premium} onChange={e=>setProduct(i,'premium',e.target.value)} />
          </div>
          <div className="form-group" style={{margin:0}}>
            <label>Quote on File</label>
            <select value={p.quoteOnFile||'Y'} onChange={e=>setProduct(i,'quoteOnFile',e.target.value)}>
              <option value="Y">Y</option><option value="N">N</option>
            </select>
          </div>
          <button type="button" onClick={()=>removeProduct(i)} className="btn btn-sm btn-danger" style={{alignSelf:'flex-end'}} disabled={products.length===1}>
            <Trash2 size={13}/>
          </button>
        </div>
      ))}
      <button type="button" onClick={addProduct} className="btn btn-sm btn-outline" style={{marginBottom:'1rem'}}>
        <Plus size={13}/> Add Product
      </button>

      {/* ── Section D ── */}
      <div className="section-title">Section D — Initial Recommendation / Advice and Motivation</div>
      <div className="alert alert-info" style={{marginBottom:'1rem',fontSize:'0.82rem'}}>
        <Sparkles size={13} style={{color:'var(--gold)',flexShrink:0}}/> Cover amounts auto-populated from debt/FNA data where available. Select the ONE product recommended per need type, then click Generate.
      </div>

      {[
        { key:'death',     label:'DEATH',      fields:[['Life Cover Required','life_cover_required'],['Life Cover Considered','life_cover_considered']] },
        { key:'disability',label:'DISABILITY', fields:[['Income Required (p/m)','income_required'],['Income Considered (p/m)','income_considered'],['Lump Sum Capital Required','capital_required'],['Lump Sum Capital Considered','capital_considered']] },
        { key:'trauma',    label:'TRAUMA',     fields:[['Cover Required','cover_required'],['Cover Considered','cover_considered']] },
      ].map(({key,label,fields}) => {
        const rec = recs[key]||{}
        return (
          <div key={key} style={{background:'var(--off-white)',border:'1px solid var(--border-light)',borderRadius:'8px',padding:'1.25rem',marginBottom:'1rem'}}>
            <div style={{fontWeight:700,fontSize:'0.9rem',borderBottom:'2px solid var(--gold)',paddingBottom:'0.4rem',marginBottom:'1rem',color:'var(--black)'}}>{label}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'0.75rem'}}>
              {fields.map(([fl,fk])=>(
                <div className="form-group" key={fk} style={{margin:0}}>
                  <label>{fl} (R)</label>
                  <input type="number" value={rec[fk]||''} onChange={e=>setRec(key,fk,e.target.value)} placeholder="e.g. 3 000 000" />
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'0.75rem'}}>
              <div className="form-group" style={{margin:0}}>
                <label>Products Considered</label>
                <input value={rec.considered||allInsurers.join(', ')} onChange={e=>setRec(key,'considered',e.target.value)} />
              </div>
              <div className="form-group" style={{margin:0}}>
                <label>Product Selected — the ONE product chosen</label>
                <select value={rec.selected||''} onChange={e=>setRec(key,'selected',e.target.value)}>
                  <option value="">Select the recommended product...</option>
                  {selectedProducts.map((p,i)=>(
                    <option key={i} value={`${p.customInsurer||p.insurer} — ${p.product}`}>
                      {p.customInsurer||p.insurer} — {p.product}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group" style={{margin:0}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.35rem'}}>
                <label>Rationale</label>
                <AIButton onClick={()=>genRationale(key)} loading={generating[key]} label={`Generate ${label} Rationale`} />
              </div>
              {generating[key]
                ? <div className="signoff-generating"><div className="spinner"/><span>Comparing products for {label}…</span></div>
                : <textarea value={rec.rationale||''} onChange={e=>setRec(key,'rationale',e.target.value)} style={{minHeight:'80px'}} placeholder="Click Generate or type manually..." />
              }
            </div>
          </div>
        )
      })}

      {/* Financial Planning Needs Summary */}
      <div style={{fontWeight:600,fontSize:'0.88rem',margin:'1rem 0 0.5rem'}}>Financial Planning Needs Summary</div>
      <div className="alert alert-info" style={{marginBottom:'0.75rem',fontSize:'0.82rem'}}>
        Auto-populated from Section D above. Review and adjust as needed.
      </div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem',minWidth:'700px'}}>
          <thead>
            <tr style={{background:'var(--black)',color:'var(--gold)'}}>
              <th style={{padding:'0.4rem 0.6rem',textAlign:'left',width:'26%'}}>Financial Planning Need</th>
              <th style={{padding:'0.4rem',textAlign:'center',width:'14%'}}>Needs Quantified (R)</th>
              <th style={{padding:'0.4rem',textAlign:'center',width:'8%'}}>Priority</th>
              <th style={{padding:'0.4rem',textAlign:'center',width:'20%'}}>Addressed</th>
              <th style={{padding:'0.4rem',textAlign:'center',width:'14%'}}>Shortfall (R)</th>
              <th style={{padding:'0.4rem 0.6rem',width:'16%'}}>Review Date</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_NEEDS_KEYS.map((need,i) => {
              const pn = planNeeds[need]||{}
              return (
                <tr key={need} style={{borderBottom:'1px solid var(--border-light)',background:i%2===0?'var(--white)':'var(--off-white)'}}>
                  <td style={{padding:'0.35rem 0.6rem',fontWeight:500,fontSize:'0.78rem'}}>{need}</td>
                  <td style={{padding:'0.35rem 0.4rem'}}>
                    <input type="number" value={pn.quantified||''} onChange={e=>setPlanNeed(need,'quantified',e.target.value)}
                      style={{width:'100%',fontSize:'0.78rem',padding:'0.2rem 0.4rem'}} placeholder="R" />
                  </td>
                  <td style={{padding:'0.35rem 0.4rem',textAlign:'center'}}>
                    <select value={pn.priority||'1'} onChange={e=>setPlanNeed(need,'priority',e.target.value)}
                      style={{width:'100%',fontSize:'0.78rem',padding:'0.2rem'}}>
                      {PRIORITY_OPTS.map(p=><option key={p}>{p}</option>)}
                    </select>
                  </td>
                  <td style={{padding:'0.35rem 0.4rem'}}>
                    <div style={{display:'flex',gap:'0.3rem',justifyContent:'center',flexWrap:'wrap'}}>
                      {STATUS_OPTS.map(s=>(
                        <label key={s} style={{display:'flex',alignItems:'center',gap:'0.2rem',fontSize:'0.75rem',
                          cursor:'pointer',fontWeight:pn.status===s?700:400,color:pn.status===s?'var(--gold-dark)':'var(--slate)'}}>
                          <input type="radio" name={`st_${need}`} value={s} checked={pn.status===s}
                            onChange={()=>setPlanNeed(need,'status',s)} style={{width:'auto',accentColor:'var(--gold)'}}/>
                          {s==='Y'?'Yes':s==='N'?'No':s==='P'?'Part.':'Later'}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td style={{padding:'0.35rem 0.4rem'}}>
                    <input type="number" value={pn.shortfall||''} onChange={e=>setPlanNeed(need,'shortfall',e.target.value)}
                      style={{width:'100%',fontSize:'0.78rem',padding:'0.2rem 0.4rem'}} placeholder="R" />
                  </td>
                  <td style={{padding:'0.35rem 0.6rem'}}>
                    <input type="date" value={pn.reviewDate||reviewDate} onChange={e=>setPlanNeed(need,'reviewDate',e.target.value)}
                      style={{width:'100%',fontSize:'0.78rem',padding:'0.2rem'}} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Section E ── */}
      <div className="section-title">Section E — Implementation Motivation</div>
      <div className="form-group">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.35rem'}}>
          <label>Product(s) selected & implementation rationale</label>
          <AIButton onClick={genSectionE} loading={generating.sectionE} label="Generate Section E" />
        </div>
        <div className="form-group" style={{marginBottom:'0.5rem'}}>
          <label>Product(s) Selected by Client</label>
          <input value={data.selectedProductsText||
            Object.values(recs).filter(r=>r.selected).map(r=>r.selected).filter((v,i,a)=>a.indexOf(v)===i).join(', ')||
            selectedProducts.map(p=>`${p.customInsurer||p.insurer} ${p.product}`).join(', ')}
            onChange={set('selectedProductsText')} />
        </div>
        {generating.sectionE
          ? <div className="signoff-generating"><div className="spinner"/><span>Generating Section E…</span></div>
          : <textarea value={data.sectionE||''} onChange={set('sectionE')} style={{minHeight:'120px'}} placeholder="Click Generate Section E or type manually..." />
        }
      </div>

      {/* ── Section F ── */}
      <div className="section-title">Section F — Important Information Highlighted to Client</div>
      <div className="form-group">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.35rem'}}>
          <label>Exclusions, waiting periods, fees, loadings, policy terms</label>
          <AIButton onClick={genSectionF} loading={generating.sectionF} label="Generate from Product Notes" />
        </div>
        {generating.sectionF
          ? <div className="signoff-generating"><div className="spinner"/><span>Compiling from product notes…</span></div>
          : <textarea value={data.sectionF||''} onChange={set('sectionF')} style={{minHeight:'130px'}}
              placeholder="Click Generate from Product Notes — pulls from selected insurers' knowledge base." />
        }
      </div>

      {/* ── Section G — Multiple Fees ── */}
      <div className="section-title">Section G — Fees & Commission</div>
      <div className="alert alert-info" style={{marginBottom:'0.75rem',fontSize:'0.82rem'}}>
        Add a fee row for each product selected. Totals auto-calculated.
      </div>
      {fees.map((f,i) => (
        <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:'0.75rem',marginBottom:'0.75rem',alignItems:'end',
          background:'var(--off-white)',padding:'0.75rem',borderRadius:'8px',border:'1px solid var(--border-light)'}}>
          <div className="form-group" style={{margin:0}}>
            <label>Product / Insurer</label>
            <select value={f.product} onChange={e=>setFee(i,'product',e.target.value)}>
              <option value="">Select product...</option>
              {selectedProducts.map((p,pi)=>(
                <option key={pi} value={`${p.customInsurer||p.insurer} ${p.product}`}>
                  {p.customInsurer||p.insurer} — {p.product}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group" style={{margin:0}}>
            <label>Upfront / Commission (R)</label>
            <input type="number" value={f.upfront||''} onChange={e=>setFee(i,'upfront',e.target.value)} placeholder="0" />
          </div>
          <div className="form-group" style={{margin:0}}>
            <label>Ongoing Fee (R p.a.)</label>
            <input type="number" value={f.ongoing||''} onChange={e=>setFee(i,'ongoing',e.target.value)} placeholder="0" />
          </div>
          <button type="button" onClick={()=>removeFee(i)} className="btn btn-sm btn-danger" style={{alignSelf:'flex-end'}} disabled={fees.length===1}>
            <Trash2 size={13}/>
          </button>
        </div>
      ))}
      <button type="button" onClick={addFee} className="btn btn-sm btn-outline" style={{marginBottom:'0.75rem'}}>
        <Plus size={13}/> Add Fee Row
      </button>
      {/* Totals */}
      {fees.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:'0.75rem',
          background:'var(--black)',padding:'0.75rem',borderRadius:'8px',color:'var(--gold)'}}>
          <div style={{fontWeight:700,fontSize:'0.85rem'}}>TOTALS</div>
          <div style={{fontWeight:700}}>
            Upfront: R {fees.reduce((s,f)=>s+(Number(f.upfront)||0),0).toLocaleString('en-ZA')}
          </div>
          <div style={{fontWeight:700}}>
            Ongoing: R {fees.reduce((s,f)=>s+(Number(f.ongoing)||0),0).toLocaleString('en-ZA')} p.a.
          </div>
        </div>
      )}

      {/* ── Annexures — Assets & Liabilities + Capital Analysis ── */}
      <div className="section-title">Annexures — Assets & Liabilities (ROA Calculator)</div>
      <div className="alert alert-info" style={{marginBottom:'0.75rem',fontSize:'0.82rem'}}>
        From the ROA Calculator Annexures spreadsheet. All totals auto-calculated.
      </div>

      {/* Section 1: Assets & Liabilities */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
        <div>
          <div style={{fontWeight:700,fontSize:'0.85rem',marginBottom:'0.5rem',color:'var(--black)'}}>ASSETS (R)</div>
          {[
            ['propertyHouse','Property (House)'],['otherProperty','Other property'],
            ['houseContents','House contents'],['vehicles','Vehicles'],
            ['cashAssets','Cash'],['investments','Investments'],
            ['businessInterests','Business interests'],['lifeCoverAsset','Life cover'],
          ].map(([f,l])=>(
            <div className="form-group" key={f} style={{margin:'0 0 0.5rem 0',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',alignItems:'center'}}>
              <label style={{textTransform:'none',fontWeight:400,fontSize:'0.82rem',margin:0}}>{l}</label>
              <input type="number" value={(data.annexures||{})[f]||''} onChange={e=>setV('annexures',{...(data.annexures||{}),[f]:e.target.value})} placeholder="0" style={{padding:'0.25rem 0.5rem',fontSize:'0.82rem'}} />
            </div>
          ))}
          <div style={{fontWeight:700,fontSize:'0.85rem',marginTop:'0.5rem',padding:'0.35rem',background:'var(--gold-pale)',borderRadius:'6px'}}>
            GROSS ESTATE: R {Object.entries(data.annexures||{}).filter(([k])=>['propertyHouse','otherProperty','houseContents','vehicles','cashAssets','investments','businessInterests','lifeCoverAsset'].includes(k)).reduce((s,[,v])=>s+(Number(v)||0),0).toLocaleString('en-ZA')}
          </div>
        </div>
        <div>
          <div style={{fontWeight:700,fontSize:'0.85rem',marginBottom:'0.5rem',color:'var(--black)'}}>LIABILITIES (R)</div>
          {[
            ['bond','Bond'],['otherLiability','Other'],
            ['hirePurchase','Hire purchase'],['hirePurchaseVehicle','Hire purchase (vehicle)'],
            ['hirePurchaseCash','Hire purchase (cash)'],['overdrawnAccounts','Overdrawn accounts'],
            ['loans','Loans'],
          ].map(([f,l])=>(
            <div className="form-group" key={f} style={{margin:'0 0 0.5rem 0',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',alignItems:'center'}}>
              <label style={{textTransform:'none',fontWeight:400,fontSize:'0.82rem',margin:0}}>{l}</label>
              <input type="number" value={(data.annexures||{})[f]||''} onChange={e=>setV('annexures',{...(data.annexures||{}),[f]:e.target.value})} placeholder="0" style={{padding:'0.25rem 0.5rem',fontSize:'0.82rem'}} />
            </div>
          ))}
          <div style={{fontWeight:700,fontSize:'0.85rem',marginTop:'0.5rem',padding:'0.35rem',background:'#fff5f5',borderRadius:'6px'}}>
            TOTAL LIABILITIES: R {Object.entries(data.annexures||{}).filter(([k])=>['bond','otherLiability','hirePurchase','hirePurchaseVehicle','hirePurchaseCash','overdrawnAccounts','loans'].includes(k)).reduce((s,[,v])=>s+(Number(v)||0),0).toLocaleString('en-ZA')}
          </div>
        </div>
      </div>

      {/* Section 4: Capital Needs on Death */}
      <div style={{fontWeight:600,fontSize:'0.88rem',margin:'1rem 0 0.5rem',color:'var(--black)'}}>Capital Needs Analysis on Death (Section 4)</div>
      <div className="form-grid">
        <div className="form-group"><label>Annual income required on death (R)</label><input type="number" value={(data.annexures||{}).incomeOnDeath||''} onChange={e=>setV('annexures',{...(data.annexures||{}),...{incomeOnDeath:e.target.value}})} placeholder="0" /></div>
        <div className="form-group"><label>Less: Annual income provided for — widow's pension etc (R)</label><input type="number" value={(data.annexures||{}).incomeProvided||''} onChange={e=>setV('annexures',{...(data.annexures||{}),...{incomeProvided:e.target.value}})} placeholder="0" /></div>
        <div className="form-group"><label>Capital available to dependants (R)</label><input type="number" value={(data.annexures||{}).capitalAvailable||''} onChange={e=>setV('annexures',{...(data.annexures||{}),...{capitalAvailable:e.target.value}})} placeholder="0" /></div>
        <div className="form-group"><label>Other capital needs — funeral etc (R)</label><input type="number" value={(data.annexures||{}).otherCapital||''} onChange={e=>setV('annexures',{...(data.annexures||{}),...{otherCapital:e.target.value}})} placeholder="0" /></div>
      </div>

      {/* Section 5: Capital Needs on Disability */}
      <div style={{fontWeight:600,fontSize:'0.88rem',margin:'1rem 0 0.5rem',color:'var(--black)'}}>Capital Needs Analysis on Disability (Section 5)</div>
      <div className="form-grid">
        <div className="form-group"><label>Annual income required on disability (R)</label><input type="number" value={(data.annexures||{}).incomeOnDisability||''} onChange={e=>setV('annexures',{...(data.annexures||{}),...{incomeOnDisability:e.target.value}})} placeholder="0" /></div>
        <div className="form-group"><label>Less: Disability pension / provision (R)</label><input type="number" value={(data.annexures||{}).disabilityProvision||''} onChange={e=>setV('annexures',{...(data.annexures||{}),...{disabilityProvision:e.target.value}})} placeholder="0" /></div>
        <div className="form-group"><label>Lump sum disability capital available (R)</label><input type="number" value={(data.annexures||{}).disabilityCapital||''} onChange={e=>setV('annexures',{...(data.annexures||{}),...{disabilityCapital:e.target.value}})} placeholder="0" /></div>
        <div className="form-group"><label>Outstanding liabilities / property alterations (R)</label><input type="number" value={(data.annexures||{}).disabilityOther||''} onChange={e=>setV('annexures',{...(data.annexures||{}),...{disabilityOther:e.target.value}})} placeholder="0" /></div>
      </div>

      {/* Section 6: Capital Needs on Retirement */}
      <div style={{fontWeight:600,fontSize:'0.88rem',margin:'1rem 0 0.5rem',color:'var(--black)'}}>Capital Needs Analysis on Retirement (Section 6)</div>
      <div className="form-grid">
        <div className="form-group"><label>Annual income required on retirement (R)</label><input type="number" value={(data.annexures||{}).incomeOnRetirement||''} onChange={e=>setV('annexures',{...(data.annexures||{}),...{incomeOnRetirement:e.target.value}})} placeholder="0" /></div>
        <div className="form-group"><label>Less: Pension / other provision (R)</label><input type="number" value={(data.annexures||{}).retirementProvision||''} onChange={e=>setV('annexures',{...(data.annexures||{}),...{retirementProvision:e.target.value}})} placeholder="0" /></div>
        <div className="form-group"><label>Years to retirement</label><input type="number" value={(data.annexures||{}).yearsToRetirement||data.yrs||''} onChange={e=>setV('annexures',{...(data.annexures||{}),...{yearsToRetirement:e.target.value}})} placeholder="e.g. 23" /></div>
        <div className="form-group"><label>Existing investments available (R)</label><input type="number" value={(data.annexures||{}).existingInvestments||''} onChange={e=>setV('annexures',{...(data.annexures||{}),...{existingInvestments:e.target.value}})} placeholder="0" /></div>
      </div>

      {/* ── Section H ── */}
      <div className="section-title">Section H — Financial Advisor's Declaration</div>
      <div className="form-grid">
        <div className="form-group span-2">
          <label>1. Products the client elected NOT to accept</label>
          <input value={sH.declinedProducts !== undefined ? sH.declinedProducts
            : selectedProducts.filter(p => {
                const chosen = Object.values(recs).map(r=>r.selected).filter(Boolean)
                return !chosen.some(s=>s.includes(p.customInsurer||p.insurer))
              }).map(p=>p.customInsurer||p.insurer).filter((v,i,a)=>a.indexOf(v)===i).join(' & ')}
            onChange={e=>setSH('declinedProducts',e.target.value)} placeholder="e.g. PPS & Old Mutual" />
        </div>
        <div className="form-group span-2">
          <label>2. Reasons the client elected not to accept the recommendations</label>
          <input value={sH.declinedReasons||''} onChange={e=>setSH('declinedReasons',e.target.value)}
            placeholder="e.g. Increased premiums and aggregated benefits" />
        </div>
        <div className="form-group span-2">
          <label>3. Existence of any risks for not concluding the recommended transaction</label>
          <select value={sH.risks||'NO'} onChange={e=>setSH('risks',e.target.value)}>
            <option>NO</option><option>YES</option>
          </select>
        </div>
        <div className="form-group span-2">
          <label>4. Consequences clearly explained to the client</label>
          <div style={{display:'flex',gap:'2rem',marginTop:'0.25rem'}}>
            {['Yes','No'].map(v=>(
              <label key={v} style={{display:'flex',alignItems:'center',gap:'0.4rem',textTransform:'none',
                cursor:'pointer',fontWeight:sH.consequencesExplained===v?700:400}}>
                <input type="radio" name="conseq" value={v} checked={sH.consequencesExplained===v}
                  onChange={()=>setSH('consequencesExplained',v)} style={{width:'auto',accentColor:'var(--gold)'}}/> {v}
              </label>
            ))}
          </div>
        </div>
        <div className="form-group span-2">
          <label>5. Focused need — what was discussed and agreed</label>
          <input value={sH.focusedNeed||'N/A'} onChange={e=>setSH('focusedNeed',e.target.value)} />
        </div>
        <div className="form-group span-2">
          <label>General Comments</label>
          <textarea value={data.generalComments||''} onChange={set('generalComments')} style={{minHeight:'55px'}} placeholder="Optional" />
        </div>
      </div>
    </div>
  )
}
