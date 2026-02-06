/**
 * Authentication Utilities
 * Password hashing, verification, and JWT token management
 */

import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import prisma from './prisma'

// JWT Configuration
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-change-in-production')
const JWT_EXPIRY = '7d' // Token expires in 7 days
const COOKIE_NAME = 'parliament-session'

// Password Configuration
const SALT_ROUNDS = 12

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Generate a JWT token for a user
 */
export async function generateToken(userId: string): Promise<string> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET)
  
  return token
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return { userId: payload.userId as string }
  } catch {
    return null
  }
}

/**
 * Create a session for a user and set the cookie
 */
export async function createSession(userId: string): Promise<string> {
  const token = await generateToken(userId)
  
  // Calculate expiry date (7 days from now)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  
  // Save session to database
  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt
    }
  })
  
  // Set cookie
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/'
  })
  
  return token
}

/**
 * Get current session from cookie
 */
export async function getSession(): Promise<{ userId: string; user: { id: string; email: string } } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  
  if (!token) {
    return null
  }
  
  // Verify JWT
  const payload = await verifyToken(token)
  if (!payload) {
    return null
  }
  
  // Check if session exists in database and is not expired
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  })
  
  if (!session || session.expiresAt < new Date()) {
    // Session expired or not found, clear cookie
    cookieStore.delete(COOKIE_NAME)
    return null
  }
  
  return {
    userId: session.userId,
    user: {
      id: session.user.id,
      email: session.user.email
    }
  }
}

/**
 * Delete session (logout)
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  
  if (token) {
    // Delete from database
    await prisma.session.deleteMany({
      where: { token }
    })
    
    // Clear cookie
    cookieStore.delete(COOKIE_NAME)
  }
}

/**
 * Clean up expired sessions (can be called periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  })
  
  return result.count
}
