/**
 * Next.js Middleware
 * Protects routes that require authentication
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/verify',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify-otp',
  '/api/auth/reset-password',
  '/api/auth/reset-confirm',
]

// Routes that should redirect authenticated users away
const authRoutes = [
  '/login',
  '/register',
  '/verify',
  '/reset-password',
]

const COOKIE_NAME = 'parliament-session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow all API routes except protected ones
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/me') && !pathname.startsWith('/api/auth/logout')) {
    // Allow existing parliament API routes without auth for now
    return NextResponse.next()
  }
  
  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname === route)
  
  // Get session token
  const token = request.cookies.get(COOKIE_NAME)?.value
  
  let isAuthenticated = false
  
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-change-in-production')
      await jwtVerify(token, secret)
      isAuthenticated = true
    } catch {
      // Token is invalid or expired
      isAuthenticated = false
    }
  }
  
  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  // Redirect unauthenticated users to login
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
