import { NextResponse } from 'next/server'
import { runScan } from '@/lib/scanner'

export async function POST() {
  try {
    const results = await runScan()
    return NextResponse.json({ success: true, results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
