'use client'

import { useState } from 'react'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import FloatingActionButton from './FloatingActionButton'
import { MessageSquare } from 'lucide-react'

interface NavigationWrapperProps {
  children: React.ReactNode
  onNewChat?: () => void
}

export default function NavigationWrapper({ children, onNewChat }: NavigationWrapperProps) {
  const [activeTab, setActiveTab] = useState('home')

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.removeItem('parliament_sessionId')
      window.location.href = '/login'
    } catch (err) {
      console.error('Logout error:', err)
      window.location.href = '/login'
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    // Handle navigation logic here
    if (tab === 'chat' && onNewChat) {
      onNewChat()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="main-content min-h-screen pb-20 md:pb-0 md:mr-64">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Floating Action Button - Mobile only */}
      <div className="md:hidden">
        <FloatingActionButton
          onClick={() => onNewChat?.()}
          icon={<MessageSquare className="w-6 h-6" />}
          label="שיחה חדשה"
        />
      </div>
    </div>
  )
}
