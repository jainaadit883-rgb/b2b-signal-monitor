'use client'
import { useState } from 'react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select a hidden textarea
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy outreach angle"
      style={{
        background: copied ? '#0d2f26' : '#111d35',
        border: `1px solid ${copied ? '#34d399' : '#1e3464'}`,
        color: copied ? '#34d399' : '#4f7ef8',
        fontFamily: 'var(--font-geist-mono)',
        fontSize: '10px', fontWeight: 600,
        padding: '3px 9px', borderRadius: '5px',
        cursor: 'pointer', letterSpacing: '.05em',
        transition: 'all .15s',
      }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}
