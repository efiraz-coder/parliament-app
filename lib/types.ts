export interface Question {
  question: string
  agentId: string // מזהה פנימי - לא מוצג למשתמש
  options: string[] // 4 אפשרויות תשובה
}

export interface AskResponse {
  originalQuestion: string
  questions: Question[] // מערך של 4 שאלות
}

export interface AskRequest {
  question: string
}

export interface QuestionAnswer {
  agentId: string
  question: string
  options: string[]
  selectedOptions: number[] // אינדקסים של האפשרויות שנבחרו
  freeText: string
}

export interface AnswersRequest {
  originalQuestion: string
  answers: QuestionAnswer[]
}

export interface AgentAnalysis {
  agentId: string
  analysis: string // 2-3 פסקאות
}

export interface AnswersResponse {
  originalQuestion: string
  agentAnalyses: AgentAnalysis[]
  summary: string // סיכום של יו"ר הפרלמנט
}

// Types for question types (context, motivation, pattern)
export type QuestionType = 'pattern' | 'context' | 'motivation'

// Types עבור שאלה אחת עם תשובות אפשריות
export interface QuestionWithOptions {
  question: string
  sourceQuestion?: string // שאלת המקור - הבעיה במילים של המשתמש (חייבת להיות מוצגת תמיד!)
  questionType?: QuestionType // סוג השאלה: דפוס, הקשר, מוטיבציה
  agentId: string // מזהה פנימי - לא מוצג למשתמש
  options: string[] // 4 תשובות אפשריות
  questionId: string // מזהה ייחודי לשאלה
}

export interface ChatQuestionResponse {
  question: QuestionWithOptions
}

export interface AnswerRequest {
  sessionId: string
  questionId: string
  question: string
  options: string[]
  selectedOptions: number[] // אינדקסים של האפשרויות שנבחרו
  freeText: string
  // Special action for external domain handling
  action?: 'ADD_EXTERNAL_SPECIALIST' | 'CONTINUE_WITHOUT_EXTERNAL'
  externalDomain?: string
}

export interface ExpertProposal {
  agentId: string
  agentName: string
  schoolName: string
  position: string // 2–4 sentences: expert's view from their school's angle
  proposedQuestion: string
  answerOptions: string[] // 3–4 options for that question
}

export interface ExternalDomainQuestion {
  detected: boolean
  domain?: string
  domainDisplayName?: string
  clarificationQuestion?: string
  options?: Array<{ id: string; label: string }>
}

export type AnswerResponseMode = 
  | 'NEXT_QUESTION'
  | 'EXTERNAL_DOMAIN_DETECTED' 
  | 'REQUIRES_FINAL_ANSWER' 
  | 'REQUIRES_DEEP_ANALYSIS'
  | 'SHOW_CHOICE'
  | 'ERROR'

export interface AnswerResponse {
  mode?: AnswerResponseMode // Clear mode indicator
  nextQuestion?: QuestionWithOptions
  showChoice?: boolean
  roundNumber?: number
  requiresFinalAnswer?: boolean
  requiresDeepAnalysis?: boolean
  expertProposals?: ExpertProposal[]
  externalDomainQuestion?: ExternalDomainQuestion // שאלת הבהרה על תחום חיצוני
  error?: string
}

export interface ChoiceRequest {
  sessionId: string
  choice: 'opinion' | 'continue' // 'opinion' = חוות דעת, 'continue' = נמשיך לדייק
}

// צעד בתכנית הפעולה (פורמט חדש)
export interface ActionPlanStep {
  title: string
  description: string
  success_criteria: string
}

// תגובת היו"ר בפורמט JSON החדש
export interface ChairSummaryNewFormat {
  original_question: string
  pattern_name: string
  user_friendly_explanation: string
  action_plan: ActionPlanStep[]
  resistance_note?: string
  closing?: string
  medical_note?: string
  external_domain_note?: string | null
  offer_expert_view: string
  expert_voices?: string[]
}

export interface ChairSummaryResponse {
  mode: 'INSUFFICIENT_HISTORY' | 'USER_UNSURE' | 'FULL_SUMMARY'
  chairMessage?: string
  summary?: {
    // פורמט ישן (לתאימות לאחור)
    mechanism?: string
    expertVoices?: string[] // 3–5 bullets by school name (e.g. "פסיכודינמי: …")
    chairLeaningToward?: string // לאיזו עמדה היו"ר נוטה יותר ולמה
    understanding?: string
    steps: string[]
    resistance?: string // מה מתוך הצעדים המשתמש כנראה לא ירצה לעשות ולמה
    closing?: string
    externalDomainNote?: string // המלצה לפנייה למומחה חיצוני (קשב, משפטי, פיננסי וכו')
    // פורמט חדש (JSON מובנה)
    originalQuestion?: string // שאלת המקור
    patternName?: string // שם הדפוס בשפה יומיומית
    userFriendlyExplanation?: string // הסבר למשתמש
    actionPlan?: ActionPlanStep[] // תכנית פעולה מובנית
    resistanceNote?: string // התנגדות צפויה
    medicalNote?: string // המלצה רפואית
    offerExpertView?: string // הצעה לראות ניתוח מומחים
    // תובנה ממקורות יהודיים (במקום שורת סיכום גנרית)
    jewishQuote?: string // משפט או תובנה מהמקורות
    jewishSource?: string // שם המקור (ספר, מסכת)
    jewishExplanation?: string // הסבר מודרני קצר
    offerTrainingQuestion?: string // שאלה: האם תרצה בתהליך אימוני – מוצג אחרי התובנות; רק אם המשתמש אומר כן מוצגים actionPlan + resistanceNote
  }
}
