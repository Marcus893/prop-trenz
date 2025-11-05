import React from 'react'
import Image from 'next/image'

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showText ? (
        <Image
          src="/logo.svg"
          alt="PropTrenz"
          width={200}
          height={60}
          className={sizeClasses[size]}
          priority
        />
      ) : (
        <Image
          src="/logo-icon.svg"
          alt="PropTrenz"
          width={60}
          height={60}
          className={sizeClasses[size]}
          priority
        />
      )}
    </div>
  )
}

// Alternative: Pure SVG component (no image loading)
export function LogoSVG({ className = '', showText = true, size = 'md' }: LogoProps) {
  // Size classes for icon-only logo
  const iconSizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }
  
  // Size classes for logo with text (different aspect ratio)
  const fullLogoSizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
  }
  
  const sizeClasses = showText ? fullLogoSizeClasses : iconSizeClasses

  // Check if we're on a dark/colored background
  const isDark = className.includes('text-white') || className.includes('dark')

  const iconColor = isDark ? '#FFFFFF' : '#2563EB'
  const trendColor = isDark ? '#10B981' : '#10B981'
  const textColor = isDark ? '#FFFFFF' : '#1F2937'
  const lineColor = isDark ? '#FFFFFF' : '#2563EB'

  if (!showText) {
    // Icon colors for depth
    const houseColor1 = isDark ? '#FFFFFF' : '#2563EB'
    const houseColor2 = isDark ? 'rgba(255,255,255,0.8)' : '#3B82F6'
    const houseColor3 = isDark ? 'rgba(255,255,255,0.7)' : '#1E40AF'
    const windowColor = isDark ? '#1F2937' : '#FFFFFF'
    
    return (
      <svg
        width="60"
        height="60"
        viewBox="0 0 60 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses[size]} ${className}`}
      >
        <g>
          {/* Second house (behind) */}
          <path d="M8 31 L15 25 L22 31 Z" fill={houseColor2} opacity={isDark ? 0.6 : 0.8}/>
          <rect x="10" y="31" width="10" height="12" fill={houseColor2} opacity={isDark ? 0.6 : 0.8} rx="1"/>
          
          {/* Main house */}
          <path d="M18 25 L28 17 L38 25 Z" fill={houseColor1}/>
          <rect x="21" y="25" width="14" height="18" fill={houseColor1} rx="1"/>
          <rect x="25" y="33" width="6" height="10" fill={windowColor} opacity={isDark ? 0.9 : 0.9} rx="0.5"/>
          <rect x="29" y="27" width="4" height="4" fill={windowColor} opacity={isDark ? 0.9 : 0.9} rx="0.5"/>
          
          {/* Third house (taller) */}
          <path d="M41 23 L49 15 L57 23 Z" fill={houseColor3}/>
          <rect x="45" y="23" width="10" height="20" fill={houseColor3} rx="1"/>
          <rect x="48" y="31" width="4" height="12" fill={windowColor} opacity={isDark ? 0.9 : 0.9} rx="0.5"/>
        </g>
        
        {/* Trend line */}
        <g>
          <path
            d="M6 45 L20 40 L33 33 L46 27"
            stroke={trendColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="6" cy="45" r="2" fill={trendColor}/>
          <circle cx="20" cy="40" r="2" fill={trendColor}/>
          <circle cx="33" cy="33" r="2" fill={trendColor}/>
          <circle cx="46" cy="27" r="2" fill={trendColor}/>
        </g>
      </svg>
    )
  }

  // Icon colors for depth in full logo
  const houseColor1 = isDark ? '#FFFFFF' : '#2563EB'
  const houseColor2 = isDark ? 'rgba(255,255,255,0.8)' : '#3B82F6'
  const houseColor3 = isDark ? 'rgba(255,255,255,0.7)' : '#1E40AF'
  const windowColor = isDark ? '#1F2937' : '#FFFFFF'
  
  return (
    <svg
      width="200"
      height="60"
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClasses[size]} ${className}`}
      style={{ width: 'auto' }}
    >
      <g>
        {/* Second house (behind, smaller) */}
        <path d="M5 26 L12 20 L19 26 Z" fill={houseColor2} opacity={isDark ? 0.6 : 0.8}/>
        <rect x="7" y="26" width="10" height="12" fill={houseColor2} opacity={isDark ? 0.6 : 0.8} rx="1"/>
        
        {/* Main house */}
        <path d="M15 20 L25 12 L35 20 Z" fill={houseColor1}/>
        <rect x="18" y="20" width="14" height="18" fill={houseColor1} rx="1"/>
        <rect x="22" y="28" width="6" height="10" fill={windowColor} opacity={isDark ? 0.9 : 0.9} rx="0.5"/>
        <rect x="26" y="22" width="4" height="4" fill={windowColor} opacity={isDark ? 0.9 : 0.9} rx="0.5"/>
        
        {/* Third house (taller, right) */}
        <path d="M38 18 L46 10 L54 18 Z" fill={houseColor3}/>
        <rect x="42" y="18" width="10" height="20" fill={houseColor3} rx="1"/>
        <rect x="45" y="26" width="4" height="12" fill={windowColor} opacity={isDark ? 0.9 : 0.9} rx="0.5"/>
      </g>
      
      {/* Trend line with data points */}
      <g>
        <path
          d="M8 40 L22 35 L35 28 L48 22"
          stroke={trendColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="8" cy="40" r="2.5" fill={trendColor}/>
        <circle cx="22" cy="35" r="2.5" fill={trendColor}/>
        <circle cx="35" cy="28" r="2.5" fill={trendColor}/>
        <circle cx="48" cy="22" r="2.5" fill={trendColor}/>
      </g>
      
      {/* Text: PropTrenz */}
      <text
        x="58"
        y="32"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="20"
        fontWeight="700"
        fill={textColor}
        letterSpacing="-0.5"
      >
        PropTrenz
      </text>
      
      {/* Subtle accent line */}
      <line
        x1="58"
        y1="38"
        x2="180"
        y2="38"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  )
}

