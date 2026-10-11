import { Suspense } from 'react'
import { io } from 'next/cache'
import { supabase } from '@/lib/supabase'
import RunScanButton from './components/RunScanButton'

interface Account {
  id: string
  account_name: string
  account_stage: string
  signal_score: number | null
  signal_summary: string | null
  last_trigger: string | null
  trigger_date: string | null
  outreach_angle: string | null
  last_scanned_at: string | null
  notes: string | null
  last_contact_date: string | null
  relationship_notes: string | null
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
              <div className="flex items-center gap-3">
                <span className="text-gray-400 font-mono text-sm w-5">{idx + 1}</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold text-gray-900">{account.account_name}</h2>
                    <StageBadge stage={account.account_stage} />
                  </div>
                  {account.signal_summary && (
                    <p className="text-gray-600 text-sm mt-1">{account.signal_summary}</p>
                  )}
                </div>
              </div>
              <ScoreBadge score={account.signal_score} />
            </div>

            {account.outreach_angle && (
              <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">Outreach Angle</p>
                <p className="text-sm text-indigo-900">{account.outreach_angle}</p>
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
