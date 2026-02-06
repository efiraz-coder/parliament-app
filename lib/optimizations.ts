/**
 * Parliament App - Performance Optimizations
 * 
 * This file contains optimized versions of key functions to reduce latency.
 * 
 * OPTIMIZATION STRATEGIES:
 * 1. Skip Orchestrator - we call all 5 agents anyway
 * 2. Early synthesis - start synthesizing when 3/5 agents respond
 * 3. Streaming - return partial results as they come
 * 4. Shorter prompts - for intermediate steps
 * 5. Caching - common patterns and questions
 */

import { getAgents, getSchoolName } from './agents'
import { callAgent } from './agent-caller'
import { FAST_MODEL, FAST_MODEL_MAX_TOKENS, getOpenAIApiKey } from './config'
import type { ExpertProposal, QuestionType } from './types'
import { SYSTEM_PROMPT_SHORT } from './system-prompt'
import OpenAI from 'openai'

// ============================================
// OPTIMIZATION 1: Skip Orchestrator
// ============================================
// The Orchestrator adds ~1-2 seconds just to decide which agents speak.
// Since we call all 5 agents in parallel anyway, we can skip it entirely.

// ============================================
// OPTIMIZATION 2: Early Synthesis (Race Pattern)
// ============================================
// Don't wait for all 5 agents - start synthesizing when 3 agents respond

export async function collectProposalsWithEarlySynthesis(
  lastQuestion: string,
  userAnswer: string,
  conversationSummary: string,
  onPartialResult?: (proposals: ExpertProposal[]) => void
): Promise<ExpertProposal[]> {
  const allAgents = getAgents()
  const activeAgentIds = ['psychodynamic-freudian', 'cbt', 'dbt', 'managerial-organizational', 'social-sociological', 'modern-stoic']
  const agents = allAgents.filter(agent => activeAgentIds.includes(agent.id))

  // Shorter prompt for speed
  const shortPrompt = `תשובת המשתמש: "${userAnswer}"
תקציר: ${conversationSummary.slice(0, 500)}

כתוב JSON:
{
  "position": "2-3 משפטים על מה קורה (מותר מונחים)",
  "proposedQuestion": "כש[X], מה קורה לך?",
  "answerOptions": ["אני...", "אני...", "אני...", "משהו אחר: ____"]
}`

  const proposals: ExpertProposal[] = []
  const MIN_PROPOSALS = 3 // Start synthesizing after 3 responses

  const proposalPromises = agents.map(async (agent) => {
    try {
      const response = await callAgent(
        agent.id,
        [{ content: shortPrompt }],
        {
          model: FAST_MODEL,
          maxTokens: 200, // Reduced from 400
          responseFormat: 'json_object'
        }
      )

      if (response) {
        const data = JSON.parse(response)
        const proposal: ExpertProposal = {
          agentId: agent.id,
          agentName: agent.displayName || agent.name,
          schoolName: getSchoolName(agent.id),
          position: data.position || '',
          proposedQuestion: data.proposedQuestion || '',
          answerOptions: data.answerOptions || []
        }

        proposals.push(proposal)

        // Notify when we have enough proposals
        if (proposals.length >= MIN_PROPOSALS && onPartialResult) {
          onPartialResult(proposals)
        }

        return proposal
      }
    } catch (error) {
      console.error(`Error from agent ${agent.id}:`, error)
    }
    return null
  })

  await Promise.all(proposalPromises)
  return proposals.filter(p => p !== null) as ExpertProposal[]
}

// ============================================
// OPTIMIZATION 3: Combined Synthesis (Single Call)
// ============================================
// Combine expert proposals + question synthesis in ONE API call
// This saves one full API round-trip (~1-2 seconds)

export async function collectAndSynthesizeInOne(
  lastQuestion: string,
  userAnswer: string,
  conversationSummary: string,
  missingQuestionTypes: QuestionType[] = []
): Promise<{
  proposals: ExpertProposal[]
  question: string
  options: string[]
  questionType: QuestionType
}> {
  const openai = new OpenAI({ apiKey: getOpenAIApiKey() })

  // Check if user already said they're asking ABOUT others (couple/person) – not about themselves
  const summaryAndAnswer = `${conversationSummary}\n${userAnswer}`
  const isAskingAboutOthers =
    summaryAndAnswer.includes('על זוג או אדם אחר') ||
    summaryAndAnswer.includes('אני שואל על זוג') ||
    summaryAndAnswer.includes('אני שואלת על זוג') ||
    summaryAndAnswer.includes('שואל/ת על זוג') ||
    summaryAndAnswer.includes('על זוג אחר') ||
    summaryAndAnswer.includes('שואל על אחרים')

  // IMPORTANT: Force the next question type based on what's missing
  // Priority: context > motivation > pattern (exploration order)
  let forcedQuestionType: QuestionType = 'pattern'
  let questionTypeInstruction = `
**שאלת דפוס עם העמקה:**
לפני שאלות גנריות על "מה את מרגישה", שאל קודם:
1. **דיוק מושג**: אם יש מילה כללית ("זוגיות טובה", "להצליח") – שאל "כשאת/ה אומר/ת [X] – מה הכי חשוב בזה בשבילך?"
2. **דפוס ספציפי לנושא**: שאל על התנהגות טיפוסית בנושא עצמו.

דוגמה לדייטים:
- "כשאת אומרת 'זוגיות טובה' – מה הכי חשוב שיהיה בה?"
- "כשדייט לא מתקדם, מה את נוטה לעשות?" (עם 3-4 אופציות ספציפיות לדייטים)`
  
  if (missingQuestionTypes.length > 0) {
    // Pick the first missing type (they're already in priority order)
    if (missingQuestionTypes.includes('context')) {
      forcedQuestionType = 'context'
      if (isAskingAboutOthers) {
        questionTypeInstruction = `
**חובה: סוג השאלה הבא "context" – והפונה כבר אמר/ה שהוא/היא שואל/ת על זוג או אדם אחר!**
**אל תשאל "איפה הדפוס פוגש אותך" – הפונה לא מדבר/ת על עצמו/ה.**

שאל במקום:
- "איפה את/ה רואה את הדפוס הזה אצל הזוג / אצל האדם שאת/ה מתאר/ת?" או
- "אילו מצבים אצל הזוג/אצל האחר זה בא לידי ביטוי?"
אופציות לדוגמה: "רואה את זה ביניהם בתקשורת", "במצבי לחץ", "סביב הילדים", "משהו אחר: ____" – כולן מתייחסות ל**הזוג/האחר**, לא ל"אותך".`
      } else {
        questionTypeInstruction = `
**חובה: סוג השאלה הבא חייב להיות "context" (שאלת הקשר)!**
שאל: "איפה הדפוס הזה עוד פוגש אותך בחיים?" או "יש עוד מצבים דומים?"
האופציות צריכות להציע תחומי חיים שונים: עבודה, זוגיות, משפחה, כסף, חברים.

**חשוב:** אם המשתמש/ת כבר אמר/ה שהנושא רלוונטי רק לתחום אחד (למשל "הכל טוב חוץ מדייטים"), אל תשאל שוב על תחומים אחרים. במקום זאת, שאל שאלת העמקה על הנושא עצמו.`
      }
    } else if (missingQuestionTypes.includes('motivation')) {
      forcedQuestionType = 'motivation'
      if (isAskingAboutOthers) {
        questionTypeInstruction = `
**חובה: סוג השאלה הבא "motivation" – והפונה כבר אמר/ה שהוא/היא שואל/ת על זוג או אדם אחר!**
**אל תשאל "מה גורם לך לרצות לטפל" כאילו הפונה מדבר/ת על עצמו/ה.**

שאל במקום:
- "מה היית/היית רוצה שישתנה – מהצד שלך או אצל הזוג/אצל האדם?" או
- "איזה סוג עזרה את/ה מחפש/ת – כלים בשבילך (איך לתמוך) או בשביל הזוג/האחר?"
אופציות לדוגמה: "אני מחפש/ת כלים איך לתמוך בהם", "אני רוצה להבין איך ליצור הרמוניה", "אני רוצה להפנות אותם לעזרה", "משהו אחר: ____" – כולן מתאימות למי ששואל **על** אחרים.`
      } else {
        questionTypeInstruction = `
**חובה: סוג השאלה הבא חייב להיות "motivation" (שאלת מוטיבציה)!**
שאל: "מה גורם לך לרצות לטפל בזה עכשיו?" או "אם זה ישתנה, מה יהיה אחרת?"

**חשוב מאוד - האופציות חייבות להתאים למה שהמשתמש/ת אמר/ה!**
- קרא בעיון את התקציר והתשובות הקודמות.
- אם המשתמש/ת אמר/ה שהכל טוב חוץ מנושא אחד (למשל "הכל טוב חוץ מדייטים") – אל תציע אופציות על עבודה/לימודים/כסף.
- התמקד רק בנושא שהמשתמש/ת העלה/תה.
- דוגמה: אם הנושא הוא דייטים וזוגיות, האופציות צריכות להיות: "אני רוצה בן/בת זוג", "אני מרגישה בודדות", "אני רוצה לבנות משפחה", "משהו אחר".`
      }
    }
  }

  const prompt = `אתה מומחה שמייצג 5 נקודות מבט (פסיכודינמי, CBT, ניהולי, סוציולוגי, סטואי).

תשובת המשתמש: "${userAnswer}"
תקציר: ${conversationSummary.slice(0, 800)}

${questionTypeInstruction}

תפקידך:
1. לייצר 5 עמדות קצרות (אחת לכל נקודת מבט)
2. לייצר שאלה אחת משולבת עם 4 אופציות מסוג "${forcedQuestionType}"

**חשוב מאוד - מניעת כפילות:**
- אל תיצור שאלה שחוזרת על שאלת המקור או על שאלות קודמות.
- כל שאלה חייבת להיות חדשה ומקדמת את השיחה.

${SYSTEM_PROMPT_SHORT}

החזר JSON:
{
  "positions": {
    "psychodynamic": "משפט אחד",
    "cbt": "משפט אחד",
    "dbt": "משפט אחד",
    "managerial": "משפט אחד",
    "sociological": "משפט אחד",
    "stoic": "משפט אחד"
  },
  "questionType": "${forcedQuestionType}",
  "question": "השאלה (סוג: ${forcedQuestionType})",
  "options": ["אני...", "אני...", "אני...", "משהו אחר: ____"]
}`

  const response = await openai.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: 'system', content: 'אתה יועץ רגשי שמייצג מספר נקודות מבט. החזר רק JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 500,
    response_format: { type: 'json_object' }
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No response')

  const data = JSON.parse(content)

  // Convert positions to ExpertProposal format
  const positionMap: Record<string, { id: string; name: string; school: string }> = {
    psychodynamic: { id: 'psychodynamic-freudian', name: 'הפסיכודינמי', school: 'פסיכודינמי' },
    cbt: { id: 'cbt', name: 'ה-CBT', school: 'CBT' },
    dbt: { id: 'dbt', name: 'ה-DBT', school: 'DBT' },
    managerial: { id: 'managerial-organizational', name: 'הניהולי', school: 'ניהול ארגוני' },
    sociological: { id: 'social-sociological', name: 'הסוציולוגי', school: 'סוציולוגי' },
    stoic: { id: 'modern-stoic', name: 'הסטואי', school: 'סטואי מודרני' }
  }

  const proposals: ExpertProposal[] = Object.entries(data.positions || {}).map(([key, position]) => {
    const info = positionMap[key] || { id: key, name: key, school: key }
    return {
      agentId: info.id,
      agentName: info.name,
      schoolName: info.school,
      position: position as string,
      proposedQuestion: data.question,
      answerOptions: data.options
    }
  })

  // CRITICAL: Use the forced question type, not what the LLM returned
  // This ensures we always progress through pattern -> context -> motivation
  return {
    proposals,
    question: data.question,
    options: data.options,
    questionType: forcedQuestionType // Use the forced type, not data.questionType!
  }
}

// ============================================
// OPTIMIZATION 4: Cached Question Templates
// ============================================
// Pre-built question templates for common patterns

export const CACHED_QUESTION_TEMPLATES = {
  pattern: {
    procrastination: {
      question: 'כשאתה דוחה משהו שצריך לעשות, מה הכי מתאר את מה שקורה לך?',
      options: [
        'אני אומר לעצמי שאעשה את זה בפעם אחרת',
        'אני חושב על כמה זה יהיה קשה ולא מתחיל',
        'אני נסחף לדברים אחרים ושוכח',
        'אני מרגיש עייף ולא רואה טעם',
        'משהו אחר: ____'
      ]
    },
    avoidance: {
      question: 'כשאתה נמנע ממשהו, מה בדרך כלל קורה?',
      options: [
        'אני מרגיש הקלה רגעית אבל אז אשמה',
        'אני עוסק בדברים אחרים כדי לא לחשוב על זה',
        'אני מחכה שזה יעבור מעצמו',
        'אני מרגיש שאין לי כוח להתמודד',
        'משהו אחר: ____'
      ]
    }
  },
  context: {
    general: {
      question: 'איפה הדפוס הזה עוד פוגש אותך בחיים?',
      options: [
        'בעבודה/לימודים – גם שם אני נתקל בזה',
        'בזוגיות/משפחה – זה קורה גם ביחסים',
        'עם כסף/ניהול – גם שם יש משהו דומה',
        'עם חברים – גם בחברות זה עולה',
        'משהו אחר: ____'
      ]
    }
  },
  motivation: {
    general: {
      question: 'מה גורם לך לרצות לטפל בזה דווקא עכשיו?',
      options: [
        'זה מתחיל להשפיע על היחסים שלי',
        'אני מרגיש שזה פוגע בי בעבודה/לימודים',
        'אני פשוט עייף מזה ורוצה שינוי',
        'משהו ספציפי קרה לאחרונה שהעלה את זה',
        'משהו אחר: ____'
      ]
    }
  }
}

// ============================================
// OPTIMIZATION 5: Streaming Response Builder
// ============================================
// Build response progressively and stream to client

export interface StreamingState {
  status: 'collecting' | 'synthesizing' | 'complete'
  proposals: ExpertProposal[]
  question?: string
  options?: string[]
}

export function createStreamingUpdater(
  onUpdate: (state: StreamingState) => void
) {
  let state: StreamingState = {
    status: 'collecting',
    proposals: []
  }

  return {
    addProposal: (proposal: ExpertProposal) => {
      state.proposals.push(proposal)
      onUpdate({ ...state })
    },
    startSynthesis: () => {
      state.status = 'synthesizing'
      onUpdate({ ...state })
    },
    complete: (question: string, options: string[]) => {
      state.status = 'complete'
      state.question = question
      state.options = options
      onUpdate({ ...state })
    },
    getState: () => ({ ...state })
  }
}

// ============================================
// OPTIMIZATION SUMMARY
// ============================================
/*
BEFORE (3-4 API calls in sequence):
1. Orchestrator: 1-2 sec
2. 5 Agents (parallel): 2-3 sec
3. Synthesizer: 1-2 sec
4. Chair (if final): 2-3 sec
TOTAL: 6-10 seconds

AFTER (with optimizations):
Option A - Combined Call:
1. collectAndSynthesizeInOne: 2-3 sec
2. Chair (if final): 2-3 sec
TOTAL: 2-6 seconds (50-70% faster)

Option B - Early Synthesis:
1. 5 Agents with early callback at 3: 1.5-2 sec
2. Synthesizer (starts early): 1-2 sec
TOTAL: 2.5-4 seconds (50-60% faster)

RECOMMENDATION:
- Use collectAndSynthesizeInOne for exploration phase (fastest)
- Use full flow only for final summary (highest quality)
*/
