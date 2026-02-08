'use client'

import { motion } from 'framer-motion'
import { Home, Compass, MessageCircle, User, LogOut, Settings } from 'lucide-react'
import { TabId } from './BottomNav'

interface SidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  onLogout: () => void
}

const menuItems = [
  { id: 'home' as TabId, label: 'החדרים שלי', icon: Home },
  { id: 'discover' as TabId, label: 'גילוי', icon: Compass },
  { id: 'my-questions' as TabId, label: 'השאלות שלי', icon: MessageCircle },
  { id: 'profile' as TabId, label: 'פרופיל', icon: User },
]

export default function Sidebar({ activeTab, onTabChange, onLogout }: SidebarProps) {
  return (
    <aside className="fixed right-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 border-l-2 border-slate-200 dark:border-slate-700 flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b-2 border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏛️</span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              הפרלמנט הפנימי
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              מרחב בטוח לשאלות
            </p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTabChange(item.id)}
              className={`sidebar-item w-full ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </motion.button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t-2 border-slate-200 dark:border-slate-700 space-y-2">
        <button
          onClick={onLogout}
          className="sidebar-item w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="w-5 h-5" />
          <span>התנתקות</span>
        </button>
      </div>
    </aside>
  )
}
