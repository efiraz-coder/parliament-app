/**
 * Registration API
 * POST /api/auth/register
 * 
 * 1. Validate email and password
 * 2. Check if email already exists
 * 3. Hash password
 * 4. Create user
 * 5. Send OTP for verification
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { createOTP } from '@/lib/otp'
import { sendRegistrationOTP, isEmailConfigured } from '@/lib/email'

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Password requirements
const MIN_PASSWORD_LENGTH = 6

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

    // Validate email format
    const normalizedEmail = email.toLowerCase().trim()
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'כתובת מייל לא תקינה' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים` },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'כתובת המייל כבר רשומה במערכת' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash
      }
    })

    // Create and send OTP
    const otpCode = await createOTP(user.id, 'REGISTER')

    // Send email (if configured)
    if (isEmailConfigured()) {
      const emailSent = await sendRegistrationOTP(normalizedEmail, otpCode)
      if (!emailSent) {
        console.error('[Register] Failed to send OTP email')
      }
    } else {
      // In development without email config, log the code
      console.log(`[Register] OTP for ${normalizedEmail}: ${otpCode}`)
    }

    return NextResponse.json({
      success: true,
      message: 'נשלח קוד אימות למייל',
      userId: user.id,
      requiresVerification: true
    })

  } catch (error) {
    console.error('[Register] Error:', error)
    return NextResponse.json(
      { error: 'שגיאה ביצירת החשבון' },
      { status: 500 }
    )
  }
}
