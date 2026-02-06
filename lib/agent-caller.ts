import { getAgentById, Agent } from './agents'
import { OPENAI_CONFIG, FAST_MODEL, getOpenAIApiKey } from './config'
import OpenAI from 'openai'

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * פונקציה אחידה לקריאת agent עם system_prompt ייחודי
 * @param agentId - מזהה ה-agent
 * @param messages - רשימת הודעות (ללא system message - הוא מתווסף אוטומטית)
 * @param options - אפשרויות נוספות (temperature, max_tokens וכו')
 * @returns תשובת ה-agent
 */
export async function callAgent(
  agentId: string,
  messages: Omit<AgentMessage, 'role'>[] | AgentMessage[],
  options?: {
    model?: string // Allow specifying model (defaults to FAST_MODEL for experts)
    temperature?: number
    maxTokens?: number
    responseFormat?: 'json_object' | 'text'
  }
): Promise<string> {
  const agent = getAgentById(agentId)
  
  if (!agent) {
    throw new Error(`Agent with id ${agentId} not found`)
  }

  const openai = new OpenAI({
    apiKey: getOpenAIApiKey()
  })

  // בניית רשימת הודעות עם system prompt ייחודי
  const fullMessages: AgentMessage[] = [
    {
      role: 'system',
      content: agent.systemPrompt
    },
    ...messages.map(msg => {
      // אם ההודעה כבר כוללת role, השתמש בה. אחרת, הוסף role: 'user'
      if ('role' in msg && msg.role) {
        return msg as AgentMessage
      }
      return {
        role: 'user' as const,
        content: msg.content
      }
    })
  ]

  const requestConfig: any = {
    model: options?.model ?? FAST_MODEL, // Default to FAST_MODEL for expert calls
    messages: fullMessages,
    temperature: options?.temperature ?? OPENAI_CONFIG.temperature,
    max_tokens: options?.maxTokens ?? OPENAI_CONFIG.maxTokens
  }

  // הוספת response_format רק אם נדרש
  if (options?.responseFormat === 'json_object') {
    requestConfig.response_format = { type: 'json_object' }
  }

  const response = await openai.chat.completions.create(requestConfig)

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error(`No response from agent ${agentId}`)
  }

  return content
}

/**
 * קריאה למספר agents במקביל
 */
export async function callMultipleAgents(
  agentIds: string[],
  messages: Omit<AgentMessage, 'role'>[] | AgentMessage[],
  options?: {
    temperature?: number
    maxTokens?: number
  }
): Promise<Map<string, string>> {
  const results = await Promise.all(
    agentIds.map(async (agentId) => {
      try {
        const response = await callAgent(agentId, messages, options)
        return { agentId, response, error: null }
      } catch (error) {
        console.error(`Error calling agent ${agentId}:`, error)
        return { 
          agentId, 
          response: null, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    })
  )

  const resultMap = new Map<string, string>()
  for (const result of results) {
    if (result.response) {
      resultMap.set(result.agentId, result.response)
    }
  }

  return resultMap
}

/**
 * Call an external specialist with a custom system prompt
 * Used for temporary domain-specific specialists (ADHD, legal, financial, etc.)
 */
export async function callExternalSpecialist(
  systemPrompt: string,
  userMessage: string,
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
    responseFormat?: 'json_object' | 'text'
  }
): Promise<string | null> {
  const openai = new OpenAI({
    apiKey: getOpenAIApiKey()
  })

  const messages: AgentMessage[] = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: userMessage
    }
  ]

  const requestConfig: any = {
    model: options?.model ?? FAST_MODEL,
    messages,
    temperature: options?.temperature ?? OPENAI_CONFIG.temperature,
    max_tokens: options?.maxTokens ?? OPENAI_CONFIG.maxTokens
  }

  if (options?.responseFormat === 'json_object') {
    requestConfig.response_format = { type: 'json_object' }
  }

  try {
    const response = await openai.chat.completions.create(requestConfig)
    return response.choices[0]?.message?.content || null
  } catch (error) {
    console.error('[External Specialist] Error calling external specialist:', error)
    return null
  }
}
