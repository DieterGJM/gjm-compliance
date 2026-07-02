// Extract age and DOB from SA ID number (YYMMDD format, first 6 digits)
function parseIDNumber(id) {
  if (!id || id.length < 6) return {}
  const yy = parseInt(id.substring(0, 2))
  const mm = parseInt(id.substring(2, 4))
  const dd = parseInt(id.substring(4, 6))
  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return {}
  const currentYear = new Date().getFullYear()
  const century = yy + 2000 > currentYear ? 1900 : 2000
  const fullYear = century + yy
  const dob = `${fullYear}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`
  const today = new Date()
  const birthDate = new Date(dob)
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
  return { dob, age: isNaN(age) ? null : age }
}

export default function ClientDetailsForm({ data, onChange, clientType, onTypeChange }) {
  const set = (field) => (e) => onChange({ ...data, [field]: e.target.value })

  return (
    <div>
      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label>Client Type</label>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
          {['natural', 'legal'].map(t => (
            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textTransform: 'none', fontWeight: clientType === t ? 700 : 400 }}>
              <input type="radio" name="clientType" value={t} checked={clientType === t} onChange={() => onTypeChange(t)} style={{ width: 'auto' }} />
              {t === 'natural' ? 'Natural Person (Individual)' : 'Legal Entity (Company / Trust / CC)'}
            </label>
          ))}
        </div>
      </div>

      {clientType === 'natural' ? (
        <div className="form-grid">
          <div className="form-group span-2">
            <label>Full Names *</label>
            <input value={data.fullName || ''} onChange={set('fullName')} placeholder="As per ID document" />
          </div>
          <div className="form-group">
            <label>Date of Birth *</label>
            <input type="date" value={data.dob || ''} onChange={set('dob')} />
          </div>
          <div className="form-group">
            <label>SA Identity Number</label>
            <input value={data.idNumber || ''} onChange={e => {
              const id = e.target.value
              const parsed = parseIDNumber(id)
              onChange({ ...data, idNumber: id, ...(parsed.dob ? { dob: parsed.dob, age: parsed.age } : {}) })
            }} placeholder="13-digit ID number" maxLength={13} />
            {data.idNumber && data.idNumber.length >= 6 && (() => {
              const p = parseIDNumber(data.idNumber)
              return p.age ? <span style={{fontSize:'0.78rem',color:'var(--success)',marginTop:'0.25rem',display:'block'}}>✓ DOB: {p.dob} · Age: {p.age}</span> : null
            })()}
          </div>
          <div className="form-group">
            <label>Citizenship</label>
            <select value={data.citizenship || 'RSA'} onChange={set('citizenship')}>
              <option value="RSA">RSA</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Passport No. (if applicable)</label>
            <input value={data.passportNo || ''} onChange={set('passportNo')} placeholder="Only if non-SA citizen" />
          </div>
          <div className="form-group span-2">
            <label>Residential Address *</label>
            <input value={data.residentialAddress || ''} onChange={set('residentialAddress')} placeholder="Street address, suburb, city, code" />
          </div>
          <div className="form-group span-2">
            <label>Postal Address (if different)</label>
            <input value={data.postalAddress || ''} onChange={set('postalAddress')} placeholder="Leave blank if same as residential" />
          </div>
          <div className="form-group">
            <label>Telephone No.</label>
            <input value={data.telephone || ''} onChange={set('telephone')} placeholder="+27 11 000 0000" />
          </div>
          <div className="form-group">
            <label>Mobile No. *</label>
            <input value={data.mobile || ''} onChange={set('mobile')} placeholder="+27 82 000 0000" />
          </div>
          <div className="form-group span-2">
            <label>Email Address *</label>
            <input type="email" value={data.email || ''} onChange={set('email')} placeholder="client@email.com" />
          </div>
          <div className="form-group span-2">
            <label>Occupation / Profession *</label>
            <input value={data.occupation || ''} onChange={set('occupation')} placeholder="e.g. Neurosurgeon, Paediatrician, Civil Engineer, Attorney" />
            <span style={{fontSize:'0.78rem', color:'var(--slate-light)', marginTop:'0.25rem'}}>Used to auto-generate compliance sign-off paragraphs</span>
          </div>
        </div>
      ) : (
        <div className="form-grid">
          <div className="form-group span-2">
            <label>Registered Name *</label>
            <input value={data.registeredName || ''} onChange={set('registeredName')} placeholder="Full registered legal name" />
          </div>
          <div className="form-group">
            <label>Registration No. *</label>
            <input value={data.registrationNo || ''} onChange={set('registrationNo')} placeholder="CIPC / Trust registration" />
          </div>
          <div className="form-group">
            <label>VAT No. (if applicable)</label>
            <input value={data.vatNo || ''} onChange={set('vatNo')} placeholder="VAT registration number" />
          </div>
          <div className="form-group span-2">
            <label>Registered Address *</label>
            <input value={data.registeredAddress || ''} onChange={set('registeredAddress')} placeholder="Registered office address" />
          </div>
          <div className="form-group span-2">
            <label>Postal Address (if different)</label>
            <input value={data.postalAddress || ''} onChange={set('postalAddress')} />
          </div>
          <div className="form-group">
            <label>Contact Person (Authorised Rep) *</label>
            <input value={data.contactPerson || ''} onChange={set('contactPerson')} />
          </div>
          <div className="form-group">
            <label>Contact Person ID No. *</label>
            <input value={data.contactPersonId || ''} onChange={set('contactPersonId')} />
          </div>
          <div className="form-group">
            <label>Telephone No.</label>
            <input value={data.telephone || ''} onChange={set('telephone')} />
          </div>
          <div className="form-group">
            <label>Mobile No.</label>
            <input value={data.mobile || ''} onChange={set('mobile')} />
          </div>
          <div className="form-group span-2">
            <label>Email Address *</label>
            <input type="email" value={data.email || ''} onChange={set('email')} />
          </div>
          <div className="form-group">
            <label>Entity Type</label>
            <select value={data.entityType || 'company'} onChange={set('entityType')}>
              <option value="company">Company (Pty Ltd / Ltd)</option>
              <option value="cc">Close Corporation (CC)</option>
              <option value="trust">Trust</option>
              <option value="partnership">Partnership</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Nature of Business</label>
            <input value={data.naturOfBusiness || ''} onChange={set('naturOfBusiness')} placeholder="e.g. Property investment" />
          </div>
          <div className="form-group span-2">
            <label>Primary Business Activity / Industry *</label>
            <input value={data.occupation || ''} onChange={set('occupation')} placeholder="e.g. Medical Practice, Law Firm, Property Developer" />
            <span style={{fontSize:'0.78rem', color:'var(--slate-light)', marginTop:'0.25rem'}}>Used to auto-generate compliance sign-off paragraphs</span>
          </div>
        </div>
      )}
    </div>
  )
}
