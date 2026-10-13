import { Suspense } from 'react'
import { io } from 'next/cache'
import { supabase } from '@/lib/supabase'
import RunScanButton from './components/RunScanButton'

interface HistoryEntry {
  date: string
  score: number
}

interface Account {
  id: string
  account_name: string
  account_stage: string
  signal_score: number | null
  signal_summary: string | null
  last_trigger: string | null
  trigger_date: string | null
  outreach_angle: string | null
  suggested_poc: string | null
  detected_poc_name: string | null
  last_scanned_at: string | null
  signal_history: HistoryEntry[] | null
  notes: string | null
  last_contact_date: string | null
  relationship_notes: string | null
  poc_name: string | null
  poc_title: string | null
  poc_email: string | null
  poc_phone: string | null
}

function ScoreBar({ score }: { score: number | null }) {
  const s = score ?? 0
  const pct = (s / 10) * 100
  const color = s >= 7 ? '#34d399' : s >= 4 ? '#f59e0b' : '#475569'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        flex: 1, height: '6px', borderRadius: '999px',
        background: '#1a2540', overflow: 'hidden'
      }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width .5s' }} />
      </div>
      <span style={{
        fontFamily: 'var(--font-geist-mono)', fontSize: '13px', fontWeight: 700,
        color, minWidth: '36px', textAlign: 'right'
      }}>{s}/10</span>
    </div>
  )
}

function StageBadge({ stage }: { stage: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    'signed customer': { bg: '#1a2e58', color: '#7aadff' },
    'live pilot':      { bg: '#2d1a5c', color: '#c4aeff' },
  }
  const s = styles[stage] ?? { bg: '#151e30', color: '#6b7fa3' }
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-geist-mono)',
      padding: '2px 8px', borderRadius: '4px', letterSpacing: '.04em',
      textTransform: 'uppercase'
    }}>{stage}</span>
  )
}

function Sparkline({ history }: { history: HistoryEntry[] | null }) {
  if (!history || history.length < 2) return null
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-10)
  const W = 72, H = 24, PAD = 2
  const pts = sorted.map((h, i) => {
    const x = PAD + (i / (sorted.length - 1)) * (W - PAD * 2)
    const y = H - PAD - (h.score / 10) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const last = sorted[sorted.length - 1].score
  const prev = sorted[sorted.length - 2].score
  const trend = last > prev ? '↑' : last < prev ? '↓' : '→'
  const trendColor = last > prev ? '#34d399' : last < prev ? '#f87171' : '#6b7fa3'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <polyline points={pts} fill="none" stroke="#4f7ef8" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {sorted.map((h, i) => {
          const x = PAD + (i / (sorted.length - 1)) * (W - PAD * 2)
          const y = H - PAD - (h.score / 10) * (H - PAD * 2)
          return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={i === sorted.length - 1 ? 3 : 1.5} fill="#4f7ef8" />
        })}
      </svg>
      <span style={{ color: trendColor, fontSize: '12px', fontWeight: 700 }}>{trend}</span>
    </div>
  )
}

async function AccountList() {
  await io()

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('signal_score', { ascending: false, nullsFirst: false })

  const list = (accounts as Account[]) || []
  const lastScanned = list[0]?.last_scanned_at
    ? new Date(list[0].last_scanned_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Never'

  const hot = list.filter(a => (a.signal_score ?? 0) >= 7).length

  return (
    <>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {[
          { label: 'Accounts', value: list.length, color: '#4f7ef8' },
          { label: 'Hot (7+)', value: hot, color: '#34d399' },
          { label: 'Last Scan', value: lastScanned, color: '#9f7bfa', wide: true },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#0e1525', border: '1px solid #1a2540', borderRadius: '10px',
            padding: '14px 20px', flex: stat.wide ? '1' : '0 0 auto', minWidth: stat.wide ? '200px' : '80px'
          }}>
            <div style={{ fontSize: '11px', color: '#6b7fa3', fontFamily: 'var(--font-geist-mono)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>{stat.label}</div>
            <div style={{ fontSize: stat.wide ? '14px' : '22px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Account cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {list.map((account, idx) => {
          const s = account.signal_score ?? 0
          const accentColor = s >= 7 ? '#34d399' : s >= 4 ? '#f59e0b' : '#475569'

          return (
            <div key={account.id} style={{
              background: '#0e1525',
              border: '1px solid #1a2540',
              borderRadius: '12px',
              overflow: 'hidden',
              borderLeft: `3px solid ${accentColor}`,
            }}>
              {/* Card header */}
              <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'flex-start', gap: '12px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0 }}>
                  <span style={{ color: '#2e3f5c', fontFamily: 'var(--font-geist-mono)', fontSize: '12px', paddingTop: '2px', minWidth: '18px' }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f5' }}>{account.account_name}</span>
                      <StageBadge stage={account.account_stage} />
                    </div>
                    {account.signal_summary && (
                      <p style={{ fontSize: '13px', color: '#8899bb', margin: 0, lineHeight: 1.5 }}>{account.signal_summary}</p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                  <Sparkline history={account.signal_history} />
                </div>
              </div>

              {/* Score bar */}
              <div style={{ padding: '0 20px 14px 50px' }}>
                <ScoreBar score={account.signal_score} />
              </div>

              {/* Outreach angle */}
              {account.outreach_angle && (
                <div style={{
                  margin: '0 20px 14px 50px',
                  background: '#111d35', border: '1px solid #1e3464',
                  borderRadius: '8px', padding: '12px 14px',
                  borderLeft: '3px solid #4f7ef8'
                }}>
                  <div style={{ fontSize: '10px', fontFamily: 'var(--font-geist-mono)', color: '#4f7ef8', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '5px' }}>Outreach Angle</div>
                  <p style={{ fontSize: '13px', color: '#93bbff', margin: 0, lineHeight: 1.55 }}>{account.outreach_angle}</p>
                </div>
              )}

              {/* POC row */}
              {(account.detected_poc_name || account.suggested_poc || account.poc_name || account.poc_email || account.poc_phone) && (
                <div style={{ padding: '0 20px 14px 50px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {(account.detected_poc_name || account.suggested_poc) && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: '#1e1a0e', border: '1px solid #3a2a09',
                      borderRadius: '7px', padding: '6px 12px'
                    }}>
                      <span style={{ fontSize: '10px', color: '#b08010', fontFamily: 'var(--font-geist-mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Reach out to</span>
                      {account.detected_poc_name && (
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#fcd06a' }}>{account.detected_poc_name}</span>
                      )}
                      {account.suggested_poc && (
                        <span style={{ fontSize: '12px', color: '#8a6820' }}>· {account.suggested_poc}</span>
                      )}
                    </div>
                  )}
                  {account.poc_email && (
                    <a href={`mailto:${account.poc_email}`} style={{ fontSize: '13px', color: '#4f7ef8', textDecoration: 'none' }}>
                      {account.poc_email}
                    </a>
                  )}
                  {account.poc_phone && (
                    <span style={{ fontSize: '13px', color: '#6b7fa3' }}>📞 {account.poc_phone}</span>
                  )}
                </div>
              )}

              {/* Manual notes */}
              {(account.notes || account.last_contact_date || account.relationship_notes) && (
                <div style={{
                  borderTop: '1px solid #1a2540', margin: '0 20px', padding: '12px 0 14px 30px',
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '12px'
                }}>
                  {account.notes && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#2e3f5c', fontFamily: 'var(--font-geist-mono)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '3px' }}>Notes</div>
                      <div style={{ fontSize: '13px', color: '#6b7fa3' }}>{account.notes}</div>
                    </div>
                  )}
                  {account.last_contact_date && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#2e3f5c', fontFamily: 'var(--font-geist-mono)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '3px' }}>Last Contact</div>
                      <div style={{ fontSize: '13px', color: '#6b7fa3' }}>{account.last_contact_date}</div>
                    </div>
                  )}
                  {account.relationship_notes && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#2e3f5c', fontFamily: 'var(--font-geist-mono)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '3px' }}>Relationship</div>
                      <div style={{ fontSize: '13px', color: '#6b7fa3' }}>{account.relationship_notes}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

export default function Dashboard() {
  return (
    <main style={{ minHeight: '100vh', background: '#080c14', padding: '0 0 60px' }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #1a2540',
        background: '#0a0f1e',
        padding: '20px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-geist-mono)', color: '#4f7ef8', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
            B2B Signal Monitor
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#e2e8f5', margin: 0, letterSpacing: '-.3px' }}>
            Account Intelligence Dashboard
          </h1>
        </div>
        <RunScanButton />
      </div>

      {/* Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px 0' }}>
        <Suspense fallback={
          <div style={{ color: '#6b7fa3', fontSize: '14px', padding: '40px 0', textAlign: 'center' }}>
            Loading accounts...
          </div>
        }>
          <AccountList />
        </Suspense>
      </div>
    </main>
  )
}
