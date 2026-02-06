'use client'

import SecurityDisclaimer from './SecurityDisclaimer'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
}

/**
 * Shared layout for authentication pages
 */
export default function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">{title}</h1>
        <SecurityDisclaimer />
        {children}
      </div>
      
      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          padding: 20px;
        }
        
        .auth-card {
          background: white;
          border-radius: 16px;
          padding: 40px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .auth-title {
          color: #1a1a2e;
          font-size: 28px;
          font-weight: 700;
          text-align: center;
          margin: 0 0 24px 0;
        }
      `}</style>
    </div>
  )
}
