import { NextRequest, NextResponse } from 'next/server'
import { clearSession } from '@/lib/chat-state'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ ok: false, error: 'sessionId required' }, { status: 400 })
    }
    clearSession(sessionId)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
