/**
 * Reset Password Confirm API
 * POST /api/auth/reset-confirm
 * 
 * 1. Verify OTP code
 * 2. Update password
 * 3. Invalidate all sessions
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { verifyOTP } from '@/lib/otp'

const MIN_PASSWORD_LENGTH = 6

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, code, newPassword } = body

    // Validate input
    if (!userId || !code || !newPassword) {
      return NextResponse.json(
        { error: 'נדרשים קוד, מזהה משתמש וסיסמה חדשה' },
        { status: 400 }
      )
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'קוד האימות חייב להכיל 6 ספרות' },
        { status: 400 }
      )
    }

    // Validate new password
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים` },
        { status: 400 }
      )
    }

    // Verify OTP
    const result = await verifyOTP(userId, code, 'RESET_PASSWORD')

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error || 'קוד שגוי' },
        { status: 401 }
      )
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword)

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    })

    // Invalidate all existing sessions for security
    await prisma.session.deleteMany({
      where: { userId }
    })

    return NextResponse.json({
      success: true,
      message: 'הסיסמה עודכנה בהצלחה! יש להתחבר מחדש.',
      redirectTo: '/login'
    })

  } catch (error) {
    console.error('[ResetConfirm] Error:', error)
    return NextResponse.json(
      { error: 'שגיאה בעדכון הסיסמה' },
      { status: 500 }
    )
  }
}
