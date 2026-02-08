'use client'

import { motion } from 'framer-motion'
import { Bookmark, MessageCircle, Clock } from 'lucide-react'

interface SavedQuestion {
  id: string
  text: string
  roomName: string
  savedAt: string
}

// Mock data
const savedQuestions: SavedQuestion[] = [
  {
    id: '1',
    text: 'האם זה מטורף להחליף קריירה בגיל הזה, או שלהישאר זה הסיכון האמיתי?',
    roomName: 'קריירה',
    savedAt: 'לפני יומיים',
  },
  {
    id: '2',
    text: 'איך יודעים אם הקשר הזה שווה להציל או שהגיע הזמן ללכת?',
    roomName: 'זוגיות ומשפחה',
    savedAt: 'לפני שבוע',
  },
  {
    id: '3',
    text: 'מה עושים כשהזיכרון מתחיל לבגוד ואת מפחדת שזה לא רק גיל?',
    roomName: 'מנופאוזה',
    savedAt: 'לפני שבועיים',
  },
]

const myComments = [
  {
    id: '1',
    questionText: 'מה עושים עם הבדידות הזו שאף אחד לא מדבר עליה?',
    myComment: 'גיליתי שהקשר הכי חשוב הוא עם עצמי. כשהתחלתי להקשיב לעצמי באמת...',
    likes: 23,
    timestamp: 'לפני 3 ימים',
  },
]

export default function MyQuestionsView() {
  return (
    <div className="page-container section-padding space-y-8 lg:space-y-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center md:text-right"
      >
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2 md:mb-3">
          השאלות שלי
        </h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-600 dark:text-slate-400">
          שאלות ששמרת ותגובות שכתבת
        </p>
      </motion.div>

      {/* Saved Questions */}
      <section>
        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <Bookmark className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
            שמורים ({savedQuestions.length})
          </h2>
        </div>
        
        {savedQuestions.length > 0 ? (
          <div className="card-grid">
            {savedQuestions.map((question, index) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="card p-4 md:p-5 lg:p-6 cursor-pointer"
              >
                <span className="badge badge-neutral text-xs md:text-sm mb-3">
                  {question.roomName}
                </span>
                <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-white mb-3 leading-relaxed">
                  {question.text}
                </p>
                <div className="flex items-center gap-2 text-sm md:text-base text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>נשמר {question.savedAt}</span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="card p-8 md:p-12 text-center">
            <Bookmark className="w-12 h-12 md:w-16 md:h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-base md:text-lg">עדיין לא שמרת שאלות</p>
            <p className="text-sm md:text-base text-slate-400 mt-2">
              לחץ על סימן הסימניה ליד שאלה כדי לשמור אותה
            </p>
          </div>
        )}
      </section>

      {/* My Comments */}
      <section>
        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-indigo-500" />
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
            התגובות שלי ({myComments.length})
          </h2>
        </div>
        
        {myComments.length > 0 ? (
          <div className="card-grid-2">
            {myComments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="card p-4 md:p-5 lg:p-6"
              >
                <p className="text-sm md:text-base text-slate-500 mb-3">
                  בתגובה ל: "{comment.questionText}"
                </p>
                <p className="text-base md:text-lg text-slate-900 dark:text-white mb-4 leading-relaxed">
                  {comment.myComment}
                </p>
                <div className="flex items-center justify-between text-sm md:text-base text-slate-500">
                  <span>❤️ {comment.likes} אהבו</span>
                  <span>{comment.timestamp}</span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="card p-8 md:p-12 text-center">
            <MessageCircle className="w-12 h-12 md:w-16 md:h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-base md:text-lg">עדיין לא כתבת תגובות</p>
            <p className="text-sm md:text-base text-slate-400 mt-2">
              שתף/י את החוויה שלך ועזור/י לאחרים
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
