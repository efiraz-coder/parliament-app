/**
 * CENTRAL CONVERSATION HISTORY STORE
 * 
 * This module is the SINGLE SOURCE OF TRUTH for all conversation history.
 * All API routes (/api/chat, /api/answer, /api/deep-analysis) MUST use this store
 * to read and write conversation messages by sessionId.
 * 
 * Storage: In-memory Map<string, ChatSession> (for development)
 * Each session contains: messages[], roundNumber, phase, etc.
 */

export interface ChatMessage {
  speaker: 'user' | string // 'user' או שם המומחה או 'chair'
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: string
}

export type ConversationPhase = 'exploration' | 'deep_analysis' | 'final_response'

export type ExternalDomainType = 
  | 'neurological-attention'
  | 'psychiatric'
  | 'medical'
  | 'legal'
  | 'financial'
  | 'employment-legal'
  | 'diagnostic'
  | 'addiction'

export interface ExternalDomainState {
  detected: boolean
  domain?: ExternalDomainType
  domainDisplayName?: string
  userApproved?: boolean // האם המשתמש אישר הוספת מומחה-חוץ
  specialistAdded?: boolean // האם המומחה-חוץ נוסף לסשן
}

// סוגי שאלות שחייבים להישאל בכל נושא
export type QuestionTypeKey = 'pattern' | 'context' | 'motivation'

export interface QuestionTypeCoverage {
  pattern: boolean    // שאלה על הדפוס כאן-ועכשיו
  context: boolean    // שאלת הקשר: "איפה זה עוד פוגש אותך?"
  motivation: boolean // שאלת מוטיבציה: "למה חשוב לך?"
}

// ניתוחי תוכן אמיתיים מכל מומחה – נשמרים לפני סיכום היו"ר ומשמשים גם לבקשת תהליך אימוני
export interface ExpertContentAnalysis {
  agentId: string
  agentName: string
  schoolName: string
  analysis: string
}

export interface ChatSession {
  sessionId: string
  messages: ChatMessage[]
  createdAt: string
  lastUpdated: string
  roundNumber: number // מונה סיבובים
  continueRefining: boolean // האם המשתמש בחר להמשיך לדייק
  futureGoalAnswered: boolean // האם המשתמש ענה על שאלת היעד לשבוע-שבועיים הקרובים
  phase: ConversationPhase // שלב השיחה: exploration, deep_analysis, final_response
  externalDomain?: ExternalDomainState // מצב תחום חיצוני
  sourceQuestion?: string // שאלת המקור - הבעיה במילים של המשתמש (כלל זהב: חייבת להיות מוצגת תמיד!)
  questionTypeCoverage: QuestionTypeCoverage // מעקב אחר סוגי שאלות שנשאלו (חובה מבנית!)
  expertContentAnalyses?: ExpertContentAnalysis[] // תשובות אמיתיות מכל מומחה תוכן (לפני סיכום היו"ר)
}

// SINGLETON: In-memory conversation store (process-level)
// This Map is the single source of truth for all conversation sessions
// All API routes MUST import and use functions from this module to access this Map
// Uses globalThis to ensure true process-level singleton across Next.js hot reloads
class ConversationStore {
  public readonly storeId: string
  private sessions: Map<string, ChatSession> = new Map()

  constructor() {
    // Generate unique store ID to verify singleton across routes
    this.storeId = `store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    console.log(`[ChatStore] Created ConversationStore instance with ID: ${this.storeId}`)
  }

  getSessions(): Map<string, ChatSession> {
    return this.sessions
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId)
  }

  setSession(sessionId: string, session: ChatSession): void {
    this.sessions.set(sessionId, session)
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  listSessionIds(): string[] {
    return Array.from(this.sessions.keys())
  }

  getSessionCount(): number {
    return this.sessions.size
  }
}

// Process-level singleton using globalThis (survives Next.js hot reloads)
// This ensures all route handlers share the exact same store instance
const globalForChatStore = globalThis as unknown as {
  chatStore?: ConversationStore
}

// Create or reuse the singleton instance from globalThis
export const chatStore = globalForChatStore.chatStore ??= new ConversationStore()

// Log that we're using the shared singleton (only once on first access)
if (process.env.NODE_ENV === 'development') {
  console.log(`[ChatStore] Using shared chatStore singleton, storeId: ${chatStore.storeId}, sessions: ${chatStore.getSessionCount()}`)
}

// For backward compatibility, keep the sessions Map accessible via functions
const sessions = chatStore.getSessions()

export function createSession(sessionId: string): ChatSession {
  const now = new Date().toISOString()
  const session: ChatSession = {
    sessionId,
    messages: [],
    createdAt: now,
    lastUpdated: now,
    roundNumber: 0,
    continueRefining: false,
    futureGoalAnswered: false,
    phase: 'exploration', // מתחיל בשלב exploration
    questionTypeCoverage: {
      pattern: false,
      context: false,
      motivation: false
    }
  }
  chatStore.setSession(sessionId, session)
  return session
}

export function getSession(sessionId: string): ChatSession | undefined {
  return chatStore.getSession(sessionId)
}

// List all session IDs (for debugging)
export function listSessions(): string[] {
  return chatStore.listSessionIds()
}

// Get session count (for debugging)
export function getSessionCount(): number {
  return chatStore.getSessionCount()
}

export function getOrCreateSession(sessionId: string): ChatSession {
  const existing = getSession(sessionId)
  if (existing) {
    return existing
  }
  return createSession(sessionId)
}

export function addMessage(sessionId: string, message: ChatMessage): void {
  const session = getOrCreateSession(sessionId)
  session.messages.push(message)
  session.lastUpdated = new Date().toISOString()
  
  // Logging for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[ChatState] Added message to session ${sessionId}:`, {
      speaker: message.speaker,
      role: message.role,
      contentLength: message.content.length,
      totalMessages: session.messages.length
    })
  }
}

export function getMessages(sessionId: string): ChatMessage[] {
  const session = getSession(sessionId)
  const messages = session?.messages || []
  
  // Logging for debugging (only in development)
  if (process.env.NODE_ENV === 'development' && !session) {
    const availableSessions = listSessions()
    console.warn(`[ChatState] Session not found for sessionId: ${sessionId}`)
    console.warn(`[ChatState] Available sessions (${availableSessions.length}): ${availableSessions.join(', ')}`)
    console.warn(`[ChatState] Store instance ID: ${chatStore.getSessionCount()} sessions`)
  }
  
  return messages
}

// Helper function to get full session history (alias for clarity)
export function getSessionHistory(sessionId: string): ChatMessage[] {
  return getMessages(sessionId)
}

// Helper function to append message (alias for clarity)
export function appendMessage(sessionId: string, message: ChatMessage): void {
  addMessage(sessionId, message)
}

// Helper function to verify session exists and log details
export function verifySession(sessionId: string): { exists: boolean; messageCount: number; session?: ChatSession } {
  const session = getSession(sessionId)
  return {
    exists: !!session,
    messageCount: session?.messages?.length || 0,
    session
  }
}

export function getRecentMessages(sessionId: string, limit: number = 20): ChatMessage[] {
  const messages = getMessages(sessionId)
  return messages.slice(-limit)
}

export function clearSession(sessionId: string): void {
  chatStore.deleteSession(sessionId)
}

export function incrementRound(sessionId: string): number {
  const session = getOrCreateSession(sessionId)
  session.roundNumber++
  session.lastUpdated = new Date().toISOString()
  return session.roundNumber
}

export function getRoundNumber(sessionId: string): number {
  const session = getSession(sessionId)
  return session?.roundNumber || 0
}

export function setContinueRefining(sessionId: string, value: boolean): void {
  const session = getOrCreateSession(sessionId)
  session.continueRefining = value
  session.lastUpdated = new Date().toISOString()
}

export function getContinueRefining(sessionId: string): boolean {
  const session = getSession(sessionId)
  return session?.continueRefining || false
}

// פונקציה לספירת הודעות משתמש משמעותיות
export function countUserMessages(sessionId: string): number {
  const messages = getMessages(sessionId)
  return messages.filter(msg => msg.speaker === 'user' && msg.content.trim().length > 10).length
}

// פונקציה לזיהוי דפוס 'לא יודע' חוזר
export function hasDontKnowPattern(sessionId: string, recentCount: number = 3): boolean {
  const messages = getRecentMessages(sessionId, 20)
  const userMessages = messages.filter(msg => msg.speaker === 'user').slice(-recentCount)
  
  if (userMessages.length < 2) return false
  
  const dontKnowKeywords = [
    'לא יודע', 'אין לי מושג', 'אין לי תשובה', 'לא מבין', 
    'לא בטוח', 'אין לי רעיון', 'לא יכול', 'לא יודעת', 
    'אין לי מושג', 'לא ברור לי', 'לא זוכר', 'לא זוכרת'
  ]
  
  let dontKnowCount = 0
  for (const msg of userMessages) {
    const content = msg.content.toLowerCase()
    const hasKeyword = dontKnowKeywords.some(keyword => content.includes(keyword.toLowerCase()))
    const isEmpty = content.trim().length < 5
    
    if (hasKeyword || isEmpty) {
      dontKnowCount++
    }
  }
  
  // אם 2 מתוך 3 האחרונות או יותר הן 'לא יודע'
  return dontKnowCount >= 2
}

// פונקציה לזיהוי אם השאלה היא על עתיד קרוב (שבוע-שבועיים)
export function isFutureGoalQuestion(question: string): boolean {
  if (!question || typeof question !== 'string') return false
  
  const questionLower = question.toLowerCase()
  
  const futureTimePatterns = [
    'שבוע-שבועיים',
    'שבוע שבועיים',
    'השבוע-שבועיים',
    'השבוע שבועיים',
    'בשבוע-שבועיים',
    'בשבוע שבועיים',
    'השבוע הקרוב',
    'השבועות הקרובים',
    'שבועיים הקרובים'
  ]
  
  const futureGoalPatterns = [
    'רוצה שיקרה',
    'היית רוצה שיקרה',
    'תרצה שיקרה',
    'מה היית רוצה',
    'מה תרצה',
    'מה הדבר',
    'מה היית רוצה שיקרה',
    'מה תרצה שיקרה',
    'מה הדבר שהכי',
    'היית רוצה שיקרה',
    'רוצה שיקרה',
    'ארצה',
    'תרצה',
    'היית רוצה'
  ]
  
  const hasTimeRange = futureTimePatterns.some(pattern => questionLower.includes(pattern)) ||
                       (questionLower.includes('שבוע') && (questionLower.includes('שבועיים') || questionLower.includes('הקרוב')))
  
  const hasFutureGoal = futureGoalPatterns.some(pattern => questionLower.includes(pattern)) ||
                       (questionLower.includes('רוצה') && questionLower.includes('שיקרה'))
  
  return hasTimeRange && hasFutureGoal
}

// פונקציה לסמן שהמשתמש ענה על שאלת היעד
export function setFutureGoalAnswered(sessionId: string, value: boolean): void {
  const session = getOrCreateSession(sessionId)
  session.futureGoalAnswered = value
  session.lastUpdated = new Date().toISOString()
}

// פונקציה לבדיקה אם המשתמש ענה על שאלת היעד
export function getFutureGoalAnswered(sessionId: string): boolean {
  const session = getSession(sessionId)
  return session?.futureGoalAnswered || false
}

// פונקציות לניהול phase
export function getPhase(sessionId: string): ConversationPhase {
  const session = getSession(sessionId)
  return session?.phase || 'exploration'
}

export function setPhase(sessionId: string, phase: ConversationPhase): void {
  const session = getOrCreateSession(sessionId)
  session.phase = phase
  session.lastUpdated = new Date().toISOString()
}

// ========================================
// External Domain State Management
// ========================================

export function getExternalDomainState(sessionId: string): ExternalDomainState | undefined {
  const session = getSession(sessionId)
  return session?.externalDomain
}

export function setExternalDomainDetected(
  sessionId: string, 
  domain: ExternalDomainType, 
  domainDisplayName: string
): void {
  const session = getOrCreateSession(sessionId)
  session.externalDomain = {
    detected: true,
    domain,
    domainDisplayName,
    userApproved: undefined,
    specialistAdded: false
  }
  session.lastUpdated = new Date().toISOString()
}

export function setExternalDomainUserApproval(sessionId: string, approved: boolean): void {
  const session = getOrCreateSession(sessionId)
  if (session.externalDomain) {
    session.externalDomain.userApproved = approved
    if (approved) {
      session.externalDomain.specialistAdded = true
    }
  }
  session.lastUpdated = new Date().toISOString()
}

export function isExternalSpecialistActive(sessionId: string): boolean {
  const session = getSession(sessionId)
  return session?.externalDomain?.specialistAdded === true
}

export function getActiveExternalDomain(sessionId: string): ExternalDomainType | undefined {
  const session = getSession(sessionId)
  if (session?.externalDomain?.specialistAdded) {
    return session.externalDomain.domain
  }
  return undefined
}

export function clearExternalDomain(sessionId: string): void {
  const session = getSession(sessionId)
  if (session) {
    session.externalDomain = undefined
    session.lastUpdated = new Date().toISOString()
  }
}

// ========================================
// Source Question Management (כלל זהב)
// ========================================

/**
 * Set the source question for a session.
 * The source question is the user's original problem in their own words.
 * GOLDEN RULE: This must be displayed on screen with every follow-up question!
 */
export function setSourceQuestion(sessionId: string, sourceQuestion: string): void {
  const session = getOrCreateSession(sessionId)
  session.sourceQuestion = sourceQuestion
  session.lastUpdated = new Date().toISOString()
  console.log(`[ChatState] Set source question for ${sessionId}: "${sourceQuestion}"`)
}

/**
 * Get the source question for a session.
 * Returns undefined if no source question has been set.
 */
export function getSourceQuestion(sessionId: string): string | undefined {
  const session = getSession(sessionId)
  return session?.sourceQuestion
}

/**
 * Clear the source question (when starting a new topic).
 */
export function clearSourceQuestion(sessionId: string): void {
  const session = getSession(sessionId)
  if (session) {
    session.sourceQuestion = undefined
    session.lastUpdated = new Date().toISOString()
  }
}

/**
 * Store expert content analyses (real answers from each expert in their domain).
 * Used by chair-summary and by training-process API.
 */
export function setExpertContentAnalyses(sessionId: string, analyses: ExpertContentAnalysis[]): void {
  const session = getOrCreateSession(sessionId)
  session.expertContentAnalyses = analyses
  session.lastUpdated = new Date().toISOString()
}

export function getExpertContentAnalyses(sessionId: string): ExpertContentAnalysis[] | undefined {
  const session = getSession(sessionId)
  return session?.expertContentAnalyses
}

// ========================================
// Question Type Coverage Management (חובה מבנית!)
// ========================================

/**
 * Mark a question type as asked.
 * All three types MUST be asked for each topic.
 */
export function markQuestionTypeAsked(sessionId: string, questionType: QuestionTypeKey): void {
  const session = getOrCreateSession(sessionId)
  if (!session.questionTypeCoverage) {
    session.questionTypeCoverage = { pattern: false, context: false, motivation: false }
  }
  session.questionTypeCoverage[questionType] = true
  session.lastUpdated = new Date().toISOString()
  console.log(`[ChatState] Marked question type '${questionType}' as asked for ${sessionId}`)
}

/**
 * Get current question type coverage for a session.
 */
export function getQuestionTypeCoverage(sessionId: string): QuestionTypeCoverage {
  const session = getSession(sessionId)
  return session?.questionTypeCoverage || { pattern: false, context: false, motivation: false }
}

/**
 * Get which question types are still missing (not yet asked).
 */
export function getMissingQuestionTypes(sessionId: string): QuestionTypeKey[] {
  const coverage = getQuestionTypeCoverage(sessionId)
  const missing: QuestionTypeKey[] = []
  if (!coverage.pattern) missing.push('pattern')
  if (!coverage.context) missing.push('context')
  if (!coverage.motivation) missing.push('motivation')
  return missing
}

/**
 * Check if all required question types have been asked.
 */
export function areAllQuestionTypesAsked(sessionId: string): boolean {
  const coverage = getQuestionTypeCoverage(sessionId)
  return coverage.pattern && coverage.context && coverage.motivation
}

/**
 * Reset question type coverage (when starting a new topic).
 */
export function resetQuestionTypeCoverage(sessionId: string): void {
  const session = getSession(sessionId)
  if (session) {
    session.questionTypeCoverage = { pattern: false, context: false, motivation: false }
    session.lastUpdated = new Date().toISOString()
  }
}
