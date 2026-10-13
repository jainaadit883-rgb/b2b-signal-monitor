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

  const monoLabel: React.CSSProperties = {
    fontFamily: 'var(--font-geist-mono)',
    fontSize: '10px',
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    color: '#444',
  }

  const textBtn = (active = false): React.CSSProperties => ({
    background: 'transparent',
    border: 'none',
    color: active ? '#fff' : '#555',
    fontFamily: 'var(--font-geist-mono)',
    fontSize: '10px',
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    padding: '0',
    transition: 'color .15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>

        {/* Stage */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={monoLabel}>STAGE</span>
          <select
            value={currentStage}
            onChange={handleStageChange}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid #333',
              color: '#888',
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '10px',
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              padding: '2px 0',
              outline: 'none',
            }}
          >
            {STAGES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
        </div>

        {/* Mark contacted */}
        <button onClick={handleMarkContacted} disabled={marking} style={textBtn(!!contacted)}>
          {marking ? 'SAVING...' : contacted ? `✓ CONTACTED ${contacted}` : '+ MARK CONTACTED'}
        </button>

        {/* Edit notes */}
        <button onClick={() => setEditingNotes(!editingNotes)} style={textBtn(editingNotes)}>
          {editingNotes ? '✕ CANCEL' : '✎ NOTES'}
        </button>
      </div>

      {editingNotes && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingTop: '4px' }}>
          <textarea
            value={currentNotes}
            onChange={e => setCurrentNotes(e.target.value)}
            rows={2}
            placeholder="Add notes..."
            style={{
              flex: 1,
              background: '#0a0a0a',
              border: '1px solid #2a2a2a',
              color: '#ccc',
              fontSize: '12px',
              fontFamily: 'var(--font-geist-mono)',
              padding: '8px 10px',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.5,
            }}
            autoFocus
          />
          <button
            onClick={handleSaveNotes}
            disabled={savingNotes}
            style={{ ...textBtn(), color: '#fff', borderBottom: '1px solid #333', paddingBottom: '2px' }}
          >
            {savingNotes ? 'SAVING' : 'SAVE →'}
          </button>
        </div>
      )}
    </div>
  )
}
