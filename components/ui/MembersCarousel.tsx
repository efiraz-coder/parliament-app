'use client'

import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import MemberCard from './MemberCard'
import type { Agent } from '@/lib/agents'

interface MembersCarouselProps {
  members: Agent[]
  onReplaceMember?: (id: string) => void
}

export default function MembersCarousel({ members, onReplaceMember }: MembersCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="relative">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          חברי הפרלמנט
        </h2>
        
        {/* Desktop scroll buttons */}
        <div className="hidden md:flex gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
            aria-label="גלול ימינה"
          >
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
            aria-label="גלול שמאלה"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </motion.button>
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div
        ref={scrollRef}
        className="scroll-container -mx-4 px-4"
      >
        {members.map((member, index) => (
          <div key={member.id} className="scroll-item">
            <MemberCard
              id={member.id}
              name={member.name}
              displayName={member.displayName}
              role={member.role}
              expertiseDescription={member.expertiseDescription}
              inspiredBy={member.inspiredBy}
              color={member.id}
              index={index}
              onReplace={onReplaceMember}
            />
          </div>
        ))}
      </div>

      {/* Scroll indicator for mobile */}
      <div className="flex justify-center mt-4 gap-1 md:hidden">
        {members.map((_, index) => (
          <div
            key={index}
            className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"
          />
        ))}
      </div>
    </div>
  )
}
