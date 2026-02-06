/**
 * OTP (One-Time Password) Service
 * Generate and verify 6-digit codes
 */

import crypto from 'crypto'
import prisma from './prisma'
import { OTPType } from '@prisma/client'

// OTP Configuration
const OTP_LENGTH = 6
const OTP_EXPIRY_MINUTES = 5
const MAX_ATTEMPTS = 3

/**
 * Generate a random 6-digit OTP code
 */
export function generateOTPCode(): string {
  // Generate a random number between 100000 and 999999
  const min = Math.pow(10, OTP_LENGTH - 1)
  const max = Math.pow(10, OTP_LENGTH) - 1
  const code = crypto.randomInt(min, max + 1)
  return code.toString()
}

/**
 * Create and store an OTP for a user
 */
export async function createOTP(userId: string, type: OTPType): Promise<string> {
  const code = generateOTPCode()
  
  // Calculate expiry time (5 minutes from now)
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES)
  
  // Invalidate any existing OTPs of the same type for this user
  await prisma.oTPCode.updateMany({
    where: {
      userId,
      type,
      used: false
    },
    data: {
      used: true
    }
  })
  
  // Create new OTP
  await prisma.oTPCode.create({
    data: {
      userId,
      code,
      type,
      expiresAt,
      maxAttempts: MAX_ATTEMPTS
    }
  })
  
  console.log(`[OTP] Created ${type} OTP for user ${userId}`)
  return code
}

/**
 * Verify an OTP code
 * Returns the OTP record if valid, null otherwise
 */
export async function verifyOTP(
  userId: string, 
  code: string, 
  type: OTPType
): Promise<{ valid: boolean; error?: string }> {
  // Find the OTP
  const otp = await prisma.oTPCode.findFirst({
    where: {
      userId,
      type,
      used: false
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  
  if (!otp) {
    return { valid: false, error: 'לא נמצא קוד אימות. בקש קוד חדש.' }
  }
  
  // Check if expired
  if (otp.expiresAt < new Date()) {
    await prisma.oTPCode.update({
      where: { id: otp.id },
      data: { used: true }
    })
    return { valid: false, error: 'הקוד פג תוקף. בקש קוד חדש.' }
  }
  
  // Check if max attempts exceeded
  if (otp.attempts >= otp.maxAttempts) {
    await prisma.oTPCode.update({
      where: { id: otp.id },
      data: { used: true }
    })
    return { valid: false, error: 'יותר מדי ניסיונות שגויים. בקש קוד חדש.' }
  }
  
  // Check if code matches
  if (otp.code !== code) {
    // Increment attempts
    await prisma.oTPCode.update({
      where: { id: otp.id },
      data: { attempts: otp.attempts + 1 }
    })
    const remaining = otp.maxAttempts - otp.attempts - 1
    return { 
      valid: false, 
      error: remaining > 0 
        ? `קוד שגוי. נותרו ${remaining} ניסיונות.`
        : 'קוד שגוי. יותר מדי ניסיונות - בקש קוד חדש.'
    }
  }
  
  // Mark as used
  await prisma.oTPCode.update({
    where: { id: otp.id },
    data: { used: true }
  })
  
  console.log(`[OTP] Verified ${type} OTP for user ${userId}`)
  return { valid: true }
}

/**
 * Check if user has a pending OTP (for rate limiting)
 */
export async function hasPendingOTP(userId: string, type: OTPType): Promise<boolean> {
  const otp = await prisma.oTPCode.findFirst({
    where: {
      userId,
      type,
      used: false,
      expiresAt: {
        gt: new Date()
      }
    }
  })
  
  return !!otp
}

/**
 * Clean up expired OTPs (can be called periodically)
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  const result = await prisma.oTPCode.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { used: true }
      ]
    }
  })
  
  return result.count
}
