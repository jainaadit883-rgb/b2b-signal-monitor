import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data: account, error } = await supabase
    .from('accounts')
    .select('account_name, signal_summary, last_trigger, outreach_angle, detected_poc_name, suggested_poc, poc_name, poc_title')
    .eq('id', id)
    .single()

  if (error || !account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  const pocName = account.poc_name || account.detected_poc_name || 'there'
  const pocTitle = account.poc_title || account.suggested_poc || 'HR/Operations Leader'
  const trigger = account.last_trigger || account.signal_summary || 'standing B2B prospect in India'
  const angle = account.outreach_angle || `${account.account_name} manages a large workforce in India and could benefit from digital workforce management.`

  const prompt = `You are writing a cold outreach email for Arjun, who sells a workforce management SaaS in India. The product helps companies digitize attendance, scheduling, payroll, and compliance.

Company: ${account.account_name}
Contact: ${pocName} (${pocTitle})
Signal/trigger: ${trigger}
Outreach angle: ${angle}

Write a concise, personalized cold email (under 180 words total):
- A compelling subject line referencing the specific signal
- 1 sentence personal hook tied to the trigger
- 1-2 sentences on specific value: attendance digitization, payroll compliance, workforce scheduling
- One clear CTA: "Would you be open to a 15-minute call this week?"
- Sign off from Arjun

Keep it direct and human — not corporate. No generic phrases like "I hope this finds you well."

Return ONLY valid JSON:
{
  "subject": "...",
  "body": "..."
}`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({ subject: parsed.subject, body: parsed.body })
  } catch {
    return NextResponse.json({ error: 'Failed to generate email' }, { status: 500 })
  }
}
