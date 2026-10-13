'use client'
import { useState } from 'react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        background: 'transparent',
        border: 'none',
        color: copied ? '#00ff88' : '#444',
        fontFamily: 'var(--font-geist-mono)',
        fontSize: '10px',
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        padding: '0',
        transition: 'color .15s',
      }}
    >
      {copied ? '✓ COPIED' : '[ COPY ]'}
    </button>
  )
}
