import { getAgentById } from './agents'
import { OPENAI_CONFIG, FAST_MODEL, getOpenAIApiKey } from './config'
import OpenAI from 'openai'

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * פונקציה אחידה לקריאת agent עם system_prompt ייחודי
 */
export async function callAgent(
  agentId: string,
  messages: Omit<AgentMessage, 'role'>[] | AgentMessage[],
  options?: {
    model?: string
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

  const fullMessages: AgentMessage[] = [
    { role: 'system', content: agent.systemPrompt },
    ...messages.map(msg => {
      if ('role' in msg && msg.role) {
        return msg as AgentMessage
      }
      return { role: 'user' as const, content: msg.content }
    })
  ]

  const response = options?.responseFormat === 'json_object'
    ? await openai.chat.completions.create({
        model: options?.model ?? FAST_MODEL,
        messages: fullMessages,
        temperature: options?.temperature ?? OPENAI_CONFIG.temperature,
        max_tokens: options?.maxTokens ?? OPENAI_CONFIG.maxTokens,
        response_format: { type: 'json_object' },
      })
    : await openai.chat.completions.create({
        model: options?.model ?? FAST_MODEL,
        messages: fullMessages,
        temperature: options?.temperature ?? OPENAI_CONFIG.temperature,
        max_tokens: options?.maxTokens ?? OPENAI_CONFIG.maxTokens,
      })

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
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ]

  try {
    const response = options?.responseFormat === 'json_object'
      ? await openai.chat.completions.create({
          model: options?.model ?? FAST_MODEL,
          messages,
          temperature: options?.temperature ?? OPENAI_CONFIG.temperature,
          max_tokens: options?.maxTokens ?? OPENAI_CONFIG.maxTokens,
          response_format: { type: 'json_object' },
        })
      : await openai.chat.completions.create({
          model: options?.model ?? FAST_MODEL,
          messages,
          temperature: options?.temperature ?? OPENAI_CONFIG.temperature,
          max_tokens: options?.maxTokens ?? OPENAI_CONFIG.maxTokens,
        })
    return response.choices[0]?.message?.content || null
  } catch (error) {
    console.error('[External Specialist] Error calling external specialist:', error)
    return null
  }
}
