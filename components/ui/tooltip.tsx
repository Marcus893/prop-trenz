'use client'

import React, { useState } from 'react'
import { Info } from 'lucide-react'

interface TooltipProps {
  content: string
  children?: React.ReactNode
  className?: string
  iconClassName?: string
}

export function Tooltip({ content, children, className = '', iconClassName = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children || (
        <Info
          className={`h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors ${iconClassName}`}
          aria-label="More information"
        />
      )}
      {isVisible && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-xl"
          role="tooltip"
        >
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
          <p className="leading-relaxed whitespace-normal">{content}</p>
        </div>
      )}
    </div>
  )
}

interface InfoIconProps {
  content: string
  className?: string
  iconClassName?: string
}

export function InfoIcon({ content, className = '', iconClassName = '' }: InfoIconProps) {
  return <Tooltip content={content} className={className} iconClassName={iconClassName} />
}

