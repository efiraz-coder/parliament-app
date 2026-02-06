import { NextRequest, NextResponse } from 'next/server'
import { getMessages, addMessage, ChatMessage } from '@/lib/chat-state'
import { OPENAI_CONFIG, getOpenAIApiKey } from '@/lib/config'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'נדרש sessionId' },
        { status: 400 }
      )
    }

    // קבלת כל היסטוריית השיחה
    const history = getMessages(sessionId)

    if (history.length === 0) {
      return NextResponse.json(
        { error: 'אין היסטוריית שיחה' },
        { status: 400 }
      )
    }

    // יצירת תקציר השיחה
    const conversationSummary = history
      .map(msg => {
        const speakerName = msg.speaker === 'user' ? 'משתמש' : msg.speaker
        return `${speakerName}: ${msg.content}`
      })
      .join('\n\n')
      .slice(-4000) // הגבלה ל-4000 תווים אחרונים

    const chairPrompt = `את/ה יו"ר פרלמנט של 8 מומחים. קיבלתם את השיחה הבאה (תמלול מקוצר):

${conversationSummary}

תפקידך:
1. סכם/י בקצרה מה הבין כל מומחה ומה הנקודות המרכזיות שלו
2. ציין/י הסכמות, מחלוקות, ופערים פתוחים
3. שאל/י את המשתמש שאלה אחת או שתיים נוספות שמכוונות לרפלקציה והבהרה, לפני מתן עמדה סופית
4. לאחר השאלות, תן/י המלצה או מסקנה זמנית, ברור שמותר לו/לה גם לא להסכים

סגנון התקשורת שלך:
- שפה נגישה וברורה בעברית
- מקצועי, מאוזן, לא שיפוטי
- מעודד רפלקציה והבהרה

החזר טקסט אחד שכולל: סיכום + שאלות המשך + מסקנה זמנית.`

    const openai = new OpenAI({
      apiKey: getOpenAIApiKey()
    })
    
    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'אתה יו"ר פרלמנט מקצועי ומאוזן. החזר טקסט ברור ונגיש בעברית.'
        },
        {
          role: 'user',
          content: chairPrompt
        }
      ],
      temperature: OPENAI_CONFIG.temperature,
      max_tokens: OPENAI_CONFIG.maxTokens * 2 // יותר tokens לסיכום
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('לא התקבלה תגובה מ-OpenAI')
    }

    const chairMessage: ChatMessage = {
      speaker: 'chair',
      role: 'assistant',
      content: content.trim(),
      timestamp: new Date().toISOString()
    }

    // הוספת הודעת היו"ר להיסטוריה
    addMessage(sessionId, chairMessage)

    return NextResponse.json({
      message: {
        speaker: 'chair',
        content: content.trim(),
        timestamp: chairMessage.timestamp
      }
    })
  } catch (error) {
    console.error('Error in chair API:', error)
    return NextResponse.json(
      { error: 'שגיאה בעיבוד סיכום היו"ר' },
      { status: 500 }
    )
  }
}
