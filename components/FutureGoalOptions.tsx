'use client'

interface FutureGoalOptionsProps {
  selectedOptions: number[]
  freeText: string
  onOptionToggle: (index: number) => void
  onFreeTextChange: (text: string) => void
}

// 4 אפשרויות קבועות ליעד עתידי
const FUTURE_GOAL_OPTIONS = [
  'בעוד שבוע-שבועיים ארצה להיות מסוגל לעשות פעולה מסוימת שיהיה לי קשה לעשות היום (למשל צעד קטן בכיוון שאני נוטה להימנע ממנו).',
  'בעוד שבוע-שבועיים ארצה להרגיש קצת אחרת לגבי המצב הזה (פחות מוצף/פחות לחוץ/יותר רגוע או בטוח בעצמי).',
  'בעוד שבוע-שבועיים ארצה להבין יותר טוב מה באמת קורה לי פה, ומה חשוב לי לעשות עם זה הלאה.',
  'בעוד שבוע-שבועיים ארצה להיות קצת יותר עדין ומקבל כלפי עצמי במצב הזה, גם אם הדברים עוד לא נפתרו לגמרי.'
]

export default function FutureGoalOptions({
  selectedOptions,
  freeText,
  onOptionToggle,
  onFreeTextChange
}: FutureGoalOptionsProps) {
  return (
    <>
      {/* 4 אפשרויות קבועות */}
      <div style={{
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {FUTURE_GOAL_OPTIONS.map((option, index) => (
          <label
            key={index}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.75rem',
              backgroundColor: selectedOptions.includes(index) ? '#e3f2fd' : '#f9f9f9',
              borderRadius: '8px',
              border: selectedOptions.includes(index) ? '2px solid #0070f3' : '1px solid #e0e0e0',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <input
              type="checkbox"
              checked={selectedOptions.includes(index)}
              onChange={() => onOptionToggle(index)}
              style={{
                marginTop: '0.25rem',
                cursor: 'pointer'
              }}
            />
            <span style={{
              flex: 1,
              fontSize: '1rem',
              color: '#333',
              lineHeight: '1.5'
            }}>
              {option}
            </span>
          </label>
        ))}
      </div>

      {/* Textarea לתשובה חופשית */}
      <div style={{ marginBottom: '1.5rem' }}>
        <textarea
          value={freeText}
          onChange={(e) => onFreeTextChange(e.target.value)}
          placeholder="או לכתוב במילים שלך מה היית רוצה שיקרה בשבילך בשבוע-שבועיים הקרובים…"
          style={{
            width: '100%',
            minHeight: '60px',
            padding: '0.75rem',
            fontSize: '0.95rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      </div>
    </>
  )
}

// ייצוא של האפשרויות הקבועות לשימוש במקומות אחרים
export { FUTURE_GOAL_OPTIONS }
