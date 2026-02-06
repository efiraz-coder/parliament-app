'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'

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
        // Redirect to OTP verification page
        router.push(`/verify?userId=${data.userId}&type=LOGIN`)
      }
    } catch {
      setError('שגיאת רשת. נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="התחברות">
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="error-message">{error}</div>}
        
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

        <div className="form-group">
          <label htmlFor="password">סיסמה</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'מתחבר...' : 'התחבר'}
        </button>

        <div className="auth-links">
          <Link href="/register">אין לך חשבון? הירשם</Link>
          <Link href="/reset-password">שכחת סיסמה?</Link>
        </div>
      </form>

      <style jsx>{`
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
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

        .error-message {
          background: #fee2e2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          text-align: center;
          border: 1px solid #fecaca;
        }

        .auth-links {
          display: flex;
          justify-content: space-between;
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
