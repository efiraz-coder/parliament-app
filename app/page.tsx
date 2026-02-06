'use client'

import { useState, useEffect, useRef } from 'react'
import { getAgents, Agent } from '@/lib/agents'
import { QuestionWithOptions, AnswerRequest } from '@/lib/types'
import FutureGoalOptions, { FUTURE_GOAL_OPTIONS } from '@/components/FutureGoalOptions'
import { LEADING_QUESTIONS } from '@/lib/leading-questions'

// Timeout for API calls (ms) – OpenAI can take 5–30+ seconds
const API_TIMEOUT = 90000 // 90 seconds for long flows (chair-summary, deep-analysis)
const CHAT_ANSWER_TIMEOUT = 60000 // 60 seconds for chat/answer

async function fetchWithTimeout(
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
      throw new Error('הבקשה לקחה יותר מדי זמן. נסה שוב או לחץ "שיחה חדשה".')
    }
    throw err
  }
}

interface AnsweredQuestion {
  question: QuestionWithOptions
  selectedOptions: number[]
  freeText: string
  timestamp: string
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string>('')
  const [initialMessage, setInitialMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<QuestionWithOptions | null>(null)
  const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([])
  const [selectedOptions, setSelectedOptions] = useState<number[]>([])
  const [freeText, setFreeText] = useState('')
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showChoice, setShowChoice] = useState(false)
  const [roundNumber, setRoundNumber] = useState(0)
  const [chairSummary, setChairSummary] = useState<{ mode: string; chairMessage?: string; summary?: { mechanism?: string; expertVoices?: string[]; chairLeaningToward?: string; understanding?: string; steps: string[]; resistance?: string; closing?: string; externalDomainNote?: string; jewishQuote?: string; jewishSource?: string; jewishExplanation?: string; userFriendlyExplanation?: string; actionPlan?: Array<{ title: string; description: string; success_criteria: string }>; resistanceNote?: string; offerTrainingQuestion?: string } } | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [showExpertLayer, setShowExpertLayer] = useState(false) // שכבת מומחים אופציונלית - ברירת מחדל מוסתרת
  const [showTrainingProcess, setShowTrainingProcess] = useState(false) // הצגת תהליך אימוני רק אחרי שהמשתמש בוחר "כן"
  const [userDeclinedTraining, setUserDeclinedTraining] = useState(false) // המשתמש בחר "לא תודה" להצעת תהליך אימוני
  const [trainingProcessResult, setTrainingProcessResult] = useState<{ actionPlan: Array<{ title: string; description: string; success_criteria: string }>; resistanceNote: string } | null>(null) // תהליך אימוני מ-API (קאוצ'ינג, CBT, DBT)
  const [loadingTrainingProcess, setLoadingTrainingProcess] = useState(false) // טוען תהליך אימוני מ-API
  const [isThinking, setIsThinking] = useState(false) // state לטעינה/חשיבה
  const [parliamentStage, setParliamentStage] = useState<'idle' | 'experts' | 'synthesis' | 'chair'>('idle')
  const [showParliamentManagement, setShowParliamentManagement] = useState(false)
  const [agents, setAgents] = useState<Agent[]>(getAgents())
  const [researcherNames, setResearcherNames] = useState<Record<string, string>>({})
  const [updatingAgent, setUpdatingAgent] = useState<string | null>(null)
  const [showReplaceAgent, setShowReplaceAgent] = useState<Record<string, boolean>>({})
  const [replacementNames, setReplacementNames] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  // Logout function
  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      // Clear local session
      localStorage.removeItem('parliament_sessionId')
      // Redirect to login
      window.location.href = '/login'
    } catch (err) {
      console.error('Logout error:', err)
      // Still redirect on error
      window.location.href = '/login'
    }
  }
  
  // External domain state
  const [externalDomainQuestion, setExternalDomainQuestion] = useState<{
    detected: boolean
    domain?: string
    domainDisplayName?: string
    clarificationQuestion?: string
    options?: Array<{ id: string; label: string }>
  } | null>(null)

  // Create sessionId on component mount and persist it in localStorage
  useEffect(() => {
    // Try to get existing sessionId from localStorage first
    const storedSessionId = localStorage.getItem('parliament_sessionId')
    
    if (storedSessionId && storedSessionId.trim() !== '') {
      // Use existing sessionId from localStorage
      console.log('[Frontend] Restored sessionId from localStorage:', storedSessionId)
      setSessionId(storedSessionId)
    } else if (!sessionId || sessionId.trim() === '') {
      // Create new sessionId if none exists
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      console.log('[Frontend] Created new sessionId:', newSessionId)
      setSessionId(newSessionId)
      localStorage.setItem('parliament_sessionId', newSessionId)
    }
  }, []) // Run only once on mount

  // Sync sessionId to localStorage whenever it changes
  useEffect(() => {
    if (sessionId && sessionId.trim() !== '') {
      localStorage.setItem('parliament_sessionId', sessionId)
      console.log('[Frontend] Saved sessionId to localStorage:', sessionId)
    }
  }, [sessionId])

  // גלילה אוטומטית למטה כשמוסיפים שאלות
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [answeredQuestions, currentQuestion])

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!initialMessage.trim() || !sessionId) {
      return
    }

    const userMessageText = initialMessage.trim()
    setInitialMessage('')
    setLoading(true)
    setIsThinking(true) // Start loading state - show indicator immediately
    setParliamentStage('experts') // Start with experts stage
    setError(null)
    setCurrentQuestion(null)
    setSelectedOptions([])
    setFreeText('')
    setAnsweredQuestions([])

    try {
      // Keep at 'experts' stage during API call (experts are being consulted)
      // The stage will move to 'idle' when question is received
      
      const response = await fetchWithTimeout(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userMessage: userMessageText,
            startFresh: true // אחרי הודעה ראשונה – מעבר לשאלות פתוחות (fixed-q1), גם אחרי רענון
          }),
        },
        CHAT_ANSWER_TIMEOUT
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'שגיאה בשליחת ההודעה')
      }

      const data = await response.json()
      
      if (data.question) {
        // Question received - move to idle and hide loader
        setParliamentStage('idle')
        setCurrentQuestion(data.question)
        setIsThinking(false) // Hide loader when question is shown
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשליחת ההודעה')
      setParliamentStage('idle')
      setIsThinking(false) // Hide loader on error
    } finally {
      setLoading(false)
    }
  }

  // פונקציה לזיהוי אם השאלה היא על עתיד קרוב (שבוע-שבועיים)
  const isFutureGoalQuestion = (question: string): boolean => {
    if (!question || typeof question !== 'string') return false
    
    const questionLower = question.toLowerCase()
    
    // מילות מפתח שמעידות על שאלה על עתיד + טווח זמן קצר
    const futureTimePatterns = [
      'שבוע-שבועיים',
      'שבוע שבועיים',
      'השבוע-שבועיים',
      'השבוע שבועיים',
      'בשבוע-שבועיים',
      'בשבוע שבועיים',
      'השבוע הקרוב',
      'השבועות הקרובים',
      'השבועות הקרובים',
      'שבועיים הקרובים'
    ]
    
    // מילות מפתח שמעידות על שאלה על רצון/יעד עתידי
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
    
    // בודק אם יש דפוס של זמן קצר (שבוע-שבועיים)
    const hasTimeRange = futureTimePatterns.some(pattern => questionLower.includes(pattern)) ||
                         (questionLower.includes('שבוע') && (questionLower.includes('שבועיים') || questionLower.includes('הקרוב')))
    
    // בודק אם יש דפוס של שאלה על יעד/רצון עתידי
    const hasFutureGoal = futureGoalPatterns.some(pattern => questionLower.includes(pattern)) ||
                         (questionLower.includes('רוצה') && questionLower.includes('שיקרה'))
    
    // השאלה היא על עתיד אם יש גם זמן קצר וגם דפוס של יעד/רצון
    return hasTimeRange && hasFutureGoal
  }

  const handleOptionToggle = (optionIndex: number) => {
    setSelectedOptions(prev => {
      if (prev.includes(optionIndex)) {
        return prev.filter(idx => idx !== optionIndex)
      } else {
        return [...prev, optionIndex]
      }
    })
  }

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !sessionId) {
      return
    }

    setSubmittingAnswer(true)
    setIsThinking(true) // Start loading state
    setParliamentStage('experts') // Start with experts consulting
    setError(null)

    // בדיקה אם זו שאלה על עתיד - אם כן, נשתמש באפשרויות הקבועות
    const isFutureQuestion = isFutureGoalQuestion(currentQuestion.question)
    const optionsToUse = isFutureQuestion ? FUTURE_GOAL_OPTIONS : currentQuestion.options

    // יצירת שאלה מעודכנת עם האפשרויות הנכונות
    const questionToSave: QuestionWithOptions = {
      ...currentQuestion,
      options: optionsToUse
    }

    // שמירת השאלה הנוכחית עם התשובות
    const answeredQuestion: AnsweredQuestion = {
      question: questionToSave,
      selectedOptions: [...selectedOptions],
      freeText: freeText.trim(),
      timestamp: new Date().toISOString()
    }

    setAnsweredQuestions(prev => [...prev, answeredQuestion])

    // איפוס השדות
    setSelectedOptions([])
    setFreeText('')
    setCurrentQuestion(null)

    try {
      const answerRequest: AnswerRequest = {
        sessionId,
        questionId: currentQuestion.questionId,
        question: currentQuestion.question,
        options: optionsToUse, // שימוש באפשרויות הנכונות
        selectedOptions: answeredQuestion.selectedOptions,
        freeText: answeredQuestion.freeText
      }

      const response = await fetchWithTimeout(
        '/api/answer',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(answerRequest),
        },
        CHAT_ANSWER_TIMEOUT
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'שגיאה בשליחת התשובה')
      }

      // Move to synthesis stage when we get the response (experts have been consulted)
      setParliamentStage('synthesis')

      const data = await response.json()
      
      // After receiving response, move to idle when question is set
      if (data.nextQuestion) {
        setParliamentStage('idle')
      }
      
      // Handle external domain detection - show clarification question to user
      if (data.mode === 'EXTERNAL_DOMAIN_DETECTED' && data.externalDomainQuestion) {
        console.log('[Frontend] External domain detected:', data.externalDomainQuestion.domain)
        setExternalDomainQuestion(data.externalDomainQuestion)
        setParliamentStage('idle')
        setIsThinking(false)
        setSubmittingAnswer(false)
        return // Don't continue with normal flow - wait for user's choice
      }
      
      // אם המשתמש ענה על שאלת היעד (כולל אחרי 3 השאלות הפתוחות), קבלת תשובה סופית מיו"ר
      if (data.requiresFinalAnswer) {
        setCurrentQuestion(null)
        setShowChoice(false)
        setIsThinking(true) // Start loading state – יוצג "מכין חוות דעת..."
        setParliamentStage('chair') // Move to chair stage for final answer
        setError(null)
        // קריאה אוטומטית ל-chair-summary לקבלת תשובה סופית (יכול לקחת דקה – מומחים + יו"ר)
        try {
          const summaryResponse = await fetchWithTimeout(
            '/api/chair-summary',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            },
            API_TIMEOUT
          )

          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json()
            setChairSummary(summaryData)
            setShowExpertLayer(false) // Reset expert layer for new summary
            setShowTrainingProcess(false)
            setUserDeclinedTraining(false)
            setTrainingProcessResult(null)
            setLoadingTrainingProcess(false)
            setParliamentStage('idle')
            // גלילה לתשובה הסופית כדי שהמשתמש יראה אותה
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)
          } else {
            const errData = await summaryResponse.json().catch(() => ({}))
            const errMsg = errData?.error || 'שגיאה בקבלת התשובה הסופית'
            setError(errMsg)
            setParliamentStage('idle')
          }
        } catch (err) {
          console.error('Error getting final answer from chair:', err)
          setError(err instanceof Error ? err.message : 'שגיאה בקבלת התשובה הסופית. נסה שוב או לחץ "חוות דעת וכיוון פעולה".')
          setParliamentStage('idle')
        } finally {
          setIsThinking(false) // סיום מצב טעינה
        }
      } else if (data.requiresDeepAnalysis) {
        // Need to move to deep_analysis phase
        setCurrentQuestion(null)
        setShowChoice(false)
        setIsThinking(true) // Start loading state
        setParliamentStage('chair') // Move to chair stage for deep analysis
        try {
          // Validate sessionId before calling API
          if (!sessionId || sessionId.trim() === '') {
            console.error('[Frontend] Cannot call deep-analysis: sessionId is empty')
            setError('Session ID is missing. Please start a new conversation.')
            setIsThinking(false)
            setParliamentStage('idle')
            return
          }

          // Call all experts for deep analysis
          console.log('[Frontend] Calling /api/deep-analysis with sessionId:', sessionId)
          
          const deepAnalysisResponse = await fetchWithTimeout(
            '/api/deep-analysis',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            },
            API_TIMEOUT
          )

          if (!deepAnalysisResponse.ok) {
            const errorData = await deepAnalysisResponse.json().catch(() => ({ error: 'Unknown error' }))
            console.error('[Frontend] Deep analysis API error:', errorData)
            setError(`Deep analysis failed: ${errorData.error || 'Unknown error'}`)
            setParliamentStage('idle')
            return
          }

          const analysisData = await deepAnalysisResponse.json()
          console.log('[Frontend] Deep analysis completed, received analyses:', analysisData.analyses?.length || 0)

          // After experts analyzed, call chair for final summary
          const summaryResponse = await fetchWithTimeout(
            '/api/chair-summary',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            },
            API_TIMEOUT
          )

          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json()
            setChairSummary(summaryData)
            setShowExpertLayer(false) // Reset expert layer for new summary
            setShowTrainingProcess(false)
            setUserDeclinedTraining(false)
            setTrainingProcessResult(null)
            setLoadingTrainingProcess(false)
          } else {
            const errorData = await summaryResponse.json().catch(() => ({ error: 'Unknown error' }))
            console.error('[Frontend] Chair summary API error:', errorData)
            setError(`Chair summary failed: ${errorData.error || 'Unknown error'}`)
          }
        } catch (err) {
          console.error('[Frontend] Error in deep analysis flow:', err)
          setError(`Error in deep analysis: ${err instanceof Error ? err.message : 'Unknown error'}`)
          setParliamentStage('idle')
        } finally {
          setIsThinking(false) // End loading state
        }
      } else if (data.showChoice) {
        // צריך להציג שאלת בחירה
        setShowChoice(true)
        setRoundNumber(data.roundNumber || 0)
        setParliamentStage('idle')
        setIsThinking(false) // Hide loader when choice is shown
      } else if (data.nextQuestion) {
        setCurrentQuestion(data.nextQuestion)
        setRoundNumber(data.roundNumber || 0)
        // Reset stage after question is received
        setParliamentStage('idle')
        setIsThinking(false) // Hide loader when question is shown
      } else {
        // No question or choice - hide loader
        setParliamentStage('idle')
        setIsThinking(false)
      }
    } catch (err) {
      console.error('Error submitting answer:', err)
      setError(err instanceof Error ? err.message : 'שגיאה בשליחת התשובה')
      setParliamentStage('idle')
    } finally {
      setSubmittingAnswer(false)
      setIsThinking(false) // End loading state
    }
  }

  // Handle external domain specialist choice
  const handleExternalDomainChoice = async (addSpecialist: boolean) => {
    if (!sessionId || !externalDomainQuestion) return

    setIsThinking(true)
    setParliamentStage('experts')
    setError(null)
    setExternalDomainQuestion(null) // Clear the question immediately

    try {
      const response = await fetchWithTimeout(
        '/api/answer',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            questionId: 'external-domain-choice',
            question: externalDomainQuestion.clarificationQuestion || '',
            options: [],
            selectedOptions: [],
            freeText: '',
            action: addSpecialist ? 'ADD_EXTERNAL_SPECIALIST' : 'CONTINUE_WITHOUT_EXTERNAL',
            externalDomain: externalDomainQuestion.domain
          }),
        },
        CHAT_ANSWER_TIMEOUT
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'שגיאה בעיבוד הבחירה')
      }

      const data = await response.json()
      
      if (data.mode === 'NEXT_QUESTION' && data.nextQuestion) {
        setCurrentQuestion(data.nextQuestion)
        setRoundNumber(data.roundNumber || 0)
        setParliamentStage('idle')
        setIsThinking(false)
      } else if (data.error) {
        setError(data.error)
        setParliamentStage('idle')
        setIsThinking(false)
      } else {
        // Unexpected response
        setParliamentStage('idle')
        setIsThinking(false)
      }
    } catch (err) {
      console.error('Error handling external domain choice:', err)
      setError(err instanceof Error ? err.message : 'שגיאה בעיבוד הבחירה')
      setParliamentStage('idle')
      setIsThinking(false)
    }
  }

  const handleChoice = async (choice: 'opinion' | 'continue') => {
    if (!sessionId) return

    setLoadingSummary(true)
    setIsThinking(true) // Start loading state
    setParliamentStage('chair') // Move to chair stage
    setError(null)
    setShowChoice(false)

    try {
      // שליחת הבחירה ל-API
      const choiceResponse = await fetchWithTimeout(
        '/api/choice',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, choice }),
        },
        API_TIMEOUT
      )

      if (!choiceResponse.ok) {
        const errorData = await choiceResponse.json()
        throw new Error(errorData.error || 'שגיאה בשליחת הבחירה')
      }

      if (choice === 'opinion') {
        // בחר בחוות דעת - קבלת סיכום מהפרלמנט
        const summaryResponse = await fetchWithTimeout(
          '/api/chair-summary',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          },
          API_TIMEOUT
        )

        if (!summaryResponse.ok) {
          const errorData = await summaryResponse.json()
          throw new Error(errorData.error || 'שגיאה בקבלת סיכום היו"ר')
        }

        const summaryData = await summaryResponse.json()
        
        // שמירת התגובה ב-state
        setChairSummary(summaryData)
        setShowExpertLayer(false) // Reset expert layer for new summary
        setShowTrainingProcess(false)
        setUserDeclinedTraining(false)
        setTrainingProcessResult(null)
        setLoadingTrainingProcess(false)
        
        // בדיקה קריטית: אם המשתמש כבר ענה על שאלת היעד, לא ניצור עוד שאלות
        // נבדוק זאת על ידי קריאה ל-API או בדיקה מקומית
        // אם זה FULL_SUMMARY אחרי תשובה על שאלת היעד, זה תשובה סופית - לא ניצור שאלות נוספות
        if (summaryData.mode === 'FULL_SUMMARY') {
          // זה תשובה סופית - לא ניצור שאלות נוספות
          setCurrentQuestion(null)
          setShowChoice(false)
        } else if (summaryData.mode === 'INSUFFICIENT_HISTORY' || summaryData.mode === 'USER_UNSURE') {
          // אם זו תגובה מיוחדת (אין מספיק מידע או 'לא יודע'), צריך ליצור שאלה חדשה
          // אבל רק אם המשתמש עדיין לא ענה על שאלת היעד
          // בדיקה אם השאלה של יו"ר היא על עתיד קרוב
          const chairQuestion = summaryData.chairMessage || ''
          if (isFutureGoalQuestion(chairQuestion)) {
            // אם השאלה של יו"ר היא על עתיד, יוצרים currentQuestion עם השאלה של יו"ר
            // והאפשרויות הג'נריות יוצגו אוטומטית על ידי הקומפוננטה FutureGoalOptions
            const futureQuestionId = `chair-future-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            const futureQuestion: QuestionWithOptions = {
              question: chairQuestion,
              agentId: 'chair',
              options: FUTURE_GOAL_OPTIONS, // האפשרויות הג'נריות
              questionId: futureQuestionId
            }
            setCurrentQuestion(futureQuestion)
          } else {
            // אם זו לא שאלה על עתיד, יוצרים שאלה רגילה דרך continue-question
            try {
              const continueResponse = await fetchWithTimeout(
                '/api/continue-question',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId }),
                },
                CHAT_ANSWER_TIMEOUT
              )

              if (continueResponse.ok) {
                const continueData = await continueResponse.json()
                if (continueData.nextQuestion) {
                  setCurrentQuestion(continueData.nextQuestion)
                }
              }
            } catch (err) {
              console.error('Error creating question after chair message:', err)
            }
          }
        }
      } else if (choice === 'continue') {
        // בחר להמשיך לדייק - קבלת שאלה נוספת
        const continueResponse = await fetchWithTimeout(
          '/api/continue-question',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          },
          CHAT_ANSWER_TIMEOUT
        )

        if (!continueResponse.ok) {
          const errorData = await continueResponse.json()
          throw new Error(errorData.error || 'שגיאה בקבלת שאלה נוספת')
        }

        const continueData = await continueResponse.json()
        if (continueData.nextQuestion) {
          setCurrentQuestion(continueData.nextQuestion)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעיבוד הבחירה')
      setParliamentStage('idle')
    } finally {
      setLoadingSummary(false)
      setIsThinking(false) // End loading state
    }
  }

  const handleNewSession = async () => {
    // Clear server-side session for current sessionId (so next time we don't have stale messages)
    if (sessionId) {
      try {
        await fetch('/api/clear-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        })
      } catch (_) { /* ignore */ }
    }
    // Clear localStorage when starting new session
    localStorage.removeItem('parliament_sessionId')
    const freshSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    console.log('[Frontend] Starting new session with sessionId:', freshSessionId)
    setSessionId(freshSessionId)
    localStorage.setItem('parliament_sessionId', freshSessionId)
    setCurrentQuestion(null)
    setAnsweredQuestions([])
    setSelectedOptions([])
    setFreeText('')
    setInitialMessage('')
    setShowChoice(false)
    setChairSummary(null)
    setShowExpertLayer(false) // Reset expert layer visibility
    setShowTrainingProcess(false)
    setUserDeclinedTraining(false)
    setTrainingProcessResult(null)
    setLoadingTrainingProcess(false)
    setRoundNumber(0)
  }

  const handleUpdateExpert = async (agentId: string) => {
    const researcherName = researcherNames[agentId]?.trim()
    if (!researcherName) return

    setUpdatingAgent(agentId)
    setError(null)

    try {
      const response = await fetchWithTimeout(
        '/api/update-expert',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId, researcherName }),
        },
        CHAT_ANSWER_TIMEOUT
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'שגיאה בעדכון המומחה')
      }

      const data = await response.json()
      
      // עדכון הרשימה המקומית
      setAgents(getAgents())
      
      // איפוס שדה הטקסט
      setResearcherNames({
        ...researcherNames,
        [agentId]: ''
      })

      alert(`המומחה עודכן בהצלחה! כעת הוא בהשראת ${researcherName}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון המומחה')
    } finally {
      setUpdatingAgent(null)
    }
  }

  return (
    <main
      className="app-main"
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h1 className="app-title" style={{ margin: 0 }}>
          Parliament App
        </h1>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.9rem',
            fontWeight: '500',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loggingOut ? 'not-allowed' : 'pointer',
            opacity: loggingOut ? 0.7 : 1,
            transition: 'background-color 0.2s'
          }}
        >
          {loggingOut ? 'מתנתק...' : 'יציאה'}
        </button>
      </div>

      {/* רשימת חברי הפרלמנט */}
      <div className="parliament-container" style={{
        marginBottom: '2rem',
        backgroundColor: '#f9f9f9',
        borderRadius: '16px'
      }}>
        <h2 className="parliament-title">
          חברי הפרלמנט
        </h2>
        <div className="members-grid">
          {agents.map((agent) => {
            const initials = agent.name
              .split(/[\s\/-]/)
              .map(word => word.charAt(0))
              .filter(char => char && char !== 'ה' && char !== 'ת')
              .slice(0, 2)
              .join('')
              .toUpperCase() || agent.name.charAt(0)
            
            // Map agent ID to CSS class for icon color
            const getIconClass = (agentId: string): string => {
              const classMap: Record<string, string> = {
                'psychodynamic-freudian': 'icon-psychodynamic',
                'cbt': 'icon-cbt',
                'dbt': 'icon-dbt',
                'managerial-organizational': 'icon-managerial',
                'social-sociological': 'icon-social',
                'modern-stoic': 'icon-stoic'
              }
              return classMap[agentId] || 'icon-psychodynamic'
            }
            
            return (
              <div
                key={agent.id}
                className="member-card"
              >
                <div className={`card-icon ${getIconClass(agent.id)}`}>
                  {initials}
                </div>
                <div className="card-title">
                  {agent.displayName}
                </div>
                <div className="card-text">
                  {agent.expertiseDescription}
                </div>
                <button
                  type="button"
                  className="card-link"
                  onClick={() => setShowReplaceAgent({
                    ...showReplaceAgent,
                    [agent.id]: !showReplaceAgent[agent.id]
                  })}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    marginTop: 'auto'
                  }}
                >
                  להחלפת חבר פרלמנט זה
                </button>
                {showReplaceAgent[agent.id] && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '12px',
                    width: '100%'
                  }}>
                    <input
                      type="text"
                      placeholder="הכנס שם חבר פרלמנט חלופי"
                      value={replacementNames[agent.id] || ''}
                      onChange={(e) => setReplacementNames({
                        ...replacementNames,
                        [agent.id]: e.target.value
                      })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.9rem',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        marginBottom: '0.75rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const replacementName = replacementNames[agent.id]?.trim()
                        if (replacementName) {
                          console.log(`שם חלופי ל-${agent.name}: ${replacementName}`)
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        backgroundColor: '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0051cc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0070f3'}
                    >
                      החלף
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* אזור ניהול פרלמנט - הוזז מתחת לגריד */}
      <div style={{
        marginTop: '2rem',
        marginBottom: '2rem',
        padding: '1.5rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
        width: '100%'
      }}>
        <button
          type="button"
          onClick={() => setShowParliamentManagement(!showParliamentManagement)}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            fontWeight: '600',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#333'
          }}
        >
          <span>ניהול פרלמנט</span>
          <span>{showParliamentManagement ? '▼' : '▶'}</span>
        </button>

        {showParliamentManagement && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#fff',
            borderRadius: '8px'
          }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: '#333'
            }}>
              החלף מומחה
            </h3>
            <p style={{
              fontSize: '0.9rem',
              color: '#666',
              marginBottom: '1rem'
            }}>
              הזן שם חוקר/ת חדש/ה כדי להחליף את המומחה הנוכחי
            </p>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#fafafa'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        marginBottom: '0.25rem',
                        color: '#333'
                      }}>
                        {agent.name}
                      </div>
                      <div style={{
                        fontSize: '0.85rem',
                        color: '#666',
                        marginBottom: '0.5rem'
                      }}>
                        {agent.role} • בהשראת: {agent.inspiredBy}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center',
                      flex: '1',
                      minWidth: '250px'
                    }}>
                      <input
                        type="text"
                        placeholder="שם חוקר/ת חדש/ה..."
                        value={researcherNames[agent.id] || ''}
                        onChange={(e) => setResearcherNames({
                          ...researcherNames,
                          [agent.id]: e.target.value
                        })}
                        style={{
                          flex: '1',
                          padding: '0.5rem',
                          fontSize: '0.9rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateExpert(agent.id)}
                        disabled={!researcherNames[agent.id]?.trim() || updatingAgent === agent.id}
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          backgroundColor: updatingAgent === agent.id ? '#999' : '#0070f3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: updatingAgent === agent.id ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {updatingAgent === agent.id ? 'מעדכן...' : 'החלף מומחה'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* אזור השיחה */}
      <div className="chat-area" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '2rem',
        width: '100%'
      }}>
        {/* טופס התחלת שיחה + שאלות מובילות */}
        {answeredQuestions.length === 0 && !currentQuestion && (
          <>
            {/* שאלות מובילות – לחיצה ממלאת את השדה */}
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{
                fontSize: '0.95rem',
                fontWeight: '600',
                color: '#495057',
                marginBottom: '0.75rem'
              }}>
                שאלות מובילות – התחל מכאן
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {LEADING_QUESTIONS.map(cat => (
                  <div key={cat.id}>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#6c757d',
                      marginBottom: '0.35rem'
                    }}>
                      {cat.name}
                    </div>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.35rem'
                    }}>
                      {cat.questions.map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setInitialMessage(q)}
                          style={{
                            padding: '0.4rem 0.65rem',
                            fontSize: '0.8rem',
                            backgroundColor: initialMessage === q ? '#e6f0ff' : '#fff',
                            border: `1px solid ${initialMessage === q ? '#0070f3' : '#dee2e6'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            color: '#333',
                            textAlign: 'right',
                            maxWidth: '100%'
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={handleStartConversation} className="start-form" style={{
              marginBottom: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{
                fontSize: '0.95rem',
                fontWeight: '600',
                color: '#495057',
                marginBottom: '0.25rem'
              }}>
                או כתוב שאלה אישית / משלימה משלך
              </div>
              <textarea
                className="textarea-field"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="כתוב כאן את השאלה או הנושא שבו תרצה לדון עם הפרלמנט – אישי, משלים, או כל נושא אחר..."
                style={{
                  minHeight: '120px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !initialMessage.trim()}
                style={{
                  opacity: loading || !initialMessage.trim() ? 0.6 : 1,
                  cursor: loading || !initialMessage.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'שולח...' : 'התחל שיחה'}
              </button>
            </form>
          </>
        )}

        {/* אזור השאלות והתשובות */}
        <div className="qa-container" style={{
          flex: 1,
          minHeight: '300px',
          maxHeight: '800px',
          overflowY: 'auto',
          padding: '1rem',
          backgroundColor: '#fafafa',
          borderRadius: '12px',
          border: '1px solid #e0e0e0',
          marginBottom: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          {/* שאלות שכבר נענו */}
          {answeredQuestions.map((answered, index) => (
            <div key={answered.timestamp} style={{
              padding: '1.5rem',
              backgroundColor: '#fff',
              borderRadius: '12px',
              border: '1px solid #e0e0e0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: '#333',
                lineHeight: '1.6'
              }}>
                {answered.question.question}
              </div>
              
              <div style={{
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid #e0e0e0'
              }}>
                {/* שאלה פתוחה (ללא אפשרויות) – מציגים רק את התשובה החופשית */}
                {answered.question.options.length === 0 ? (
                  answered.freeText && (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      color: '#333'
                    }}>
                      <strong>תשובתך:</strong> {answered.freeText}
                    </div>
                  )
                ) : (
                  <>
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#666',
                      marginBottom: '0.5rem'
                    }}>
                      תשובות שנבחרו:
                    </div>
                    {answered.selectedOptions.length > 0 ? (
                      <ul style={{
                        margin: 0,
                        paddingRight: '1.5rem',
                        color: '#333'
                      }}>
                        {answered.selectedOptions.map(optIdx => (
                          <li key={optIdx} style={{ marginBottom: '0.25rem' }}>
                            {answered.question.options[optIdx]}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ color: '#999', fontStyle: 'italic' }}>לא נבחרו תשובות</div>
                    )}
                    {answered.freeText && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        color: '#333'
                      }}>
                        <strong>תשובה חופשית:</strong> {answered.freeText}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* הודעת יו"ר מיוחדת (אין מספיק מידע או 'לא יודע') */}
          {chairSummary && (chairSummary.mode === 'INSUFFICIENT_HISTORY' || chairSummary.mode === 'USER_UNSURE') && (
            <div style={{
              padding: '2rem',
              backgroundColor: '#fff3cd',
              borderRadius: '12px',
              border: '2px solid #ffc107',
              marginTop: '1rem'
            }}>
              <div style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: '#856404',
                textAlign: 'center'
              }}>
                הודעת יו"ר הפרלמנט
              </div>
              <div style={{
                fontSize: '1rem',
                lineHeight: '1.8',
                color: '#333',
                whiteSpace: 'pre-wrap'
              }}>
                {chairSummary.chairMessage}
              </div>
            </div>
          )}

          {/* תצוגת סיכום היו"ר המלא */}
          {chairSummary && chairSummary.mode === 'FULL_SUMMARY' && chairSummary.summary && (
            <div style={{
              padding: '2rem',
              backgroundColor: '#fff3cd',
              borderRadius: '12px',
              border: '2px solid #ffc107',
              marginTop: '1rem'
            }}>
              <div style={{
                fontSize: '1.3rem',
                fontWeight: '700',
                marginBottom: '1.5rem',
                color: '#856404',
                textAlign: 'center'
              }}>
                תשובה סופית
              </div>

              {/* התובנה המרכזית – הסבר בשפה יומיומית */}
              {(chairSummary.summary.userFriendlyExplanation || chairSummary.summary.mechanism) && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  border: '2px solid #ff9800',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    fontSize: '1rem',
                    color: '#333',
                    fontWeight: '500',
                    lineHeight: '1.8',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {chairSummary.summary.userFriendlyExplanation || chairSummary.summary.mechanism}
                  </div>
                </div>
              )}

              {/* שכבת מומחים אופציונלית - ברירת מחדל מוסתרת */}
              {chairSummary.summary.expertVoices && chairSummary.summary.expertVoices.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  {/* כפתור להצגת שכבת המומחים */}
                  {!showExpertLayer ? (
                    <button
                      onClick={() => setShowExpertLayer(true)}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'transparent',
                        border: '1px dashed #6c757d',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        color: '#6c757d',
                        width: '100%',
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa'
                        e.currentTarget.style.borderColor = '#495057'
                        e.currentTarget.style.color = '#495057'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.borderColor = '#6c757d'
                        e.currentTarget.style.color = '#6c757d'
                      }}
                    >
                      אם תרצה/י, אפשר גם לראות איך קולות המומחים מפרשים את זה בשפה מקצועית יותר
                    </button>
                  ) : (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #ffc107'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem'
                      }}>
                        <div style={{
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          color: '#856404'
                        }}>
                          כך המומחים מתארים את מה שסיפרת (לקריאה חופשית, לא חובה)
                        </div>
                        <button
                          onClick={() => setShowExpertLayer(false)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            color: '#6c757d'
                          }}
                        >
                          הסתר
                        </button>
                      </div>
                      <ul style={{ margin: 0, paddingRight: '1.25rem', color: '#333', fontSize: '0.95rem', lineHeight: '1.6' }}>
                        {chairSummary.summary.expertVoices.map((voice, idx) => (
                          <li key={idx} style={{ marginBottom: '0.35rem' }}>{voice}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* לאיזו עמדה היו"ר נוטה - חלק משכבת המומחים האופציונלית */}
              {showExpertLayer && chairSummary.summary.chairLeaningToward && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#e8f5e9',
                  borderRadius: '8px',
                  border: '1px solid #4caf50',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: '#2e7d32'
                  }}>
                    לאיזו עמדה היו״ר נוטה
                  </div>
                  <div style={{
                    fontSize: '0.95rem',
                    color: '#2e7d32',
                    lineHeight: '1.6'
                  }}>
                    {chairSummary.summary.chairLeaningToward}
                  </div>
                </div>
              )}

              {/* המלצה לתחום חיצוני – לפני שאלת התהליך */}
              {chairSummary.summary.externalDomainNote && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '8px',
                  border: '1px solid #2196f3',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: '#1565c0'
                  }}>
                    הערה לתחום חיצוני
                  </div>
                  <div style={{
                    fontSize: '0.95rem',
                    color: '#333',
                    lineHeight: '1.6'
                  }}>
                    {chairSummary.summary.externalDomainNote}
                  </div>
                </div>
              )}

              {/* פסקת סיום – תובנה ממקורות יהודיים או שורת סיכום – לפני שאלת התהליך */}
              {(chairSummary.summary.jewishQuote && chairSummary.summary.jewishExplanation) ? (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#fffbea',
                  borderRadius: '8px',
                  border: '1px solid #d4a84b',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#7d5a00', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {chairSummary.summary.jewishSource ? `ממקורות יהודיים (${chairSummary.summary.jewishSource})` : 'ממקורות יהודיים'}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#333', lineHeight: '1.8', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                    {chairSummary.summary.jewishQuote}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#555', fontWeight: 600, marginBottom: '0.25rem' }}>
                    ההסבר המודרני:
                  </div>
                  <div style={{ fontSize: '1rem', color: '#333', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                    {chairSummary.summary.jewishExplanation}
                  </div>
                </div>
              ) : chairSummary.summary.closing ? (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #ffc107',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '1rem',
                    color: '#333',
                    lineHeight: '1.8',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {chairSummary.summary.closing}
                  </div>
                </div>
              ) : null}

              {/* שאלת הצעת תהליך אימוני – מוצגת אחרי התובנות; אם המשתמש בוחר "כן" נשלח המידע ל-AI ונציג תהליך (קאוצ'ינג, CBT, DBT) */}
              {!showTrainingProcess && !userDeclinedTraining && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1.25rem',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  border: '2px solid #ffc107'
                }}>
                  <div style={{ fontSize: '1rem', color: '#333', marginBottom: '1rem', fontWeight: '500' }}>
                    {chairSummary.summary.offerTrainingQuestion || 'היית רוצה לקבל תהליך אימוני לסיוע?'}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={loadingTrainingProcess}
                      onClick={async () => {
                        setLoadingTrainingProcess(true)
                        setError(null)
                        try {
                          const res = await fetchWithTimeout(
                            '/api/training-process',
                            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) },
                            API_TIMEOUT
                          )
                          if (!res.ok) {
                            const errData = await res.json().catch(() => ({}))
                            throw new Error(errData.error || 'שגיאה בבקשת תהליך אימוני')
                          }
                          const data = await res.json()
                          setTrainingProcessResult({ actionPlan: data.actionPlan || [], resistanceNote: data.resistanceNote || '' })
                          setShowTrainingProcess(true)
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'שגיאה בבקשת תהליך אימוני')
                        } finally {
                          setLoadingTrainingProcess(false)
                        }
                      }}
                      style={{
                        padding: '0.6rem 1.2rem',
                        backgroundColor: loadingTrainingProcess ? '#ccc' : '#ffc107',
                        color: '#333',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: loadingTrainingProcess ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {loadingTrainingProcess ? 'טוען...' : 'כן, לקבל תהליך אימוני'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserDeclinedTraining(true)}
                      style={{
                        padding: '0.6rem 1.2rem',
                        backgroundColor: '#f5f5f5',
                        color: '#555',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        cursor: 'pointer'
                      }}
                    >
                      לא תודה
                    </button>
                  </div>
                </div>
              )}

              {/* תהליך אימוני + התנגדות צפויה – רק אחרי שהמשתמש בוחר "כן" (מ-API: קאוצ'ינג, CBT, DBT או מיו"ר) */}
              {showTrainingProcess && (
                <>
                  {loadingTrainingProcess ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#856404' }}>
                      טוען תהליך אימוני...
                    </div>
                  ) : (
                    <>
                      <div style={{
                        marginBottom: '1rem',
                        padding: '1.5rem',
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        border: '1px solid #ffc107'
                      }}>
                        <div style={{
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          marginBottom: '1rem',
                          color: '#856404'
                        }}>
                          תהליך אימוני לשבוע-שבועיים הקרובים (כולל כלי קאוצ'ינג, CBT ו-DBT):
                        </div>
                        {((trainingProcessResult?.actionPlan)?.length ?? 0) > 0 ? (
                          <ol style={{
                            margin: 0,
                            paddingRight: '1.5rem',
                            color: '#333',
                            fontSize: '1rem',
                            lineHeight: '1.8'
                          }}>
                            {(trainingProcessResult?.actionPlan ?? []).map((step, index) => (
                              <li key={index} style={{ marginBottom: '0.75rem' }}>
                                <strong>{step.title}:</strong> {step.description}
                                {step.success_criteria && (
                                  <span style={{ display: 'block', fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                                    (קריטריון: {step.success_criteria})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ol>
                        ) : chairSummary.summary.actionPlan && chairSummary.summary.actionPlan.length > 0 ? (
                          <ol style={{
                            margin: 0,
                            paddingRight: '1.5rem',
                            color: '#333',
                            fontSize: '1rem',
                            lineHeight: '1.8'
                          }}>
                            {chairSummary.summary.actionPlan.map((step, index) => (
                              <li key={index} style={{ marginBottom: '0.75rem' }}>
                                <strong>{step.title}:</strong> {step.description}
                                {step.success_criteria && (
                                  <span style={{ display: 'block', fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                                    (קריטריון: {step.success_criteria})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <ol style={{
                            margin: 0,
                            paddingRight: '1.5rem',
                            color: '#333',
                            fontSize: '1rem',
                            lineHeight: '1.8'
                          }}>
                            {(chairSummary.summary.steps || []).map((step, index) => (
                              <li key={index} style={{ marginBottom: '0.5rem' }}>{step}</li>
                            ))}
                          </ol>
                        )}
                      </div>

                      {/* התנגדות צפויה */}
                      {(trainingProcessResult?.resistanceNote ?? chairSummary.summary.resistanceNote ?? chairSummary.summary.resistance) && (
                        <div style={{
                          padding: '1rem',
                          backgroundColor: '#fff3e0',
                          borderRadius: '8px',
                          border: '1px solid #ff9800',
                          marginTop: '0.5rem'
                        }}>
                          <div style={{
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            marginBottom: '0.5rem',
                            color: '#e65100'
                          }}>
                            התנגדות צפויה
                          </div>
                          <div style={{
                            fontSize: '0.95rem',
                            color: '#333',
                            lineHeight: '1.6'
                          }}>
                            {trainingProcessResult?.resistanceNote || chairSummary.summary.resistanceNote || chairSummary.summary.resistance}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Global thinking indicator */}
          {(isThinking || submittingAnswer || loadingSummary) && !externalDomainQuestion && (
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '12px',
              border: '1px solid #e0e0e0',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '3px solid #e0e0e0',
                borderTopColor: '#0070f3',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span style={{ color: '#666', fontSize: '1rem' }}>
                {parliamentStage === 'chair' ? 'מכין חוות דעת מהפרלמנט – המומחים מנתחים, יו"ר מסכם (זה יכול לקחת עד דקה)' : 'הפרלמנט מתייעץ עבורך... (זה יכול לקחת עד דקה)'}
              </span>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}

          {/* שאלת בחירה */}
          {showChoice && !chairSummary && (
            <div style={{
              padding: '2rem',
              backgroundColor: '#e3f2fd',
              borderRadius: '12px',
              border: '2px solid #2196f3',
              marginTop: '1rem'
            }}>
              <div style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                color: '#333',
                textAlign: 'center',
                lineHeight: '1.6'
              }}>
                יש לנו כבר תמונה די טובה. תרצה עכשיו חוות דעת וכיוון פעולה, או להמשיך לדייק את הבעיה?
              </div>

              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <button
                  type="button"
                  onClick={() => handleChoice('opinion')}
                  disabled={loadingSummary}
                  style={{
                    padding: '1rem 2rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    backgroundColor: loadingSummary ? '#999' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loadingSummary ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                    minWidth: '200px'
                  }}
                >
                  {loadingSummary ? 'מעבד...' : 'חוות דעת וכיוון פעולה'}
                </button>
                <button
                  type="button"
                  onClick={() => handleChoice('continue')}
                  disabled={loadingSummary}
                  style={{
                    padding: '1rem 2rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    backgroundColor: loadingSummary ? '#999' : '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loadingSummary ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                    minWidth: '200px'
                  }}
                >
                  {loadingSummary ? 'מעבד...' : 'נמשיך לדייק'}
                </button>
              </div>
            </div>
          )}

          {/* External domain question - ask user if they want to add a specialist */}
          {externalDomainQuestion && (
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#fff8e1',
              borderRadius: '12px',
              border: '2px solid #ffc107',
              boxShadow: '0 2px 6px rgba(255,193,7,0.3)',
              marginBottom: '1rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#ffc107',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '1.25rem'
                }}>
                  💡
                </div>
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: '#856404',
                    marginBottom: '0.5rem',
                    fontSize: '1rem'
                  }}>
                    זוהה תחום חיצוני: {externalDomainQuestion.domainDisplayName}
                  </div>
                  <div style={{
                    fontSize: '0.95rem',
                    color: '#333',
                    lineHeight: '1.6'
                  }}>
                    {externalDomainQuestion.clarificationQuestion}
                  </div>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <button
                  type="button"
                  onClick={() => handleExternalDomainChoice(true)}
                  disabled={isThinking}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '0.875rem 1.25rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: isThinking ? 'not-allowed' : 'pointer',
                    opacity: isThinking ? 0.7 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  {isThinking ? 'מעבד...' : 'כן, להוסיף מומחה-חוץ'}
                </button>
                <button
                  type="button"
                  onClick={() => handleExternalDomainChoice(false)}
                  disabled={isThinking}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '0.875rem 1.25rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: isThinking ? 'not-allowed' : 'pointer',
                    opacity: isThinking ? 0.7 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  {isThinking ? 'מעבד...' : 'לא, להמשיך בלי מומחה-חוץ'}
                </button>
              </div>
            </div>
          )}

          {/* שאלה נוכחית */}
          {/* לא נציג שאלות חדשות אם המשתמש כבר קיבל תשובה סופית (FULL_SUMMARY אחרי תשובה על שאלת היעד) */}
          {currentQuestion && !showChoice && !externalDomainQuestion && (!chairSummary || chairSummary.mode === 'INSUFFICIENT_HISTORY' || chairSummary.mode === 'USER_UNSURE') && (
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#fff',
              borderRadius: '12px',
              border: '2px solid #0070f3',
              boxShadow: '0 2px 6px rgba(0,112,243,0.2)'
            }}>
              {/* כלל זהב: שאלת המקור מוצגת תמיד! */}
              {currentQuestion.sourceQuestion && (
                <div style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#f0f7ff',
                  borderRadius: '8px',
                  borderRight: '4px solid #0070f3'
                }}>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#666',
                    marginBottom: '0.25rem',
                    fontWeight: '600'
                  }}>
                    שאלת המקור:
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    color: '#333',
                    lineHeight: '1.5'
                  }}>
                    {currentQuestion.sourceQuestion}
                  </div>
                </div>
              )}
              
              {/* שאלת המשך עם סוג השאלה */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: currentQuestion.sourceQuestion ? '0.85rem' : '1.2rem',
                color: currentQuestion.sourceQuestion ? '#666' : '#333',
                marginBottom: currentQuestion.sourceQuestion ? '0.25rem' : '0',
                fontWeight: currentQuestion.sourceQuestion ? '600' : 'normal'
              }}>
                {currentQuestion.sourceQuestion ? 'שאלת המשך:' : ''}
                {currentQuestion.questionType && (
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    backgroundColor: currentQuestion.questionType === 'pattern' ? '#e3f2fd' :
                                     currentQuestion.questionType === 'context' ? '#f3e5f5' :
                                     currentQuestion.questionType === 'motivation' ? '#e8f5e9' : '#f5f5f5',
                    color: currentQuestion.questionType === 'pattern' ? '#1565c0' :
                           currentQuestion.questionType === 'context' ? '#7b1fa2' :
                           currentQuestion.questionType === 'motivation' ? '#2e7d32' : '#666'
                  }}>
                    {currentQuestion.questionType === 'pattern' ? 'דפוס' :
                     currentQuestion.questionType === 'context' ? 'הקשר' :
                     currentQuestion.questionType === 'motivation' ? 'מוטיבציה' : ''}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                color: '#333',
                lineHeight: '1.6'
              }}>
                {currentQuestion.question}
              </div>

              {/* שאלה פתוחה (ללא אפשרויות) – רק שדה תשובה חופשית */}
              {currentQuestion.options.length === 0 ? (
                <div style={{ marginBottom: '1.5rem' }}>
                  <textarea
                    className="textarea-field"
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    placeholder="כתוב את תשובתך כאן"
                    style={{
                      minHeight: '120px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      width: '100%',
                      padding: '1rem',
                      borderRadius: '10px',
                      border: '2px solid #e9ecef',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              ) : isFutureGoalQuestion(currentQuestion.question) ? (
                <FutureGoalOptions
                  selectedOptions={selectedOptions}
                  freeText={freeText}
                  onOptionToggle={handleOptionToggle}
                  onFreeTextChange={setFreeText}
                />
              ) : (
                <>
                  {/* 4 תשובות אפשריות רגילות */}
                  <div className="options-list" style={{
                    marginBottom: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    {currentQuestion.options.map((option, index) => (
                      <label
                        key={index}
                        className={`option-label ${selectedOptions.includes(index) ? 'selected' : ''}`}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          padding: '1rem',
                          backgroundColor: selectedOptions.includes(index) ? '#e6f0ff' : '#f8f9fa',
                          borderRadius: '10px',
                          border: selectedOptions.includes(index) ? '2px solid #0070f3' : '2px solid #e9ecef',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedOptions.includes(index)}
                          onChange={() => handleOptionToggle(index)}
                          style={{
                            marginTop: '0.25rem',
                            cursor: 'pointer',
                            width: '18px',
                            height: '18px',
                            flexShrink: 0
                          }}
                        />
                        <span style={{
                          flex: 1,
                          fontSize: '0.95rem',
                          color: '#333',
                          lineHeight: '1.5'
                        }}>
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Textarea לתשובה חופשית */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <textarea
                      className="textarea-field"
                      value={freeText}
                      onChange={(e) => setFreeText(e.target.value)}
                      placeholder="אם בא לך להוסיף משהו במילים שלך – כתוב כאן"
                      style={{
                        minHeight: '60px',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </>
              )}

              {/* כפתור שליחת תשובה: בשאלה פתוחה – רק לפי freeText; בשאלה עם אפשרויות – לפי בחירה או freeText */}
              {(() => {
                const isOpenQuestion = currentQuestion.options.length === 0
                const canSubmit = isOpenQuestion ? !!freeText.trim() : (selectedOptions.length > 0 || !!freeText.trim())
                const disabled = submittingAnswer || !canSubmit
                return (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSubmitAnswer}
                    disabled={disabled}
                    style={{
                      opacity: disabled ? 0.6 : 1,
                      backgroundColor: disabled ? '#999' : '#0070f3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {submittingAnswer ? 'שולח...' : 'שלח תשובה'}
                  </button>
                )
              })()}
            </div>
          )}

          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#666'
            }}>
              המומחים חושבים... (זה יכול לקחת עד דקה)
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* כפתור שיחה חדשה */}
        {(answeredQuestions.length > 0 || currentQuestion) && (
          <button
            type="button"
            onClick={handleNewSession}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              alignSelf: 'flex-start'
            }}
          >
            שיחה חדשה
          </button>
        )}
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: (error.includes('השיחה הסתיימה') || error.includes('Session completed')) ? '#e3f2fd' : '#fee',
          border: (error.includes('השיחה הסתיימה') || error.includes('Session completed')) ? '1px solid #2196f3' : '1px solid #fcc',
          borderRadius: '8px',
          color: (error.includes('השיחה הסתיימה') || error.includes('Session completed')) ? '#1565c0' : '#c00',
          marginBottom: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {(error.includes('השיחה הסתיימה') || error.includes('Session completed')) ? (
            <>
              <span>{error}</span>
              <button
                type="button"
                onClick={() => { handleNewSession(); setError(null); }}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  backgroundColor: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  alignSelf: 'flex-start'
                }}
              >
                שיחה חדשה
              </button>
            </>
          ) : (
            <>שגיאה: {error}</>
          )}
        </div>
      )}

    </main>
  )
}
