'use client'

import { motion } from 'framer-motion'
import { Home, Compass, MessageCircle, User } from 'lucide-react'

export type TabId = 'home' | 'discover' | 'my-questions' | 'profile'

interface BottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const tabs = [
  { id: 'home' as TabId, label: 'הבית', icon: Home },
  { id: 'discover' as TabId, label: 'גילוי', icon: Compass },
  { id: 'my-questions' as TabId, label: 'השאלות שלי', icon: MessageCircle },
  { id: 'profile' as TabId, label: 'פרופיל', icon: User },
]

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700 px-2 py-1 pb-safe">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onTabChange(tab.id)}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                  />
                )}
              </div>
              <span className="bottom-nav-label">{tab.label}</span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}
