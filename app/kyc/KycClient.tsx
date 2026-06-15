'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Upload, CheckCircle, Loader2, FileText,
  Camera, CreditCard, AlertTriangle, User, MapPin, Phone
} from 'lucide-react'

const DOC_TYPES = [
  'International Passport',
  'National Identity Card',
  "Driver's License",
  "Voter's Card",
  'Residence Permit',
  'Utility Bill',
]

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan',
  'Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
  'Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic',
  'Denmark','Djibouti','Dominica','Dominican Republic',
  'Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia',
  'Fiji','Finland','France',
  'Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana',
  'Haiti','Honduras','Hungary',
  'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Ivory Coast',
  'Jamaica','Japan','Jordan',
  'Kazakhstan','Kenya','Kiribati','Kuwait','Kyrgyzstan',
  'Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg',
  'Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
  'Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway',
  'Oman',
  'Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal',
  'Qatar',
  'Romania','Russia','Rwanda',
  'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria',
  'Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu',
  'Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan',
  'Vanuatu','Vatican City','Venezuela','Vietnam',
  'Yemen',
  'Zambia','Zimbabwe',
]

interface Props {
  profile: { full_name: string; account_number: string; kyc_status: string; phone?: string } | null
}

const inp = 'mt-1 w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500'
const lbl = 'text-xs font-semibold text-gray-500 uppercase tracking-wide'
const req = <span className="text-red-500 ml-0.5">*</span>

export default function KycClient({ profile }: Props) {
  const router = useRouter()

  // Personal details
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [nationality, setNationality] = useState('')
  const [maidenName, setMaidenName] = useState('')
  const [occupation, setOccupation] = useState('')

  // Contact
  const [primaryPhone, setPrimaryPhone] = useState(profile?.phone ?? '')
  const [secondaryPhone, setSecondaryPhone] = useState('')

  // Address
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [stateProvince, setStateProvince] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('')

  // Document
  const [docType, setDocType] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function preview(file: File | null) {
    if (!file) return null
    return URL.createObjectURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dateOfBirth) { setError('Date of birth is required.'); return }
    if (!primaryPhone) { setError('Primary phone number is required.'); return }
    if (!addressLine1 || !city || !country) { setError('Address (line 1), city and country are required.'); return }
    if (!docType) { setError('Please select a document type.'); return }
    if (!docNumber) { setError('Document / ID number is required.'); return }
    if (!frontFile) { setError('Please upload the front of your ID document.'); return }

    setSubmitting(true)
    setError('')

    const form = new FormData()
    // Personal
    form.append('full_name', profile?.full_name ?? '')
    form.append('account_number', profile?.account_number ?? '')
    form.append('date_of_birth', dateOfBirth)
    form.append('gender', gender)
    form.append('nationality', nationality)
    form.append('maiden_name', maidenName)
    form.append('occupation', occupation)
    // Contact
    form.append('primary_phone', primaryPhone)
    form.append('secondary_phone', secondaryPhone)
    // Address
    form.append('address_line1', addressLine1)
    form.append('address_line2', addressLine2)
    form.append('city', city)
    form.append('state_province', stateProvince)
    form.append('postal_code', postalCode)
    form.append('country', country)
    // Document
    form.append('doc_type', docType)
    form.append('doc_number', docNumber)
    form.append('doc_front', frontFile)
    if (backFile) form.append('doc_back', backFile)
    if (selfieFile) form.append('selfie', selfieFile)

    const res = await fetch('/api/kyc-submit', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Submission failed'); setSubmitting(false); return }
    setDone(true)
    setSubmitting(false)
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Profile not found. <Link href="/dashboard" className="text-blue-700">Go back</Link></p>
      </div>
    )
  }

  if (profile.kyc_status === 'approved') {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="px-4 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #003087, #0066cc)' }}>
          <Link href="/profile" className="text-white/70 hover:text-white"><ArrowLeft size={20} /></Link>
          <p className="text-white font-semibold text-sm">KYC Verification</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">KYC Approved</h2>
          <p className="text-gray-500 text-sm">Your identity has been verified. Your account is fully activated.</p>
          <Link href="/dashboard" className="mt-6 px-6 py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="px-4 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #003087, #0066cc)' }}>
          <p className="text-white font-semibold text-sm">KYC Verification</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-blue-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Submitted</h2>
          <p className="text-gray-500 text-sm">Your identity details and documents have been received and are under review. You will be notified once approved.</p>
          <button onClick={() => router.push('/dashboard')} className="mt-6 px-6 py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold">Back to Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-12">
      <div className="px-4 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #003087, #0066cc)' }}>
        <Link href="/profile" className="text-white/70 hover:text-white"><ArrowLeft size={20} /></Link>
        <div>
          <p className="text-white font-semibold text-sm">KYC Verification</p>
          <p className="text-white/70 text-xs">Complete identity verification to activate your account</p>
        </div>
      </div>

      {profile.kyc_status === 'pending' && (
        <div className="mx-4 mt-4 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <AlertTriangle size={15} className="text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-700">Your KYC is under review. You may resubmit if your documents were rejected.</p>
        </div>
      )}
      {profile.kyc_status === 'rejected' && (
        <div className="mx-4 mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle size={15} className="text-red-600 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">Your previous KYC was rejected. Please resubmit with accurate information and clearer documents.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-4 mt-5 space-y-5">

        {/* ── SECTION 1: PERSONAL DETAILS ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User size={15} className="text-blue-700" />
            <p className={lbl}>Personal Details</p>
          </div>

          <div className="flex justify-between text-sm py-2 border-b border-gray-50">
            <span className="text-gray-500">Full Name</span>
            <span className="font-semibold text-gray-800">{profile.full_name}</span>
          </div>
          <div className="flex justify-between text-sm pb-2 border-b border-gray-50">
            <span className="text-gray-500">Account No.</span>
            <span className="font-mono text-gray-700">{profile.account_number}</span>
          </div>

          <div>
            <label className={lbl}>Date of Birth {req}</label>
            <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className={inp} max={new Date(Date.now() - 18 * 365.25 * 86400000).toISOString().split('T')[0]} />
          </div>

          <div>
            <label className={lbl}>Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)} className={inp}>
              <option value="">Select gender…</option>
              <option>Male</option>
              <option>Female</option>
              <option>Prefer not to say</option>
            </select>
          </div>

          <div>
            <label className={lbl}>Nationality</label>
            <select value={nationality} onChange={e => setNationality(e.target.value)} className={inp}>
              <option value="">Select nationality…</option>
              {COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>Maiden Name <span className="text-gray-400 normal-case font-normal">(if applicable)</span></label>
            <input type="text" value={maidenName} onChange={e => setMaidenName(e.target.value)} className={inp} placeholder="Birth surname / maiden name" />
          </div>

          <div>
            <label className={lbl}>Occupation</label>
            <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)} className={inp} placeholder="e.g. Engineer, Teacher, Business owner…" />
          </div>
        </div>

        {/* ── SECTION 2: CONTACT DETAILS ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Phone size={15} className="text-blue-700" />
            <p className={lbl}>Contact Details</p>
          </div>

          <div>
            <label className={lbl}>Primary Phone Number {req}</label>
            <input type="tel" value={primaryPhone} onChange={e => setPrimaryPhone(e.target.value)} className={inp} placeholder="+1 234 567 8900" />
          </div>

          <div>
            <label className={lbl}>Secondary Phone Number <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
            <input type="tel" value={secondaryPhone} onChange={e => setSecondaryPhone(e.target.value)} className={inp} placeholder="+1 234 567 8900" />
          </div>
        </div>

        {/* ── SECTION 3: ADDRESS ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={15} className="text-blue-700" />
            <p className={lbl}>Residential Address</p>
          </div>

          <div>
            <label className={lbl}>Address Line 1 {req}</label>
            <input type="text" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} className={inp} placeholder="Street number and name" />
          </div>

          <div>
            <label className={lbl}>Address Line 2 <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
            <input type="text" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} className={inp} placeholder="Apartment, suite, unit…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>City {req}</label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)} className={inp} placeholder="City" />
            </div>
            <div>
              <label className={lbl}>State / Province</label>
              <input type="text" value={stateProvince} onChange={e => setStateProvince(e.target.value)} className={inp} placeholder="State" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Postal Code</label>
              <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} className={inp} placeholder="00000" />
            </div>
            <div>
              <label className={lbl}>Country {req}</label>
              <select value={country} onChange={e => setCountry(e.target.value)} className={inp}>
                <option value="">Select…</option>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── SECTION 4: DOCUMENT INFO ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={15} className="text-blue-700" />
            <p className={lbl}>Identity Document</p>
          </div>

          <div>
            <label className={lbl}>Document Type {req}</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {DOC_TYPES.map(type => (
                <button key={type} type="button" onClick={() => setDocType(type)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium text-left border transition-colors ${docType === type ? 'bg-blue-700 text-white border-blue-700' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-300'}`}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={lbl}>Document / ID Number {req}</label>
            <input type="text" value={docNumber} onChange={e => setDocNumber(e.target.value)} className={inp} placeholder="e.g. A12345678" />
          </div>
        </div>

        {/* ── SECTION 5: DOCUMENT UPLOADS ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <p className={lbl}>Upload Documents</p>

          {/* Front */}
          <div>
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mb-2">
              <CreditCard size={13} className="text-blue-600" /> Front of Document {req}
            </label>
            <label className={`flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors ${frontFile ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300'}`} style={{ minHeight: 100 }}>
              {frontFile ? (
                <div className="flex flex-col items-center p-3">
                  {frontFile.type.startsWith('image/') && <img src={preview(frontFile)!} alt="front" className="h-20 object-contain rounded-lg mb-1" />}
                  <p className="text-xs text-blue-700 font-medium text-center truncate max-w-full px-2">{frontFile.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-gray-400">
                  <Upload size={22} className="mb-1" />
                  <p className="text-xs">Tap to upload front</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setFrontFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          {/* Back */}
          <div>
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mb-2">
              <FileText size={13} className="text-blue-600" /> Back of Document <span className="text-gray-400 text-[10px] ml-1">(optional)</span>
            </label>
            <label className={`flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors ${backFile ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300'}`} style={{ minHeight: 80 }}>
              {backFile ? (
                <div className="flex flex-col items-center p-3">
                  {backFile.type.startsWith('image/') && <img src={preview(backFile)!} alt="back" className="h-16 object-contain rounded-lg mb-1" />}
                  <p className="text-xs text-blue-700 font-medium text-center truncate max-w-full px-2">{backFile.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center py-5 text-gray-400">
                  <FileText size={20} className="mb-1" />
                  <p className="text-xs">Tap to upload back</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setBackFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          {/* Selfie */}
          <div>
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mb-2">
              <Camera size={13} className="text-blue-600" /> Selfie Holding Document <span className="text-gray-400 text-[10px] ml-1">(recommended)</span>
            </label>
            <label className={`flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors ${selfieFile ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300'}`} style={{ minHeight: 80 }}>
              {selfieFile ? (
                <div className="flex flex-col items-center p-3">
                  <img src={preview(selfieFile)!} alt="selfie" className="h-16 object-contain rounded-lg mb-1" />
                  <p className="text-xs text-blue-700 font-medium text-center truncate max-w-full px-2">{selfieFile.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center py-5 text-gray-400">
                  <Camera size={20} className="mb-1" />
                  <p className="text-xs">Tap to take / upload selfie</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" capture="user" onChange={e => setSelfieFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-blue-800 transition-colors">
          {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <><Upload size={16} /> Submit KYC Verification</>}
        </button>

        <p className="text-center text-xs text-gray-400 pb-4">
          All information is encrypted and stored securely. It is used solely for identity verification purposes.
        </p>
      </form>
    </div>
  )
}
