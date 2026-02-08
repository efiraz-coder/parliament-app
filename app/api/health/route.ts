import { NextResponse } from 'next/server'

export const maxDuration = 30

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
  }

  const apiKey = process.env.OPENAI_API_KEY
  diagnostics.apiKeyExists = !!apiKey
  diagnostics.apiKeyLength = apiKey?.length ?? 0
  diagnostics.apiKeyPrefix = apiKey?.slice(0, 10) ?? 'MISSING'

  if (apiKey) {
    // Test 1: Direct fetch to OpenAI (bypass SDK)
    try {
      const startTime = Date.now()
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'say OK' }],
          max_tokens: 5,
        }),
      })
      const elapsed = Date.now() - startTime
      diagnostics.fetchElapsedMs = elapsed
      diagnostics.fetchStatus = res.status

      if (res.ok) {
        const data = await res.json()
        diagnostics.openaiStatus = 'OK'
        diagnostics.openaiResponse = data.choices?.[0]?.message?.content
      } else {
        const errorText = await res.text()
        diagnostics.openaiStatus = 'HTTP_ERROR'
        diagnostics.openaiHttpStatus = res.status
        diagnostics.openaiErrorBody = errorText.slice(0, 500)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      diagnostics.openaiStatus = 'FETCH_ERROR'
      diagnostics.openaiError = error.message
      diagnostics.openaiErrorName = error.name
      diagnostics.openaiStack = error.stack?.slice(0, 300)
    }
  }

  return NextResponse.json(diagnostics)
}
