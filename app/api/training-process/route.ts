import { NextRequest, NextResponse } from 'next/server'
import { getMessages, getExpertContentAnalyses, setExpertContentAnalyses } from '@/lib/chat-state'
import { collectExpertContentAnalyses } from '@/lib/expert-content-analysis'
import { getOpenAIApiKey, DEEP_MODEL, FAST_MODEL, OPTIMIZATION_CONFIG } from '@/lib/config'
import { ActionPlanStep } from '@/lib/types'
import OpenAI from 'openai'

/**
 * POST: בקשת תהליך אימוני לסיוע.
 * שולח את כלל המידע (שיחה + תשובות המומחים) ל-AI ומבקש תהליך אימוני הכולל כלים מאימון (קאוצ'ינג), CBT ו-DBT.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'נדרש sessionId' }, { status: 400 })
    }

    const history = getMessages(sessionId)
    const conversationSummary = history
      .map(m => `${m.speaker === 'user' ? 'משתמש' : m.speaker}: ${m.content}`)
      .join('\n\n')
      .slice(-5000)

    let analyses = getExpertContentAnalyses(sessionId)
    if (!analyses || analyses.length === 0) {
      analyses = await collectExpertContentAnalyses(sessionId)
      setExpertContentAnalyses(sessionId, analyses)
    }
    const expertBlock = analyses.length > 0
      ? '\n\nתשובות המומחים:\n' + analyses.map(a => `${a.schoolName}: ${a.analysis}`).join('\n\n')
      : ''

    const userPrompt = `השיחה עם האדם:
---
${conversationSummary}
---${expertBlock}

תפקידך: לבנות **תהליך אימוני לסיוע** לשבוע–שבועיים הקרובים, תוך שילוב כלים מתחומים:
- **אימון (קאוצ'ינג)**: צעדים מעשיים, התחייבויות קטנות, ליווי עצמי.
- **CBT**: זיהוי מחשבות, תיקון עיוותים, ניסויים התנהגותיים קטנים.
- **DBT**: ויסות רגשי, קבלה ורצון, מיומנויות בין-אישיות (במידה רלוונטית).

החזר **JSON בלבד** בפורמט:
{
  "action_plan": [
    {
      "title": "כותרת קצרה לצעד 1",
      "description": "תיאור הצעד בשפה פשוטה; מה לעשות בפועל.",
      "success_criteria": "קריטריון הצלחה מדיד (למשל: 3 פעמים בשבוע)."
    },
    {
      "title": "כותרת לצעד 2",
      "description": "תיאור.",
      "success_criteria": "קריטריון."
    },
    {
      "title": "כותרת לצעד 3",
      "description": "תיאור.",
      "success_criteria": "קריטריון."
    }
  ],
  "resistance_note": "מה מתוך הצעדים כנראה יהיה קשה למשתמש, ולמה? (2–3 משפטים אמפתיים)."
}

חובה: 2–3 צעדים; כל צעד עם success_criteria ברור. resistance_note – השערה כנה ואמפתית.`

    const openai = new OpenAI({ apiKey: getOpenAIApiKey() })
    const model = OPTIMIZATION_CONFIG.useFastModelForChair ? FAST_MODEL : DEEP_MODEL
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'אתה מומחה לאימון וטיפול. תפקידך להחזיר רק JSON תקין, ללא טקסט חופשי לפני או אחרי.'
        },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 900,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('לא התקבלה תגובה מ-OpenAI')
    }

    const data = JSON.parse(content) as {
      action_plan?: Array<{ title: string; description: string; success_criteria: string }>
      resistance_note?: string
    }
    const actionPlan: ActionPlanStep[] = (data.action_plan || []).slice(0, 3).map(s => ({
      title: s.title || '',
      description: s.description || '',
      success_criteria: s.success_criteria || ''
    }))
    const resistanceNote = (data.resistance_note || '').trim()

    return NextResponse.json({
      actionPlan,
      resistanceNote
    })
  } catch (error) {
    console.error('[Training Process API] Error:', error)
    return NextResponse.json(
      { error: 'שגיאה בבניית תהליך האימון' },
      { status: 500 }
    )
  }
}
