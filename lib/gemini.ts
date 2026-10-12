import { GoogleGenerativeAI } from '@google/generative-ai'
import { NewsArticle } from './news'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface SignalAnalysis {
  score: number
  summary: string
  trigger: string
  outreachAngle: string
  suggestedPoc: string
  detectedPocName: string
}

export async function analyzeSignals(
  companyName: string,
  articles: NewsArticle[],
  jobSignals: string = ''
): Promise<SignalAnalysis> {
  if (articles.length === 0 && !jobSignals) {
    return { score: 0, summary: 'No recent news found', trigger: '', outreachAngle: '', suggestedPoc: '', detectedPocName: '' }
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  const newsText = articles
    .map(a => `- [${a.pubDate}] ${a.title}: ${a.description}`)
    .join('\n')

  const jobSection = jobSignals
    ? `\nJob postings & hiring news:\n${jobSignals}`
    : ''

  const prompt = `You are analyzing B2B sales signals for a company called "${companyName}".

Arjun sells a workforce management SaaS to mid-market and enterprise companies in India. His product helps companies digitally manage scheduling, attendance, payroll, and compliance.

Recent news about ${companyName}:
${newsText || '(no general news found)'}
${jobSection}

Identify trigger events relevant to Arjun's product:
- Headcount expansion or hiring surge (especially for HR Ops, Payroll, Workforce roles → very strong signal)
- New CHRO, VP Operations, or HR leadership joining
- Funding rounds (precede team growth)
- Workforce digitalization statements
- Operational scaling challenges

If the job postings section shows the company is actively hiring HR / Payroll / Workforce roles, treat that as a strong signal (add 2-3 extra points to the score).

Respond ONLY with valid JSON, no extra text:
{
  "score": <integer 0-10>,
  "summary": "<one sentence: the most relevant signal, or 'No relevant signals this week'>",
  "trigger": "<the specific trigger event, or empty string if none>",
  "outreachAngle": "<one paragraph connecting the trigger to workforce management SaaS, or empty string>",
  "suggestedPoc": "<the exact job title of the best person to contact at this company right now — e.g. 'CHRO', 'VP Operations', 'Head of HR', 'COO' — or empty string if no signal>",
  "detectedPocName": "<the full name of the best person for Arjun to contact at ${companyName} regarding workforce management. First check if any name is explicitly mentioned in the news or job postings above. If not, use your own knowledge about ${companyName}'s leadership team to name the current CHRO, VP HR, VP Operations, or equivalent decision-maker. Provide a real name if you know one — do not leave empty if you have knowledge of this company's leadership>"
}`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const parsed = JSON.parse(jsonMatch[0])
    return {
      score: Math.min(10, Math.max(0, parseInt(parsed.score) || 0)),
      summary: parsed.summary || 'No relevant signals this week',
      trigger: parsed.trigger || '',
      outreachAngle: parsed.outreachAngle || '',
      suggestedPoc: parsed.suggestedPoc || '',
      detectedPocName: parsed.detectedPocName || '',
    }
  } catch {
    return { score: 0, summary: 'Analysis unavailable', trigger: '', outreachAngle: '', suggestedPoc: '', detectedPocName: '' }
  }
}
