'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { KeyRound, CheckCircle } from 'lucide-react'

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const userId = searchParams.get('userId')
  const type = searchParams.get('type') || 'LOGIN'

  useEffect(() => {
    if (!userId) {
      router.push('/login')
    }
  }, [userId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code, type })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'קוד שגוי')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch {
      setError('שגיאת רשת. נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  if (!userId) {
    return null
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

        {/* Verify Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-8 shadow-xl"
        >
          {success ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">אימות בוצע בהצלחה!</h2>
              <p className="text-slate-500">מעביר אותך לאפליקציה...</p>
            </motion.div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
                הזנת קוד אימות
              </h2>
              <p className="text-center text-slate-500 mb-6 text-lg">
                הקוד נשלח למייל שלך
              </p>

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
                      className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 text-2xl text-center tracking-[0.5em] font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-50"
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
                      מאמת...
                    </span>
                  ) : (
                    'אמת קוד'
                  )}
                </motion.button>
              </form>
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

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
