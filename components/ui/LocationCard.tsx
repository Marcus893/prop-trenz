'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, HeartOff, MapPin, TrendingUp } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useTranslation } from 'next-i18next'

interface LocationCardProps {
  location: {
    id: string
    name: string
    type: 'national' | 'state' | 'municipality' | 'metro_zone'
    state?: string
  }
  currentPrice?: number
  growthRate?: number
  isInWatchlist?: boolean
  onToggleWatchlist?: (locationId: string) => void
  onClick?: (locationId: string) => void
  className?: string
}

export function LocationCard({
  location,
  currentPrice,
  growthRate,
  isInWatchlist = false,
  onToggleWatchlist,
  onClick,
  className
}: LocationCardProps) {
  const { t } = useTranslation('common')

  const getLocationTypeLabel = () => {
    switch (location.type) {
      case 'national':
        return t('navigation.national')
      case 'state':
        return t('navigation.state')
      case 'municipality':
        return t('navigation.municipality')
      case 'metro_zone':
        return t('navigation.metro_zone')
      default:
        return location.type
    }
  }

  const getGrowthColor = () => {
    if (!growthRate) return 'text-gray-600'
    if (growthRate > 0) return 'text-green-600'
    if (growthRate < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getGrowthIcon = () => {
    if (!growthRate) return null
    if (growthRate > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
  }

  return (
    <Card 
      className={`p-2 hover:shadow-lg transition-shadow cursor-pointer ${className}`}
      onClick={() => onClick?.(location.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">{/* min-w-0 enables text truncation inside flex */}
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">{getLocationTypeLabel()}</span>
          </div>
          
          <h3 className="text-base md:text-base font-semibold text-gray-900 mb-1 break-words">
            {location.name}
          </h3>
          
          {location.state && (
            <p className="text-xs md:text-sm text-gray-600 mb-3 line-clamp-2 break-words">
              {location.state}
            </p>
          )}

          <div className="flex items-center gap-4">
            {currentPrice && (
              <div>
                <div className="text-sm text-gray-600">{t('current_price')}</div>
                <div className="text-lg font-semibold">{currentPrice.toFixed(2)}</div>
              </div>
            )}
            
            {growthRate !== undefined && (
              <div>
                <div className="text-sm text-gray-600">{t('growth_rate')}</div>
                <div className={`flex items-center gap-1 ${getGrowthColor()}`}>
                  {getGrowthIcon()}
                  <span className="text-lg font-semibold">
                    {growthRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {onToggleWatchlist && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onToggleWatchlist(location.id)
            }}
            className="ml-2"
          >
            {isInWatchlist ? (
              <Heart className="h-5 w-5 text-red-500 fill-current" />
            ) : (
              <HeartOff className="h-5 w-5 text-gray-400" />
            )}
          </Button>
        )}
      </div>
    </Card>
  )
}

export default LocationCard


