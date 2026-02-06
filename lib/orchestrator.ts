import { getAgents, Agent } from './agents'
import { getRecentMessages, ChatMessage, getPhase, ConversationPhase } from './chat-state'
import { OPENAI_CONFIG, getOpenAIApiKey } from './config'
import OpenAI from 'openai'

export interface ExpertAction {
  expertId: string
  action: 'ask' | 'listen' // 'ask' = שואל שאלה, 'listen' = רק מקשיב
}

export interface OrchestrationResult {
  actions: ExpertAction[]
}

export async function orchestrate(
  sessionId: string,
  userMessage: string,
  phase?: ConversationPhase
): Promise<OrchestrationResult> {
  const agents = getAgents()
  const history = getRecentMessages(sessionId, 15)
  const currentPhase = phase || getPhase(sessionId)
  
  // יצירת תקציר היסטוריה
  const historySummary = history
    .map(msg => `${msg.speaker}: ${msg.content}`)
    .join('\n')
    .slice(-2000) // הגבלה ל-2000 תווים אחרונים
  
  // בניית prompt ל-Orchestrator
  const agentsDescription = agents.map(a => 
    `- ${a.name} (${a.id}): ${a.expertise} - ${a.description}`
  ).join('\n')
  
  const phaseContext = currentPhase === 'exploration' 
    ? 'אנחנו בשלב exploration - עד 3 סיבובים. בחר מומחים שישאלו שאלות ממוקדות.'
    : currentPhase === 'deep_analysis'
    ? 'אנחנו בשלב deep_analysis - כל המומחים צריכים לתת ניתוח מלא. בחר את כל המומחים הרלוונטיים.'
    : 'אנחנו בשלב final_response - לא צריך עוד שאלות.'
  
  const orchestratorPrompt = `אתה Orchestrator של פרלמנט עם מומחים. תפקידך להחליט אילו מומחים צריכים לדבר עכשיו.

שלב השיחה הנוכחי: ${currentPhase}
${phaseContext}

המומחים:
${agentsDescription}

היסטוריית השיחה האחרונה:
${historySummary || 'שיחה חדשה'}

השאלה/הודעה החדשה של המשתמש:
${userMessage}

החלט:
1. אילו מומחים (1-3) צריכים לשאול שאלות עכשיו (action: 'ask')
2. אילו מומחים רק מקשיבים ומעדכנים הבנה (action: 'listen')

החזר JSON עם רשימת actions:
{
  "actions": [
    {"expertId": "psychodynamic-freudian", "action": "ask"},
    {"expertId": "cbt", "action": "listen"},
    ...
  ]
}

חשוב: בחר 1-3 מומחים ל-'ask' לפי הרלוונטיות לשאלה הנוכחית.`

  try {
    const openai = new OpenAI({
      apiKey: getOpenAIApiKey()
    })
    
    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'אתה Orchestrator מקצועי. החזר רק JSON תקני ללא טקסט נוסף.'
        },
        {
          role: 'user',
          content: orchestratorPrompt
        }
      ],
      temperature: OPENAI_CONFIG.temperature,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('לא התקבלה תגובה מ-OpenAI')
    }

    const result = JSON.parse(content) as { actions: ExpertAction[] }
    
    // וידוא שיש לפחות מומחה אחד
    if (!result.actions || result.actions.length === 0) {
      // fallback: בוחר מומחה אחד אקראי
      const randomAgent = agents[Math.floor(Math.random() * agents.length)]
      return {
        actions: [{ expertId: randomAgent.id, action: 'ask' }]
      }
    }

    return result as OrchestrationResult
  } catch (error) {
    console.error('Error in orchestrator:', error)
    // fallback: בוחר מומחה אחד אקראי
    const agents = getAgents()
    const randomAgent = agents[Math.floor(Math.random() * agents.length)]
    return {
      actions: [{ expertId: randomAgent.id, action: 'ask' }]
    }
  }
}
