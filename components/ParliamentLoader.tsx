'use client'

export default function ParliamentLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-4">
      {/* Hourglass icon with CSS animation */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="animate-pulse"
        >
          {/* Hourglass shape */}
          <path
            d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99.01.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zM16 4v3.5l-4 4-4-4V4h8z"
            fill="#0070f3"
            opacity="0.8"
          />
        </svg>
      </div>
      <p className="text-sm text-gray-600">המערכת עובדת בשבילך…</p>
    </div>
  )
}
