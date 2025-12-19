'use client'

import React from 'react'
import Link from 'next/link'
import { BarChart3, MapPin, TrendingUp, ExternalLink, ArrowRight } from 'lucide-react'
import type { DataReference } from '@/lib/pseo/dataReferences'
import { getDataReferenceUrl, getDataReferenceLabel } from '@/lib/pseo/dataReferences'

interface DataReferenceLinkProps {
  reference: DataReference
  className?: string
}

export function DataReferenceLink({ reference, className = '' }: DataReferenceLinkProps) {
  const url = getDataReferenceUrl(reference, '')
  const label = getDataReferenceLabel(reference)
  
  // Determine icon based on reference type
  const getIcon = () => {
    switch (reference.type) {
      case 'chart':
        return <BarChart3 className="h-3.5 w-3.5" />
      case 'map':
        return <MapPin className="h-3.5 w-3.5" />
      case 'growth':
      case 'price':
        return <TrendingUp className="h-3.5 w-3.5" />
      default:
        return <ExternalLink className="h-3.5 w-3.5" />
    }
  }
  
  // Determine color scheme based on type
  const getColorClasses = () => {
    switch (reference.type) {
      case 'chart':
        return {
          text: 'text-blue-700 hover:text-blue-800',
          icon: 'text-blue-600'
        }
      case 'map':
        return {
          text: 'text-green-700 hover:text-green-800',
          icon: 'text-green-600'
        }
      case 'growth':
      case 'price':
        return {
          text: 'text-purple-700 hover:text-purple-800',
          icon: 'text-purple-600'
        }
      default:
        return {
          text: 'text-indigo-700 hover:text-indigo-800',
          icon: 'text-indigo-600'
        }
    }
  }
  
  const colors = getColorClasses()
  
  const handleClick = (e: React.MouseEvent) => {
    // Track the click
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('guide_data_reference_clicked', {
        reference_type: reference.type,
        location: reference.location,
        action: reference.action || 'view'
      })
    }
    // Link will open in new tab via target="_blank", no need to prevent default
  }
  
  return (
    <Link
      href={url}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex items-center gap-1.5 font-semibold text-sm transition-all duration-200 ${colors.text} underline decoration-2 underline-offset-2 ${className}`}
    >
      <span className={colors.icon}>{getIcon()}</span>
      <span className="font-bold">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  )
}

