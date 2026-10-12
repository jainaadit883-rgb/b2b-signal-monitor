import { supabase } from './supabase'
import { fetchNewsForCompany } from './news'
import { fetchJobSignals } from './jobs'
import { analyzeSignals } from './gemini'
import { findPocAtCompany } from './proxycurl'

export interface ScanResult {
  id: string
  name: string
  score: number
  summary: string
  outreachAngle: string
  suggestedPoc: string
  detectedPocName: string
}

export async function runScan(): Promise<ScanResult[]> {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, account_name, signal_history')

  if (error || !accounts) throw new Error('Failed to fetch accounts')

  const results: ScanResult[] = []

  for (const account of accounts) {
    const [articles, jobSignals] = await Promise.all([
      fetchNewsForCompany(account.account_name),
      fetchJobSignals(account.account_name),
    ])

    const analysis = await analyzeSignals(account.account_name, articles, jobSignals)

    // Try to enrich POC via Proxycurl (only if key is set)
    const proxycurlPoc = await findPocAtCompany(account.account_name)
    const detectedPocName = proxycurlPoc?.name || analysis.detectedPocName || null
    const suggestedPoc = proxycurlPoc?.title || analysis.suggestedPoc || null

    // Append to signal history (keep last 30 entries)
    const today = new Date().toISOString().split('T')[0]
    const history: { date: string; score: number }[] = Array.isArray(account.signal_history)
      ? account.signal_history
      : []
    const updatedHistory = [
      ...history.filter((h: { date: string }) => h.date !== today),
      { date: today, score: analysis.score },
    ].slice(-30)

    // Update ONLY signal-derived columns — never touch manual columns
    await supabase
      .from('accounts')
      .update({
        signal_score: analysis.score,
        signal_summary: analysis.summary,
        last_trigger: analysis.trigger || null,
        trigger_date: analysis.trigger ? today : null,
        outreach_angle: analysis.outreachAngle || null,
        suggested_poc: suggestedPoc,
        detected_poc_name: detectedPocName,
        signal_history: updatedHistory,
        last_scanned_at: new Date().toISOString(),
      })
      .eq('id', account.id)

    results.push({
      id: account.id,
      name: account.account_name,
      score: analysis.score,
      summary: analysis.summary,
      outreachAngle: analysis.outreachAngle,
      suggestedPoc: suggestedPoc || '',
      detectedPocName: detectedPocName || '',
    })
  }

  return results.sort((a, b) => b.score - a.score)
}
