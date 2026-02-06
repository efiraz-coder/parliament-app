/**
 * Verify OTP API
 * POST /api/auth/verify-otp
 * 
 * 1. Validate OTP code
 * 2. Create session if valid
 * 3. Return success with redirect URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/otp'
import { createSession } from '@/lib/auth'
import { OTPType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, code, type } = body

    // Validate input
    if (!userId || !code) {
      return NextResponse.json(
        { error: 'נדרשים קוד ומזהה משתמש' },
        { status: 400 }
      )
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'קוד האימות חייב להכיל 6 ספרות' },
        { status: 400 }
      )
    }

    // Determine OTP type
    const otpType: OTPType = type === 'REGISTER' ? 'REGISTER' : 'LOGIN'

    // Verify OTP
    const result = await verifyOTP(userId, code, otpType)

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error || 'קוד שגוי' },
        { status: 401 }
      )
    }

    // Create session
    await createSession(userId)

    return NextResponse.json({
      success: true,
      message: 'התחברת בהצלחה!',
      redirectTo: '/'
    })

  } catch (error) {
    console.error('[VerifyOTP] Error:', error)
    return NextResponse.json(
      { error: 'שגיאה באימות הקוד' },
      { status: 500 }
    )
  }
}
