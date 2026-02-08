'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'שגיאה בהתחברות')
        return
      }

      if (data.requiresOTP) {
        router.push(`/verify?userId=${data.userId}&type=LOGIN`)
      }
    } catch {
      setError('שגיאת רשת. נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[400px]"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <span className="text-5xl mb-4 block">🏛️</span>
          <h1 className="text-3xl font-bold text-white mb-2">
            הפרלמנט הפנימי
          </h1>
          <p className="text-slate-400 text-lg">
            מרחב בטוח לשאלות החשובות באמת
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-8 shadow-xl"
        >
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">
            התחברות
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-base text-center font-medium"
              >
                {error}
              </motion.div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-base font-semibold text-slate-700 mb-2">
                מייל
              </label>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                  className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-lg placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-base font-semibold text-slate-700 mb-2">
                סיסמה
              </label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-lg placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  מתחבר...
                </span>
              ) : (
                <>
                  התחבר
                  <ArrowLeft className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Links */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between gap-4 text-base">
              <Link
                href="/register"
                className="text-indigo-600 hover:text-indigo-800 font-semibold text-center transition-colors"
              >
                אין לך חשבון? הירשם
              </Link>
              <Link
                href="/reset-password"
                className="text-slate-600 hover:text-slate-900 font-medium text-center transition-colors"
              >
                שכחת סיסמה?
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          © 2024 הפרלמנט הפנימי
        </p>
      </motion.div>
    </div>
  )
}
