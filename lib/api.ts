/**
 * Shared API helpers: timeout fetch and standard timeouts.
 */

export const API_TIMEOUT = 90000
export const CHAT_ANSWER_TIMEOUT = 60000

export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return res
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('הבקשה לקחה יותר מדי זמן. נסה שוב.')
    }
    throw err
  }
}
