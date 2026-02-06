/**
 * Logout API
 * POST /api/auth/logout
 * 
 * 1. Delete session from database
 * 2. Clear session cookie
 */

import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/auth'

export async function POST() {
  try {
    await deleteSession()

    return NextResponse.json({
      success: true,
      message: 'התנתקת בהצלחה',
      redirectTo: '/login'
    })

  } catch (error) {
    console.error('[Logout] Error:', error)
    return NextResponse.json(
      { error: 'שגיאה בהתנתקות' },
      { status: 500 }
    )
  }
}
