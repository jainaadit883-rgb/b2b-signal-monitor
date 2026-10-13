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
      style={{
        background: loading ? '#1a2540' : '#1a3a6e',
        border: '1px solid ' + (loading ? '#2e3f5c' : '#4f7ef8'),
        color: loading ? '#6b7fa3' : '#93bbff',
        fontFamily: 'var(--font-geist-mono)',
        fontSize: '13px',
        fontWeight: 600,
        padding: '9px 18px',
        borderRadius: '8px',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all .2s',
        letterSpacing: '.02em',
      }}
    >
      {loading ? (
        <>
          <svg style={{ animation: 'spin 1s linear infinite', width: 14, height: 14 }} fill="none" viewBox="0 0 24 24">
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <circle style={{ opacity: .25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path style={{ opacity: .75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Scanning...
        </>
      ) : (
        <>⚡ Run Scan Now</>
      )}
    </button>
  )
}
