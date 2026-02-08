'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bookmark, Users, GraduationCap, ChevronLeft } from 'lucide-react'
import { ProvocativeQuestion } from '@/lib/rooms'

interface QuestionCardProps {
  question: ProvocativeQuestion
  onClick: () => void
  onBookmark?: () => void
}

export default function QuestionCard({ question, onClick, onBookmark }: QuestionCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(question.isBookmarked || false)

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsBookmarked(!isBookmarked)
    onBookmark?.()
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="question-card cursor-pointer h-full flex flex-col"
      onClick={onClick}
    >
      <div className="flex items-start gap-3 flex-1">
        <div className="flex-1">
          {/* Category Badge */}
          <span className="badge badge-neutral text-xs md:text-sm mb-2 md:mb-3">
            {question.category}
          </span>
          
          {/* Question Text */}
          <p className="text-sm md:text-base lg:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed mb-3 md:mb-4">
            {question.text}
          </p>
          
          {/* Stats */}
          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm lg:text-base text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 md:w-5 md:h-5" />
              <span>{question.expertCount} מומחים</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
              <span>{question.communityCount} קהילה</span>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <button
            onClick={handleBookmark}
            className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
            aria-label={isBookmarked ? 'הסר מהשמורים' : 'שמור לאחר כך'}
          >
            <Bookmark 
              className="w-5 h-5 md:w-6 md:h-6" 
              fill={isBookmarked ? 'currentColor' : 'none'}
            />
          </button>
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </div>
      </div>
    </motion.div>
  )
}
