'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Send, Sparkles, RefreshCw, Check, MessageCircle } from 'lucide-react'
import { getAgents, Agent } from '@/lib/agents'
import { QuestionWithOptions, AnswerRequest, ChairSummaryResponse } from '@/lib/types'
import { LEADING_QUESTIONS } from '@/lib/leading-questions'
import { fetchWithTimeout, API_TIMEOUT, CHAT_ANSWER_TIMEOUT } from '@/lib/api'
import { CATEGORY_TILES } from '@/lib/experts-ui'
import ExpertPill from '@/components/ui/ExpertPill'

interface AnsweredQuestion {
  question: QuestionWithOptions
  selectedOptions: number[]
  freeText: string
  timestamp: string
}

export default function Home() {
  const router = useRouter()
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
  const [chairSummary, setChairSummary] = useState<ChairSummaryResponse | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [agents] = useState<Agent[]>(getAgents())
  const [showLeadingQuestions, setShowLeadingQuestions] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Session management
  useEffect(() => {
    const storedSessionId = localStorage.getItem('parliament_sessionId')
    if (storedSessionId && storedSessionId.trim() !== '') {
      setSessionId(storedSessionId)
    } else {
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setSessionId(newSessionId)
      localStorage.setItem('parliament_sessionId', newSessionId)
    }
  }, [])

  useEffect(() => {
    if (sessionId && sessionId.trim() !== '') {
      localStorage.setItem('parliament_sessionId', sessionId)
    }
  }, [sessionId])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [answeredQuestions, currentQuestion])

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!initialMessage.trim() || !sessionId) return

    const userMessageText = initialMessage.trim()
    setInitialMessage('')
    setLoading(true)
    setIsThinking(true)
    setError(null)
    setCurrentQuestion(null)
    setSelectedOptions([])
    setFreeText('')
    setAnsweredQuestions([])
    setShowLeadingQuestions(false)

    try {
      const response = await fetchWithTimeout(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, userMessage: userMessageText, startFresh: true }),
        },
        CHAT_ANSWER_TIMEOUT
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'שגיאה בשליחת ההודעה')
      }

      const data = await response.json()
      if (data.question) {
        setCurrentQuestion(data.question)
        setIsThinking(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשליחת ההודעה')
      setIsThinking(false)
    } finally {
      setLoading(false)
    }
  }

  const handleQuestionSelect = (question: string) => {
    setInitialMessage(question)
    setSelectedCategory(null)
  }

  const handleOptionToggle = (optionIndex: number) => {
    setSelectedOptions(prev =>
      prev.includes(optionIndex)
        ? prev.filter(idx => idx !== optionIndex)
        : [...prev, optionIndex]
    )
  }

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !sessionId) return

    setSubmittingAnswer(true)
    setIsThinking(true)
    setError(null)

    const answeredQuestion: AnsweredQuestion = {
      question: currentQuestion,
      selectedOptions: [...selectedOptions],
      freeText: freeText.trim(),
      timestamp: new Date().toISOString(),
    }

    setAnsweredQuestions(prev => [...prev, answeredQuestion])
    setSelectedOptions([])
    setFreeText('')
    setCurrentQuestion(null)

    try {
      const answerRequest: AnswerRequest = {
        sessionId,
        questionId: currentQuestion.questionId,
        question: currentQuestion.question,
        options: currentQuestion.options,
        selectedOptions: answeredQuestion.selectedOptions,
        freeText: answeredQuestion.freeText,
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

      const data = await response.json()

      if (data.requiresFinalAnswer || data.requiresDeepAnalysis) {
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
        }
        setIsThinking(false)
      } else if (data.showChoice) {
        setShowChoice(true)
        setRoundNumber(data.roundNumber || 0)
        setIsThinking(false)
      } else if (data.nextQuestion) {
        setCurrentQuestion(data.nextQuestion)
        setRoundNumber(data.roundNumber || 0)
        setIsThinking(false)
      } else {
        setIsThinking(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשליחת התשובה')
      setIsThinking(false)
    } finally {
      setSubmittingAnswer(false)
    }
  }

  const handleChoice = async (choice: 'opinion' | 'continue') => {
    if (!sessionId) return

    setLoadingSummary(true)
    setIsThinking(true)
    setError(null)
    setShowChoice(false)

    try {
      await fetchWithTimeout(
        '/api/choice',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, choice }),
        },
        API_TIMEOUT
      )

      if (choice === 'opinion') {
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
        }
      } else {
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעיבוד הבחירה')
    } finally {
      setLoadingSummary(false)
      setIsThinking(false)
    }
  }

  const handleNewSession = async () => {
    if (sessionId) {
      try {
        await fetch('/api/clear-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
      } catch {}
    }
    localStorage.removeItem('parliament_sessionId')
    const freshSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setSessionId(freshSessionId)
    localStorage.setItem('parliament_sessionId', freshSessionId)
    setCurrentQuestion(null)
    setAnsweredQuestions([])
    setSelectedOptions([])
    setFreeText('')
    setInitialMessage('')
    setShowChoice(false)
    setChairSummary(null)
    setRoundNumber(0)
    setShowLeadingQuestions(true)
    setSelectedCategory(null)
    setError(null)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏛️</span>
            <h1 
              className="text-xl font-bold text-[#0F172A]" 
              style={{ fontFamily: 'Georgia, "Frank Ruhl Libre", serif' }}
            >
              הפרלמנט הפנימי
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {(answeredQuestions.length > 0 || currentQuestion) && (
              <button
                onClick={handleNewSession}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">שיחה חדשה</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-medium transition-colors"
            >
              יציאה
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 md:px-8 py-12">
        {/* Hero Section */}
        <AnimatePresence mode="wait">
          {showLeadingQuestions && answeredQuestions.length === 0 && !currentQuestion && (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              {/* Main Headline */}
              <div className="text-center">
                <h2 
                  className="text-3xl md:text-4xl font-bold text-[#0F172A] leading-tight"
                  style={{ fontFamily: 'Georgia, "Frank Ruhl Libre", serif' }}
                >
                  איזו החלטה נוכל לעזור לך לקבל היום?
                </h2>
              </div>

              {/* Category Tiles Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {CATEGORY_TILES.map((cat) => {
                  const IconComponent = cat.icon
                  const isSelected = selectedCategory === cat.id
                  return (
                    <motion.button
                      key={cat.id}
                      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                      className={`relative p-6 rounded-xl transition-all duration-200 border shadow-sm ${
                        isSelected
                          ? 'bg-[#1E293B] text-white border-[#1E293B] shadow-lg'
                          : 'bg-white text-[#1E293B] border-slate-200 hover:shadow-md hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <IconComponent 
                          className={`w-11 h-11 transition-colors ${
                            isSelected ? 'text-white' : 'text-[#1E293B]'
                          }`} 
                        />
                        <span className="font-medium text-base">{cat.name}</span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              {/* Selected Category Questions */}
              <AnimatePresence>
                {selectedCategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {LEADING_QUESTIONS.find(c => c.id === selectedCategory)?.questions.map((q, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ x: 4, backgroundColor: '#F1F5F9' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleQuestionSelect(q)}
                            className="w-full text-right p-4 rounded-lg bg-slate-50 text-slate-700 border border-transparent hover:border-slate-200 transition-all font-medium text-sm leading-relaxed"
                          >
                            {q}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Experts Panel - 2 rows of 3, centered */}
              <div className="text-center">
                <p className="text-slate-600 mb-5 font-medium text-base">
                  6 מומחי הפרלמנט מנתחים את פנייתך
                </p>
                <div className="flex flex-col items-center gap-3">
                  <div className="flex flex-wrap justify-center gap-3">
                    {agents.slice(0, 3).map((agent) => (
                      <ExpertPill key={agent.id} expertId={agent.id} displayName={agent.displayName} />
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    {agents.slice(3, 6).map((agent) => (
                      <ExpertPill key={agent.id} expertId={agent.id} displayName={agent.displayName} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Input Section */}
              <form onSubmit={handleStartConversation} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <textarea
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="ספרו לנו מה על לבכם או איזו החלטה עומדת על הפרק... 6 מומחי הפרלמנט מחכים לנתח את פנייתכם."
                  className="w-full p-4 bg-white border border-slate-300 rounded-lg text-slate-800 text-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E293B] focus:border-[#1E293B] min-h-[140px] resize-none transition-all duration-200"
                />
                <motion.button
                  type="submit"
                  disabled={loading || !initialMessage.trim()}
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="w-full mt-5 py-4 bg-[#1E293B] hover:bg-[#0F172A] text-white text-lg font-bold rounded-lg flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      הפרלמנט מתכנס...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5" />
                      התחל שיחה עם הפרלמנט
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation Area */}
        <div className="space-y-6">
          {/* Answered Questions */}
          {answeredQuestions.map((answered) => (
            <motion.div
              key={answered.timestamp}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
            >
              <p className="font-semibold text-[#0F172A] text-lg mb-4">
                {answered.question.question}
              </p>
              {answered.selectedOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {answered.selectedOptions.map((optIdx) => (
                    <span key={optIdx} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">
                      <Check className="w-4 h-4 mr-1 text-emerald-600" />
                      {answered.question.options[optIdx]}
                    </span>
                  ))}
                </div>
              )}
              {answered.freeText && (
                <p className="text-slate-600 bg-slate-50 p-4 rounded-lg text-sm border border-slate-100">
                  {answered.freeText}
                </p>
              )}
            </motion.div>
          ))}

          {/* Thinking Indicator */}
          {isThinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-3 py-12"
            >
              <Sparkles className="w-6 h-6 text-[#1E293B] animate-pulse" />
              <span className="text-slate-600 text-lg font-medium">הפרלמנט מתייעץ...</span>
            </motion.div>
          )}

          {/* Current Question */}
          {currentQuestion && !isThinking && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border-2 border-[#1E293B]/30 p-6 shadow-sm"
            >
              <p 
                className="font-bold text-[#0F172A] text-xl mb-6" 
                style={{ fontFamily: 'Georgia, "Frank Ruhl Libre", serif' }}
              >
                {currentQuestion.question}
              </p>

              {currentQuestion.options.length > 0 && (
                <div className="space-y-3 mb-5">
                  {currentQuestion.options.map((option, index) => (
                    <motion.button
                      key={index}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOptionToggle(index)}
                      className={`w-full p-4 text-right rounded-lg transition-all duration-200 flex items-center gap-3 border ${
                        selectedOptions.includes(index)
                          ? 'bg-[#1E293B] border-[#1E293B] text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedOptions.includes(index)
                          ? 'border-white bg-white'
                          : 'border-slate-300'
                      }`}>
                        {selectedOptions.includes(index) && <Check className="w-4 h-4 text-[#1E293B]" />}
                      </div>
                      <span className="text-base">{option}</span>
                    </motion.button>
                  ))}
                </div>
              )}

              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder={currentQuestion.options.length > 0 ? 'רוצה להוסיף משהו במילים שלך?' : 'כתוב את תשובתך כאן...'}
                className="w-full p-4 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E293B] focus:border-[#1E293B] min-h-[80px] resize-none mb-5 transition-all duration-200"
              />

              <motion.button
                onClick={handleSubmitAnswer}
                disabled={submittingAnswer || (currentQuestion.options.length === 0 ? !freeText.trim() : selectedOptions.length === 0 && !freeText.trim())}
                whileHover={{ scale: submittingAnswer ? 1 : 1.01 }}
                whileTap={{ scale: submittingAnswer ? 1 : 0.98 }}
                className="w-full py-4 bg-[#1E293B] hover:bg-[#0F172A] text-white text-lg font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {submittingAnswer ? 'שולח...' : 'המשך'}
                <Send className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {/* Choice Modal */}
          {showChoice && !chairSummary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm"
            >
              <p 
                className="text-center font-bold text-[#0F172A] text-xl mb-8" 
                style={{ fontFamily: 'Georgia, "Frank Ruhl Libre", serif' }}
              >
                יש לנו תמונה טובה. מה תרצה לעשות?
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  onClick={() => handleChoice('opinion')}
                  disabled={loadingSummary}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-4 bg-[#1E293B] hover:bg-[#0F172A] text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl"
                >
                  קבל חוות דעת וכיוון פעולה
                </motion.button>
                <motion.button
                  onClick={() => handleChoice('continue')}
                  disabled={loadingSummary}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 border border-slate-300"
                >
                  נמשיך לדייק
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Chair Summary */}
          {chairSummary?.mode === 'FULL_SUMMARY' && chairSummary.summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm"
            >
              <h3 
                className="text-2xl font-bold text-[#0F172A] mb-6 flex items-center gap-3" 
                style={{ fontFamily: 'Georgia, "Frank Ruhl Libre", serif' }}
              >
                <Sparkles className="w-7 h-7 text-amber-500" />
                סיכום והמלצות
              </h3>
              
              {/* Reflection Section - סיכום אמפתי */}
              {(chairSummary.summary.reflection || chairSummary.summary.information || chairSummary.summary.userFriendlyExplanation) && (
                <div className="mb-6 p-5 bg-slate-50 rounded-lg border-l-4 border-l-slate-400 border border-slate-200">
                  <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2 text-lg">
                    📋 מה שסיפרת
                  </h4>
                  <div 
                    className="text-slate-600 leading-relaxed prose prose-slate max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: (chairSummary.summary.reflection || chairSummary.summary.information || chairSummary.summary.userFriendlyExplanation)
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br/>') 
                    }}
                  />
                </div>
              )}

              {/* Expert Insights Section - זוויות מהפרלמנט */}
              {(chairSummary.summary.selectedExperts?.length > 0 || chairSummary.summary.expertVoices?.length > 0 || chairSummary.summary.mechanism) && (
                <div className="mb-6">
                  <h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2 text-lg">
                    💡 זוויות מהפרלמנט
                  </h4>
                  
                  {/* New structured expert cards */}
                  {chairSummary.summary.selectedExperts?.length > 0 ? (
                    <div className="space-y-4">
                      {chairSummary.summary.selectedExperts.map((expert, index) => (
                        <motion.div
                          key={expert.id + index}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <ExpertPill
                            expertId={expert.id}
                            displayName={expert.name}
                            insight={expert.insight}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : chairSummary.summary.expertVoices?.length > 0 ? (
                    /* Fallback to old expertVoices format */
                    <div className="space-y-4">
                      {chairSummary.summary.expertVoices.map((voice: string, index: number) => (
                        <div 
                          key={index}
                          className="p-4 rounded-lg bg-amber-50 border border-amber-100 border-r-4 border-r-amber-400"
                        >
                          <div 
                            className="text-slate-600 leading-relaxed"
                            dangerouslySetInnerHTML={{ 
                              __html: voice
                                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-800">$1</strong>')
                                .replace(/\n/g, '<br/>') 
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : chairSummary.summary.mechanism && (
                    /* Fallback to mechanism */
                    <div className="p-5 rounded-lg bg-amber-50 border border-amber-100 border-l-4 border-l-amber-500">
                      <div 
                        className="text-slate-600 leading-relaxed prose prose-slate max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: chairSummary.summary.mechanism
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br/>') 
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action Plan Section (supports both legacy steps[] and new actionPlan[]) */}
              {((chairSummary.summary.actionPlan?.length ?? 0) > 0 || (chairSummary.summary.steps?.length ?? 0) > 0) && (
                <div className="mb-6 p-5 bg-emerald-50 rounded-lg border-l-4 border-l-emerald-500 border border-emerald-100">
                  <h4 className="font-semibold text-slate-700 mb-5 flex items-center gap-2 text-lg">
                    🎯 כלים לפעולה
                  </h4>
                  <ol className="space-y-6">
                    {chairSummary.summary.actionPlan?.length > 0
                      ? chairSummary.summary.actionPlan.map((step, index) => (
                          <li key={index} className="flex gap-4">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1E293B] text-white text-sm font-bold flex items-center justify-center mt-0.5">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <h5 className="font-semibold text-slate-800 mb-1">{step.title}</h5>
                              <div
                                className="text-slate-700 leading-relaxed"
                                dangerouslySetInnerHTML={{
                                  __html: step.description.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>').replace(/\n/g, '<br/>'),
                                }}
                              />
                              {step.success_criteria && (
                                <div className="mt-2 text-sm text-emerald-700 bg-emerald-100/50 px-3 py-1.5 rounded-md inline-block">
                                  <span className="font-semibold">קריטריון:</span> {step.success_criteria}
                                </div>
                              )}
                            </div>
                          </li>
                        ))
                      : (chairSummary.summary.steps ?? []).map((step: string, index: number) => {
                          const criterionMatch = step.match(/\(קריטריון[:\s]*([^)]+)\)/i)
                          const mainText = criterionMatch ? step.replace(/\(קריטריון[:\s]*[^)]+\)/i, '').trim() : step
                          const criterion = criterionMatch?.[1]?.trim()
                          return (
                            <li key={index} className="flex gap-4">
                              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1E293B] text-white text-sm font-bold flex items-center justify-center mt-0.5">
                                {index + 1}
                              </span>
                              <div className="flex-1">
                                <div
                                  className="text-slate-700 leading-relaxed font-medium"
                                  dangerouslySetInnerHTML={{
                                    __html: mainText
                                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>')
                                      .replace(/^([^:]+):/, '<strong class="text-slate-900">$1:</strong>')
                                      .replace(/\n/g, '<br/>'),
                                  }}
                                />
                                {criterion && (
                                  <div className="mt-2 text-sm text-emerald-700 bg-emerald-100/50 px-3 py-1.5 rounded-md inline-block">
                                    <span className="font-semibold">קריטריון:</span> {criterion}
                                  </div>
                                )}
                              </div>
                            </li>
                          )
                        })}
                  </ol>
                </div>
              )}

              <motion.button
                onClick={handleNewSession}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center justify-center gap-2 transition-all duration-200 border border-slate-200"
              >
                <RefreshCw className="w-5 h-5" />
                התחל שיחה חדשה
              </motion.button>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center font-medium"
            >
              {error}
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>
    </div>
  )
}
