'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STAGES = ['prospect', 'contacted', 'live pilot', 'signed customer', 'churned']

interface Props {
  id: string
  stage: string
  notes: string | null
  lastContact: string | null
}

export default function AccountActions({ id, stage, notes, lastContact }: Props) {
  const router = useRouter()
  const [currentStage, setCurrentStage] = useState(stage)
  const [currentNotes, setCurrentNotes] = useState(notes ?? '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [contacted, setContacted] = useState(lastContact)
  const [marking, setMarking] = useState(false)

  async function patch(fields: Record<string, string>) {
    await fetch(`/api/accounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    router.refresh()
  }

  async function handleStageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setCurrentStage(val)
    await patch({ account_stage: val })
  }

  async function handleSaveNotes() {
    setSavingNotes(true)
    await patch({ notes: currentNotes })
    setSavingNotes(false)
    setEditingNotes(false)
  }

  async function handleMarkContacted() {
    setMarking(true)
    const today = new Date().toISOString().split('T')[0]
    await patch({ last_contact_date: today })
    setContacted(today)
    setMarking(false)
  }

  const inputStyle: React.CSSProperties = {
    background: '#080c14', border: '1px solid #1a2540', color: '#e2e8f5',
    fontSize: '13px', borderRadius: '6px', padding: '6px 10px',
    fontFamily: 'var(--font-geist-sans)', outline: 'none', width: '100%',
  }

  const btnStyle = (color: string, bg: string, border: string): React.CSSProperties => ({
    background: bg, border: `1px solid ${border}`, color,
    fontFamily: 'var(--font-geist-mono)', fontSize: '11px', fontWeight: 600,
    padding: '5px 12px', borderRadius: '6px', cursor: 'pointer',
    letterSpacing: '.04em', transition: 'all .15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Stage + Contact row */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Stage dropdown */}
        <select
          value={currentStage}
          onChange={handleStageChange}
          style={{ ...inputStyle, width: 'auto', cursor: 'pointer', paddingRight: '28px' }}
        >
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Mark as contacted */}
        <button
          onClick={handleMarkContacted}
          disabled={marking}
          style={btnStyle('#34d399', '#0d2f26', '#1a5c40')}
        >
          {marking ? 'Saving...' : contacted ? `✓ Contacted ${contacted}` : '+ Mark Contacted'}
        </button>

        {/* Edit notes toggle */}
        <button
          onClick={() => setEditingNotes(!editingNotes)}
          style={btnStyle('#9f7bfa', '#1a1040', '#2d1a5c')}
        >
          {editingNotes ? 'Cancel' : '✏ Edit Notes'}
        </button>
      </div>

      {/* Inline notes editor */}
      {editingNotes && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <textarea
            value={currentNotes}
            onChange={e => setCurrentNotes(e.target.value)}
            rows={2}
            placeholder="Add notes about this account..."
            style={{ ...inputStyle, resize: 'vertical', flex: 1 }}
            autoFocus
          />
          <button
            onClick={handleSaveNotes}
            disabled={savingNotes}
            style={btnStyle('#4f7ef8', '#111d35', '#1e3464')}
          >
            {savingNotes ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}
