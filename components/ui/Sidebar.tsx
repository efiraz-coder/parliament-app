'use client'

import { motion } from 'framer-motion'
import { Home, Users, MessageSquare, Settings, LogOut, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
}

const menuItems = [
  { id: 'home', label: 'בית', icon: <Home className="w-5 h-5" /> },
  { id: 'members', label: 'חברי הפרלמנט', icon: <Users className="w-5 h-5" /> },
  { id: 'chat', label: 'שיחה חדשה', icon: <MessageSquare className="w-5 h-5" /> },
  { id: 'settings', label: 'הגדרות', icon: <Settings className="w-5 h-5" /> },
]

export default function Sidebar({ activeTab, onTabChange, onLogout }: SidebarProps) {
  return (
    <motion.aside
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="sidebar"
    >
      {/* Logo */}
      <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 dark:text-white">הפרלמנט</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">הפנימי שלך</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-6">
        <ul className="space-y-1">
          {menuItems.map((item, index) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => onTabChange(item.id)}
                className={cn('sidebar-item w-full', activeTab === item.id && 'active')}
              >
                {item.icon}
                <span>{item.label}</span>
                
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeSidebar"
                    className="absolute right-0 w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-l-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            </motion.li>
          ))}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300"
        >
          <LogOut className="w-5 h-5" />
          <span>יציאה</span>
        </motion.button>
      </div>
    </motion.aside>
  )
}
