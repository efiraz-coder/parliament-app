import { NextRequest, NextResponse } from 'next/server'
import { getMessages, addMessage, ChatMessage, getPhase, setPhase, getOrCreateSession, getSession, getSessionHistory, verifySession, listSessions, getSessionCount, chatStore } from '@/lib/chat-state'
import { getAgents, getAgentById } from '@/lib/agents'
import { DEEP_MODEL, DEEP_MODEL_MAX_TOKENS, OPENAI_CONFIG, getOpenAIApiKey } from '@/lib/config'
import OpenAI from 'openai'

interface MemberAnalysis {
  agentId: string
  agentName: string
  interpretation: string // Understanding of the core problem
  insights: string[] // 2-3 key insights
  suggestions: string[] // 1-2 suggestions for directions of change
}

interface DeepAnalysisBody {
  sessionId?: string
}

export async function POST(request: NextRequest) {
  try {
    let body: DeepAnalysisBody
    try {
      body = (await request.json()) as DeepAnalysisBody
    } catch (parseError) {
      console.error('[Deep Analysis] Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body', details: parseError instanceof Error ? parseError.message : 'Unknown error' },
        { status: 400 }
      )
    }

    const { sessionId } = body

    // Improved validation with detailed error messages
    if (!sessionId || (typeof sessionId === 'string' && sessionId.trim() === '')) {
      console.error('[Deep Analysis] Missing or empty sessionId in request body. Body:', JSON.stringify(body))
      return NextResponse.json(
        { 
          error: 'Missing or empty sessionId in request body', 
          receivedBody: Object.keys(body),
          receivedSessionId: sessionId 
        },
        { status: 400 }
      )
    }

    if (typeof sessionId !== 'string') {
      console.error('[Deep Analysis] sessionId is not a string. Type:', typeof sessionId, 'Value:', sessionId)
      return NextResponse.json(
        { error: 'sessionId must be a string', receivedType: typeof sessionId, receivedValue: sessionId },
        { status: 400 }
      )
    }

    // Read full conversation history from shared process-level singleton store
    const allSessionIds = listSessions()
    const sessionVerification = verifySession(sessionId)
    const history = getSessionHistory(sessionId)
    
    console.log('[Deep Analysis] Using chatStore, storeId:', chatStore.storeId, ', sessions:', chatStore.getSessionCount())
    console.log('[Deep Analysis] Reading conversation history from shared store:', {
      sessionId,
      sessionExists: sessionVerification.exists,
      historyLength: history.length,
      sessionMessageCount: sessionVerification.messageCount,
      totalSessionsInStore: getSessionCount(),
      availableSessionIds: allSessionIds,
      storeId: chatStore.storeId,
      messageSpeakers: history.map(m => m.speaker),
      recentMessages: history.slice(-5).map(m => ({ 
        speaker: m.speaker, 
        role: m.role,
        content: m.content.substring(0, 50),
        timestamp: m.timestamp
      }))
    })
    
    if (history.length === 0) {
      console.error('[Deep Analysis] No conversation history found for sessionId:', sessionId)
      console.error('[Deep Analysis] Session verification:', sessionVerification)
      
      // Check if session exists but has no messages
      if (sessionVerification.exists && sessionVerification.messageCount === 0) {
        return NextResponse.json(
          { 
            error: 'Conversation history is empty. Please ensure you have completed at least 3 exploration rounds before requesting deep analysis.',
            sessionId,
            sessionExists: true,
            messageCount: 0
          },
          { status: 400 }
        )
      }
      
      // Session doesn't exist - this means messages weren't saved properly
      return NextResponse.json(
        { 
          error: 'Conversation history not found for this sessionId. The session may have expired or messages were not saved. Please start a new conversation.',
          sessionId,
          sessionExists: sessionVerification.exists,
          troubleshooting: 'Ensure that /api/chat and /api/answer are saving messages with the same sessionId',
          debugInfo: {
            verifiedSessionExists: sessionVerification.exists,
            verifiedMessageCount: sessionVerification.messageCount,
            historyLength: history.length
          }
        },
        { status: 400 }
      )
    }
    
    console.log(`[Deep Analysis] Successfully retrieved ${history.length} messages from conversation store for sessionId: ${sessionId}`)

    // Check and set phase - be lenient since frontend might call this right after round 3
    const currentPhase = getPhase(sessionId)
    console.log('[Deep Analysis] Current phase:', currentPhase, 'SessionId:', sessionId, 'History length:', history.length)
    
    // Set phase to deep_analysis if not already set (frontend might call this before phase is updated)
    if (currentPhase !== 'deep_analysis') {
      console.log('[Deep Analysis] Setting phase to deep_analysis (was:', currentPhase, ')')
      setPhase(sessionId, 'deep_analysis')
    }

    // יצירת תקציר השיחה
    const conversationSummary = history
      .map(msg => {
        const speakerName = msg.speaker === 'user' ? 'משתמש' : msg.speaker
        return `${speakerName}: ${msg.content}`
      })
      .join('\n\n')
      .slice(-4000)

    // קבלת כל המומחים
    const agents = getAgents()
    
    // קריאה לכל המומחים במקביל לקבלת ניתוח עמוק
    const openai = new OpenAI({
      apiKey: getOpenAIApiKey()
    })

    // DEEP ANALYSIS PHASE: Each expert analyzes the full conversation
    const analysisPromises = agents.map(async (agent): Promise<MemberAnalysis> => {
      const prompt = `You are ${agent.name}, a member of a mental parliament. You have received the full conversation with the user.

Your task: Provide a deep analysis of the entire history from your expertise perspective.

Full conversation:
${conversationSummary}

Provide your analysis in three parts:
1. Your understanding of the core problem (source of difficulty) - 2-3 sentences from your perspective.
2. 2-3 key insights about what is really happening.
3. 1-2 suggestions for directions of change - concrete, actionable steps.

Return JSON:
{
  "interpretation": "Your understanding of the core problem...",
  "insights": ["Key insight 1", "Key insight 2", "Key insight 3"],
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}`

      try {
        const response = await openai.chat.completions.create({
          model: DEEP_MODEL, // Use stronger model for deep analysis
          messages: [
            {
              role: 'system',
              content: agent.systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: OPENAI_CONFIG.temperature,
          max_tokens: DEEP_MODEL_MAX_TOKENS, // More tokens for comprehensive deep analysis
          response_format: { type: 'json_object' }
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
          throw new Error('לא התקבלה תגובה')
        }

        const data = JSON.parse(content)
        
        return {
          agentId: agent.id,
          agentName: agent.name,
          interpretation: data.interpretation || '',
          insights: Array.isArray(data.insights) ? data.insights : [],
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : []
        }
      } catch (error) {
        console.error(`Error getting analysis from ${agent.name}:`, error)
        return {
          agentId: agent.id,
          agentName: agent.name,
          interpretation: 'Could not analyze from my expertise perspective.',
          insights: [],
          suggestions: []
        }
      }
    })

    // המתנה לכל הניתוחים
    const allAnalyses = await Promise.all(analysisPromises)

    // Store expert analyses in history (internal)
    for (const analysis of allAnalyses) {
      const analysisMessage: ChatMessage = {
        speaker: analysis.agentName,
        role: 'assistant',
        content: `[Deep Analysis] Interpretation: ${analysis.interpretation}\n\nInsights: ${analysis.insights.join('; ')}\n\nSuggestions: ${analysis.suggestions.join('; ')}`,
        timestamp: new Date().toISOString()
      }
      addMessage(sessionId, analysisMessage)
    }

    // אל תעדכן phase ל-final_response כאן – רק chair-summary יעשה זאת אחרי שהמשתמש מקבל את התשובה הסופית. אחרת אם chair-summary ייכשל/יתעכב המשתמש יראה "השיחה הסתיימה" בלי תשובה.

    return NextResponse.json({
      analyses: allAnalyses
    })
  } catch (error) {
    console.error('[Deep Analysis] Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json(
      { 
        error: 'Error processing deep analysis',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    )
  }
}
