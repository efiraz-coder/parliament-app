'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthLayout from '@/components/AuthLayout'

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')
  const type = searchParams.get('type') || 'LOGIN'
  
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Redirect if no userId
  useEffect(() => {
    if (!userId) {
      router.push('/login')
    }
  }, [userId, router])

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits are entered
    if (value && index === 5) {
      const fullCode = newCode.join('')
      if (fullCode.length === 6) {
        handleSubmit(fullCode)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split('')
      setCode(newCode)
      inputRefs.current[5]?.focus()
      handleSubmit(pastedData)
    }
  }

  const handleSubmit = async (codeToSubmit?: string) => {
    const fullCode = codeToSubmit || code.join('')
    
    if (fullCode.length !== 6) {
      setError('יש להזין 6 ספרות')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: fullCode, type })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'קוד שגוי')
        // Clear code on error
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }

      setSuccess('התחברת בהצלחה!')
      
      // Redirect after short delay
      setTimeout(() => {
        router.push(data.redirectTo || '/')
      }, 1000)
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
    <AuthLayout title="אימות קוד">
      <div className="verify-container">
        <p className="verify-description">
          שלחנו קוד בן 6 ספרות למייל שלך
        </p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="code-inputs" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={loading || !!success}
              className="code-input"
            />
          ))}
        </div>

        <button 
          onClick={() => handleSubmit()}
          className="submit-btn" 
          disabled={loading || code.join('').length !== 6 || !!success}
        >
          {loading ? 'מאמת...' : 'אמת קוד'}
        </button>

        <p className="resend-text">
          לא קיבלת קוד?{' '}
          <button 
            className="resend-btn"
            onClick={() => router.back()}
          >
            שלח שוב
          </button>
        </p>
      </div>

      <style jsx>{`
        .verify-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .verify-description {
          color: #666;
          text-align: center;
          margin: 0;
        }

        .code-inputs {
          display: flex;
          gap: 10px;
          direction: ltr;
        }

        .code-input {
          width: 50px;
          height: 60px;
          text-align: center;
          font-size: 24px;
          font-weight: 600;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .code-input:focus {
          outline: none;
          border-color: #0f3460;
          box-shadow: 0 0 0 3px rgba(15, 52, 96, 0.1);
        }

        .code-input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .submit-btn {
          width: 100%;
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
          width: 100%;
          background: #fee2e2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          text-align: center;
          border: 1px solid #fecaca;
        }

        .success-message {
          width: 100%;
          background: #dcfce7;
          color: #16a34a;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          text-align: center;
          border: 1px solid #bbf7d0;
        }

        .resend-text {
          color: #666;
          font-size: 14px;
        }

        .resend-btn {
          background: none;
          border: none;
          color: #0f3460;
          cursor: pointer;
          text-decoration: underline;
          font-size: 14px;
        }

        .resend-btn:hover {
          color: #16213e;
        }
      `}</style>
    </AuthLayout>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <AuthLayout title="אימות קוד">
        <div style={{ textAlign: 'center', padding: '40px' }}>טוען...</div>
      </AuthLayout>
    }>
      <VerifyContent />
    </Suspense>
  )
}
