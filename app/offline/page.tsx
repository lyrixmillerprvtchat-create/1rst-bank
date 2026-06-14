'use client'
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(160deg, #003087 0%, #0066cc 50%, #f0f4f8 100%)' }}>
      <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#003087" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;re offline</h1>
        <p className="text-gray-500 text-sm mb-6">
          Please check your connection and try again. Your account data is safe.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl bg-blue-700 text-white font-semibold text-sm hover:bg-blue-800 transition-colors"
        >
          Try again
        </button>
      </div>
      <p className="text-blue-200 text-xs mt-6">1rst Bank</p>
    </div>
  )
}
