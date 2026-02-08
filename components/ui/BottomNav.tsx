'use client'

import { motion } from 'framer-motion'
import { Home, Users, MessageSquare, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href?: string
}

interface BottomNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const navItems: NavItem[] = [
  { id: 'home', label: 'בית', icon: <Home className="w-5 h-5" /> },
  { id: 'members', label: 'חברים', icon: <Users className="w-5 h-5" /> },
  { id: 'chat', label: 'שיחה', icon: <MessageSquare className="w-5 h-5" /> },
  { id: 'settings', label: 'הגדרות', icon: <Settings className="w-5 h-5" /> },
]

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="bottom-nav pb-safe"
    >
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'bottom-nav-item',
              activeTab === item.id && 'active'
            )}
          >
            <motion.div
              initial={false}
              animate={{
                scale: activeTab === item.id ? 1.1 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {item.icon}
            </motion.div>
            <span className="text-xs mt-1 font-medium">{item.label}</span>
            
            {/* Active indicator */}
            {activeTab === item.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute -bottom-1 w-8 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </motion.nav>
  )
}
