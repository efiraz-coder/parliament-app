/**
 * Get Current User API
 * GET /api/auth/me
 * 
 * Returns the current logged-in user info
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'לא מחובר', authenticated: false },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      user: session.user
    })

  } catch (error) {
    console.error('[Me] Error:', error)
    return NextResponse.json(
      { error: 'שגיאה בקריאת מידע המשתמש', authenticated: false },
      { status: 500 }
    )
  }
}
