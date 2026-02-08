import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  }

  // Check 1: Is OPENAI_API_KEY set?
  const apiKey = process.env.OPENAI_API_KEY
  diagnostics.apiKeyExists = !!apiKey
  diagnostics.apiKeyLength = apiKey?.length ?? 0
  diagnostics.apiKeyPrefix = apiKey?.slice(0, 10) ?? 'MISSING'

  // Check 2: Try a simple OpenAI call
  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey })
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'say OK' }],
        max_tokens: 5,
      })
      diagnostics.openaiStatus = 'OK'
      diagnostics.openaiResponse = response.choices[0]?.message?.content
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      diagnostics.openaiStatus = 'ERROR'
      diagnostics.openaiError = error.message
      diagnostics.openaiErrorName = error.name
    }
  }

  return NextResponse.json(diagnostics)
}
