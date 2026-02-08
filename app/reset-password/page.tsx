'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, KeyRound, CheckCircle, ArrowRight } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'שגיאה בשליחת הקוד')
        return
      }

      setStep('code')
    } catch {
      setError('שגיאת רשת. נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות אינן תואמות')
      return
    }

    if (newPassword.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'שגיאה באיפוס הסיסמה')
        return
      }

      setStep('success')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
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
        </motion.div>

        {/* Reset Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-8 shadow-xl"
        >
          {step === 'success' ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">הסיסמה אופסה בהצלחה!</h2>
              <p className="text-slate-500">מעביר לדף ההתחברות...</p>
            </motion.div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
                איפוס סיסמה
              </h2>
              <p className="text-center text-slate-500 mb-6 text-lg">
                {step === 'email' ? 'הזן את המייל שלך' : 'הזן את הקוד והסיסמה החדשה'}
              </p>

              {step === 'email' ? (
                <form onSubmit={handleEmailSubmit} className="space-y-5">
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
                        שולח קוד...
                      </span>
                    ) : (
                      'שלח קוד איפוס'
                    )}
                  </motion.button>
                </form>
              ) : (
                <form onSubmit={handleCodeSubmit} className="space-y-5">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-base text-center font-medium"
                    >
                      {error}
                    </motion.div>
                  )}

                  {/* OTP Input */}
                  <div>
                    <label className="block text-base font-semibold text-slate-700 mb-2">
                      קוד אימות (6 ספרות)
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        required
                        disabled={loading}
                        maxLength={6}
                        className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-xl text-center tracking-[0.3em] font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* New Password Input */}
                  <div>
                    <label className="block text-base font-semibold text-slate-700 mb-2">
                      סיסמה חדשה
                    </label>
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        disabled={loading}
                        className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-lg placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Confirm Password Input */}
                  <div>
                    <label className="block text-base font-semibold text-slate-700 mb-2">
                      אימות סיסמה חדשה
                    </label>
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                    disabled={loading || code.length !== 6}
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
                        מאפס סיסמה...
                      </span>
                    ) : (
                      'אפס סיסמה'
                    )}
                  </motion.button>
                </form>
              )}

              {/* Back Link */}
              <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                <Link
                  href="/login"
                  className="text-indigo-600 hover:text-indigo-800 font-semibold text-base inline-flex items-center gap-2 transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                  חזרה להתחברות
                </Link>
              </div>
            </>
          )}
        </motion.div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          © 2024 הפרלמנט הפנימי
        </p>
      </motion.div>
    </div>
  )
}
