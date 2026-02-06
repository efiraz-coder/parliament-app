/**
 * Login API
 * POST /api/auth/login
 * 
 * 1. Validate email and password
 * 2. Find user by email
 * 3. Verify password
 * 4. Send OTP for 2FA
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'
import { createOTP } from '@/lib/otp'
import { sendLoginOTP, isEmailConfigured } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'נדרשים מייל וסיסמה' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      // Don't reveal if email exists or not
      return NextResponse.json(
        { error: 'מייל או סיסמה שגויים' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'מייל או סיסמה שגויים' },
        { status: 401 }
      )
    }

    // Create and send OTP for 2FA
    const otpCode = await createOTP(user.id, 'LOGIN')

    // Send email
    if (isEmailConfigured()) {
      const emailSent = await sendLoginOTP(normalizedEmail, otpCode)
      if (!emailSent) {
        console.error('[Login] Failed to send OTP email')
      }
    } else {
      // In development without email config, log the code
      console.log(`[Login] OTP for ${normalizedEmail}: ${otpCode}`)
    }

    return NextResponse.json({
      success: true,
      message: 'נשלח קוד אימות למייל',
      userId: user.id,
      requiresOTP: true
    })

  } catch (error) {
    console.error('[Login] Error:', error)
    return NextResponse.json(
      { error: 'שגיאה בהתחברות' },
      { status: 500 }
    )
  }
}
