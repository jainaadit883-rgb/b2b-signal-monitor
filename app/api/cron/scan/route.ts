import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { runScan } from '@/lib/scanner'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await runScan()

  const today = new Date().getDay()
  if (today === 1 || today === 4) {
    await sendHotListEmail(results)
  }

  return NextResponse.json({ success: true, processed: results.length, results })
}

async function sendHotListEmail(accounts: { name: string; score: number; summary: string; outreachAngle: string }[]) {
  const top10 = accounts.slice(0, 10)

  const rows = top10.map(acc => `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:12px;font-weight:600;color:#111827;">${acc.name}</td>
      <td style="padding:12px;text-align:center;">
        <span style="background:${acc.score >= 7 ? '#dcfce7' : acc.score >= 4 ? '#fef9c3' : '#f3f4f6'};
                     color:${acc.score >= 7 ? '#166534' : acc.score >= 4 ? '#854d0e' : '#374151'};
                     padding:2px 10px;border-radius:9999px;font-size:13px;font-weight:600;">
          ${acc.score}/10
        </span>
      </td>
      <td style="padding:12px;color:#374151;font-size:14px;">${acc.summary}</td>
      <td style="padding:12px;color:#6b7280;font-size:13px;font-style:italic;">${acc.outreachAngle || '—'}</td>
    </tr>
  `).join('')

  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })

  await resend.emails.send({
    from: 'Signal Monitor <onboarding@resend.dev>',
    to: process.env.ARJUN_EMAIL!,
    subject: `🔥 Hot List — ${dateStr}`,
    html: `
      <div style="font-family:sans-serif;max-width:860px;margin:0 auto;padding:32px;background:#fff;">
        <h1 style="color:#111827;margin-bottom:4px;">🔥 Hot List</h1>
        <p style="color:#6b7280;margin-top:0;">Strongest signals from the last 3 days — ${dateStr}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:24px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:12px;text-align:left;color:#374151;font-size:13px;text-transform:uppercase;letter-spacing:.05em;">Account</th>
              <th style="padding:12px;text-align:center;color:#374151;font-size:13px;text-transform:uppercase;letter-spacing:.05em;">Score</th>
              <th style="padding:12px;text-align:left;color:#374151;font-size:13px;text-transform:uppercase;letter-spacing:.05em;">Signal</th>
              <th style="padding:12px;text-align:left;color:#374151;font-size:13px;text-transform:uppercase;letter-spacing:.05em;">Outreach Angle</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;">
          B2B Signal Monitor · Auto-generated · ${new Date().toISOString()}
        </p>
      </div>
    `,
  })
}
