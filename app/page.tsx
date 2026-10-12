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

function ScoreBadge({ score }: { score: number | null }) {
  const s = score ?? 0
  const color =
    s >= 7 ? 'bg-green-100 text-green-800' :
    s >= 4 ? 'bg-yellow-100 text-yellow-800' :
    'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-semibold ${color}`}>
      {s}/10
    </span>
  )
}

function StageBadge({ stage }: { stage: string }) {
  const color =
    stage === 'signed customer' ? 'bg-blue-100 text-blue-700' :
    stage === 'live pilot' ? 'bg-purple-100 text-purple-700' :
    'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {stage}
    </span>
  )
}

function Sparkline({ history }: { history: HistoryEntry[] | null }) {
  if (!history || history.length < 2) return null

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-10)
  const W = 80, H = 28, PAD = 2
  const max = 10

  const pts = sorted.map((h, i) => {
    const x = PAD + (i / (sorted.length - 1)) * (W - PAD * 2)
    const y = H - PAD - (h.score / max) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const lastScore = sorted[sorted.length - 1].score
  const prevScore = sorted[sorted.length - 2].score
  const trend = lastScore > prevScore ? '↑' : lastScore < prevScore ? '↓' : '→'
  const trendColor = lastScore > prevScore ? '#16a34a' : lastScore < prevScore ? '#dc2626' : '#6b7280'

  return (
    <div className="flex items-center gap-1.5" title={`Score history (last ${sorted.length} scans)`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <polyline
          points={pts}
          fill="none"
          stroke="#6366f1"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {sorted.map((h, i) => {
          const x = PAD + (i / (sorted.length - 1)) * (W - PAD * 2)
          const y = H - PAD - (h.score / max) * (H - PAD * 2)
          return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="2" fill="#6366f1" />
        })}
      </svg>
      <span style={{ color: trendColor }} className="text-xs font-semibold">{trend}</span>
    </div>
  )
}

async function AccountList() {
  await io()

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('signal_score', { ascending: false, nullsFirst: false })

  const lastScanned = (accounts as Account[] | null)?.[0]?.last_scanned_at
    ? new Date((accounts as Account[])[0].last_scanned_at!).toLocaleString('en-IN')
    : 'Never'

  return (
    <>
      <p className="text-gray-500 text-sm mb-6">Last scanned: {lastScanned}</p>
      <div className="space-y-4">
        {((accounts as Account[]) || []).map((account, idx) => (
          <div key={account.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-gray-400 font-mono text-sm w-5 shrink-0">{idx + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold text-gray-900">{account.account_name}</h2>
                    <StageBadge stage={account.account_stage} />
                  </div>
                  {account.signal_summary && (
                    <p className="text-gray-600 text-sm mt-1">{account.signal_summary}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <ScoreBadge score={account.signal_score} />
                <Sparkline history={account.signal_history} />
              </div>
            </div>

            {account.outreach_angle && (
              <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">Outreach Angle</p>
                <p className="text-sm text-indigo-900">{account.outreach_angle}</p>
              </div>
            )}

            {/* POC info */}
            {(account.suggested_poc || account.detected_poc_name || account.poc_name || account.poc_email || account.poc_phone) && (
              <div className="mt-3 flex flex-wrap gap-3 text-sm items-center">
                {(account.detected_poc_name || account.suggested_poc) && (
                  <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                    <span className="text-xs font-semibold uppercase tracking-wide">Reach out to:</span>
                    <span className="font-semibold">{account.detected_poc_name || ''}</span>
                    {account.suggested_poc && (
                      <span className="text-amber-500">({account.suggested_poc})</span>
                    )}
                  </div>
                )}
                {account.poc_name && (
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <span className="font-medium">{account.poc_name}</span>
                    {account.poc_title && <span className="text-gray-400">· {account.poc_title}</span>}
                  </div>
                )}
                {account.poc_email && (
                  <a href={`mailto:${account.poc_email}`} className="text-indigo-600 hover:underline">
                    {account.poc_email}
                  </a>
                )}
                {account.poc_phone && (
                  <a href={`tel:${account.poc_phone}`} className="text-gray-600">
                    📞 {account.poc_phone}
                  </a>
                )}
              </div>
            )}

            {(account.notes || account.last_contact_date || account.relationship_notes) && (
              <div className="mt-4 border-t border-gray-100 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {account.notes && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Notes</p>
                    <p className="text-sm text-gray-600 mt-0.5">{account.notes}</p>
                  </div>
                )}
                {account.last_contact_date && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Last Contact</p>
                    <p className="text-sm text-gray-600 mt-0.5">{account.last_contact_date}</p>
                  </div>
                )}
                {account.relationship_notes && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Relationship</p>
                    <p className="text-sm text-gray-600 mt-0.5">{account.relationship_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">B2B Signal Monitor</h1>
          <RunScanButton />
        </div>
        <Suspense fallback={<p className="text-gray-500">Loading accounts...</p>}>
          <AccountList />
        </Suspense>
      </div>
    </main>
  )
}
