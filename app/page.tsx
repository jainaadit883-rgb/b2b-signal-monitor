import { Suspense } from 'react'
import { io } from 'next/cache'
import { supabase } from '@/lib/supabase'
import RunScanButton from './components/RunScanButton'
import CopyButton from './components/CopyButton'
import AccountActions from './components/AccountActions'
import EmailDraftButton from './components/EmailDraftButton'

interface HistoryEntry { date: string; score: number }
interface ArticleEntry { title: string; description: string; pubDate: string; link?: string }

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
  last_articles: ArticleEntry[] | null
}

const mono: React.CSSProperties = { fontFamily: 'var(--font-geist-mono)' }
const label: React.CSSProperties = { ...mono, fontSize: '10px', letterSpacing: '.12em', textTransform: 'uppercase', color: '#777' }

function scoreColor(s: number) {
  return s >= 7 ? '#00ff88' : s >= 4 ? '#ffaa00' : '#555'
}

function Sparkline({ history }: { history: HistoryEntry[] | null }) {
  if (!history || history.length < 2) return null
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-10)
  const W = 60, H = 20, PAD = 1
  const pts = sorted.map((h, i) => {
    const x = PAD + (i / (sorted.length - 1)) * (W - PAD * 2)
    const y = H - PAD - (h.score / 10) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const last = sorted[sorted.length - 1].score
  const prev = sorted[sorted.length - 2].score
  const delta = last - prev
  const col = delta > 0 ? '#00ff88' : delta < 0 ? '#ff4444' : '#444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <polyline points={pts} fill="none" stroke="#333" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" />
        {sorted.map((h, i) => {
          const x = PAD + (i / (sorted.length - 1)) * (W - PAD * 2)
          const y = H - PAD - (h.score / 10) * (H - PAD * 2)
          return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={i === sorted.length - 1 ? 2.5 : 1} fill={i === sorted.length - 1 ? col : '#333'} />
        })}
      </svg>
      <span style={{ ...mono, fontSize: '10px', color: col }}>
        {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
      </span>
    </div>
  )
}

function DigestBar({ accounts }: { accounts: Account[] }) {
  const hot = accounts.filter(a => (a.signal_score ?? 0) >= 7).length
  const ago30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const stale = accounts.filter(a => !a.last_contact_date || a.last_contact_date < ago30).length
  const top = accounts[0]

  let biggestJump = 0
  let jumpName = ''
  for (const a of accounts) {
    const h = a.signal_history
    if (h && h.length >= 2) {
      const s = [...h].sort((x, y) => x.date.localeCompare(y.date))
      const j = s[s.length - 1].score - s[s.length - 2].score
      if (j > biggestJump) { biggestJump = j; jumpName = a.account_name }
    }
  }

  const stats = [
    { k: 'HOT ACCOUNTS', v: hot, c: '#00ff88' },
    { k: 'UNCONTACTED 30D', v: stale, c: '#ffaa00' },
    { k: 'TOP SIGNAL', v: top?.account_name ?? '—', c: '#fff' },
    ...(biggestJump >= 3 ? [{ k: 'BIGGEST JUMP', v: `${jumpName} +${biggestJump}`, c: '#ff4444' }] : []),
  ]

  return (
    <div style={{ borderBottom: '1px solid #1a1a1a', padding: '20px 0 20px', display: 'flex', gap: '48px', flexWrap: 'wrap', marginBottom: '32px' }}>
      {stats.map(s => (
        <div key={s.k}>
          <div style={label}>{s.k}</div>
          <div style={{ ...mono, fontSize: '18px', fontWeight: 700, color: s.c, marginTop: '4px' }}>{s.v}</div>
        </div>
      ))}
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

  return (
    <>
      <DigestBar accounts={list} />

      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr 80px 80px 120px',
        gap: '0 24px',
        padding: '0 16px 12px',
        borderBottom: '1px solid #222',
        marginBottom: '4px',
      }}>
        {['#', 'ACCOUNT', 'SCORE', 'TREND', 'STAGE'].map(h => (
          <span key={h} style={label}>{h}</span>
        ))}
      </div>

      {/* Account rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {list.map((account, idx) => {
          const s = account.signal_score ?? 0
          const col = scoreColor(s)
          const history = account.signal_history ?? []
          const sortedH = [...history].sort((a, b) => a.date.localeCompare(b.date))
          const prevScore = sortedH.length >= 2 ? sortedH[sortedH.length - 2].score : null
          const jump = prevScore !== null ? s - prevScore : 0
          const isNewHot = jump >= 3

          return (
            <div key={account.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
              {/* Main row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr 80px 80px 120px',
                gap: '0 24px',
                padding: '22px 16px',
                alignItems: 'center',
                background: idx % 2 === 0 ? '#050505' : '#000',
              }}>
                <span style={{ ...mono, fontSize: '11px', color: '#555' }}>{String(idx + 1).padStart(2, '0')}</span>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff', letterSpacing: '-.2px' }}>
                      {account.account_name}
                    </span>
                    {isNewHot && (
                      <span style={{ ...mono, fontSize: '9px', color: '#ff4444', letterSpacing: '.12em', border: '1px solid #ff4444', padding: '1px 6px' }}>
                        ↑ NEW HOT
                      </span>
                    )}
                  </div>
                  {account.signal_summary && (
                    <p style={{ fontSize: '13px', color: '#999', margin: '4px 0 0', lineHeight: 1.6 }}>{account.signal_summary}</p>
                  )}
                </div>

                <div style={{ ...mono, fontSize: '20px', fontWeight: 700, color: col }}>{s}<span style={{ fontSize: '11px', color: '#333' }}>/10</span></div>

                <Sparkline history={account.signal_history} />

                <span style={{ ...mono, fontSize: '10px', color: '#888', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  {account.account_stage}
                </span>
              </div>

              {/* Expanded detail */}
              <div style={{ padding: '20px 16px 28px 68px', background: '#080808', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Outreach angle */}
                {account.outreach_angle && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={label}>OUTREACH ANGLE</span>
                      <CopyButton text={account.outreach_angle} />
                    </div>
                    <p style={{ fontSize: '13px', color: '#bbb', margin: 0, lineHeight: 1.7, borderLeft: '2px solid #333', paddingLeft: '14px' }}>
                      {account.outreach_angle}
                    </p>
                  </div>
                )}

                {/* Email draft */}
                <EmailDraftButton id={account.id} />

                {/* News feed */}
                {account.last_articles && account.last_articles.length > 0 && (
                  <details>
                    <summary style={{ ...label, cursor: 'pointer', userSelect: 'none', color: '#666' }}>
                      NEWS SOURCES ({account.last_articles.length}) →
                    </summary>
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {account.last_articles.map((a, i) => (
                        <div key={i} style={{ borderLeft: '2px solid #1e1e1e', paddingLeft: '12px' }}>
                          {a.link ? (
                            <a href={a.link} target="_blank" rel="noopener noreferrer" className="news-link"
                              style={{ fontSize: '12px', lineHeight: 1.5, display: 'block' }}
                            >
                              {a.title}
                            </a>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#aaa', lineHeight: 1.5, display: 'block' }}>{a.title}</span>
                          )}
                          <span style={{ ...mono, fontSize: '10px', color: '#444', marginTop: '2px', display: 'block' }}>{a.pubDate}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Why this score */}
                {account.last_trigger && (
                  <details>
                    <summary style={{ ...label, cursor: 'pointer', userSelect: 'none', color: '#666' }}>
                      WHY THIS SCORE →
                    </summary>
                    <div style={{ marginTop: '8px', paddingLeft: '14px', borderLeft: '2px solid #333' }}>
                      <p style={{ fontSize: '13px', color: '#aaa', margin: 0, lineHeight: 1.6 }}>{account.last_trigger}</p>
                      {account.trigger_date && <p style={{ ...mono, fontSize: '10px', color: '#555', margin: '4px 0 0' }}>{account.trigger_date}</p>}
                    </div>
                  </details>
                )}

                {/* POC */}
                {(account.detected_poc_name || account.suggested_poc) && (
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={label}>CONTACT</div>
                      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{account.detected_poc_name}</span>
                        {account.suggested_poc && <span style={{ ...mono, fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '.06em' }}>{account.suggested_poc}</span>}
                      </div>
                    </div>
                    {account.poc_email && (
                      <div>
                        <div style={label}>EMAIL</div>
                        <a href={`mailto:${account.poc_email}`} style={{ marginTop: '4px', fontSize: '13px', color: '#888', display: 'block', textDecoration: 'none' }}>{account.poc_email}</a>
                      </div>
                    )}
                    {account.poc_phone && (
                      <div>
                        <div style={label}>PHONE</div>
                        <span style={{ marginTop: '4px', fontSize: '13px', color: '#888', display: 'block' }}>{account.poc_phone}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <AccountActions id={account.id} stage={account.account_stage} notes={account.notes} lastContact={account.last_contact_date} />

                {/* Notes display */}
                {(account.notes || account.relationship_notes) && (
                  <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                    {account.notes && (
                      <div>
                        <div style={label}>NOTES</div>
                        <p style={{ fontSize: '13px', color: '#999', margin: '4px 0 0', lineHeight: 1.6 }}>{account.notes}</p>
                      </div>
                    )}
                    {account.relationship_notes && (
                      <div>
                        <div style={label}>RELATIONSHIP</div>
                        <p style={{ fontSize: '13px', color: '#999', margin: '4px 0 0', lineHeight: 1.6 }}>{account.relationship_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ ...mono, fontSize: '10px', color: '#555', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: '24px' }}>
        LAST SCAN — {lastScanned} · {list.length} ACCOUNTS MONITORED
      </div>
    </>
  )
}

export default function Dashboard() {
  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#fff' }}>

      {/* Top nav bar */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
          <span style={{ ...mono, fontSize: '13px', fontWeight: 700, letterSpacing: '.1em', color: '#fff' }}>SIGNAL MONITOR</span>
          <span style={{ ...mono, fontSize: '10px', color: '#333', letterSpacing: '.08em' }}>/INDIA · B2B · WORKFORCE</span>
        </div>
        <RunScanButton />
      </div>

      {/* Page header */}
      <div style={{ padding: '48px 40px 0', maxWidth: '1100px', margin: '0 auto' }}>
        <p style={{ ...mono, fontSize: '11px', color: '#444', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: '10px' }}>
          ACCOUNT INTELLIGENCE
        </p>
        <h1 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1.1, margin: '0 0 4px' }}>
          B2B Signal Monitor
        </h1>
        <p style={{ fontSize: '14px', color: '#444', margin: '0 0 0' }}>
          AI-powered sales trigger detection for Indian enterprise accounts
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 40px 80px' }}>
        <Suspense fallback={
          <div style={{ ...mono, fontSize: '11px', color: '#333', letterSpacing: '.1em', textTransform: 'uppercase', padding: '60px 0' }}>
            LOADING ACCOUNTS...
          </div>
        }>
          <AccountList />
        </Suspense>
      </div>
    </main>
  )
}
