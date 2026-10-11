'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RunScanButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleScan() {
    setLoading(true)
    try {
      await fetch('/api/scan', { method: 'POST' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleScan}
      disabled={loading}
      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Scanning...
        </>
      ) : (
        <>⚡ Run Scan Now</>
      )}
    </button>
  )
}
