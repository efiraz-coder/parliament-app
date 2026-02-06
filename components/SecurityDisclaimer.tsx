'use client'

/**
 * Security Disclaimer Component
 * Shows a prominent warning about server security
 */

export default function SecurityDisclaimer() {
  return (
    <div className="security-disclaimer">
      <div className="disclaimer-icon">⚠️</div>
      <div className="disclaimer-content">
        <strong>שים לב!</strong>
        <p>ניתן לפרוץ לשרתים אלו. אל תשאיר מידע אישי!</p>
      </div>
      
      <style jsx>{`
        .security-disclaimer {
          background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%);
          border: 2px solid #ffc107;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);
        }
        
        .disclaimer-icon {
          font-size: 32px;
          flex-shrink: 0;
        }
        
        .disclaimer-content {
          flex: 1;
        }
        
        .disclaimer-content strong {
          color: #856404;
          font-size: 18px;
          display: block;
          margin-bottom: 4px;
        }
        
        .disclaimer-content p {
          color: #856404;
          margin: 0;
          font-size: 14px;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}
