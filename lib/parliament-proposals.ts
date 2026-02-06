import { getAgents, getSchoolName } from './agents'
import { callAgent } from './agent-caller'
import { FAST_MODEL, FAST_MODEL_MAX_TOKENS } from './config'
import type { ExpertProposal } from './types'
import type { ExternalDomainType } from './chat-state'
import { getExternalSpecialist } from './external-specialists'
import { callExternalSpecialist } from './agent-caller'
import { FEW_SHOT_EXAMPLES } from './few-shot-examples'
import { SYSTEM_PROMPT_SHORT } from './system-prompt'

/**
 * Collect from each expert: position (2–4 sentences) + proposedQuestion + answerOptions (3–4).
 * Used by answer API; positions are stored in history and passed to synthesizer.
 * If externalDomain is provided, also includes the external specialist's perspective.
 */
export async function collectParliamentProposals(
  lastQuestion: string,
  userAnswer: string,
  conversationSummary: string,
  externalDomain?: ExternalDomainType
): Promise<ExpertProposal[]> {
  const allAgents = getAgents()
  const activeAgentIds = ['psychodynamic-freudian', 'cbt', 'dbt', 'managerial-organizational', 'social-sociological', 'modern-stoic']
  const agents = allAgents.filter(agent => activeAgentIds.includes(agent.id))
  const agentIds = agents.map(agent => agent.id)

  const promptForMembers = `השאלה האחרונה שנשאלה למשתמש:
"${lastQuestion}"

תשובת המשתמש:
${userAnswer}

תקציר קצר של השיחה עד עכשיו:
${conversationSummary}

${SYSTEM_PROMPT_SHORT}

תפקידך:
1. מנקודת המבט של האסכולה שלך – כתוב "position" (עמדה): 2–4 משפטים על מה באמת קורה כאן. (חלק זה פנימי – מותר מונחים מקצועיים)
2. הצע שאלה אחת המשך ("proposedQuestion") – מתחילה ב"כש..." ומתייחסת למה שהמשתמש אמר.
3. הצע 4–5 אפשרויות תשובה ("answerOptions"):
   - בגוף ראשון: "אני מרגיש/ה ש...", "אני נוטה ל...", "בדרך כלל אני..."
   - מתארות דפוסים בחיי היומיום (לא תאוריות)
   - האופציה האחרונה תמיד: "משהו אחר: ____"

${FEW_SHOT_EXAMPLES}

החזר JSON בפורמט:
{
  "position": "2–4 משפטים: העמדה שלך (מותר מונחים – זה פנימי).",
  "proposedQuestion": "כש[מה שהמשתמש אמר], מה הכי מתאר את מה שקורה לך?",
  "answerOptions": ["אני מרגיש/ה ש...", "אני נוטה ל...", "בדרך כלל אני...", "משהו אחר: ____"]
}`

  console.log(`[Parliament Proposals] Collecting proposals from ${agentIds.length} agents`)

  const proposalPromises = agentIds.map(async (agentId) => {
    try {
      console.log(`[Parliament Proposals] Calling agent ${agentId}...`)
      const response = await callAgent(
        agentId,
        [{ content: promptForMembers }],
        {
          model: FAST_MODEL,
          maxTokens: Math.max(FAST_MODEL_MAX_TOKENS, 400),
          responseFormat: 'json_object'
        }
      )
      console.log(`[Parliament Proposals] Got response from agent ${agentId}`)
      return { agentId, response }
    } catch (error) {
      console.error(`[Parliament Proposals] Error getting proposal from agent ${agentId}:`, error)
      return { agentId, response: null }
    }
  })

  const proposalResults = await Promise.all(proposalPromises)
  console.log(`[Parliament Proposals] Received ${proposalResults.length} responses from agents`)

  const proposals: ExpertProposal[] = []

  for (const result of proposalResults) {
    if (!result.response) {
      console.warn(`[Parliament Proposals] No response from agent ${result.agentId}`)
      continue
    }

    const agent = agents.find(a => a.id === result.agentId)
    if (!agent) {
      console.warn(`[Parliament Proposals] Agent ${result.agentId} not found`)
      continue
    }

    try {
      const data = JSON.parse(result.response) as {
        position?: string
        proposedQuestion?: string
        answerOptions?: string[]
      }

      const position = (data.position || '').trim()
      const proposedQuestion = (data.proposedQuestion || '').trim()
      const answerOptions = Array.isArray(data.answerOptions)
        ? data.answerOptions.slice(0, 4).map((a: string) => String(a).trim()).filter(Boolean)
        : []

      if (position && proposedQuestion && answerOptions.length >= 3) {
        proposals.push({
          agentId: result.agentId,
          agentName: agent.displayName || agent.name,
          schoolName: getSchoolName(result.agentId),
          position,
          proposedQuestion,
          answerOptions
        })
        console.log(`[Parliament Proposals] Successfully parsed proposal from ${agent.name}`)
      } else {
        console.warn(`[Parliament Proposals] Invalid proposal format from agent ${result.agentId} (need position, proposedQuestion, 3+ answerOptions)`)
      }
    } catch (error) {
      console.error(`[Parliament Proposals] Error parsing proposal from agent ${result.agentId}:`, error)
    }
  }

  // If external specialist is active, collect their perspective as well
  if (externalDomain) {
    try {
      const specialist = getExternalSpecialist(externalDomain)
      console.log(`[Parliament Proposals] Including external specialist: ${specialist.displayName}`)
      
      const externalProposal = await collectExternalSpecialistProposal(
        specialist,
        lastQuestion,
        userAnswer,
        conversationSummary
      )
      
      if (externalProposal) {
        proposals.push(externalProposal)
        console.log(`[Parliament Proposals] Added external specialist proposal from ${specialist.displayName}`)
      }
    } catch (error) {
      console.error(`[Parliament Proposals] Error getting external specialist proposal:`, error)
    }
  }

  console.log(`[Parliament Proposals] Returning ${proposals.length} valid proposals`)
  return proposals
}

/**
 * Collect proposal from external specialist
 */
async function collectExternalSpecialistProposal(
  specialist: ReturnType<typeof getExternalSpecialist>,
  lastQuestion: string,
  userAnswer: string,
  conversationSummary: string
): Promise<ExpertProposal | null> {
  const promptForExternalSpecialist = `השאלה האחרונה שנשאלה למשתמש:
"${lastQuestion}"

תשובת המשתמש:
${userAnswer}

תקציר קצר של השיחה עד עכשיו:
${conversationSummary}

אתה ${specialist.displayName}, מומחה-חוץ שהוזמן לתת זווית כללית בפרלמנט.

תפקידך:
1. כתוב "position" (עמדה): 2–4 משפטים על איך התחום שלך (${specialist.domainType}) עשוי להיות רלוונטי למה שהמשתמש מתאר. זכור: אתה לא מאבחן ולא נותן ייעוץ ספציפי, רק מציג זווית כללית. (חלק זה פנימי – מותר מונחים מקצועיים)
2. אם יש מידע חסר שכדאי להשיג ממומחה אמיתי, ציין זאת.
3. הצע שאלה אחת המשך ("proposedQuestion") שיכולה לעזור להבין אם התחום שלך רלוונטי יותר או פחות.
4. הצע 3–4 אפשרויות תשובה ("answerOptions") לשאלה הזו.

===== חשוב מאוד לגבי השאלה והאפשרויות =====
המשתמש אינו איש מקצוע! בשאלה ובאפשרויות:
- כתוב בשפת חוויה יומיומית: "אני מרגיש/ה ש...", "נראה לי ש...", "בדרך כלל אני..."
- אסור מונחים מקצועיים או רפואיים מסובכים.
- האפשרויות צריכות להיות בגוף ראשון וקצרות.

החזר JSON בפורמט:
{
  "position": "2–4 משפטים: הזווית שלך כמומחה-חוץ (מותר מונחים – זה פנימי).",
  "proposedQuestion": "השאלה שאתה מציע – בשפה יומיומית פשוטה",
  "answerOptions": ["אני מרגיש/ה ש...", "נראה לי ש...", "בדרך כלל אני..."]
}`

  try {
    const response = await callExternalSpecialist(
      specialist.systemPrompt,
      promptForExternalSpecialist,
      {
        model: FAST_MODEL,
        maxTokens: Math.max(FAST_MODEL_MAX_TOKENS, 400),
        responseFormat: 'json_object'
      }
    )

    if (!response) return null

    const data = JSON.parse(response) as {
      position?: string
      proposedQuestion?: string
      answerOptions?: string[]
    }

    const position = (data.position || '').trim()
    const proposedQuestion = (data.proposedQuestion || '').trim()
    const answerOptions = Array.isArray(data.answerOptions)
      ? data.answerOptions.slice(0, 4).map((a: string) => String(a).trim()).filter(Boolean)
      : []

    if (position && proposedQuestion && answerOptions.length >= 3) {
      return {
        agentId: specialist.id,
        agentName: specialist.displayName,
        schoolName: `מומחה-חוץ (${specialist.domainType})`,
        position,
        proposedQuestion,
        answerOptions
      }
    }

    return null
  } catch (error) {
    console.error(`[Parliament Proposals] Error parsing external specialist response:`, error)
    return null
  }
}
