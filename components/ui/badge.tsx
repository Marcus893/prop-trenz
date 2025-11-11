'use client'

import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium'
  const variants: Record<typeof variant, string> = {
    default: 'bg-blue-600 text-white',
    outline: 'border border-gray-300 text-gray-700 bg-white'
  }

  return <span className={cn(baseStyles, variants[variant], className)} {...props} />
}

export default Badge
