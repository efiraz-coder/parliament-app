'use client'

import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { getAllRooms, Room } from '@/lib/rooms'
import RoomCard from '@/components/cards/RoomCard'

interface DiscoverViewProps {
  onRoomClick: (room: Room) => void
}

export default function DiscoverView({ onRoomClick }: DiscoverViewProps) {
  const allRooms = getAllRooms()
  const popularQuestions = allRooms
    .flatMap(room => room.questions.map(q => ({ ...q, roomName: room.name, roomIcon: room.icon })))
    .sort((a, b) => b.communityCount - a.communityCount)
    .slice(0, 6)

  return (
    <div className="page-container section-padding space-y-8 lg:space-y-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center md:text-right"
      >
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2 md:mb-3">
          גילוי
        </h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-600 dark:text-slate-400">
          גלו חדרים ונושאים חדשים
        </p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative max-w-2xl mx-auto md:mx-0"
      >
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-slate-400" />
        <input
          type="text"
          placeholder="חפש שאלות או נושאים..."
          className="input pr-12 text-base md:text-lg"
        />
      </motion.div>

      {/* All Rooms - 2 Column Grid */}
      <section>
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4 md:mb-6">
          כל החדרים
        </h2>
        <div className="card-grid-2">
          {allRooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <RoomCard room={room} onClick={() => onRoomClick(room)} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Popular Questions - 3 Column Grid */}
      <section>
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4 md:mb-6">
          השאלות הפופולריות ביותר
        </h2>
        <div className="card-grid">
          {popularQuestions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.08 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="card p-4 md:p-5 lg:p-6 cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{question.roomIcon}</span>
                <span className="badge badge-neutral text-xs md:text-sm">
                  {question.roomName}
                </span>
              </div>
              <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
                {question.text}
              </p>
              <p className="text-sm md:text-base text-slate-500 mt-3">
                👥 {question.communityCount} משתתפים
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
