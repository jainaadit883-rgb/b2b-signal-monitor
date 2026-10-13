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
        background: 'transparent',
        border: '1px solid #333',
        color: loading ? '#444' : '#fff',
        fontFamily: 'var(--font-geist-mono)',
        fontSize: '11px',
        fontWeight: 600,
        padding: '8px 20px',
        cursor: loading ? 'not-allowed' : 'pointer',
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        transition: 'border-color .15s, color .15s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.borderColor = '#fff' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#333' }}
    >
      {loading ? (
        <>
          <svg style={{ animation: 'spin 1s linear infinite', width: 12, height: 12 }} fill="none" viewBox="0 0 24 24">
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <circle style={{ opacity: .2 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path style={{ opacity: .8 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          SCANNING
        </>
      ) : '⚡ RUN SCAN'}
    </button>
  )
}
