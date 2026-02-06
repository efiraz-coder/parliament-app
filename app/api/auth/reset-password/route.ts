/**
 * Reset Password Request API
 * POST /api/auth/reset-password
 * 
 * 1. Find user by email
 * 2. Send OTP for password reset
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createOTP } from '@/lib/otp'
import { sendPasswordResetOTP, isEmailConfigured } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'נדרש מייל' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    // Always return success message to prevent email enumeration
    if (!user) {
      // Don't reveal if email exists
      return NextResponse.json({
        success: true,
        message: 'אם המייל רשום במערכת, ישלח אליו קוד איפוס'
      })
    }

    // Create and send OTP
    const otpCode = await createOTP(user.id, 'RESET_PASSWORD')

    // Send email
    if (isEmailConfigured()) {
      const emailSent = await sendPasswordResetOTP(normalizedEmail, otpCode)
      if (!emailSent) {
        console.error('[ResetPassword] Failed to send OTP email')
      }
    } else {
      // In development without email config, log the code
      console.log(`[ResetPassword] OTP for ${normalizedEmail}: ${otpCode}`)
    }

    return NextResponse.json({
      success: true,
      message: 'אם המייל רשום במערכת, ישלח אליו קוד איפוס',
      userId: user.id
    })

  } catch (error) {
    console.error('[ResetPassword] Error:', error)
    return NextResponse.json(
      { error: 'שגיאה בשליחת קוד האיפוס' },
      { status: 500 }
    )
  }
}
