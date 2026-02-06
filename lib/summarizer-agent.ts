import { callAgent } from './agent-caller'
import { getAgentById } from './agents'
import { OPENAI_CONFIG, getOpenAIApiKey } from './config'
import OpenAI from 'openai'

export interface AgentResponse {
  agentId: string
  agentName: string
  response: string
}

/**
 * Agent מסכם שמקבל תגובות של כל המומחים ויוצר שאלה חדשה + תשובות אפשריות
 */
export async function createSummarizedQuestion(
  agentResponses: AgentResponse[],
  conversationHistory: string,
  userAnswer: string
): Promise<{ question: string; options: string[] }> {
  // בניית סיכום של תגובות המומחים
  const agentsSummary = agentResponses
    .map(ar => {
      const agent = getAgentById(ar.agentId)
      return `${agent?.name || ar.agentName}: ${ar.response}`
    })
    .join('\n\n')

  const openai = new OpenAI({
    apiKey: getOpenAIApiKey()
  })

  const systemPrompt = `אתה agent מסכם בפרלמנט מנטלי. תפקידך:
1. לקרוא את כל התגובות של חברי הפרלמנט על תשובת המשתמש
2. לזהות את הנקודות המרכזיות והמשותפות
3. ליצור שאלה אחת חדשה שמעמיקה את ההבנה, תוך שילוב התובנות מכל המומחים
4. ליצור 4 תשובות אפשריות בשפה מדוברת, לא מקצועית, עמוקה וחומלת

חשוב:
- השאלה צריכה להיות ממוקדת ולא כפולה
- התשובות האפשריות צריכות להיות ניסוחים שהמשתמש יכול להזדהות איתם
- אל תחזור על שאלות שכבר נשאלו
- התייחס למה שהמשתמש סימן וכתב

החזר JSON בפורמט:
{
  "question": "השאלה כאן",
  "options": ["תשובה 1", "תשובה 2", "תשובה 3", "תשובה 4"]
}`

  const response = await openai.chat.completions.create({
    model: OPENAI_CONFIG.model,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `היסטוריית השיחה:\n${conversationHistory}\n\nתשובת המשתמש:\n${userAnswer}\n\nתגובות חברי הפרלמנט:\n${agentsSummary}\n\nצור שאלה אחת חדשה עם 4 תשובות אפשריות.`
      }
    ],
    temperature: OPENAI_CONFIG.temperature,
    max_tokens: OPENAI_CONFIG.maxTokens * 2,
    response_format: { type: 'json_object' }
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from summarizer agent')
  }

  const data = JSON.parse(content) as { question: string; options: string[] }
  
  if (!data.question || !Array.isArray(data.options) || data.options.length !== 4) {
    throw new Error('Invalid response format from summarizer agent')
  }

  return {
    question: data.question.trim(),
    options: data.options.map(opt => opt.trim())
  }
}
