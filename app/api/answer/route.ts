import { NextRequest, NextResponse } from 'next/server'
import { addMessage, getRecentMessages, ChatMessage, incrementRound, getRoundNumber, getContinueRefining, isFutureGoalQuestion, setFutureGoalAnswered, getFutureGoalAnswered, getPhase, setPhase, ConversationPhase, verifySession, chatStore, getExternalDomainState, setExternalDomainDetected, isExternalSpecialistActive, getActiveExternalDomain, setExternalDomainUserApproval, ExternalDomainType, getSourceQuestion, getMissingQuestionTypes, markQuestionTypeAsked, QuestionTypeKey } from '@/lib/chat-state'
import { collectParliamentProposals } from '@/lib/parliament-proposals'
import { synthesizeQuestion } from '@/lib/question-synthesizer'
import { collectAndSynthesizeInOne } from '@/lib/optimizations'
import { OPTIMIZATION_CONFIG } from '@/lib/config'
import { AnswerRequest, AnswerResponse, QuestionWithOptions, QuestionType } from '@/lib/types'
import { detectExternalDomain, getExternalDomainClarificationQuestion } from '@/lib/external-domain-detector'
import { getExternalSpecialist } from '@/lib/external-specialists'
import { isFixedQuestionId, getNextFixedQuestionOrder, getFixedQuestionByOrder } from '@/lib/fixed-questions'

export async function POST(request: NextRequest) {
  try {
    const body: AnswerRequest = await request.json()
    const { sessionId, questionId, question, options, selectedOptions, freeText, action, externalDomain } = body

    // Handle special external domain actions first
    if (action === 'ADD_EXTERNAL_SPECIALIST' && sessionId && externalDomain) {
      console.log(`[Answer API] User approved adding external specialist: ${externalDomain}`)
      setExternalDomainUserApproval(sessionId, true)
      
      const specialist = getExternalSpecialist(externalDomain as ExternalDomainType)
      
      // Add system message about the specialist
      addMessage(sessionId, {
        speaker: 'system',
        role: 'system',
        content: `[מומחה-חוץ נוסף: ${specialist.displayName}] המשתמש אישר הוספת מומחה-חוץ לתחום.`,
        timestamp: new Date().toISOString()
      })

      // Now continue with normal flow - collect proposals and synthesize question
      // Get the last question and answer from history to continue
      const history = getRecentMessages(sessionId, 10)
      const lastUserMessage = history.filter(m => m.speaker === 'user').pop()
      
      if (!lastUserMessage) {
        return NextResponse.json({
          mode: 'ERROR',
          error: 'לא נמצאה היסטוריית שיחה',
          roundNumber: getRoundNumber(sessionId)
        })
      }

      // Extract question and answer from the stored message
      const historySummary = history
        .map(msg => `${msg.speaker === 'user' ? 'משתמש' : msg.speaker}: ${msg.content}`)
        .join('\n')
        .slice(-1500)

      // Collect expert proposals including the new external specialist
      const proposals = await collectParliamentProposals(
        '', // We don't have the exact question text, use empty
        lastUserMessage.content,
        historySummary,
        externalDomain as ExternalDomainType
      )

      if (proposals.length === 0) {
        return NextResponse.json({
          mode: 'ERROR',
          error: 'Failed to collect expert opinions',
          roundNumber: getRoundNumber(sessionId)
        })
      }

      // Get missing question types (חובה מבנית!)
      const missingTypes = getMissingQuestionTypes(sessionId) as QuestionType[]
      
      // Synthesize question with missing types priority
      const synthesizedQuestion = await synthesizeQuestion(
        proposals,
        historySummary,
        lastUserMessage.content,
        missingTypes
      )
      
      // Mark the question type as asked
      markQuestionTypeAsked(sessionId, synthesizedQuestion.questionType as QuestionTypeKey)

      const nextQuestionId = `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // כלל זהב: שאלת המקור חייבת להיות מוצגת עם כל שאלת המשך
      const sourceQuestion = getSourceQuestion(sessionId)
      
      const nextQuestion: QuestionWithOptions = {
        question: synthesizedQuestion.question,
        sourceQuestion, // כלל זהב!
        questionType: synthesizedQuestion.questionType,
        agentId: 'synthesizer',
        options: synthesizedQuestion.options,
        questionId: nextQuestionId
      }

      addMessage(sessionId, {
        speaker: 'Parliament',
        role: 'assistant',
        content: synthesizedQuestion.question,
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        mode: 'NEXT_QUESTION',
        nextQuestion,
        roundNumber: getRoundNumber(sessionId),
        expertProposals: proposals.map(p => ({
          agentId: p.agentId,
          agentName: p.agentName,
          schoolName: p.schoolName,
          position: p.position,
          proposedQuestion: p.proposedQuestion,
          answerOptions: p.answerOptions
        }))
      })
    }

    if (action === 'CONTINUE_WITHOUT_EXTERNAL' && sessionId) {
      console.log(`[Answer API] User declined external specialist, continuing without`)
      setExternalDomainUserApproval(sessionId, false)
      
      // Continue with normal flow without external specialist
      const history = getRecentMessages(sessionId, 10)
      const lastUserMessage = history.filter(m => m.speaker === 'user').pop()
      
      if (!lastUserMessage) {
        return NextResponse.json({
          mode: 'ERROR',
          error: 'לא נמצאה היסטוריית שיחה',
          roundNumber: getRoundNumber(sessionId)
        })
      }

      const historySummary = history
        .map(msg => `${msg.speaker === 'user' ? 'משתמש' : msg.speaker}: ${msg.content}`)
        .join('\n')
        .slice(-1500)

      // Collect expert proposals WITHOUT external specialist
      const proposals = await collectParliamentProposals(
        '',
        lastUserMessage.content,
        historySummary,
        undefined // No external specialist
      )

      if (proposals.length === 0) {
        return NextResponse.json({
          mode: 'ERROR',
          error: 'Failed to collect expert opinions',
          roundNumber: getRoundNumber(sessionId)
        })
      }

      // Get missing question types (חובה מבנית!)
      const missingTypesForContinue = getMissingQuestionTypes(sessionId) as QuestionType[]
      
      const synthesizedQuestion = await synthesizeQuestion(
        proposals,
        historySummary,
        lastUserMessage.content,
        missingTypesForContinue
      )
      
      // Mark the question type as asked
      markQuestionTypeAsked(sessionId, synthesizedQuestion.questionType as QuestionTypeKey)

      const nextQuestionId = `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // כלל זהב: שאלת המקור חייבת להיות מוצגת עם כל שאלת המשך
      const sourceQuestionForContinue = getSourceQuestion(sessionId)
      
      const nextQuestion: QuestionWithOptions = {
        question: synthesizedQuestion.question,
        sourceQuestion: sourceQuestionForContinue, // כלל זהב!
        questionType: synthesizedQuestion.questionType,
        agentId: 'synthesizer',
        options: synthesizedQuestion.options,
        questionId: nextQuestionId
      }

      addMessage(sessionId, {
        speaker: 'Parliament',
        role: 'assistant',
        content: synthesizedQuestion.question,
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        mode: 'NEXT_QUESTION',
        nextQuestion,
        roundNumber: getRoundNumber(sessionId),
        expertProposals: proposals.map(p => ({
          agentId: p.agentId,
          agentName: p.agentName,
          schoolName: p.schoolName,
          position: p.position,
          proposedQuestion: p.proposedQuestion,
          answerOptions: p.answerOptions
        }))
      })
    }

    if (!sessionId || !questionId || typeof question !== 'string') {
      return NextResponse.json(
        { mode: 'ERROR', error: 'נתונים חסרים' },
        { status: 400 }
      )
    }
    const optionsSafe = options ?? []

    // Create answer summary (לשאלות פתוחות options ריק – רק freeText)
    const selectedAnswers = (selectedOptions ?? []).map(idx => optionsSafe[idx]).filter(Boolean)
    const answerSummary = optionsSafe.length > 0
      ? `תשובות שנבחרו: ${selectedAnswers.join(', ')}${freeText ? ` | תשובה חופשית: ${freeText}` : ''}`
      : `תשובה: ${(freeText || '').trim() || '(ללא טקסט)'}`
    
    // Verify we're using the shared process-level singleton store
    console.log(`[Answer API] Using chatStore, storeId: ${chatStore.storeId}, sessions: ${chatStore.getSessionCount()}`)

    // בדיקה אם זו שאלה על עתיד קרוב - אם כן, נסמן שהמשתמש ענה על שאלת היעד
    if (isFutureGoalQuestion(question)) {
      setFutureGoalAnswered(sessionId, true)
    }

    // Store user answer in conversation history
    const userAnswerMessage: ChatMessage = {
      speaker: 'user',
      role: 'user',
      content: `שאלה: ${question}\n${answerSummary}`,
      timestamp: new Date().toISOString()
    }
    addMessage(sessionId, userAnswerMessage)
    console.log(`[Answer API] Stored user answer for sessionId: ${sessionId}`)

    // ============================================
    // שאלות קבועות (פתוחות): אחרי תשובה – שאלה הבאה או תשובה סופית
    // ============================================
    if (isFixedQuestionId(questionId)) {
      const nextOrder = getNextFixedQuestionOrder(questionId)
      const sourceQuestion = getSourceQuestion(sessionId)
      if (nextOrder) {
        const nextQuestion = getFixedQuestionByOrder(nextOrder, sourceQuestion)
        return NextResponse.json({
          mode: 'NEXT_QUESTION',
          nextQuestion,
          roundNumber: nextOrder,
          showChoice: false
        })
      }
      setFutureGoalAnswered(sessionId, true)
      return NextResponse.json({
        mode: 'REQUIRES_FINAL_ANSWER',
        nextQuestion: undefined,
        showChoice: false,
        requiresFinalAnswer: true,
        roundNumber: getRoundNumber(sessionId)
      })
    }

    // ============================================
    // EXTERNAL DOMAIN DETECTION
    // Check if user mentioned an external domain (ADHD, legal, financial, etc.)
    // ============================================
    const userFullText = `${selectedAnswers.join(' ')} ${freeText || ''}`
    const externalDomainState = getExternalDomainState(sessionId)
    
    // Only detect if we haven't already detected and asked about this domain
    // OR if we detected but user hasn't made a choice yet
    if (!externalDomainState?.detected || (externalDomainState.detected && externalDomainState.userApproved === undefined)) {
      const detection = detectExternalDomain(userFullText)
      
      if (detection.detected && detection.domain && detection.domainDisplayName) {
        console.log(`[Answer API] External domain detected: ${detection.domain} (triggers: ${detection.triggerWords?.join(', ')})`)
        
        // Save the detection state (only if not already saved)
        if (!externalDomainState?.detected) {
          setExternalDomainDetected(sessionId, detection.domain, detection.domainDisplayName)
        }
        
        // Return clarification question to user with clear mode and options
        const clarificationQuestion = getExternalDomainClarificationQuestion(detection)
        
        return NextResponse.json({
          mode: 'EXTERNAL_DOMAIN_DETECTED',
          nextQuestion: undefined,
          roundNumber: getRoundNumber(sessionId),
          externalDomainQuestion: {
            detected: true,
            domain: detection.domain,
            domainDisplayName: detection.domainDisplayName,
            clarificationQuestion,
            options: [
              { id: 'add_external_specialist', label: 'כן, להוסיף מומחה-חוץ בתחום זה' },
              { id: 'continue_without', label: 'לא, להמשיך בלי מומחה-חוץ' }
            ]
          }
        })
      }
    }

    // אם המשתמש ענה על שאלת היעד, לא נמשיך לשאול שאלות - נחזיר flag שמסמן שצריך תשובה סופית
    if (getFutureGoalAnswered(sessionId)) {
      return NextResponse.json({
        mode: 'REQUIRES_FINAL_ANSWER',
        nextQuestion: undefined,
        showChoice: false,
        requiresFinalAnswer: true,
        roundNumber: getRoundNumber(sessionId)
      })
    }

    // Get current phase and update round
    const currentPhase = getPhase(sessionId) || 'exploration'
    
    // אם השיחה הסתיימה – מחזירים ללא שגיאה (רק code) כדי שה-UI יציג כפתור "שיחה חדשה" ולא יכשל
    if (currentPhase === 'final_response') {
      return NextResponse.json({
        mode: 'REQUIRES_FINAL_ANSWER',
        nextQuestion: undefined,
        showChoice: false,
        requiresFinalAnswer: true,
        roundNumber: getRoundNumber(sessionId),
        code: 'SESSION_COMPLETED'
        // ללא error – כדי שהמשתמש יראה את הכפתור "שיחה חדשה" בלי הודעת שגיאה אדומה
      })
    }

    // Update round number (only in exploration phase)
    let newRoundNumber = getRoundNumber(sessionId)
    if (currentPhase === 'exploration') {
      newRoundNumber = incrementRound(sessionId)
    }

    // After 3 exploration rounds, move to deep_analysis
    // Round flow: round 1 → first question, round 2 → second question, round 3 → third question
    // Only after round 3 is completed, move to deep_analysis phase
    if (currentPhase === 'exploration' && newRoundNumber >= 3) {
      setPhase(sessionId, 'deep_analysis')
      return NextResponse.json({
        mode: 'REQUIRES_DEEP_ANALYSIS',
        nextQuestion: undefined,
        showChoice: false,
        requiresDeepAnalysis: true,
        roundNumber: newRoundNumber
      })
    }

    // If in deep_analysis, don't ask more questions - wait for deep analysis to complete
    if (currentPhase === 'deep_analysis') {
      return NextResponse.json({
        mode: 'REQUIRES_DEEP_ANALYSIS',
        nextQuestion: undefined,
        showChoice: false,
        requiresDeepAnalysis: true,
        roundNumber: newRoundNumber
      })
    }

    // ============================================
    // EXPLORATION PHASE: Multiple experts speak in parallel, then synthesis
    // OPTIMIZED: Combined call saves 2-3 seconds
    // ============================================
    if (currentPhase === 'exploration') {
      // Reduced history to last 5-8 messages for speed
      const history = getRecentMessages(sessionId, 8)
      const historySummary = history
        .map(msg => `${msg.speaker === 'user' ? 'משתמש' : msg.speaker}: ${msg.content}`)
        .join('\n')
        .slice(-OPTIMIZATION_CONFIG.maxSummaryLength)

      // Get missing question types (חובה מבנית!)
      const missingTypesMain = getMissingQuestionTypes(sessionId) as QuestionType[]
      console.log(`[Answer API] Missing question types: ${missingTypesMain.join(', ') || 'none'}`)

      // Check if external specialist is active
      const activeExternalDomain = getActiveExternalDomain(sessionId)
      
      let proposals: any[]
      let synthesizedQuestion: { question: string; options: string[]; questionType: QuestionType }

      // OPTIMIZATION: Use combined call if enabled and no external specialist
      if (OPTIMIZATION_CONFIG.useCombinedCall && !activeExternalDomain) {
        console.log(`[Answer API] OPTIMIZED: Using combined call (saves 2-3 seconds)`)
        const startTime = Date.now()
        
        const result = await collectAndSynthesizeInOne(
          question,
          answerSummary,
          historySummary,
          missingTypesMain
        )
        
        proposals = result.proposals
        synthesizedQuestion = {
          question: result.question,
          options: result.options,
          questionType: result.questionType
        }
        
        console.log(`[Answer API] Combined call completed in ${Date.now() - startTime}ms`)
      } else {
        // FALLBACK: Original two-step process (for external specialists or if optimization disabled)
        console.log(`[Answer API] Round ${newRoundNumber}: Using standard two-step process...`)
        
        proposals = await collectParliamentProposals(
          question,
          answerSummary,
          historySummary,
          activeExternalDomain
        )

        if (proposals.length === 0) {
          return NextResponse.json({
            nextQuestion: undefined,
            error: 'Failed to collect expert opinions'
          })
        }

        console.log(`[Answer API] Collected ${proposals.length} expert proposals`)

        const fullHistorySummary = history
          .map(msg => `${msg.speaker === 'user' ? 'משתמש' : msg.speaker}: ${msg.content}`)
          .join('\n')
          .slice(-2000)

        const synthesized = await synthesizeQuestion(
          proposals,
          fullHistorySummary,
          answerSummary,
          missingTypesMain
        )
        
        synthesizedQuestion = {
          question: synthesized.question,
          options: synthesized.options,
          questionType: synthesized.questionType
        }
      }

      // Store expert positions (for chair / deep analysis)
      for (const proposal of proposals) {
        addMessage(sessionId, {
          speaker: proposal.agentName,
          role: 'assistant',
          content: `[Internal] Position: ${proposal.position}`,
          timestamp: new Date().toISOString()
        })
      }

      // Mark the question type as asked
      markQuestionTypeAsked(sessionId, synthesizedQuestion.questionType as QuestionTypeKey)
      console.log(`[Answer API] Asked question type: ${synthesizedQuestion.questionType}`)

      // Create next question
      const nextQuestionId = `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // כלל זהב: שאלת המקור חייבת להיות מוצגת עם כל שאלת המשך
      const sourceQuestionMain = getSourceQuestion(sessionId)
      
      const nextQuestion: QuestionWithOptions = {
        question: synthesizedQuestion.question,
        sourceQuestion: sourceQuestionMain, // כלל זהב!
        questionType: synthesizedQuestion.questionType,
        agentId: 'synthesizer',
        options: synthesizedQuestion.options,
        questionId: nextQuestionId
      }

      // Store synthesized question in conversation history
      addMessage(sessionId, {
        speaker: 'Parliament',
        role: 'assistant',
        content: synthesizedQuestion.question,
        timestamp: new Date().toISOString()
      })
      console.log(`[Answer API] Stored synthesized question for sessionId: ${sessionId}`)

      return NextResponse.json({
        mode: 'NEXT_QUESTION',
        nextQuestion,
        roundNumber: newRoundNumber,
        expertProposals: proposals.map(p => ({
          agentId: p.agentId,
          agentName: p.agentName,
          schoolName: p.schoolName,
          position: p.position,
          proposedQuestion: p.proposedQuestion || synthesizedQuestion.question,
          answerOptions: p.answerOptions || synthesizedQuestion.options
        }))
      })
    }

    // fallback - לא אמור להגיע לכאן
    return NextResponse.json({
      mode: 'ERROR',
      nextQuestion: undefined,
      error: 'Unexpected state - no action taken'
    })
  } catch (error) {
    console.error('Error in answer API:', error)
    return NextResponse.json(
      { error: 'שגיאה בעיבוד התשובה' },
      { status: 500 }
    )
  }
}
