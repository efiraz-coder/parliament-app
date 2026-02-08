'use client'

import { motion } from 'framer-motion'
import { ChevronRight, Home, LogOut } from 'lucide-react'

interface TopNavProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  onHome?: () => void
  onLogout?: () => void
}

export default function TopNav({ 
  title = 'הפרלמנט הפנימי', 
  showBack = false, 
  onBack, 
  onHome, 
  onLogout 
}: TopNavProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700"
    >
      <div className="page-container">
        <div className="flex items-center justify-between h-16 md:h-18 lg:h-20 px-4 md:px-6 lg:px-8">
          {/* Left Side - Back Button */}
          <div className="flex-1 flex justify-start">
            {showBack && onBack ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onBack}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
                style={{ minHeight: '48px' }}
              >
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                <span className="hidden sm:inline text-base md:text-lg">חזרה</span>
              </motion.button>
            ) : (
              <div className="w-12 md:w-24" /> /* Spacer */
            )}
          </div>

          {/* Center - Logo/Title */}
          <div className="flex-shrink-0">
            <motion.div 
              className="flex items-center gap-2 md:gap-3"
              whileHover={{ scale: 1.02 }}
            >
              <span className="text-2xl md:text-3xl">🏛️</span>
              <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white hidden sm:block">
                {title}
              </h1>
            </motion.div>
          </div>

          {/* Right Side - Home & Logout */}
          <div className="flex-1 flex justify-end items-center gap-1 md:gap-2">
            {onHome && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onHome}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
                style={{ minHeight: '48px' }}
                aria-label="בית"
              >
                <Home className="w-5 h-5 md:w-6 md:h-6" />
                <span className="hidden lg:inline text-base">בית</span>
              </motion.button>
            )}
            
            {onLogout && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLogout}
                className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
                style={{ minHeight: '48px' }}
                aria-label="התנתקות"
              >
                <LogOut className="w-5 h-5 md:w-6 md:h-6" />
                <span className="hidden lg:inline text-base">יציאה</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  )
}
