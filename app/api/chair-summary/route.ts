import { NextRequest, NextResponse } from 'next/server'
import { getMessages, addMessage, ChatMessage, countUserMessages, hasDontKnowPattern, getFutureGoalAnswered, getPhase, setPhase, getActiveExternalDomain, getExternalDomainState, setExpertContentAnalyses, getExpertContentAnalyses } from '@/lib/chat-state'
import { collectExpertContentAnalyses, selectRelevantExperts } from '@/lib/expert-content-analysis'
import { DEEP_MODEL, DEEP_MODEL_MAX_TOKENS, OPENAI_CONFIG, getOpenAIApiKey, CHAIR_PROMPTS, OPTIMIZATION_CONFIG, FAST_MODEL } from '@/lib/config'
import { ChairSummaryResponse, SelectedExpert } from '@/lib/types'
import OpenAI from 'openai'
import { getExternalSpecialist } from '@/lib/external-specialists'
import { getJewishInsightForSituation } from '@/lib/jewish-insight'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'נדרש sessionId' },
        { status: 400 }
      )
    }

    // Get current phase once and reuse throughout the function
    const currentPhase = getPhase(sessionId)
    
    // Check if we already received FINAL_RESPONSE - don't allow more calls
    if (currentPhase === 'final_response') {
      // Check if final response already exists in history
      const historyCheck = getMessages(sessionId)
      const hasFinalResponse = historyCheck.some(msg => 
        msg.speaker === 'chair' && 
        (msg.content.includes('תהליך אימוני') || msg.content.includes('איך אני מבין את הבקשה'))
      )
      
      if (hasFinalResponse) {
        return NextResponse.json(
          { error: 'תשובה סופית כבר ניתנה. לא ניתן לבקש עוד חוות דעת.' },
          { status: 400 }
        )
      }
    }

    // Get full conversation history
    const history = getMessages(sessionId)

    // Initial check: If user already answered goal question, always return final answer
    // This comes before all other checks to prevent creating more questions
    const futureGoalAnswered = getFutureGoalAnswered(sessionId)
    
    if (futureGoalAnswered) {
      // User already answered goal question - return final answer only
      // Don't check "don't know" or "insufficient data" - only final answer
    } else {
      // Check 1: Is there a recurring "don't know" pattern?
      // Check before checking history length, as this is more specific
      if (history.length > 0 && hasDontKnowPattern(sessionId, 3)) {
        const chairMessage: ChatMessage = {
          speaker: 'chair',
          role: 'assistant',
          content: CHAIR_PROMPTS.dontKnowPattern,
          timestamp: new Date().toISOString()
        }
        addMessage(sessionId, chairMessage)

        return NextResponse.json({
          mode: 'USER_UNSURE',
          chairMessage: CHAIR_PROMPTS.dontKnowPattern
        } as ChairSummaryResponse)
      }

      // Check 2: Is there enough history (less than 3 significant user messages)?
      // If history is empty or has less than 3 significant user messages
      if (history.length === 0 || countUserMessages(sessionId) < 3) {
        const chairMessage: ChatMessage = {
          speaker: 'chair',
          role: 'assistant',
          content: CHAIR_PROMPTS.insufficientData,
          timestamp: new Date().toISOString()
        }
        addMessage(sessionId, chairMessage)

        return NextResponse.json({
          mode: 'INSUFFICIENT_HISTORY',
          chairMessage: CHAIR_PROMPTS.insufficientData
        } as ChairSummaryResponse)
      }
    }

    // Check if user answered goal question - if yes, use final answer prompt
    // Or if we're in deep_analysis or final_response phase
    let promptToUse = CHAIR_PROMPTS.regularSummary
    
    if (futureGoalAnswered || currentPhase === 'final_response') {
      promptToUse = CHAIR_PROMPTS.finalAnswer
      // אל תעדכן phase ל-final_response כאן! רק אחרי שהתשובה נבנתה בהצלחה (למטה) – אחרת timeout/שגיאה יותירו את המשתמש בלי תשובה אבל עם "השיחה הסתיימה"
    } else if (currentPhase === 'deep_analysis') {
      promptToUse = CHAIR_PROMPTS.deepAnalysis || CHAIR_PROMPTS.regularSummary
    }

    // FINAL CHAIR RESPONSE: Get full conversation + expert analyses
    // Create conversation summary (including expert responses)
    const conversationSummary = history
      .map(msg => {
        const speakerName = msg.speaker === 'user' ? 'משתמש' : msg.speaker
        return `${speakerName}: ${msg.content}`
      })
      .join('\n\n')
      .slice(-4000)

    // בחינה אמיתית של מומחי תוכן: כשמגיעים לתשובה סופית – כל מומחה נותן ניתוח אמיתי בתחום שלו
    let expertAnalysesText = ''
    const isFinalAnswer = futureGoalAnswered || currentPhase === 'final_response'
    if (isFinalAnswer) {
      try {
        let analyses = getExpertContentAnalyses(sessionId)
        if (!analyses || analyses.length === 0) {
          const selectedIds = await selectRelevantExperts(conversationSummary)
          analyses = await collectExpertContentAnalyses(sessionId, selectedIds ?? undefined)
          setExpertContentAnalyses(sessionId, analyses)
        }
        if (analyses.length > 0) {
          expertAnalysesText = '\n\n===== תשובות המומחים (ניתוח אמיתי מכל אסכולה) =====\n' +
            analyses.map(a => `${a.schoolName} (${a.agentName}):\n${a.analysis}`).join('\n\n')
        }
      } catch (expertErr) {
        console.error('[Chair Summary] Expert analyses failed (continuing without):', expertErr)
        expertAnalysesText = ''
      }
    }
    // If in deep_analysis phase (but not final answer), try to get expert analyses from history
    if (!expertAnalysesText && currentPhase === 'deep_analysis') {
      const expertAnalysisMessages = history.filter(msg => 
        msg.content.includes('[Deep Analysis]') || 
        msg.content.includes('Interpretation:') ||
        msg.speaker !== 'user' && msg.speaker !== 'chair'
      )
      if (expertAnalysisMessages.length > 0) {
        expertAnalysesText = '\n\nניתוחי המומחים:\n' + expertAnalysisMessages
          .map(msg => `${msg.speaker}: ${msg.content}`)
          .join('\n\n')
      }
    }

    // Check if there's an active external domain specialist
    let externalDomainContext = ''
    const activeExternalDomain = getActiveExternalDomain(sessionId)
    if (activeExternalDomain) {
      const domainState = getExternalDomainState(sessionId)
      const specialist = getExternalSpecialist(activeExternalDomain)
      externalDomainContext = `\n\n[הערה: בשיחה זו הוזכר תחום חיצוני (${domainState?.domainDisplayName || activeExternalDomain}) ונוסף מומחה-חוץ: ${specialist.displayName}. אנא כלול את הזווית שלו בקולות הפרלמנט והמלץ על פנייה למומחה אמיתי בתחום הזה אם רלוונטי.]`
    }

    // Check if user said they're asking ABOUT a couple/others (not about themselves)
    const isAskingAboutOthers =
      conversationSummary.includes('על זוג או אדם אחר') ||
      conversationSummary.includes('אני שואל על זוג') ||
      conversationSummary.includes('אני שואלת על זוג') ||
      conversationSummary.includes('שואל/ת על זוג') ||
      conversationSummary.includes('על זוג אחר') ||
      conversationSummary.includes('שואל על אחרים')

    const askingAboutOthersInstruction = isAskingAboutOthers
      ? `

===== חובה – הפונה שואל/ת על זוג או אדם אחר (לא על עצמו/ה) =====
המשתמש כבר ציין בשיחה שהוא/היא שואל/ת **על** זוג או אדם אחר – לא מתאר/ת את עצמו/ה.

- **אסור** לפנות אל הפונה כאילו הוא/היא הגבר או האישה בסיפור (אין "האנרגיה הגבוהה שלך", "אתה ציינת", "את מתמודדת").
- **חובה** לנסח את user_friendly_explanation על **הזוג / האנשים שבסיפור** – "הגבר", "האישה", "ביניהם", "הם", "פער בין היכולת שלה לבין ההתפרצות האנרגטית שלו".
- **חובה** לנסח את action_plan כך: צעדים ש**הזוג/האחרים** יכולים לעשות, או צעדים ש**הפונה** (השואל/ת) יכול/ה לעשות כדי לתמוך בהם – "איך את/ה יכול/ה לתמוך בזוג", "מה להציע להם", "מתי להפנות להנחיה מקצועית".
- **חובה** לנסח resistance_note ו-closing בהתייחס לזוג/לאחרים או ל"מה שיהיה קשה להם" / "מה את/ה עלול/ה לגלות כשתנסה לתמוך", לא "מה יהיה קשה לך".
`
      : ''

    const openai = new OpenAI({
      apiKey: getOpenAIApiKey()
    })

    // שאלת המקור – הודעה ראשונה של המשתמש (לשימוש בתובנה יהודית במקביל)
    const firstUserMsg = history.find(m => m.speaker === 'user')?.content?.slice(0, 300) || ''
    const situationForJewish = conversationSummary.slice(0, 800)

    // System message for final chair response
    const systemMessage = (futureGoalAnswered || currentPhase === 'final_response' || currentPhase === 'deep_analysis')
      ? 'את/ה יו"ר פרלמנט מנטלי. תן תשובה סופית מתכללת בשלושה חלקים: understanding (הסבר מתכלל), steps (תוכנית אימון), ו-closing (הכרה בלי שאלות). אל תשאל עוד שאלות. אל תציע להמשיך. התשובה הסופית מסתיימת אחרי שלושת החלקים האלה. החזר JSON תקין.'
      : 'את/ה יו"ר פרלמנט מנטלי. החזר JSON תקין עם שני חלקים: understanding (מחרוזת) ו-steps (מערך מחרוזות).'

    // מודל ל-chair: מהיר (לקצר זמנים) או חזק (לאיכות). תשובה סופית דורשת יותר טוקנים (JSON מלא).
    const chairModel = OPTIMIZATION_CONFIG.useFastModelForChair ? FAST_MODEL : DEEP_MODEL
    const chairMaxTokens = (OPTIMIZATION_CONFIG.useFastModelForChair ? 1200 : Math.min(DEEP_MODEL_MAX_TOKENS, 1500))

    // הרצה במקביל: chair + תובנה יהודית (חוסך זמן – לא מחכים ל-chair כדי להתחיל חיפוש מקור)
    const [response, jewishInsightEarly] = await Promise.all([
      openai.chat.completions.create({
        model: chairModel,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: `${promptToUse}${askingAboutOthersInstruction}\n\nהשיחה המלאה:\n${conversationSummary}${expertAnalysesText}${externalDomainContext}` }
        ],
        temperature: 0.8,
        max_tokens: chairMaxTokens,
        frequency_penalty: 0.7,
        presence_penalty: 0.6,
        response_format: { type: 'json_object' }
      }),
      getJewishInsightForSituation(situationForJewish, firstUserMsg)
    ])

    let content = response.choices[0]?.message?.content
    if (!content || typeof content !== 'string') {
      throw new Error('לא התקבלה תגובה מ-OpenAI')
    }
    content = content.trim()
    // הסרת בלוק markdown אם המודל החזיר ```json ... ```
    const jsonBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonBlock?.[1]) content = jsonBlock[1].trim()
    // חילוץ JSON מתגובה שעשויה להכיל טקסט לפני/אחרי
    const firstBrace = content.indexOf('{')
    if (firstBrace >= 0) {
      const lastBrace = content.lastIndexOf('}')
      if (lastBrace > firstBrace) content = content.slice(firstBrace, lastBrace + 1)
    }
    // תיקון נפוץ: פסיק אחרון לפני } או ]
    content = content.replace(/,(\s*[}\]])/g, '$1')

    // Parse JSON response - support both old and new formats
    interface OldFormat {
      mechanism?: string
      expertVoices?: string[]
      chairLeaningToward?: string
      understanding?: string
      steps?: string[]
      resistance?: string
      closing?: string
      externalDomainNote?: string
    }
    
    interface SelectedExpertRaw {
      id?: string
      name?: string
      insight?: string
    }

    interface NewFormat {
      original_question?: string
      pattern_name?: string
      reflection?: string // סיכום אמפתי
      information?: string // (deprecated) שיקוף
      selected_experts?: SelectedExpertRaw[] // 3 מומחים נבחרים
      user_friendly_explanation?: string
      action_plan?: Array<{ title?: string; description?: string; success_criteria?: string }>
      resistance_note?: string
      closing?: string
      medical_note?: string
      external_domain_note?: string | null
      offer_expert_view?: string
      offer_training_question?: string
      expert_voices?: string[]
    }
    
    let rawData: OldFormat & NewFormat
    try {
      rawData = JSON.parse(content)
    } catch (parseError) {
      console.error('[Chair Summary] JSON parse failed. Content length:', content.length, 'First 300 chars:', content.slice(0, 300), 'Last 200 chars:', content.slice(-200))
      throw new Error('תגובה לא תקינה מ-OpenAI')
    }
    
    // Detect if new format (has pattern_name or action_plan)
    const isNewFormat = rawData.pattern_name || rawData.action_plan

    const VALID_EXPERT_IDS: SelectedExpert['id'][] = ['psychodynamic', 'stoic', 'cbt', 'sociological', 'organizational', 'dbt']
    const toExpertId = (s: unknown): SelectedExpert['id'] =>
      typeof s === 'string' && VALID_EXPERT_IDS.includes(s as SelectedExpert['id']) ? s as SelectedExpert['id'] : 'cbt'

    // Normalize to a unified structure
    let summaryData: {
      mechanism?: string
      expertVoices?: string[]
      chairLeaningToward?: string
      understanding?: string
      steps: string[]
      resistance?: string
      closing?: string
      externalDomainNote?: string
      // New format fields
      originalQuestion?: string
      patternName?: string
      reflection?: string // סיכום אמפתי
      information?: string // (deprecated)
      selectedExperts?: SelectedExpert[] // 3 מומחים נבחרים
      userFriendlyExplanation?: string
      actionPlan?: Array<{ title: string; description: string; success_criteria: string }>
      resistanceNote?: string
      medicalNote?: string
      offerExpertView?: string
      offerTrainingQuestion?: string
    }
    
    if (isNewFormat) {
      // Convert new format to compatible structure (הגנה מפני action_plan לא תקין)
      const actionPlanSteps = Array.isArray(rawData.action_plan) ? rawData.action_plan : []
      const stepsAsStrings = actionPlanSteps
        .filter((step: unknown): step is { title?: string; description?: string; success_criteria?: string } => typeof step === 'object' && step !== null)
        .map(step =>
          `${step.title ?? ''}: ${step.description ?? ''} (קריטריון: ${step.success_criteria ?? ''})`.trim()
        )
        .filter(Boolean)
      
      // Convert action_plan to properly typed ActionPlanStep[]
      const typedActionPlan = actionPlanSteps
        .filter((step: unknown): step is { title?: string; description?: string; success_criteria?: string } => 
          typeof step === 'object' && step !== null
        )
        .map(step => ({
          title: step.title ?? '',
          description: step.description ?? '',
          success_criteria: step.success_criteria ?? ''
        }))
        .filter(step => step.title || step.description) // Remove empty steps

      // Convert selected_experts to properly typed array (id must match SelectedExpert['id'])
      const typedSelectedExperts: SelectedExpert[] = Array.isArray(rawData.selected_experts)
        ? rawData.selected_experts
            .filter((e): e is SelectedExpertRaw => typeof e === 'object' && e !== null)
            .map(e => ({
              id: toExpertId(e.id),
              name: e.name ?? '',
              insight: e.insight ?? ''
            }))
            .filter(e => e.name && e.insight)
        : []

      // Also convert selected_experts to expertVoices for backward compatibility
      const expertVoicesFromSelected = typedSelectedExperts.map(e => 
        `**${e.name}:** ${e.insight}`
      )

      summaryData = {
        // Map new format to old fields for backward compatibility
        mechanism: rawData.user_friendly_explanation,
        expertVoices: expertVoicesFromSelected.length > 0 ? expertVoicesFromSelected : rawData.expert_voices,
        steps: stepsAsStrings,
        resistance: rawData.resistance_note,
        closing: rawData.closing,
        externalDomainNote: rawData.external_domain_note || rawData.medical_note || undefined,
        // Also store new format fields
        originalQuestion: rawData.original_question,
        patternName: rawData.pattern_name,
        reflection: rawData.reflection, // סיכום אמפתי
        information: rawData.information || rawData.reflection, // fallback
        selectedExperts: typedSelectedExperts.length > 0 ? typedSelectedExperts : undefined,
        userFriendlyExplanation: rawData.user_friendly_explanation,
        actionPlan: typedActionPlan.length > 0 ? typedActionPlan : undefined,
        resistanceNote: rawData.resistance_note,
        medicalNote: rawData.medical_note,
        offerExpertView: rawData.offer_expert_view,
        offerTrainingQuestion: rawData.offer_training_question
      }
      
    } else {
      // Old format
      summaryData = {
        mechanism: rawData.mechanism,
        expertVoices: rawData.expertVoices,
        chairLeaningToward: rawData.chairLeaningToward,
        understanding: rawData.understanding,
        steps: rawData.steps || [],
        resistance: rawData.resistance,
        closing: rawData.closing,
        externalDomainNote: rawData.externalDomainNote
      }
    }

    if (!summaryData.steps || !Array.isArray(summaryData.steps)) {
      summaryData.steps = []
    } else {
      summaryData.steps = summaryData.steps.slice(0, 3)
    }

    if (!summaryData.closing) {
      summaryData.closing = ''
    }

    // תובנה ממקורות יהודיים – התקבלה במקביל ל-chair (חוסך זמן)
    if (jewishInsightEarly) {
      ;(summaryData as { jewishQuote?: string; jewishSource?: string; jewishExplanation?: string }).jewishQuote = jewishInsightEarly.quote
      ;(summaryData as { jewishQuote?: string; jewishSource?: string; jewishExplanation?: string }).jewishSource = jewishInsightEarly.source
      ;(summaryData as { jewishQuote?: string; jewishSource?: string; jewishExplanation?: string }).jewishExplanation = jewishInsightEarly.explanation
    }

    // Clean up optional fields (remove if null or empty)
    if (summaryData.externalDomainNote === null || summaryData.externalDomainNote === 'null' || !summaryData.externalDomainNote?.trim()) {
      summaryData.externalDomainNote = undefined
    }
    if (summaryData.chairLeaningToward === null || summaryData.chairLeaningToward === 'null' || !summaryData.chairLeaningToward?.trim()) {
      summaryData.chairLeaningToward = undefined
    }
    if (summaryData.resistance === null || summaryData.resistance === 'null' || !summaryData.resistance?.trim()) {
      summaryData.resistance = undefined
    }
    if (summaryData.medicalNote === null || summaryData.medicalNote === 'null' || !summaryData.medicalNote?.trim()) {
      summaryData.medicalNote = undefined
    }

    const isFinalResponse = futureGoalAnswered || currentPhase === 'final_response' || currentPhase === 'deep_analysis'

    const mechanismText = summaryData.mechanism ? `${summaryData.mechanism}\n\n` : ''
    const voicesText = Array.isArray(summaryData.expertVoices) && summaryData.expertVoices.length > 0
      ? `קולות הפרלמנט:\n${summaryData.expertVoices.map(v => `• ${v}`).join('\n')}\n\n`
      : ''
    const leaningText = summaryData.chairLeaningToward
      ? `${summaryData.chairLeaningToward}\n\n`
      : ''
    const understandingText = summaryData.understanding ? `הבנה מתכללת:\n${summaryData.understanding}\n\n` : ''
    const stepsText = summaryData.steps.length > 0
      ? `תוכנית אימון (3 צעדים):\n${summaryData.steps.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}\n\n`
      : ''
    const resistanceText = summaryData.resistance
      ? `התנגדות צפויה:\n${summaryData.resistance}\n\n`
      : ''
    const externalDomainText = summaryData.externalDomainNote 
      ? `הערה לתחום חיצוני:\n${summaryData.externalDomainNote}\n\n` 
      : ''
    const jewishQuote = (summaryData as { jewishQuote?: string }).jewishQuote
    const jewishSource = (summaryData as { jewishSource?: string }).jewishSource
    const jewishExplanation = (summaryData as { jewishExplanation?: string }).jewishExplanation
    const closingBlock = jewishQuote && jewishExplanation
      ? `ממקורות יהודיים${jewishSource ? ` (${jewishSource})` : ''}:\n${jewishQuote}\n\nההסבר המודרני:\n${jewishExplanation}`
      : (summaryData.closing || '')
    const chairContent = isFinalResponse
      ? `${mechanismText}${voicesText}${leaningText}${understandingText}${stepsText}${resistanceText}${externalDomainText}${closingBlock}`.trim()
      : `${mechanismText}${voicesText}${leaningText}${understandingText}${stepsText}${resistanceText}${externalDomainText}`.trim()
    
    const chairMessage: ChatMessage = {
      speaker: 'chair',
      role: 'assistant',
      content: chairContent,
      timestamp: new Date().toISOString()
    }
    addMessage(sessionId, chairMessage)

    // CRITICAL: Set phase to final_response to prevent more questions
    if (isFinalResponse) {
      setPhase(sessionId, 'final_response')
    }

    const responseData: ChairSummaryResponse = {
      mode: 'FULL_SUMMARY',
      summary: {
        // Old format fields (backward compatibility)
        mechanism: summaryData.mechanism?.trim(),
        expertVoices: Array.isArray(summaryData.expertVoices) ? summaryData.expertVoices.map((v: string) => String(v).trim()).filter(Boolean) : undefined,
        chairLeaningToward: summaryData.chairLeaningToward?.trim() || undefined,
        understanding: summaryData.understanding?.trim(),
        steps: summaryData.steps.map(step => step.trim()).filter(step => step.length > 0),
        resistance: summaryData.resistance?.trim() || undefined,
        closing: summaryData.closing?.trim() || '',
        externalDomainNote: summaryData.externalDomainNote?.trim() || undefined,
        // New format fields
        originalQuestion: summaryData.originalQuestion?.trim() || undefined,
        patternName: summaryData.patternName?.trim() || undefined,
        reflection: summaryData.reflection?.trim() || undefined, // סיכום אמפתי
        information: summaryData.information?.trim() || summaryData.reflection?.trim() || undefined, // fallback
        selectedExperts: summaryData.selectedExperts?.map(e => ({
          id: toExpertId(e.id),
          name: e.name,
          insight: e.insight
        })) ?? undefined, // 3 מומחים נבחרים (ensure id matches SelectedExpert['id'])
        userFriendlyExplanation: summaryData.userFriendlyExplanation?.trim() || undefined,
        actionPlan: summaryData.actionPlan || undefined,
        resistanceNote: summaryData.resistanceNote?.trim() || undefined,
        medicalNote: summaryData.medicalNote?.trim() || undefined,
        offerExpertView: summaryData.offerExpertView?.trim() || undefined,
        jewishQuote: (summaryData as { jewishQuote?: string }).jewishQuote?.trim() || undefined,
        jewishSource: (summaryData as { jewishSource?: string }).jewishSource?.trim() || undefined,
        jewishExplanation: (summaryData as { jewishExplanation?: string }).jewishExplanation?.trim() || undefined,
        offerTrainingQuestion: summaryData.offerTrainingQuestion?.trim() || undefined
      }
    }

    return NextResponse.json(responseData)
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('Error in chair-summary API:', err.message, err.stack)
    let userMessage = 'שגיאה בעיבוד סיכום היו"ר. נסה שוב.'
    if (err.message?.includes('OPENAI_API_KEY')) userMessage = 'חסר מפתח API. בדוק .env.local'
    else if (err.message?.includes('לא התקבלה תגובה') || err.message?.includes('תגובה לא תקינה')) userMessage = err.message
    else if (err.message) userMessage = `${userMessage} (${err.message})`
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    )
  }
}
