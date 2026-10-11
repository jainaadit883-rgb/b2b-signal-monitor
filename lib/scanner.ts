import { supabase } from './supabase'
import { fetchNewsForCompany } from './news'
import { analyzeSignals } from './gemini'

export interface ScanResult {
  id: string
  name: string
  score: number
  summary: string
  outreachAngle: string
}

export async function runScan(): Promise<ScanResult[]> {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, account_name')

  if (error || !accounts) throw new Error('Failed to fetch accounts')

  const results: ScanResult[] = []

  for (const account of accounts) {
    const articles = await fetchNewsForCompany(account.account_name)
    const analysis = await analyzeSignals(account.account_name, articles)

    // Update ONLY signal-derived columns — never touch manual columns
    await supabase
      .from('accounts')
      .update({
        signal_score: analysis.score,
        signal_summary: analysis.summary,
        last_trigger: analysis.trigger || null,
        trigger_date: analysis.trigger ? new Date().toISOString().split('T')[0] : null,
        outreach_angle: analysis.outreachAngle || null,
        last_scanned_at: new Date().toISOString(),
      })
      .eq('id', account.id)

    results.push({
      id: account.id,
      name: account.account_name,
      score: analysis.score,
      summary: analysis.summary,
      outreachAngle: analysis.outreachAngle,
    })
  }

  return results.sort((a, b) => b.score - a.score)
}
