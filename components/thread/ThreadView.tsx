'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Users, Bookmark, Share2 } from 'lucide-react'
import { ProvocativeQuestion } from '@/lib/rooms'
import AnonymousToggle from './AnonymousToggle'

interface Response {
  id: string
  content: string
  author: string
  isAnonymous: boolean
  timestamp: string
  likes: number
}

interface ThreadViewProps {
  question: ProvocativeQuestion
  onBookmark: () => void
  isBookmarked: boolean
}

// Mock data for demo
const expertResponses: Response[] = [
  {
    id: 'exp-1',
    content: 'מניסיוני הקליני של 20 שנה, הסימן הראשון שאנשים מתעלמים ממנו הוא שינויים בדפוסי השינה. זה לא "סתם עייפות" - זה הגוף שמנסה להגיד לך משהו.',
    author: 'ד"ר רונית כהן',
    isAnonymous: false,
    timestamp: 'לפני שעתיים',
    likes: 45,
  },
  {
    id: 'exp-2',
    content: 'כרופא משפחה, אני רואה שאנשים רבים מייחסים כאבים קלים לגיל. אבל כאב מתמשך של יותר משבועיים שווה בדיקה. אל תשתיקו את הגוף.',
    author: 'ד"ר אבי לוי',
    isAnonymous: false,
    timestamp: 'אתמול',
    likes: 67,
  },
]

const communityResponses: Response[] = [
  {
    id: 'com-1',
    content: 'אני בת 58 והתעלמתי מכאבי ראש תכופים. התברר שזה לחץ דם גבוה. עכשיו אני יודעת - אם משהו חוזר על עצמו, תבדקי.',
    author: 'חברת קהילה',
    isAnonymous: true,
    timestamp: 'לפני 3 ימים',
    likes: 89,
  },
  {
    id: 'com-2',
    content: 'הייתי בטוח שהעייפות שלי היא בגלל העבודה. לקח לי שנה להבין שמשהו לא בסדר. תשמעו לגוף.',
    author: 'משתמש אנונימי',
    isAnonymous: true,
    timestamp: 'לפני שבוע',
    likes: 124,
  },
  {
    id: 'com-3',
    content: 'אחרי גיל 50, התחלתי לשמור יומן של איך אני מרגיש. זה עזר לי לזהות דפוסים שהרופא לא היה רואה בביקור קצר.',
    author: 'דוד',
    isAnonymous: false,
    timestamp: 'לפני שבועיים',
    likes: 56,
  },
]

export default function ThreadView({ question, onBookmark, isBookmarked }: ThreadViewProps) {
  const [activeTab, setActiveTab] = useState<'expert' | 'community'>('expert')
  const [isPostingAnonymous, setIsPostingAnonymous] = useState(true)
  const [newComment, setNewComment] = useState('')

  const responses = activeTab === 'expert' ? expertResponses : communityResponses

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 200 : -200,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 200 : -200,
      opacity: 0,
    }),
  }

  return (
    <div className="flex flex-col h-full page-container">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700 p-4 md:p-6 lg:p-8">
        {/* Question Card */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-start justify-between mb-3">
            <span className="badge badge-neutral text-xs md:text-sm">
              {question.category}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onBookmark}
                className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
              >
                <Bookmark className="w-5 h-5 md:w-6 md:h-6" fill={isBookmarked ? 'currentColor' : 'none'} />
              </button>
              <button className="bookmark-btn">
                <Share2 className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
          </div>
          <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed">
            {question.text}
          </h1>
        </div>

        {/* Thread Tabs */}
        <div className="thread-tabs">
          <button
            onClick={() => setActiveTab('expert')}
            className={`thread-tab flex items-center justify-center gap-2 ${activeTab === 'expert' ? 'active' : ''}`}
          >
            <GraduationCap className="w-5 h-5" />
            <span>מומחים ({question.expertCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`thread-tab flex items-center justify-center gap-2 ${activeTab === 'community' ? 'active' : ''}`}
          >
            <Users className="w-5 h-5" />
            <span>קהילה ({question.communityCount})</span>
          </button>
        </div>
      </div>

      {/* Responses */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            custom={activeTab === 'expert' ? -1 : 1}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {responses.map((response) => (
              <motion.div
                key={response.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-4 md:p-5 lg:p-6"
              >
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-base md:text-lg">
                      {response.isAnonymous ? '👤 אנונימי/ת' : response.author}
                    </p>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">
                      {response.timestamp}
                    </p>
                  </div>
                  {activeTab === 'expert' && (
                    <span className="badge badge-primary text-xs md:text-sm">
                      <GraduationCap className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      מומחה
                    </span>
                  )}
                </div>
                <p className="text-base md:text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                  {response.content}
                </p>
                <div className="mt-3 md:mt-4 text-sm md:text-base text-slate-500">
                  ❤️ {response.likes} אהבו את זה
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Add Comment */}
      <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700 p-4 md:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <span className="text-sm md:text-base font-medium text-slate-600 dark:text-slate-400">
              הוסף/י תגובה
            </span>
            <AnonymousToggle
              isAnonymous={isPostingAnonymous}
              onChange={setIsPostingAnonymous}
            />
          </div>
          <div className="flex gap-3 md:gap-4">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="שתפ/י את החוויה שלך..."
              className="input flex-1 text-base md:text-lg"
            />
            <button 
              className="btn btn-primary text-base md:text-lg"
              disabled={!newComment.trim()}
            >
              שלח
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
