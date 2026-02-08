'use client'

import { motion } from 'framer-motion'
import { User, Settings, Shield, LogOut, ChevronLeft } from 'lucide-react'
import { GenderId, AgeGroupId, GENDER_OPTIONS, AGE_GROUPS } from '@/lib/rooms'

interface ProfileViewProps {
  gender: GenderId
  ageGroup: AgeGroupId
  onLogout: () => void
  onResetProfile: () => void
}

export default function ProfileView({ gender, ageGroup, onLogout, onResetProfile }: ProfileViewProps) {
  const genderLabel = GENDER_OPTIONS.find(g => g.id === gender)?.label || ''
  const ageLabel = AGE_GROUPS.find(a => a.id === ageGroup)?.label || ''

  const menuItems = [
    {
      icon: User,
      label: 'עדכון פרופיל',
      description: 'שנה מגדר או קבוצת גיל',
      onClick: onResetProfile,
    },
    {
      icon: Shield,
      label: 'פרטיות ואבטחה',
      description: 'הגדרות פרטיות',
      onClick: () => {},
    },
    {
      icon: Settings,
      label: 'הגדרות',
      description: 'העדפות אפליקציה',
      onClick: () => {},
    },
  ]

  return (
    <div className="page-container section-padding space-y-8 lg:space-y-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
          <User className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2">
          הפרופיל שלי
        </h1>
        <p className="text-base md:text-lg lg:text-xl text-slate-600 dark:text-slate-400">
          {genderLabel} • {ageLabel}
        </p>
      </motion.div>

      {/* Stats - Responsive Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3 md:gap-4 lg:gap-6 max-w-lg mx-auto"
      >
        <div className="card p-4 md:p-5 lg:p-6 text-center">
          <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-indigo-600 dark:text-indigo-400">2</p>
          <p className="text-sm md:text-base text-slate-500 mt-1">שמורים</p>
        </div>
        <div className="card p-4 md:p-5 lg:p-6 text-center">
          <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-indigo-600 dark:text-indigo-400">1</p>
          <p className="text-sm md:text-base text-slate-500 mt-1">תגובות</p>
        </div>
        <div className="card p-4 md:p-5 lg:p-6 text-center">
          <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-indigo-600 dark:text-indigo-400">3</p>
          <p className="text-sm md:text-base text-slate-500 mt-1">חדרים</p>
        </div>
      </motion.div>

      {/* Menu - Centered on Desktop */}
      <section className="space-y-3 max-w-2xl mx-auto">
        {menuItems.map((item, index) => {
          const Icon = item.icon
          return (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={item.onClick}
              className="card w-full p-4 md:p-5 lg:p-6 flex items-center justify-between text-right"
            >
              <div className="flex items-center gap-4 md:gap-5">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-base md:text-lg">
                    {item.label}
                  </p>
                  <p className="text-sm md:text-base text-slate-500">
                    {item.description}
                  </p>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
            </motion.button>
          )
        })}
      </section>

      {/* Logout - Centered */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-md mx-auto"
      >
        <button
          onClick={onLogout}
          className="btn btn-danger btn-full text-base md:text-lg"
        >
          <LogOut className="w-5 h-5 md:w-6 md:h-6" />
          התנתקות
        </button>
      </motion.div>

      {/* Security Warning */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="security-warning text-base md:text-lg max-w-2xl mx-auto"
      >
        🔒 שים לב! ניתן לפרוץ לשרתים אלו. אל תשאיר מידע אישי!
      </motion.div>
    </div>
  )
}
