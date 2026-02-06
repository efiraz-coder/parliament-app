/**
 * בחינה אמיתית של מומחי התוכן: כל מומחה מקבל את השאלה בתחום שלו ומחזיר תשובה (ניתוח) אמיתית.
 * תשובה כנה, ברורה, עם זווית ייחודית וקונקרטיות; אם יש ביקורת – לפתוח ב"מצטער שעלי להוסיף כי:".
 * ניתן לבחור 4 מומחים רלוונטיים להקשר במקום כל 6.
 */

import { getMessages } from './chat-state'
import { getAgents, getSchoolName } from './agents'
import { callAgent } from './agent-caller'
import type { ExpertContentAnalysis } from './chat-state'
import { FAST_MODEL } from './config'
import OpenAI from 'openai'
import { getOpenAIApiKey } from './config'

const ACTIVE_AGENT_IDS = ['psychodynamic-freudian', 'cbt', 'dbt', 'managerial-organizational', 'social-sociological', 'modern-stoic']

/**
 * בוחר 4 מומחים רלוונטיים להקשר מתוך 6 – לפי תוכן השיחה.
 * מחזיר מערך של 4 מזההי מומחים (ids). אם נכשל – מחזיר null (ואז נשתמש בכל 6).
 */
export async function selectRelevantExperts(conversationSummary: string): Promise<string[] | null> {
  const summary = conversationSummary.slice(-2500)
  const openai = new OpenAI({ apiKey: getOpenAIApiKey() })
  try {
    const res = await openai.chat.completions.create({
      model: FAST_MODEL,
      messages: [
        {
          role: 'user',
          content: `תבסס על תוכן השיחה הבא, בחר **בדיוק 4** מומחים שהזווית שלהם הכי רלוונטית להקשר (זוגיות, קריירה, כסף, בריאות, החלטות וכו').
רשימת המומחים (מזהים באנגלית): psychodynamic-freudian, cbt, dbt, managerial-organizational, social-sociological, modern-stoic.
החזר JSON בלבד בפורמט: {"ids": ["id1", "id2", "id3", "id4"]} – רק המזהים, בלי טקסט נוסף.

תקציר השיחה:
---
${summary}
---`
        }
      ],
      max_tokens: 120,
      response_format: { type: 'json_object' }
    })
    const raw = res.choices[0]?.message?.content
    if (!raw) return null
    const parsed = JSON.parse(raw) as { ids?: string[] }
    const ids = Array.isArray(parsed.ids) ? parsed.ids.filter((id: string) => ACTIVE_AGENT_IDS.includes(id)) : []
    if (ids.length >= 3 && ids.length <= 6) return ids.slice(0, 4)
    return null
  } catch {
    return null
  }
}

/**
 * אוסף ניתוחי תוכן אמיתיים ממומחים: כל מומחה מקבל את המצב ותשובות האדם ומחזיר ניתוח עם **זווית ייחודית** ו**קונקרטיות**.
 * @param sessionId מזהה הסשן
 * @param agentIds אופציונלי – רשימת מזהי מומחים (למשל 4 רלוונטיים). אם לא מועבר – משתמשים בכל 6.
 */
export async function collectExpertContentAnalyses(sessionId: string, agentIds?: string[]): Promise<ExpertContentAnalysis[]> {
  const messages = getMessages(sessionId)
  const conversationSummary = messages
    .map(m => `${m.speaker === 'user' ? 'משתמש' : m.speaker}: ${m.content}`)
    .join('\n\n')
    .slice(-5000)

  const requestedIds = agentIds && agentIds.length >= 3 ? agentIds : ACTIVE_AGENT_IDS
  const agents = getAgents().filter(a => requestedIds.includes(a.id))
  const analyses: ExpertContentAnalysis[] = []

  const promptTemplate = `תקציר השיחה עם האדם (שאלת המקור + כל תשובותיו):
---
${conversationSummary}
---

===== חל על כל נושא =====
ההנחיות האלו חלות על **כל נושא** שהשואל מביא – זוגיות ואינטימיות, ניהול זמן, תקציב ביתי, בגידה, חוסר תמיכה של בן/בת זוג בעת צרה, עבודה, בריאות, חרדה, דחיינות, יחסים עם ילדים/הורים ועוד. התאם את הניתוח (מניעים, רווחים גלויים וסמויים) **לנושא הספציפי** – לא רק לזוגיות.

===== זווית ייחודית (חובה!) =====
**כל מומחה חייב זווית ייחודית** – לא AI גנרי. התאם את הניתוח **לאסכולה שלך בלבד**:
- **פסיכודינמי:** לא מודע, עבר, קונפליקטים פנימיים, מנגנוני הגנה, יחסים מוקדמים – **רק כשיש רמזים בטקסט**.
- **CBT:** מחשבות, אמונות, התנהגויות **כאן ועכשיו** – מה חושב/עושה והאם זה משרת.
- **DBT:** ויסות רגשי, סובלנות למצוקה, תקשורת בין־אישית – איך להתמודד בלי להחריף.
- **ניהולי-ארגוני:** מערכות, יעדים, סדרי עדיפויות, שינוי תהליכים – איך לארגן את המצב.
- **סוציולוגי:** נורמות, הקשר חברתי/משפחתי, לחצים חיצוניים – איך הסביבה משפיעה.
- **סטואי מודרני:** מה בשליטתי vs מה לא, קבלה, פעולה מעשית – איפה לפעול ואיפה להרפות.

תפקידך: **ניתוח מעמיק עם זווית ייחודית** – לא משפט כללי. **קונקרטיות:** הרחב את התוכן כך שהקורא יקבל מידע **ברור ומשמעותי** – צטט/התייחס לפרטים מהשיחה, לא משפטים כלליים.
- **עומק:** חפש **מניעים**, **רווחים גלויים וסמויים** – **בשפה יומיומית**, בלי מונחים מקצועיים.
- **חיבור לסיפור:** התייחס **ממכל** מה שהשואל כתב – והראה איך **מניעים ורווחים** מתחברים **דווקא דרך הזווית שלך**.
- **אורך:** 4–7 משפטים קונקרטיים – לא AI גנרי. מידע בהיר ומשמעותי לקורא.
- אם יש בביקורת משהו שלא נעים – **חובה** לפתוח ב"מצטער שעלי להוסיף כי:" ואז להמשיך.
- אל תציע תכנית פעולה; רק ניתוח **מעמיק** עם **זווית ייחודית** וקונקרטיות.

החזר **טקסט חופשי** (לא JSON): פסקה אחת עם הניתוח שלך.`

  const promises = agents.map(async (agent) => {
    try {
      const analysisText = await callAgent(
        agent.id,
        [{ content: promptTemplate }],
        {
          model: FAST_MODEL,
          maxTokens: 650,
          responseFormat: 'text'
        }
      )
      const analysis = (analysisText || '').trim()
      if (!analysis) return null
      return {
        agentId: agent.id,
        agentName: agent.displayName || agent.name,
        schoolName: getSchoolName(agent.id),
        analysis
      } as ExpertContentAnalysis
    } catch (err) {
      console.error(`[ExpertContentAnalysis] Error from ${agent.id}:`, err)
      return null
    }
  })

  const results = await Promise.all(promises)
  for (const r of results) {
    if (r) analyses.push(r)
  }

  return analyses
}
