import type { ExpertProposal, QuestionType } from './types'
import { FAST_MODEL, FAST_MODEL_MAX_TOKENS, OPENAI_CONFIG, getOpenAIApiKey } from './config'
import { FEW_SHOT_EXAMPLES } from './few-shot-examples'
import { SYSTEM_PROMPT_SHORT } from './system-prompt'
import OpenAI from 'openai'

export interface SynthesizedQuestion {
  question: string
  options: string[]
  questionType: QuestionType // סוג השאלה שנבחר
}

/**
 * Synthesizer receives expert proposals (schoolName, position, proposedQuestion, answerOptions).
 * It must read and compare positions, identify 2–3 themes/tensions, and produce one next question
 * that reflects concrete differences between experts (not a generic follow-up).
 * 
 * MANDATORY: Must ensure all three question types are asked during the conversation:
 * - pattern: דפוס כאן-ועכשיו
 * - context: איפה זה עוד פוגש אותך?
 * - motivation: למה חשוב לך לשנות את זה?
 */
export async function synthesizeQuestion(
  proposals: ExpertProposal[],
  conversationHistory: string,
  userAnswer: string,
  missingQuestionTypes: QuestionType[] = [] // סוגי שאלות שעדיין לא נשאלו
): Promise<SynthesizedQuestion> {
  const proposalsSummary = proposals
    .map(p => `**${p.schoolName}**:
עמדה (position): ${p.position}
שאלה מוצעת: "${p.proposedQuestion}"
אפשרויות תשובה: ${p.answerOptions.join(' | ')}`)
    .join('\n\n')

  // Build priority instruction based on missing question types
  let priorityInstruction = ''
  if (missingQuestionTypes.length > 0) {
    const typeNames = {
      pattern: 'דפוס כאן-ועכשיו (כש[X] קורה, מה קורה לך?)',
      context: 'הקשר רחב (איפה זה עוד פוגש אותך בחיים?)',
      motivation: 'מוטיבציה (למה חשוב לך לטפל בזה? מה יהיה אחרת?)'
    }
    const missingNames = missingQuestionTypes.map(t => typeNames[t]).join(', ')
    priorityInstruction = `
===== PRIORITY: MISSING QUESTION TYPES =====
The following question types have NOT been asked yet and MUST be prioritized:
${missingNames}

Choose ONE of these missing types for the next question!
`
  }

  const openai = new OpenAI({
    apiKey: getOpenAIApiKey()
  })

  const systemPrompt = `You are a Question Synthesizer in a mental parliament.

${SYSTEM_PROMPT_SHORT}

===== HARD CONSTRAINTS =====
- Do NOT generate generic questions that could fit anyone.
- Do NOT invent details about the user's life that weren't mentioned.
- Every question must reference something the user said.
- NO professional terms visible to user – ever.
${priorityInstruction}
===== Your role =====
1. Read and compare ALL experts' positions (internally).
2. Identify 2–3 key tensions between the positions.
3. Choose ONE of these question types (PRIORITIZE missing types!):
   a) **pattern** (דפוס כאן ועכשיו): "כש[X] קורה, מה הכי מתאר את מה שקורה לך בפנים/בהתנהגות?"
   b) **context** (הקשר): "איפה הדפוס הזה עוד פוגש אותך – בעבודה, בזוגיות, בכסף, במשפחה?" / "מתי עוד בחיים שלך אתה מרגיש משהו דומה?"
   c) **motivation** (מוטיבציה): "מה גורם לך לרצות לטפל דווקא בזה עכשיו?" / "אם זה ישתפר בעוד חצי שנה, מה יהיה לך אחרת?"
4. Generate 4–5 answer options:
   - Written in FIRST PERSON ("אני מרגיש...", "אני נוטה...", "בדרך כלל אני...").
   - Describe everyday patterns (avoidance, people-pleasing, fear of rejection, disorganization).
   - Short (1–2 sentences max).
   - Last option MUST be: "משהו אחר: ____".

${FEW_SHOT_EXAMPLES}

Return JSON (Hebrew):
{
  "questionType": "pattern" | "context" | "motivation",
  "question": "השאלה בעברית...",
  "options": ["אני מרגיש/ה ש...", "אני נוטה ל...", "בדרך כלל אני...", "משהו אחר: ____"]
}`

  const response = await openai.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Conversation history:\n${conversationHistory}\n\nUser's answer:\n${userAnswer}\n\nParliament member proposals (position + question + options):\n${proposalsSummary}\n\nMissing question types: ${missingQuestionTypes.length > 0 ? missingQuestionTypes.join(', ') : 'none'}\n\nCreate ONE final question with 3–4 answer options. PRIORITIZE missing question types! DO NOT repeat any questions already asked.`
      }
    ],
    temperature: OPENAI_CONFIG.temperature,
    max_tokens: Math.max(FAST_MODEL_MAX_TOKENS, 400),
    response_format: { type: 'json_object' }
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from question synthesizer')
  }

  const data = JSON.parse(content) as { questionType?: string; question: string; options: string[] }
  const question = (data.question || '').trim()
  const options = Array.isArray(data.options)
    ? data.options.slice(0, 5).map((o: string) => String(o).trim()).filter(Boolean)
    : []
  
  // Parse question type, default to 'pattern' if not provided
  let questionType: QuestionType = 'pattern'
  if (data.questionType === 'context') questionType = 'context'
  else if (data.questionType === 'motivation') questionType = 'motivation'

  if (!question || options.length < 3) {
    throw new Error('Invalid response format from question synthesizer: need question and at least 3 options')
  }

  console.log(`[Synthesizer] Generated ${questionType} question: "${question.substring(0, 50)}..."`)

  return {
    question,
    options,
    questionType
  }
}
