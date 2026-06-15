import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #003087, #0066cc)' }}>
        <Link href="/dashboard" className="text-white/70 hover:text-white"><ArrowLeft size={20} /></Link>
        <p className="text-white font-semibold text-sm">Terms of Service</p>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 text-sm text-gray-700">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Terms of Service</h1>
          <p className="text-xs text-gray-400">Last updated: June 2026</p>
        </div>
        <p>By creating an account and using the 1rst Bank platform, you agree to these Terms of Service. Please read them carefully.</p>
        <div>
          <h2 className="font-bold text-gray-800 mb-2">1. Account Eligibility</h2>
          <p>You must be at least 18 years old to open an account. You agree to provide accurate, current, and complete information during registration and to keep your account details up to date.</p>
        </div>
        <div>
          <h2 className="font-bold text-gray-800 mb-2">2. Account Security</h2>
          <p>You are responsible for maintaining the confidentiality of your login credentials. You must notify us immediately of any unauthorised use of your account. We are not liable for losses arising from your failure to keep credentials secure.</p>
        </div>
        <div>
          <h2 className="font-bold text-gray-800 mb-2">3. KYC Verification</h2>
          <p>Full account functionality requires successful identity verification (KYC). You agree to submit accurate identity documents. Providing false documents is grounds for immediate account termination and may be reported to relevant authorities.</p>
        </div>
        <div>
          <h2 className="font-bold text-gray-800 mb-2">4. Transfers and Transactions</h2>
          <p>All transactions are subject to compliance review. External transfers may take 1–3 business days to process. We reserve the right to hold, delay, or decline transactions that appear suspicious or violate our policies.</p>
        </div>
        <div>
          <h2 className="font-bold text-gray-800 mb-2">5. Prohibited Activities</h2>
          <ul className="space-y-1 list-disc pl-4">
            <li>Using the platform for money laundering or fraudulent activity</li>
            <li>Providing false identity information</li>
            <li>Attempting to circumvent security controls</li>
            <li>Using the account for commercial purposes without authorisation</li>
          </ul>
        </div>
        <div>
          <h2 className="font-bold text-gray-800 mb-2">6. Account Suspension</h2>
          <p>We reserve the right to suspend or close accounts that violate these terms, are suspected of fraud, or pose a risk to the platform or other users.</p>
        </div>
        <div>
          <h2 className="font-bold text-gray-800 mb-2">7. Limitation of Liability</h2>
          <p>1rst Bank is not liable for losses arising from circumstances beyond our reasonable control, including technical failures, network outages, or third-party service disruptions.</p>
        </div>
        <div>
          <h2 className="font-bold text-gray-800 mb-2">8. Changes to Terms</h2>
          <p>We may update these terms at any time. Continued use of the platform constitutes acceptance of the revised terms.</p>
        </div>
      </div>
    </div>
  )
}
