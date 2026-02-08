'use client'

import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { Room } from '@/lib/rooms'

interface RoomCardProps {
  room: Room
  onClick: () => void
}

export default function RoomCard({ room, onClick }: RoomCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="room-card w-full text-right h-full"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-3">
            <span className="text-3xl md:text-4xl">{room.icon}</span>
            <h3 className={`text-lg md:text-xl lg:text-2xl font-bold ${room.color}`}>
              {room.name}
            </h3>
          </div>
          <p className="text-sm md:text-base lg:text-lg text-slate-600 dark:text-slate-400 mb-3 md:mb-4 leading-relaxed">
            {room.description}
          </p>
          <div className="flex items-center gap-2 text-xs md:text-sm lg:text-base text-slate-500 dark:text-slate-500">
            <span>{room.questions.length} שאלות</span>
            <span>•</span>
            <span>
              {room.questions.reduce((acc, q) => acc + q.communityCount, 0)} משתתפים
            </span>
          </div>
        </div>
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-slate-400 dark:text-slate-500 mt-2 flex-shrink-0" />
      </div>
    </motion.button>
  )
}
