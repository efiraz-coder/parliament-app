'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { GENDER_OPTIONS, AGE_GROUPS, GenderId, AgeGroupId } from '@/lib/rooms'

interface OnboardingProps {
  onComplete: (gender: GenderId, ageGroup: AgeGroupId) => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [gender, setGender] = useState<GenderId | null>(null)
  const [ageGroup, setAgeGroup] = useState<AgeGroupId | null>(null)

  const handleGenderSelect = (g: GenderId) => {
    setGender(g)
    // Auto-advance after short delay
    setTimeout(() => setStep(2), 400)
  }

  const handleAgeSelect = (age: AgeGroupId) => {
    setAgeGroup(age)
  }

  const handleComplete = () => {
    if (gender && ageGroup) {
      onComplete(gender, ageGroup)
    }
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center">
      {/* Centered Container - Responsive max-width */}
      <div className="w-full max-w-[480px] lg:max-w-[560px] px-4 md:px-6 lg:px-8 flex flex-col min-h-screen lg:min-h-0 lg:py-12">
        {/* Header */}
        <div className="pt-8 md:pt-12 lg:pt-8 pb-6 md:pb-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="mb-4 md:mb-6"
          >
            <span className="text-5xl md:text-6xl lg:text-7xl">🏛️</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2 md:mb-3"
          >
            ברוכים הבאים לפרלמנט הפנימי
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg lg:text-xl text-slate-700 dark:text-slate-300"
          >
            מרחב בטוח לשאלות החשובות באמת
          </motion.p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center gap-3 mb-8">
          <motion.div
            animate={{ 
              scale: step === 1 ? 1.2 : 1,
              backgroundColor: step >= 1 ? '#4f46e5' : '#cbd5e1'
            }}
            className="w-3 h-3 rounded-full"
          />
          <motion.div
            animate={{ 
              scale: step === 2 ? 1.2 : 1,
              backgroundColor: step >= 2 ? '#4f46e5' : '#cbd5e1'
            }}
            className="w-3 h-3 rounded-full"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait" custom={step === 1 ? -1 : 1}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Step 1 Header */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    איך להתייחס אלייך?
                  </h2>
                  <p 
                    className="text-slate-700 dark:text-slate-300"
                    style={{ fontSize: '18px' }}
                  >
                    זה עוזר לנו להתאים את החוויה עבורך
                  </p>
                </div>

                {/* Gender Cards */}
                <div className="space-y-4">
                  {GENDER_OPTIONS.map((option, index) => (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleGenderSelect(option.id)}
                      className={`w-full rounded-2xl border-2 transition-all duration-200 flex items-center justify-between ${
                        gender === option.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 shadow-lg shadow-indigo-500/20'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-md'
                      }`}
                      style={{ padding: '24px' }}
                    >
                      <div className="flex items-center gap-5">
                        <span className="text-4xl">{option.icon}</span>
                        <span className="text-xl font-semibold text-slate-900 dark:text-white">
                          {option.label}
                        </span>
                      </div>
                      {gender === option.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center"
                        >
                          <Check className="w-6 h-6 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Step 2 Header */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    באיזה שלב בחיים את/ה?
                  </h2>
                  <p 
                    className="text-slate-700 dark:text-slate-300"
                    style={{ fontSize: '18px' }}
                  >
                    כל גיל עם האתגרים והחוכמה שלו
                  </p>
                </div>

                {/* Age Group Cards */}
                <div className="space-y-3">
                  {AGE_GROUPS.map((option, index) => (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAgeSelect(option.id)}
                      className={`w-full rounded-2xl border-2 transition-all duration-200 text-right ${
                        ageGroup === option.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 shadow-lg shadow-indigo-500/20'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-md'
                      }`}
                      style={{ padding: '20px 24px' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="text-xl font-bold text-slate-900 dark:text-white">
                            {option.label}
                          </span>
                          <p 
                            className="text-slate-600 dark:text-slate-400 mt-1"
                            style={{ fontSize: '16px' }}
                          >
                            {option.description}
                          </p>
                        </div>
                        {ageGroup === option.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 mr-4"
                          >
                            <Check className="w-6 h-6 text-white" />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="py-8 space-y-4">
          {step === 2 && (
            <>
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleComplete}
                disabled={!ageGroup}
                className={`w-full rounded-2xl font-bold text-xl flex items-center justify-center gap-3 transition-all duration-200 ${
                  ageGroup
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
                style={{ padding: '20px', minHeight: '64px' }}
              >
                להתחיל
                <ArrowLeft className="w-6 h-6" />
              </motion.button>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(1)}
                className="w-full py-4 text-slate-600 dark:text-slate-400 font-semibold flex items-center justify-center gap-2 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                style={{ fontSize: '18px' }}
              >
                <ArrowRight className="w-5 h-5" />
                חזרה
              </motion.button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
