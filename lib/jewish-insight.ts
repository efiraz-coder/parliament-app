/**
 * Jewish insight – fetches a relevant quote/insight from Jewish sources
 * and a short modern explanation, using the existing OpenAI API key.
 */

import OpenAI from 'openai'
import { getOpenAIApiKey } from './config'
import { FAST_MODEL } from './config'

export interface JewishInsightResult {
  quote: string
  source?: string
  explanation: string
}

/**
 * Given a short situation summary (pattern + context), calls the API to find
 * a matching Jewish source (verse, Talmud, rabbinic) and a one-sentence modern explanation.
 * Uses the project's OpenAI API key; each call is a fresh search.
 */
export async function getJewishInsightForSituation(
  situationSummary: string,
  originalQuestion?: string
): Promise<JewishInsightResult | null> {
  const apiKey = getOpenAIApiKey()
  if (!apiKey?.trim()) return null

  const openai = new OpenAI({ apiKey })

  const prompt = `אתה מומחה במקורות יהודיים ובפילוסופיה יהודית (תנ"ך, תלמוד, מוסר, הרמב"ם, חסידות, קבלה מעשית).
קיבלת תיאור קצר של מצב או דפוס רגשי/זוגי/משפחתי.

**המצב/הדפוס:**
${situationSummary}
${originalQuestion ? `\n**שאלת המקור:** ${originalQuestion}` : ''}

**משימתך – גרסת עומק:**

1. בחר **משפט או תובנה** ממקורות יהודיים שמתאימה **ספציפית** למצב – לא גנרית. עדיפות לתובנות מ:
   - **תורת המוסר (Musar):** ר' ישראל סלנטר, "חשבון הנפש", עבודת המידות
   - **הרמב"ם – דרך האמצע (שביל הזהב):** אם המצב כרוך בקיצוניות – חסד מופרז או גבורה מופרזת
   - **חסד מול גבורה (Chessed vs. Gevurah):** מתי המשתמש נותן יותר מדי (חסד ללא גבולות)? מתי הוא מחמיר מדי עם עצמו (גבורה ללא חסד)?
   - **תיקון עולם ברמה האישית:** לא "לתקן את העולם" באופן כללי – אלא: מהו ה"שבר" הספציפי שהמשתמש יכול לתקן **בחייו שלו**?
   - **פרקי אבות, תלמוד, מדרש:** בחר ציטוט שמפתיע – לא "הכל בידי שמיים חוץ מיראת שמיים" כשהמצב לא קשור.

2. כתוב **הסבר מודרני** (2-3 משפטים) שמסביר:
   - איך התובנה היהודית מתחברת **ספציפית** למצב (לא "חכמים ידעו")
   - מהו **הכלי המעשי** שנגזר מהתובנה (למשל: "חשבון נפש" = תרגיל ערבי של 5 דקות)

**חוקים:**
- המקור: בעברית. ארמית → תציג בעברית + ארמית קצר.
- ציין את שם המקור (ספר, מסכת, פרק).
- ההסבר: בשפה יומיומית, **בלי ז'רגון דתי**, **בלי הטפה**.
- **אסור קלישאות יהודיות:** לא "הכל מן השמיים", "גם זו לטובה" כתשובות גנריות.
- **הדגש מונחים מקצועיים** (חסד, גבורה, שביל הזהב, תיקון) ב-Bold.

החזר **רק** JSON בפורמט הזה, בלי טקסט לפני או אחרי:
{
  "quote": "המשפט או התובנה מהמקור",
  "source": "שם המקור (ספר, מסכת, פרק)",
  "explanation": "2-3 משפטים – חיבור ספציפי למצב + כלי מעשי שנגזר מהתובנה"
}`

  try {
    const response = await openai.chat.completions.create({
      model: FAST_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: 350,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content?.trim()) return null

    const data = JSON.parse(content) as { quote?: string; source?: string; explanation?: string }
    const quote = typeof data.quote === 'string' ? data.quote.trim() : ''
    const explanation = typeof data.explanation === 'string' ? data.explanation.trim() : ''

    if (!quote || !explanation) return null

    return {
      quote,
      source: typeof data.source === 'string' ? data.source.trim() : undefined,
      explanation
    }
  } catch (err) {
    console.error('[Jewish insight] API error:', err)
    return null
  }
}
