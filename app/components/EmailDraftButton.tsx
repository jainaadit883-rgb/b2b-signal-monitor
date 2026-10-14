'use client'
import { useState } from 'react'

const mono: React.CSSProperties = { fontFamily: 'var(--font-geist-mono)' }

export default function EmailDraftButton({ id }: { id: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [email, setEmail] = useState<{ subject: string; body: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  async function generate() {
    setState('loading')
    try {
      const res = await fetch(`/api/accounts/${id}/email-draft`, { method: 'POST' })
      const data = await res.json()
      if (data.subject && data.body) {
        setEmail(data)
        setState('done')
        setOpen(true)
      } else {
        setState('idle')
      }
    } catch {
      setState('idle')
    }
  }

  function copyEmail() {
    if (!email) return
    const full = `Subject: ${email.subject}\n\n${email.body}`
    navigator.clipboard.writeText(full).catch(() => {
      const el = document.createElement('textarea')
      el.value = full
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={state === 'done' ? () => setOpen(!open) : generate}
          disabled={state === 'loading'}
          style={{
            ...mono,
            background: 'transparent',
            border: 'none',
            color: state === 'loading' ? '#444' : '#00ff88',
            fontSize: '10px',
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            cursor: state === 'loading' ? 'not-allowed' : 'pointer',
            padding: 0,
          }}
        >
          {state === 'loading' ? '⟳ DRAFTING...' : state === 'done' ? (open ? '✕ HIDE EMAIL' : '✉ SHOW EMAIL') : '✉ DRAFT EMAIL'}
        </button>
        {state === 'done' && (
          <button
            onClick={generate}
            style={{ ...mono, background: 'transparent', border: 'none', color: '#555', fontSize: '10px', letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', padding: 0 }}
          >
            ↺ REGENERATE
          </button>
        )}
      </div>

      {open && email && (
        <div style={{ marginTop: '12px', background: '#0a0a0a', border: '1px solid #1e1e1e', padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ ...mono, fontSize: '10px', color: '#555', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '4px' }}>SUBJECT</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#ddd' }}>{email.subject}</div>
            </div>
            <button
              onClick={copyEmail}
              style={{
                ...mono,
                background: 'transparent',
                border: 'none',
                color: copied ? '#00ff88' : '#555',
                fontSize: '10px',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                marginLeft: '16px',
              }}
            >
              {copied ? '✓ COPIED' : '[ COPY ALL ]'}
            </button>
          </div>
          <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '12px' }}>
            <div style={{ ...mono, fontSize: '10px', color: '#555', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px' }}>BODY</div>
            <pre style={{ fontSize: '13px', color: '#bbb', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: 'inherit' }}>
              {email.body}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
