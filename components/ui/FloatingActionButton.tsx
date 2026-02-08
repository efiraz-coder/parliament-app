'use client'

import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'

interface FABProps {
  onClick: () => void
  icon?: React.ReactNode
  label?: string
}

export default function FloatingActionButton({ onClick, icon, label }: FABProps) {
  return (
    <motion.button
      onClick={onClick}
      className="fab"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      aria-label={label || 'הוסף'}
    >
      <motion.div
        whileHover={{ rotate: 90 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {icon || <Plus className="w-6 h-6" />}
      </motion.div>
    </motion.button>
  )
}
