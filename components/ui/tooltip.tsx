'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'

interface TooltipProps {
  content: string
  children?: React.ReactNode
  className?: string
  iconClassName?: string
}

export function Tooltip({ content, children, className = '', iconClassName = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isVisible && tooltipRef.current && containerRef.current) {
      const updatePosition = () => {
        if (!tooltipRef.current || !containerRef.current) return

        const container = containerRef.current
        const tooltip = tooltipRef.current
        const containerRect = container.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const margin = 16

        // Get tooltip dimensions after it's rendered (initially positioned at top)
        const tooltipRect = tooltip.getBoundingClientRect()
        const tooltipWidth = tooltipRect.width
        const tooltipHeight = tooltipRect.height
        
        // Check if there's enough space above
        const spaceAbove = containerRect.top
        const spaceBelow = viewportHeight - containerRect.bottom
        const shouldShowBelow = spaceAbove < tooltipHeight + margin + 8 && spaceBelow > spaceAbove
        
        // Apply position class
        if (shouldShowBelow) {
          tooltip.classList.remove('bottom-full', 'mb-2')
          tooltip.classList.add('top-full', 'mt-2')
        } else {
          tooltip.classList.remove('top-full', 'mt-2')
          tooltip.classList.add('bottom-full', 'mb-2')
        }
        
        // Update arrow direction
        const arrow = tooltip.querySelector('.tooltip-arrow') as HTMLElement
        if (arrow) {
          if (shouldShowBelow) {
            arrow.classList.remove('top-full', '-mt-1', 'border-t-gray-900')
            arrow.classList.add('bottom-full', '-mb-1', 'border-b-gray-900')
          } else {
            arrow.classList.remove('bottom-full', '-mb-1', 'border-b-gray-900')
            arrow.classList.add('top-full', '-mt-1', 'border-t-gray-900')
          }
        }
        
        // Force reflow to get new dimensions after position change
        void tooltip.offsetWidth
        const finalTooltipRect = tooltip.getBoundingClientRect()
        const finalTooltipWidth = finalTooltipRect.width
        
        // Calculate center position of container
        const centerX = containerRect.left + containerRect.width / 2
        
        // Calculate desired left position (centered on icon)
        let left = centerX - finalTooltipWidth / 2
        
        // Constrain to viewport with margin
        const minLeft = margin
        const maxLeft = viewportWidth - finalTooltipWidth - margin
        
        // Clamp the left position
        left = Math.max(minLeft, Math.min(left, maxLeft))
        
        // Convert to relative positioning from container
        const relativeLeft = left - containerRect.left
        
        // Apply position
        tooltip.style.left = `${relativeLeft}px`
        tooltip.style.transform = 'none'
        
        // Force reflow and verify position
        void tooltip.offsetWidth
        const finalRect = tooltip.getBoundingClientRect()
        
        // Final overflow check and correction
        if (finalRect.left < margin) {
          tooltip.style.left = `${margin - containerRect.left}px`
        } else if (finalRect.right > viewportWidth - margin) {
          const correctedLeft = viewportWidth - margin - finalRect.width - containerRect.left
          tooltip.style.left = `${Math.max(margin - containerRect.left, correctedLeft)}px`
        }
        
        // Recalculate arrow after final position
        const finalTooltipLeft = parseFloat(tooltip.style.left) || relativeLeft
        const containerCenter = containerRect.width / 2
        const finalArrowLeft = containerCenter - finalTooltipLeft
        const finalTooltipWidthAfter = tooltip.getBoundingClientRect().width
        const finalArrowLeftClamped = Math.max(12, Math.min(finalArrowLeft, finalTooltipWidthAfter - 12))
        
        if (arrow) {
          arrow.style.left = `${finalArrowLeftClamped}px`
          arrow.style.transform = 'translateX(-50%)'
        }
      }

      // Use requestAnimationFrame to ensure tooltip is rendered
      const rafId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updatePosition()
        })
      })
      
      // Also update on window resize and scroll
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
      
      return () => {
        cancelAnimationFrame(rafId)
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
      }
    }
  }, [isVisible])

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children || (
        <Info
          className={`h-4 w-4 text-blue-500 hover:text-blue-700 hover:scale-110 cursor-help transition-all duration-200 ${iconClassName}`}
          aria-label="More information"
        />
      )}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="absolute bottom-full mb-2 z-50 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-xl normal-case"
          role="tooltip"
          style={{
            maxWidth: 'min(700px, calc(100vw - 2rem))',
            width: 'auto',
            minWidth: '300px',
          }}
        >
          {/* Arrow - positioned to point at container center */}
          <div className="tooltip-arrow absolute top-full -mt-1 border-4 border-transparent border-t-gray-900" />
          <p className="leading-relaxed whitespace-normal break-words normal-case">{content}</p>
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

