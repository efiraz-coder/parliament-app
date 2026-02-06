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

  const prompt = `אתה מומחה במקורות יהודיים (תנ"ך, תלמוד, חכמים, מוסר).
קיבלת תיאור קצר של מצב או דפוס רגשי/זוגי/משפחתי.

**המצב/הדפוס:**
${situationSummary}
${originalQuestion ? `\n**שאלת המקור:** ${originalQuestion}` : ''}

**משימתך:**
1. בחר **משפט אחד או תובנה אחת** ממקורות יהודיים (פסוק, משנה, ביטוי של חכמים, מדרש) שמתאימה למצב – לא גנרית, אלא ממש קשורה לרוגע/איזון/זוגיות/כבוד/קצב/לידה/משפחה וכו'.
2. כתוב **הסבר מודרני קצר** (משפט אחד) – איך התובנה של חכמים מתחברת למצב הזה היום.

**חוקים:**
- המקור: בעברית. אם המקור במקורו בארמית – תציג בעברית או בעברית + ארמית קצר.
- ציין את שם המקור (למשל: "משלי", "פרקי אבות", "תלמוד בבלי") אם אפשר.
- ההסבר המודרני: בשפה יומיומית, בלי ז'רגון דתי.

החזר **רק** JSON בפורמט הזה, בלי טקסט לפני או אחרי:
{
  "quote": "המשפט או התובנה מהמקור",
  "source": "שם המקור (ספר, מסכת וכו')",
  "explanation": "משפט אחד – איך זה מתחבר למצב המודרני"
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
