'use client'

import { motion } from 'framer-motion'
import { Room, ProvocativeQuestion } from '@/lib/rooms'
import QuestionCard from '@/components/cards/QuestionCard'

interface RoomViewProps {
  room: Room
  onQuestionClick: (question: ProvocativeQuestion) => void
}

export default function RoomView({ room, onQuestionClick }: RoomViewProps) {
  return (
    <div className="page-container section-padding">
      {/* Room Header Card */}
      <div className="mb-6 md:mb-8 lg:mb-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`card p-6 md:p-8 lg:p-10 bg-gradient-to-br ${room.bgGradient}`}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-4">
            <span className="text-5xl md:text-6xl">{room.icon}</span>
            <div>
              <h1 className={`text-2xl md:text-3xl lg:text-4xl font-bold ${room.color} mb-2`}>
                {room.name}
              </h1>
              <p className="text-base md:text-lg lg:text-xl text-slate-600 dark:text-slate-400">
                {room.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm md:text-base text-slate-500 dark:text-slate-400">
            <span>{room.questions.length} שאלות</span>
            <span>•</span>
            <span>
              {room.questions.reduce((acc, q) => acc + q.communityCount, 0)} משתתפים
            </span>
          </div>
        </motion.div>
      </div>

      {/* Questions - 3 Column Grid on Desktop */}
      <section>
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4 md:mb-6">
          השאלות בחדר
        </h2>
        <div className="card-grid">
          {room.questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <QuestionCard
                question={question}
                onClick={() => onQuestionClick(question)}
              />
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
