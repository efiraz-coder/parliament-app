'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MemberCardProps {
  id: string
  name: string
  displayName: string
  role: string
  expertiseDescription: string
  inspiredBy: string
  color: string
  index?: number
  onReplace?: (id: string) => void
}

const colorMap: Record<string, string> = {
  'psychodynamic-freudian': 'from-blue-500 to-blue-600',
  'cbt': 'from-teal-500 to-cyan-600',
  'dbt': 'from-purple-500 to-violet-600',
  'managerial-organizational': 'from-emerald-500 to-green-600',
  'social-sociological': 'from-violet-500 to-purple-600',
  'modern-stoic': 'from-amber-500 to-orange-600',
}

export default function MemberCard({
  id,
  name,
  displayName,
  role,
  expertiseDescription,
  inspiredBy,
  index = 0,
  onReplace,
}: MemberCardProps) {
  const gradientClass = colorMap[id] || 'from-indigo-500 to-purple-600'
  
  // Get initials from display name
  const initials = displayName
    .split(/[\s\/-]/)
    .map(word => word.charAt(0))
    .filter(char => char && char !== 'ה' && char !== 'ת')
    .slice(0, 2)
    .join('')
    .toUpperCase() || displayName.charAt(0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="member-card-modern w-72 flex-shrink-0 cursor-pointer"
    >
      {/* Gradient accent bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r', gradientClass)} />
      
      {/* Avatar */}
      <div className="flex items-start gap-4">
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          className={cn(
            'w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shadow-lg',
            gradientClass
          )}
        >
          {initials}
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-white truncate">
            {displayName}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
            {role}
          </p>
        </div>
      </div>
      
      {/* Description */}
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
        {expertiseDescription}
      </p>
      
      {/* Inspired by */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          בהשראת: <span className="font-medium text-slate-600 dark:text-slate-300">{inspiredBy}</span>
        </p>
      </div>
      
      {/* Replace button */}
      {onReplace && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation()
            onReplace(id)
          }}
          className="mt-3 w-full py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
        >
          להחלפת חבר פרלמנט
        </motion.button>
      )}
    </motion.div>
  )
}
