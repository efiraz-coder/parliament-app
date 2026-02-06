/**
 * Email Service
 * Send emails using Gmail SMTP
 */

import nodemailer from 'nodemailer'

// Gmail SMTP Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD // App Password, not regular password
  }
})

interface SendEmailOptions {
  to: string
  subject: string
  text: string
  html?: string
}

/**
 * Send an email
 */
export async function sendEmail({ to, subject, text, html }: SendEmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"פרלמנט הפנימי" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || text
    })
    
    console.log(`[Email] Sent to ${to}: ${subject}`)
    return true
  } catch (error) {
    console.error('[Email] Error sending email:', error)
    return false
  }
}

/**
 * Send OTP code for login
 */
export async function sendLoginOTP(email: string, code: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'קוד אימות להתחברות - פרלמנט הפנימי',
    text: `קוד האימות שלך הוא: ${code}\n\nהקוד תקף ל-5 דקות.`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">קוד אימות להתחברות</h2>
        <p>קוד האימות שלך הוא:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
        </div>
        <p style="color: #666;">הקוד תקף ל-5 דקות.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">אם לא ביקשת קוד זה, התעלם מהודעה זו.</p>
      </div>
    `
  })
}

/**
 * Send OTP code for registration
 */
export async function sendRegistrationOTP(email: string, code: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'אימות הרשמה - פרלמנט הפנימי',
    text: `ברוך הבא לפרלמנט הפנימי!\n\nקוד האימות שלך הוא: ${code}\n\nהקוד תקף ל-5 דקות.`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">ברוך הבא לפרלמנט הפנימי!</h2>
        <p>כדי להשלים את ההרשמה, הזן את קוד האימות:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
        </div>
        <p style="color: #666;">הקוד תקף ל-5 דקות.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">אם לא נרשמת לשירות, התעלם מהודעה זו.</p>
      </div>
    `
  })
}

/**
 * Send OTP code for password reset
 */
export async function sendPasswordResetOTP(email: string, code: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'איפוס סיסמה - פרלמנט הפנימי',
    text: `קוד לאיפוס סיסמה: ${code}\n\nהקוד תקף ל-5 דקות.\n\nאם לא ביקשת לאפס סיסמה, התעלם מהודעה זו.`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">איפוס סיסמה</h2>
        <p>קיבלנו בקשה לאיפוס הסיסמה שלך. הנה הקוד:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
        </div>
        <p style="color: #666;">הקוד תקף ל-5 דקות.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #c00; font-size: 12px;">⚠️ אם לא ביקשת לאפס סיסמה, מישהו אחר אולי מנסה לגשת לחשבונך.</p>
      </div>
    `
  })
}

/**
 * Verify email configuration is set
 */
export function isEmailConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}
