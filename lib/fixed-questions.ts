/**
 * מבנה השאלות הקבוע: שאלה ראשונה (עצמך/אחר + מגדר) עם אפשרויות, ואז 3 שאלות פתוחות.
 */

import type { QuestionWithOptions } from './types'

/** שאלה 0: אתה שואל על עצמך או על אחר? גבר או אישה? – עם אפשרויות */
export const FIXED_Q0_QUESTION = 'אתה שואל על עצמך או על אחר? האם אתה גבר או אישה?'
export const FIXED_Q0_OPTIONS = [
  'אני גבר, שואל על עצמי',
  'אני אישה, שואלת על עצמי',
  'אני שואל/ת על זוג או אדם אחר (גבר)',
  'אני שואל/ת על זוג או אדם אחר (אישה)',
  'משהו אחר: ____'
] as const

export const FIXED_QUESTIONS = [
  {
    id: 'fixed-q0',
    question: FIXED_Q0_QUESTION,
    order: 0
  },
  {
    id: 'fixed-q1',
    question: 'מדוע בעיה זו מטרידה אותך?',
    order: 1
  },
  {
    id: 'fixed-q2',
    question: 'מה אתה מקווה להשיג?',
    order: 2
  },
  {
    id: 'fixed-q3',
    question: 'האם תוכל לספר עוד על המעורבים באירוע, ופרטים נוספים הרלוונטיים לניתוח האירוע?',
    order: 3
  }
] as const

export const FIXED_QUESTION_IDS = FIXED_QUESTIONS.map(q => q.id) as readonly string[]
export type FixedQuestionId = typeof FIXED_QUESTION_IDS[number]

export function isFixedQuestionId(questionId: string): questionId is FixedQuestionId {
  return FIXED_QUESTION_IDS.includes(questionId)
}

export type FixedQuestionOrder = 0 | 1 | 2 | 3

export function getFixedQuestionByOrder(
  order: FixedQuestionOrder,
  sourceQuestion?: string
): QuestionWithOptions {
  if (order === 0) {
    return {
      question: FIXED_Q0_QUESTION,
      sourceQuestion,
      questionId: 'fixed-q0',
      agentId: 'fixed',
      options: [...FIXED_Q0_OPTIONS]
    }
  }
  const item = FIXED_QUESTIONS.find(q => q.order === order)
  if (!item) throw new Error(`No fixed question for order ${order}`)
  return {
    question: item.question,
    sourceQuestion,
    questionId: item.id,
    agentId: 'fixed',
    options: [] // תשובה פתוחה בלבד
  }
}

export function getFixedQuestionById(
  questionId: FixedQuestionId,
  sourceQuestion?: string
): QuestionWithOptions {
  if (questionId === 'fixed-q0') {
    return getFixedQuestionByOrder(0, sourceQuestion)
  }
  const item = FIXED_QUESTIONS.find(q => q.id === questionId)
  if (!item) throw new Error(`Unknown fixed question: ${questionId}`)
  return {
    question: item.question,
    sourceQuestion,
    questionId: item.id,
    agentId: 'fixed',
    options: item.id === 'fixed-q0' ? [...FIXED_Q0_OPTIONS] : []
  }
}

/** מחזיר את סדר השאלה הבאה (0→1, 1→2, 2→3). אחרי 3 אין שאלה הבאה. */
export function getNextFixedQuestionOrder(
  currentQuestionId: string
): FixedQuestionOrder | null {
  const idx = FIXED_QUESTIONS.findIndex(q => q.id === currentQuestionId)
  if (idx < 0) return null
  const next = FIXED_QUESTIONS[idx + 1]
  return next ? (next.order as FixedQuestionOrder) : null
}
