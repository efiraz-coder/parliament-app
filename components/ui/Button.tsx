'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    isLoading, 
    leftIcon, 
    rightIcon, 
    children,
    disabled,
    ...props 
  }, ref) => {
    const variants = {
      primary: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-glow',
      secondary: 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50',
      ghost: 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
      danger: 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:shadow-lg',
    }

    const sizes = {
      sm: 'px-4 py-2 text-base rounded-lg',
      md: 'px-6 py-3 text-lg rounded-xl',
      lg: 'px-8 py-4 text-xl rounded-xl',
    }

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium shadow-soft transition-all duration-300',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          />
        ) : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export default Button
