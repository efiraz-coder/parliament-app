'use client'

import { motion } from 'framer-motion'
import { Room, ProvocativeQuestion } from '@/lib/rooms'
import RoomCard from '@/components/cards/RoomCard'
import QuestionCard from '@/components/cards/QuestionCard'

interface HomeViewProps {
  rooms: Room[]
  userName?: string
  onRoomClick: (room: Room) => void
  onQuestionClick: (question: ProvocativeQuestion, room: Room) => void
}

export default function HomeView({ rooms, userName, onRoomClick, onQuestionClick }: HomeViewProps) {
  // Get a mix of questions from all rooms for "featured" section
  const featuredQuestions = rooms.flatMap(room => 
    room.questions.slice(0, 2).map(q => ({ question: q, room }))
  ).slice(0, 6)

  return (
    <div className="page-container section-padding space-y-8 lg:space-y-12">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center md:text-right"
      >
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2 md:mb-3">
          שלום{userName ? `, ${userName}` : ''} 👋
        </h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-600 dark:text-slate-400">
          מה מעסיק אותך היום?
        </p>
      </motion.div>

      {/* Private Rooms - Responsive Grid */}
      <section>
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4 md:mb-6">
          החדרים שלי
        </h2>
        <div className="card-grid-2">
          {rooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <RoomCard room={room} onClick={() => onRoomClick(room)} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Questions - 3 Column Grid on Desktop */}
      <section>
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4 md:mb-6">
          שאלות שאולי יעניינו אותך
        </h2>
        <div className="card-grid">
          {featuredQuestions.map(({ question, room }, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.08 }}
            >
              <QuestionCard
                question={question}
                onClick={() => onQuestionClick(question, room)}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="security-warning text-base md:text-lg"
      >
        🔒 שים לב! ניתן לפרוץ לשרתים אלו. אל תשאיר מידע אישי!
      </motion.div>
    </div>
  )
}
