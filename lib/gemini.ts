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
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

  const newsText = articles.length > 0
    ? articles.map(a => `- [${a.pubDate}] ${a.title}: ${a.description}`).join('\n')
    : '(no recent news articles found this week)'

  const jobSection = jobSignals
    ? `\nJob postings & hiring news:\n${jobSignals}`
    : '\n(no job postings found this week)'

  const prompt = `You are analyzing B2B sales signals for a company called "${companyName}".

Arjun sells a workforce management SaaS to mid-market and enterprise companies in India. His product helps companies digitally manage scheduling, attendance, payroll, and compliance.

Recent news about ${companyName}:
${newsText}
${jobSection}

IMPORTANT RULES:
1. Even if no news is available, use your own training knowledge about ${companyName} to provide a useful analysis. These are real Indian companies — you likely know their industry, scale, and leadership.
2. Always set score to at least 2 if you know the company operates at mid-market or enterprise scale in India, because they are always a potential prospect.
3. Always provide suggestedPoc and detectedPocName — never leave both empty. Use your knowledge of Indian company leadership.
4. Always write an outreachAngle — even a general one about how workforce management SaaS would help a company of this type.
5. If the job postings section shows active hiring for HR/Payroll/Workforce roles, add 2-3 extra points to the score.

Trigger events to look for:
- Headcount expansion or hiring surge (especially HR Ops, Payroll, Workforce roles)
- New CHRO, VP Operations, or HR leadership joining
- Funding rounds (precede team growth)
- Workforce digitalization statements
- Operational scaling challenges

Respond ONLY with valid JSON, no extra text:
{
  "score": <integer 2-10, minimum 2 for any known Indian mid-market/enterprise company>,
  "summary": "<one sentence about the company's current situation and why Arjun should reach out>",
  "trigger": "<the specific trigger event if one exists, otherwise describe what makes this company a standing prospect>",
  "outreachAngle": "<one paragraph connecting the company's situation to workforce management SaaS value — always write this>",
  "suggestedPoc": "<the exact job title of the best person to contact — e.g. 'CHRO', 'VP Operations', 'Head of HR', 'COO' — never empty>",
  "detectedPocName": "<the full name of the best person for Arjun to contact at ${companyName}. First check the news above. If not found, use your own knowledge of ${companyName}'s leadership — name the current CHRO, VP HR, VP Operations, or equivalent. Always provide a name if you know one.>"
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
    return { score: 2, summary: `${companyName} is a standing prospect for workforce management SaaS`, trigger: 'Baseline prospect', outreachAngle: `${companyName} operates at scale in India and likely manages a large workforce. Arjun's platform could help digitize their attendance, payroll, and compliance workflows.`, suggestedPoc: 'CHRO', detectedPocName: '' }
  }
}
