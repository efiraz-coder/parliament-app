import { NextRequest, NextResponse } from 'next/server'
import { getRecentMessages, addMessage, ChatMessage, getContinueRefining } from '@/lib/chat-state'
import { orchestrate } from '@/lib/orchestrator'
import { getAgentById } from '@/lib/agents'
import { OPENAI_CONFIG, getOpenAIApiKey } from '@/lib/config'
import { QuestionWithOptions } from '@/lib/types'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'נדרש sessionId' },
        { status: 400 }
      )
    }

    // קבלת היסטוריה אחרונה
    const history = getRecentMessages(sessionId, 15)
    
    // יצירת תקציר היסטוריה
    const historySummary = history
      .map(msg => `${msg.speaker === 'user' ? 'משתמש' : msg.speaker}: ${msg.content}`)
      .join('\n')
      .slice(-3000)

    // קריאה ל-Orchestrator כדי לקבוע מי מדבר עכשיו
    const orchestration = await orchestrate(sessionId, 'נמשיך לדייק את הבעיה')

    // סינון רק מומחים שמסומנים כ-'ask' - לוקחים רק את הראשון
    const askingExperts = orchestration.actions.filter(action => action.action === 'ask')

    if (askingExperts.length === 0) {
      return NextResponse.json({
        nextQuestion: undefined
      })
    }

    // לוקחים רק את המומחה הראשון
    const selectedExpert = askingExperts[0]
    const agent = getAgentById(selectedExpert.expertId)
    
    if (!agent) {
      return NextResponse.json({
        nextQuestion: undefined
      })
    }

    // קריאה ל-OpenAI עם system-prompt של המומחה
    const openai = new OpenAI({
      apiKey: getOpenAIApiKey()
    })
    
    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: agent.systemPrompt
        },
        {
          role: 'user',
          content: `היסטוריית השיחה האחרונה:\n${historySummary}\n\nהמשתמש בחר להמשיך לדייק את הבעיה. אנא צור שאלה אחת ממוקדת חדשה עם 4 תשובות אפשריות שמעמיקה עוד יותר את ההבנה. החזר JSON בפורמט: {"question": "השאלה כאן", "options": ["תשובה 1", "תשובה 2", "תשובה 3", "תשובה 4"]}`
        }
      ],
      temperature: OPENAI_CONFIG.temperature,
      max_tokens: OPENAI_CONFIG.maxTokens * 2,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({
        nextQuestion: undefined
      })
    }

    let questionData: { question: string; options: string[] }
    try {
      questionData = JSON.parse(content)
    } catch (parseError) {
      return NextResponse.json({
        nextQuestion: undefined
      })
    }

    // וידוא שיש 4 תשובות
    if (!questionData.options || questionData.options.length !== 4) {
      return NextResponse.json({
        nextQuestion: undefined
      })
    }

    // יצירת מזהה ייחודי לשאלה
    const nextQuestionId = `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const nextQuestion: QuestionWithOptions = {
      question: questionData.question.trim(),
      agentId: agent.id,
      options: questionData.options.map((opt: string) => opt.trim()),
      questionId: nextQuestionId
    }

    // הוספת השאלה הבאה להיסטוריה
    const expertMessage: ChatMessage = {
      speaker: agent.name,
      role: 'assistant',
      content: questionData.question.trim(),
      timestamp: new Date().toISOString()
    }
    addMessage(sessionId, expertMessage)

    return NextResponse.json({
      nextQuestion
    })
  } catch (error) {
    console.error('Error in continue-question API:', error)
    return NextResponse.json(
      { error: 'שגיאה בעיבוד השאלה' },
      { status: 500 }
    )
  }
}
