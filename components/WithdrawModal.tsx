'use client'
import { useState } from 'react'
import { X, ChevronRight, Loader2, Globe, Zap, ArrowLeft, CheckCircle } from 'lucide-react'
import type { Account, Profile } from '@/lib/types'

// ── Country banking field definitions ─────────────────────────────────────────
type Field = { key: string; label: string; placeholder?: string; type?: 'text' | 'select'; options?: string[] }

const DEFAULT_FIELDS: Field[] = [
  { key: 'bank', label: 'Bank Name', placeholder: 'e.g. National Bank' },
  { key: 'account', label: 'Account Number', placeholder: '1234567890' },
  { key: 'name', label: 'Account Name', placeholder: 'John Doe' },
  { key: 'swift', label: 'SWIFT / BIC Code', placeholder: 'XXXXXX00XXX' },
]

const COUNTRY_FIELDS: Record<string, Field[]> = {
  'United States': [
    { key: 'bank', label: 'Bank Name', placeholder: 'e.g. Chase Bank' },
    { key: 'routing', label: 'ABA Routing Number', placeholder: '021000021' },
    { key: 'account', label: 'Account Number', placeholder: '1234567890' },
    { key: 'account_type', label: 'Account Type', type: 'select', options: ['Checking', 'Savings'] },
  ],
  'United Kingdom': [
    { key: 'bank', label: 'Bank Name', placeholder: 'e.g. Barclays' },
    { key: 'sort_code', label: 'Sort Code', placeholder: '20-00-00' },
    { key: 'account', label: 'Account Number', placeholder: '12345678' },
  ],
  'European Union (SEPA)': [
    { key: 'bank', label: 'Bank Name', placeholder: 'e.g. Deutsche Bank' },
    { key: 'iban', label: 'IBAN', placeholder: 'DE89370400440532013000' },
    { key: 'bic', label: 'BIC / SWIFT Code', placeholder: 'COBADEFFXXX' },
  ],
  'Canada': [
    { key: 'bank', label: 'Bank Name', placeholder: 'e.g. RBC Royal Bank' },
    { key: 'transit', label: 'Transit Number', placeholder: '12345' },
    { key: 'institution', label: 'Institution Number', placeholder: '001' },
    { key: 'account', label: 'Account Number', placeholder: '1234567890' },
  ],
  'Australia': [
    { key: 'bank', label: 'Bank Name', placeholder: 'e.g. Commonwealth Bank' },
    { key: 'bsb', label: 'BSB Number', placeholder: '062-000' },
    { key: 'account', label: 'Account Number', placeholder: '12345678' },
  ],
  'Nigeria': [
    { key: 'bank', label: 'Bank Name', type: 'select', options: ['Access Bank','GTBank','First Bank','Zenith Bank','UBA','Fidelity Bank','Union Bank','Sterling Bank','Wema Bank','Polaris Bank','Keystone Bank','Stanbic IBTC','Opay','Kuda Bank'] },
    { key: 'account', label: 'Account Number', placeholder: '0123456789' },
    { key: 'name', label: 'Account Name', placeholder: 'John Doe' },
  ],
  'Ghana': [
    { key: 'bank', label: 'Bank Name', type: 'select', options: ['GCB Bank','Ecobank Ghana','Absa Ghana','Standard Chartered Ghana','Fidelity Bank Ghana','Zenith Bank Ghana','Access Bank Ghana'] },
    { key: 'account', label: 'Account Number', placeholder: '1234567890' },
    { key: 'name', label: 'Account Name', placeholder: 'John Doe' },
  ],
  'India': [
    { key: 'bank', label: 'Bank Name', placeholder: 'e.g. HDFC Bank' },
    { key: 'ifsc', label: 'IFSC Code', placeholder: 'HDFC0001234' },
    { key: 'account', label: 'Account Number', placeholder: '1234567890123' },
  ],
  'South Africa': [
    { key: 'bank', label: 'Bank Name', type: 'select', options: ['ABSA','Standard Bank SA','FNB','Nedbank','Capitec Bank','Discovery Bank'] },
    { key: 'branch', label: 'Branch Code', placeholder: '632005' },
    { key: 'account', label: 'Account Number', placeholder: '1234567890' },
  ],
  'China': [
    { key: 'bank', label: 'Bank Name', type: 'select', options: ['ICBC','China Construction Bank','Bank of China','Agricultural Bank of China','Bank of Communications'] },
    { key: 'account', label: 'Account Number', placeholder: '6225123456789012' },
    { key: 'branch', label: 'Bank Branch', placeholder: 'e.g. Beijing Branch' },
  ],
  'United Arab Emirates': [
    { key: 'bank', label: 'Bank Name', placeholder: 'e.g. Emirates NBD' },
    { key: 'iban', label: 'IBAN', placeholder: 'AE070331234567890123456' },
    { key: 'swift', label: 'SWIFT Code', placeholder: 'EBILAEAD' },
  ],
  'Switzerland': [
    { key: 'bank', label: 'Bank Name', placeholder: 'e.g. UBS' },
    { key: 'iban', label: 'IBAN', placeholder: 'CH5604835012345678009' },
    { key: 'bic', label: 'BIC / SWIFT', placeholder: 'UBSWCHZH80A' },
  ],
}

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina',
  'Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados',
  'Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina',
  'Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Cabo Verde','Cambodia',
  'Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia',
  'Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Denmark',
  'Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador',
  'Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','European Union (SEPA)',
  'Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece',
  'Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary',
  'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica',
  'Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kosovo','Kuwait','Kyrgyzstan',
  'Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania',
  'Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta',
  'Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco',
  'Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal',
  'Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea',
  'North Macedonia','Norway','Oman','Pakistan','Palau','Palestine','Panama',
  'Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar',
  'Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia',
  'Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe',
  'Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia',
  'Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan',
  'Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan',
  'Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago',
  'Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates',
  'United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu','Vatican City',
  'Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
].sort()
type Step = 'method' | 'details' | 'confirm' | 'done'
type Method = 'country' | 'wire' | null

const inputClass = 'mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
const labelClass = 'text-xs font-medium text-gray-500 uppercase tracking-wide'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

export default function WithdrawModal({
  account, profile, onClose,
}: { account: Account | null; profile: Profile | null; onClose: () => void }) {
  const [step, setStep] = useState<Step>('method')
  const [method, setMethod] = useState<Method>(null)
  const [country, setCountry] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function setField(key: string, val: string) {
    setFields(prev => ({ ...prev, [key]: val }))
  }

  function canProceedDetails() {
    if (!amount || parseFloat(amount) <= 0) return false
    if (method === 'country') {
      if (!country) return false
      const required = COUNTRY_FIELDS[country] ?? DEFAULT_FIELDS
      return required.every(f => (fields[f.key] ?? '').trim().length > 0)
    }
    // wire
    return !!(fields.beneficiary && fields.bank && fields.swift && fields.account && fields.wire_country)
  }

  // ── Step: Method ─────────────────────────────────────────────────────────────
  if (step === 'method') {
    return (
      <Sheet onClose={onClose} title="Withdraw Funds">
        <p className="text-sm text-gray-500 mb-6">How would you like to receive your funds?</p>
        <div className="space-y-3">
          <button onClick={() => { setMethod('country'); setStep('details') }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group">
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
              <Globe size={22} className="text-blue-700" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-800 text-sm">Select Country</p>
              <p className="text-xs text-gray-400 mt-0.5">Withdraw to your local bank account</p>
            </div>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500" />
          </button>

          <button onClick={() => { setMethod('wire'); setStep('details') }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-purple-500 hover:bg-purple-50 transition-all group">
            <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-200 transition-colors">
              <Zap size={22} className="text-purple-700" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-800 text-sm">Wire Transfer</p>
              <p className="text-xs text-gray-400 mt-0.5">International SWIFT / wire transfer</p>
            </div>
            <ChevronRight size={18} className="text-gray-300 group-hover:text-purple-500" />
          </button>
        </div>
      </Sheet>
    )
  }

  // ── Step: Details ─────────────────────────────────────────────────────────────
  if (step === 'details') {
    const countryFields = method === 'country' && country ? (COUNTRY_FIELDS[country] ?? DEFAULT_FIELDS) : []

    return (
      <Sheet onClose={onClose} title={method === 'country' ? 'Bank Details' : 'Wire Transfer'} onBack={() => setStep('method')}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">

          {/* Country selector */}
          {method === 'country' && (
            <div>
              <label className={labelClass}>Select Country</label>
              <select value={country} onChange={e => { setCountry(e.target.value); setFields({}) }}
                className={inputClass}>
                <option value="">— Choose a country —</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Country-specific fields */}
          {method === 'country' && country && countryFields.map(f => (
            <div key={f.key}>
              <label className={labelClass}>{f.label}</label>
              {f.type === 'select' ? (
                <select value={fields[f.key] ?? ''} onChange={e => setField(f.key, e.target.value)} className={inputClass}>
                  <option value="">— Select —</option>
                  {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input value={fields[f.key] ?? ''} onChange={e => setField(f.key, e.target.value)}
                  placeholder={f.placeholder} className={inputClass} />
              )}
            </div>
          ))}

          {/* Wire fields */}
          {method === 'wire' && <>
            <div>
              <label className={labelClass}>Beneficiary Name</label>
              <input value={fields.beneficiary ?? ''} onChange={e => setField('beneficiary', e.target.value)}
                placeholder="Full name on account" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Bank Name</label>
              <input value={fields.bank ?? ''} onChange={e => setField('bank', e.target.value)}
                placeholder="e.g. Deutsche Bank" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Bank Address</label>
              <input value={fields.bank_address ?? ''} onChange={e => setField('bank_address', e.target.value)}
                placeholder="Bank street address" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>SWIFT / BIC Code</label>
              <input value={fields.swift ?? ''} onChange={e => setField('swift', e.target.value.toUpperCase())}
                placeholder="CHASUS33" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Account Number / IBAN</label>
              <input value={fields.account ?? ''} onChange={e => setField('account', e.target.value)}
                placeholder="Account number or IBAN" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Destination Country</label>
              <input value={fields.wire_country ?? ''} onChange={e => setField('wire_country', e.target.value)}
                placeholder="e.g. Germany" className={inputClass} />
            </div>
          </>}

          {/* Amount — always shown */}
          {(method === 'wire' || (method === 'country' && country)) && (
            <div>
              <label className={labelClass}>Withdrawal Amount ($)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1"
                placeholder="0.00" className={inputClass} />
              <p className="text-xs text-gray-400 mt-1">
                Available balance: <span className="font-semibold text-gray-600">${fmt(account?.balance ?? 0)}</span>
              </p>
            </div>
          )}
        </div>

        <button onClick={() => setStep('confirm')} disabled={!canProceedDetails()}
          className="mt-6 w-full py-3.5 rounded-xl bg-blue-700 text-white font-semibold text-sm disabled:opacity-40">
          Continue to Review
        </button>
      </Sheet>
    )
  }

  // ── Step: Confirm ─────────────────────────────────────────────────────────────
  if (step === 'confirm') {
    const displayFields = method === 'country'
      ? (COUNTRY_FIELDS[country] ?? []).map(f => ({ label: f.label, value: fields[f.key] ?? '' }))
      : [
          { label: 'Beneficiary', value: fields.beneficiary },
          { label: 'Bank', value: fields.bank },
          { label: 'Bank Address', value: fields.bank_address || '—' },
          { label: 'SWIFT / BIC', value: fields.swift },
          { label: 'Account / IBAN', value: fields.account },
          { label: 'Country', value: fields.wire_country },
        ]

    return (
      <Sheet onClose={onClose} title="Confirm Withdrawal" onBack={() => setStep('details')}>
        <div className="space-y-3">
          <div className="bg-blue-50 rounded-2xl p-4 space-y-2.5">
            <Row label="Method" value={method === 'wire' ? 'Wire Transfer' : `Local Bank · ${country}`} />
            {displayFields.map(({ label, value }) => value ? <Row key={label} label={label} value={value} /> : null)}
            <div className="border-t border-blue-100 pt-2.5 mt-1">
              <Row label="Withdrawal Amount" value={`$${fmt(parseFloat(amount))}`} bold blue />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={() => setStep('details')}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium">
              Back
            </button>
            <button onClick={() => { setSubmitting(true); setTimeout(() => { setSubmitting(false); setStep('done') }, 1200) }}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {submitting ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : 'Confirm Request'}
            </button>
          </div>
        </div>
      </Sheet>
    )
  }

  // ── Step: Done ────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <Sheet onClose={onClose} title="Request Submitted">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Withdrawal Request Received</h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Your withdrawal of <strong className="text-gray-800">${fmt(parseFloat(amount))}</strong> is under review. A support agent will contact you to assist with the process.
          </p>
          <button onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-blue-700 text-white font-semibold text-sm">
            Done
          </button>
        </div>
      </Sheet>
    )
  }

  return null
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Sheet({ children, title, onClose, onBack }: { children: React.ReactNode; title: string; onClose: () => void; onBack?: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end">
      <div className="bg-white w-full max-w-[430px] mx-auto rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          {onBack && (
            <button onClick={onBack} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <ArrowLeft size={16} className="text-gray-600" />
            </button>
          )}
          <h3 className="text-lg font-semibold text-gray-900 flex-1">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, bold, blue }: { label: string; value: string; bold?: boolean; blue?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${blue ? 'text-blue-700' : 'text-gray-800'}`}>{value}</span>
    </div>
  )
}

