'use client'

import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'

interface AnonymousToggleProps {
  isAnonymous: boolean
  onChange: (value: boolean) => void
}

export default function AnonymousToggle({ isAnonymous, onChange }: AnonymousToggleProps) {
  return (
    <button
      onClick={() => onChange(!isAnonymous)}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 transition-colors"
      aria-label={isAnonymous ? 'פרסום אנונימי מופעל' : 'פרסום אנונימי כבוי'}
    >
      <div className="relative">
        <motion.div
          className={`w-10 h-6 rounded-full transition-colors duration-200 ${
            isAnonymous ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <motion.div
            animate={{ x: isAnonymous ? 16 : 2 }}
            transition={{ duration: 0.2 }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
          />
        </motion.div>
      </div>
      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
        {isAnonymous ? (
          <>
            <EyeOff className="w-4 h-4" />
            <span>אנונימי</span>
          </>
        ) : (
          <>
            <Eye className="w-4 h-4" />
            <span>גלוי</span>
          </>
        )}
      </div>
    </button>
  )
}
