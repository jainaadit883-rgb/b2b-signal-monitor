import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { runScan, ScanResult } from '@/lib/scanner'
import { sendWhatsAppHotList } from '@/lib/whatsapp'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await runScan()

  const today = new Date().getDay()
  if (today === 1 || today === 4) {
    await Promise.allSettled([
      sendHotListEmail(results),
      sendWhatsAppHotList(results),
    ])
  }

  return NextResponse.json({ success: true, processed: results.length, results })
}

function scoreColor(score: number): { bg: string; text: string; bar: string } {
  if (score >= 8) return { bg: '#dcfce7', text: '#14532d', bar: '#16a34a' }
  if (score >= 6) return { bg: '#d1fae5', text: '#065f46', bar: '#10b981' }
  if (score >= 4) return { bg: '#fef9c3', text: '#713f12', bar: '#eab308' }
  return { bg: '#f3f4f6', text: '#374151', bar: '#9ca3af' }
}

function scoreBar(score: number, color: string): string {
  const filled = Math.round(score)
  const empty = 10 - filled
  return `<span style="letter-spacing:1px;font-size:14px;">${'▮'.repeat(filled)}<span style="color:#e5e7eb;">${'▮'.repeat(empty)}</span></span>`
}

async function sendHotListEmail(accounts: ScanResult[]) {
  const top10 = accounts.slice(0, 10)
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const cards = top10.map((acc, idx) => {
    const c = scoreColor(acc.score)
    const pocLine = acc.detectedPocName
      ? `<div style="margin-top:8px;font-size:13px;color:#6b7280;">
           👤 <strong style="color:#374151;">${acc.detectedPocName}</strong>
           ${acc.suggestedPoc ? `<span style="color:#9ca3af;"> · ${acc.suggestedPoc}</span>` : ''}
         </div>`
      : acc.suggestedPoc
        ? `<div style="margin-top:8px;font-size:13px;color:#6b7280;">Contact: ${acc.suggestedPoc}</div>`
        : ''

    const angle = acc.outreachAngle
      ? `<div style="margin-top:10px;padding:10px 12px;background:#f0f9ff;border-left:3px solid #3b82f6;border-radius:4px;font-size:13px;color:#1e3a5f;">${acc.outreachAngle}</div>`
      : ''

    return `
      <div style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:${c.bg};">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="width:24px;height:24px;background:#fff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#374151;">${idx + 1}</span>
            <span style="font-size:17px;font-weight:700;color:#111827;">${acc.name}</span>
          </div>
          <div style="text-align:right;">
            <span style="background:#fff;padding:4px 12px;border-radius:999px;font-weight:700;font-size:15px;color:${c.text};">${acc.score}/10</span>
          </div>
        </div>
        <div style="padding:14px 18px;">
          <div style="margin-bottom:6px;">${scoreBar(acc.score, c.bar)}</div>
          <p style="margin:0;color:#374151;font-size:14px;">${acc.summary}</p>
          ${pocLine}
          ${angle}
        </div>
      </div>
    `
  }).join('')

  const hotCount = top10.filter(a => a.score >= 7).length

  await resend.emails.send({
    from: 'Signal Monitor <onboarding@resend.dev>',
    to: process.env.ARJUN_EMAIL!,
    subject: `🔥 ${hotCount} Hot Account${hotCount !== 1 ? 's' : ''} — ${dateStr}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;margin:0 auto;background:#ffffff;">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1e40af 0%,#7c3aed 100%);padding:36px 32px;border-radius:0 0 24px 24px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">🔥 Hot List</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:15px;">${dateStr}</p>
          <div style="margin-top:16px;display:inline-flex;gap:16px;">
            <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 16px;">
              <div style="color:#fff;font-size:22px;font-weight:700;">${top10.length}</div>
              <div style="color:rgba(255,255,255,0.7);font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Accounts</div>
            </div>
            <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 16px;">
              <div style="color:#4ade80;font-size:22px;font-weight:700;">${hotCount}</div>
              <div style="color:rgba(255,255,255,0.7);font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Hot (7+)</div>
            </div>
          </div>
        </div>

        <!-- Accounts -->
        <div style="padding:28px 24px;">
          ${cards}
        </div>

        <!-- Footer -->
        <div style="padding:20px 24px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">B2B Signal Monitor · Powered by Gemini Flash + NewsData.io · Auto-generated</p>
          <p style="margin:4px 0 0;color:#d1d5db;font-size:11px;">${new Date().toISOString()}</p>
        </div>
      </div>
    `,
  })
}
