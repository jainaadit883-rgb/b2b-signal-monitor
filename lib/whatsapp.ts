import twilio from 'twilio'

export async function sendWhatsAppHotList(
  accounts: { name: string; score: number; summary: string; suggestedPoc: string; detectedPocName: string }[]
) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM
  const to = process.env.ARJUN_WHATSAPP

  if (!accountSid || !authToken || !from || !to) return

  const client = twilio(accountSid, authToken)
  const top5 = accounts.slice(0, 5)
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

  const lines = top5.map((a, i) => {
    const bar = '🟩'.repeat(Math.round(a.score / 2)) + '⬜'.repeat(5 - Math.round(a.score / 2))
    const poc = a.detectedPocName ? ` → ${a.detectedPocName}` : a.suggestedPoc ? ` → ${a.suggestedPoc}` : ''
    return `${i + 1}. *${a.name}* ${bar} ${a.score}/10${poc}\n   _${a.summary}_`
  }).join('\n\n')

  const body = `🔥 *Hot List — ${dateStr}*\n\nTop accounts to reach out to this week:\n\n${lines}\n\n_B2B Signal Monitor_`

  await client.messages.create({ from, to, body })
}
