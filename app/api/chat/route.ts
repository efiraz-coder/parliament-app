import { NextRequest, NextResponse } from 'next/server'
import { addMessage, getOrCreateSession, getRecentMessages, ChatMessage, getPhase, setPhase, verifySession, chatStore, setSourceQuestion, getSourceQuestion, markQuestionTypeAsked, clearSession } from '@/lib/chat-state'
import { getAgentById, getAgents } from '@/lib/agents'
import { callAgent } from '@/lib/agent-caller'
import { OPENAI_CONFIG, FAST_MODEL, OPTIMIZATION_CONFIG } from '@/lib/config'
import { QuestionWithOptions, ChatQuestionResponse } from '@/lib/types'
import { getFixedQuestionByOrder } from '@/lib/fixed-questions'
import OpenAI from 'openai'
import { getOpenAIApiKey } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, userMessage, startFresh } = body

    if (!sessionId || !userMessage || typeof sessionId !== 'string' || typeof userMessage !== 'string') {
      console.error('[Chat API] Validation failed:', {
        sessionId: sessionId ? 'present' : 'missing',
        userMessage: userMessage ? 'present' : 'missing',
        sessionIdType: typeof sessionId,
        userMessageType: typeof userMessage
      })
      return NextResponse.json(
        { error: 'נדרשים sessionId ו-userMessage', details: { receivedSessionId: !!sessionId, receivedUserMessage: !!userMessage } },
        { status: 400 }
      )
    }

    let session = getOrCreateSession(sessionId)

    if (startFresh === true) {
      clearSession(sessionId)
      session = getOrCreateSession(sessionId)
    }

    const currentPhase = getPhase(sessionId)
    if (currentPhase === 'final_response') {
      clearSession(sessionId)
      getOrCreateSession(sessionId) // יוצר סשן ריק חדש עם אותו מזהה
    }

    // Initialize phase to exploration if new conversation
    if (currentPhase === undefined || currentPhase === null) {
      setPhase(sessionId, 'exploration')
    }

    // Store user message in conversation history
    const userChatMessage: ChatMessage = {
      speaker: 'user',
      role: 'user',
      content: userMessage.trim(),
      timestamp: new Date().toISOString()
    }
    addMessage(sessionId, userChatMessage)

    const existingSourceQuestion = getSourceQuestion(sessionId)
    if (!existingSourceQuestion) {
      setSourceQuestion(sessionId, userMessage.trim())
    }

    const userMessageCount = getRecentMessages(sessionId, 50).filter(m => m.speaker === 'user').length
    if (userMessageCount === 1) {
      const sourceQuestion = getSourceQuestion(sessionId)
      const question0 = getFixedQuestionByOrder(0, sourceQuestion ?? userMessage.trim())
      return NextResponse.json({
        question: question0
      })
    }

    // OPTIMIZATION: Skip orchestrator - directly select first available agent
    // This saves 1-2 seconds per request
    const agents = getAgents()
    const availableAgentIds = ['psychodynamic-freudian', 'cbt', 'dbt', 'managerial-organizational', 'social-sociological', 'modern-stoic']
    const selectedAgentId = availableAgentIds[0]
    const agent = getAgentById(selectedAgentId)
    const selectedExpert = { expertId: selectedAgentId, action: 'ask' as const }
    
    if (!agent) {
      console.error(`[Chat API] Agent not found for ID: ${selectedExpert.expertId}`)
      return NextResponse.json(
        { error: 'מומחה לא נמצא', expertId: selectedExpert.expertId },
        { status: 400 }
      )
    }

    // קבלת היסטוריה אחרונה
    const history = getRecentMessages(sessionId, 15)
    
    // יצירת תקציר היסטוריה
    const historySummary = history
      .map(msg => `${msg.speaker === 'user' ? 'משתמש' : msg.speaker}: ${msg.content}`)
      .join('\n')
      .slice(-3000) // הגבלה ל-3000 תווים אחרונים

    // שימוש ב-callAgent במקום קריאה ישירה ל-OpenAI
    const userPrompt = `היסטוריית השיחה האחרונה:\n${historySummary}\n\nהשאלה/הודעה החדשה של המשתמש: ${userMessage.trim()}\n\nאנא צור שאלה אחת ממוקדת עם 4 תשובות אפשריות.

===== חשוב מאוד: שפה יומיומית בלבד! =====
המשתמש אינו איש מקצוע!
- אסור שמות אסכולות (CBT, פסיכודינמי וכו') או מונחים מקצועיים.
- אופציות מתארות דפוסים בחיי היומיום (הימנעות, ריצוי, פחד מדחייה, בלגן).
- אופציות בגוף ראשון: "אני מרגיש/ה ש...", "אני נוטה ל...", "בדרך כלל אני...".
- האופציה האחרונה תמיד: "משהו אחר: ____".

===== שאלות העמקה - חובה! =====
לפני שאלות גנריות על "מה את מרגישה", **חובה** לשאול קודם אחת מהשאלות הבאות:

1. **אם יש מילה כללית** ("זוגיות טובה", "להצליח", "יציבות") – שאל קודם:
   "כשאת/ה אומר/ת '[המילה]' – מה הכי חשוב בזה בשבילך?" (שאלה פתוחה)

2. **דפוס ספציפי לנושא** – שאל על התנהגות טיפוסית בנושא עצמו:
   דוגמה לדייטים: "כשדייט לא מתקדם כמו שקיווית, מה את בדרך כלל נוטה לעשות?"
   אופציות:
   - להתרחק ולא ליזום קשר נוסף
   - לנתח מה השתבש ולנסות לתקן בפעם הבאה
   - להמשיך לדייטים אחרים בלי לחשוב יותר מדי
   - משהו אחר: ____

===== מגדר והקשר – שלושה מצבים (חובה!) =====
1. **גבר פונה על עצמו** (אני מתעצל, אשתי) → שאלות בלשון זכר ("מה אתה נוטה לעשות").
2. **אישה פונה על עצמה** (אני מאוכזבת, בעלי) → שאלות בלשון נקבה ("מה את נוטה לעשות").
3. **פונה מתאר גוף שלישי / זוג / קבוצה** (הגבר…, האישה…, איך ליצור הרמוניה ביניהם) → **השאלה הראשונה חייבת להיות בירור:**
   שאל: "כדי שאוכל להתאים את השאלות – את/ה מתאר/ת את עצמך (את/ה בתוך הסיפור – אחד מבני הזוג), או שואל/ת על הזוג/אחרים מבחוץ?"
   אופציות: "אני הגבר/האדם בסיפור", "אני האישה/האדם בסיפור", "אני שואל/ת על זוג או אדם אחר", "משהו אחר: ____"
   **אל תניח** שהפונה היא האישה או הגבר – חכה לתשובה ואז התאם.

החזר JSON בפורמט: {"question": "...", "options": ["...", "...", "...", "משהו אחר: ____"]}`
    
    const content = await callAgent(
      selectedExpert.expertId,
      [{ content: userPrompt }],
      {
        maxTokens: 450, // שאלה + 4 אופציות – קיצור זמן תגובה
        responseFormat: 'json_object'
      }
    )

    // ניסיון לפרסר JSON – אם יש בלוק ```json ... ``` נחלץ אותו
    let rawJson = content.trim()
    const jsonBlock = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonBlock?.[1]) rawJson = jsonBlock[1].trim()

    let questionData: { question?: string; options?: string[] }
    try {
      questionData = JSON.parse(rawJson)
    } catch {
      questionData = {}
    }

    const question = typeof questionData.question === 'string' && questionData.question.trim()
      ? questionData.question.trim()
      : 'מה הכי מתאר את מה שקורה לך במצב הזה?'
    let options = Array.isArray(questionData.options) ? questionData.options.map((o: unknown) => String(o).trim()).filter(Boolean) : []

    // נרמול ל־4 אופציות: חסר – מוסיפים "משהו אחר"; עודף – לוקחים 4 ראשונות
    const otherOption = 'משהו אחר: ____'
    if (!options.some(o => o.includes('משהו אחר'))) options.push(otherOption)
    while (options.length < 4) options.push(otherOption)
    options = options.slice(0, 4)

    // יצירת מזהה ייחודי לשאלה
    const questionId = `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // כלל זהב: שאלת המקור חייבת להיות מוצגת עם כל שאלת המשך
    const sourceQuestion = getSourceQuestion(sessionId)
    
    markQuestionTypeAsked(sessionId, 'pattern')

    const questionWithOptions: QuestionWithOptions = {
      question,
      sourceQuestion: sourceQuestion, // כלל זהב!
      questionType: 'pattern', // שאלה ראשונה היא על דפוס כאן ועכשיו
      agentId: agent.id,
      options,
      questionId
    }

    // Store expert question in conversation history
    const expertMessage: ChatMessage = {
      speaker: agent.name,
      role: 'assistant',
      content: question,
      timestamp: new Date().toISOString()
    }
    addMessage(sessionId, expertMessage)

    const responseData: ChatQuestionResponse = {
      question: questionWithOptions
    }

    return NextResponse.json(responseData)
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('[Chat API] Error:', err.message, err)
    // הודעות ברורות למשתמש לפי סוג השגיאה
    let userMessage = 'שגיאה בעיבוד השיחה. נסה שוב או התחל שיחה חדשה.'
    if (err.message.includes('OPENAI_API_KEY')) {
      userMessage = 'חסר מפתח API. יש להגדיר OPENAI_API_KEY בקובץ .env.local'
    } else if (err.message.includes('תגובה לא תקינה') || err.message.includes('4 תשובות')) {
      userMessage = 'המערכת לא קיבלה תשובה תקינה. נסה שוב.'
    } else if (err.message.includes('rate') || err.message.includes('429')) {
      userMessage = 'יותר מדי בקשות כרגע. המתן רגע ונסה שוב.'
    }
    return NextResponse.json(
      { error: userMessage, details: process.env.NODE_ENV === 'development' ? err.message : undefined },
      { status: 500 }
    )
  }
}
