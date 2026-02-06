'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'

type Step = 'email' | 'code' | 'newPassword'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Step 1: Request password reset
  const handleRequestReset = async (e: React.FormEvent) => {
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

      setSuccess('אם המייל רשום במערכת, נשלח אליו קוד איפוס')
      if (data.userId) {
        setUserId(data.userId)
      }
      setStep('code')
    } catch {
      setError('שגיאת רשת. נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify code and set new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות לא תואמות')
      return
    }

    if (newPassword.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    if (!/^\d{6}$/.test(code)) {
      setError('הקוד חייב להכיל 6 ספרות')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code, newPassword })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'שגיאה באיפוס הסיסמה')
        return
      }

      setSuccess('הסיסמה עודכנה בהצלחה!')
      
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
    <AuthLayout title="איפוס סיסמה">
      {step === 'email' && (
        <form onSubmit={handleRequestReset} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          
          <p className="form-description">
            הזן את כתובת המייל שלך ונשלח לך קוד לאיפוס הסיסמה
          </p>

          <div className="form-group">
            <label htmlFor="email">מייל</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'שולח...' : 'שלח קוד איפוס'}
          </button>

          <div className="auth-links">
            <Link href="/login">חזרה להתחברות</Link>
          </div>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleResetPassword} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          {success && !error && <div className="success-message">{success}</div>}
          
          <p className="form-description">
            הזן את הקוד שקיבלת במייל והגדר סיסמה חדשה
          </p>

          <div className="form-group">
            <label htmlFor="code">קוד אימות (6 ספרות)</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              required
              disabled={loading}
              maxLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">סיסמה חדשה</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="לפחות 6 תווים"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">אימות סיסמה</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="הקלד שוב את הסיסמה"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'מעדכן...' : 'עדכן סיסמה'}
          </button>

          <button 
            type="button" 
            className="back-btn"
            onClick={() => setStep('email')}
          >
            שלח קוד חדש
          </button>
        </form>
      )}

      <style jsx>{`
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-description {
          color: #666;
          text-align: center;
          margin: 0;
          font-size: 14px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }

        .form-group input {
          padding: 14px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 16px;
          transition: border-color 0.2s, box-shadow 0.2s;
          direction: ltr;
          text-align: left;
        }

        .form-group input:focus {
          outline: none;
          border-color: #0f3460;
          box-shadow: 0 0 0 3px rgba(15, 52, 96, 0.1);
        }

        .form-group input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .submit-btn {
          padding: 16px;
          background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(15, 52, 96, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .back-btn {
          padding: 12px;
          background: transparent;
          color: #0f3460;
          border: 2px solid #0f3460;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .back-btn:hover {
          background: rgba(15, 52, 96, 0.1);
        }

        .error-message {
          background: #fee2e2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          text-align: center;
          border: 1px solid #fecaca;
        }

        .success-message {
          background: #dcfce7;
          color: #16a34a;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          text-align: center;
          border: 1px solid #bbf7d0;
        }

        .auth-links {
          display: flex;
          justify-content: center;
          margin-top: 8px;
        }

        .auth-links :global(a) {
          color: #0f3460;
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
        }

        .auth-links :global(a:hover) {
          color: #16213e;
          text-decoration: underline;
        }
      `}</style>
    </AuthLayout>
  )
}
