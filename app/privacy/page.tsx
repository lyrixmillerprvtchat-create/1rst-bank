import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #003087, #0066cc)' }}>
        <Link href="/dashboard" className="text-white/70 hover:text-white"><ArrowLeft size={20} /></Link>
        <p className="text-white font-semibold text-sm">Privacy Policy</p>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 text-sm text-gray-700">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
          <p className="text-xs text-gray-400">Last updated: June 2026</p>
        </div>
        <p>1rst Bank (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our banking platform.</p>
        <div>
          <h2 className="font-bold text-gray-800 mb-2">1. Information We Collect</h2>
          <ul className="space-y-1 list-disc pl-4">
            <li>Full name, email address, and phone number provided during registration</li>
            <li>Government-issued identity documents submitted for KYC verification</li>
            <li>Transaction data including transfers, deposits, and withdrawals</li>
            <li>Device and usage information for security purposes</li>
          </ul>
        </div>
        <div>
          <h2 className="font-bold text-gray-800 mb-2">2. How We Use Your Information</h2>
          <ul className="space-y-1 list-disc pl-4">
            <li>To verify your identity and comply with applicable regulations</li>
            <li>To process transactions and manage your account</li>
            <li>To send account notifications and alerts</li>
            <li>To detect and prevent fraud and unauthorised access</li>
          </ul>
        </div>
        <div>
          <h2 className="font-bold text-gray-800 mb-2">3. Data Security</h2>
          <p>We use industry-standard encryption to protect your data in transit and at rest. Access to your account information is restricted to authorised personnel only. KYC documents are stored in secure, access-controlled storage.</p>
        </div>
        <div>
          <h2 className="font-bold text-gray-800 mb-2">4. Data Sharing</h2>
          <p>We do not sell your personal data to third parties. We may share information with regulatory authorities when required by law, or with payment processors necessary to complete your transactions.</p>
        </div>
        <div>
          <h2 className="font-bold text-gray-800 mb-2">5. Your Rights</h2>
          <p>You have the right to access, correct, or request deletion of your personal information. Contact our support team to exercise these rights.</p>
        </div>
        <div>
          <h2 className="font-bold text-gray-800 mb-2">6. Contact Us</h2>
          <p>For privacy-related enquiries, please contact us through the in-app support chat.</p>
        </div>
      </div>
    </div>
  )
}
