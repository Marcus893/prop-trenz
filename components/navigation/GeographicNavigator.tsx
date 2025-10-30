'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { LocationCard } from '@/components/ui/LocationCard'
import { Search, MapPin, Filter, ChevronRight } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useTranslation } from 'next-i18next'

interface Location {
  id: string
  name: string
  type: 'national' | 'state' | 'municipality' | 'metro_zone'
  state?: string
  parent_id?: string
}

interface GeographicNavigatorProps {
  onLocationSelect: (locationId: string) => void
  selectedLocationId?: string
  className?: string
}

export function GeographicNavigator({ 
  onLocationSelect, 
  selectedLocationId,
  className 
}: GeographicNavigatorProps) {
  const { t } = useTranslation('common')
  const [allLocations, setAllLocations] = useState<Location[]>([]) // All locations for filtering
  const [locations, setLocations] = useState<Location[]>([]) // Current view locations
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  // Removed redundant state dropdown; state can be filtered via search or type
  const [breadcrumb, setBreadcrumb] = useState<Location[]>([])
  const [currentLevel, setCurrentLevel] = useState<'national' | 'state' | 'municipality'>('national')
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted before rendering translations
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fallback function for translations
  const translate = (key: string) => {
    if (!mounted) {
      // Return consistent fallback during SSR
      return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
    // keys live under navigation.* in common namespace
    const translation = t(`navigation.${key}`)
    return translation === key ? key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : translation
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    filterLocations()
  }, [locations, allLocations, searchTerm, selectedType, currentLevel])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const result = await db.getLocations()
      if (result.error) throw result.error
      if (!result.data) return
      // Remove test locations and enforce uniqueness by name+type
      const unique = new Map<string, Location>()
      for (const loc of result.data) {
        if (loc.name?.toLowerCase().startsWith('test_')) continue
        const key = `${loc.name}|${loc.type}|${loc.state || ''}`
        if (!unique.has(key)) unique.set(key, loc)
      }
      const allUniqueLocations = Array.from(unique.values())
      setAllLocations(allUniqueLocations) // Store all locations
      setLocations(allUniqueLocations) // Set current view
      setBreadcrumb([])
      setCurrentLevel('national')
    } catch (error) {
      console.error('Error loading locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterLocations = () => {
    // When 'all' is selected, show ALL locations across levels
    let filtered = selectedType === 'all' ? allLocations : allLocations.filter(l => l.type === selectedType)

    // Apply search within the chosen scope
    if (searchTerm) {
      const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const q = normalize(searchTerm.trim())

      // Simple alias map. Extendable as needed.
      const aliasMatches = (loc: Location): boolean => {
        const aliases: Array<{ keys: string[]; match: (l: Location) => boolean }> = [
          {
            // Cancún → Benito Juárez (Quintana Roo)
            keys: ['cancun', 'cancún'],
            match: (l) => l.name === 'Benito Juárez' && l.state === 'Quintana Roo',
          },
          {
            // CDMX / Mexico City → Ciudad de México
            keys: ['cdmx', 'mexico city', 'ciudad de mexico', 'df'],
            match: (l) => l.name === 'Ciudad de México',
          },
          {
            // Playa del Carmen → Solidaridad (Quintana Roo)
            keys: ['playa del carmen', 'playa del cármen'],
            match: (l) => l.name === 'Solidaridad' && l.state === 'Quintana Roo',
          },
        ]

        for (const a of aliases) {
          if (!a.match(loc)) continue
          for (const key of a.keys) {
            const k = normalize(key)
            if (k.startsWith(q) || q.startsWith(k) || k.includes(q) || q.includes(k)) {
              return true
            }
          }
        }
        return false
      }

      filtered = filtered.filter(location => {
        const name = normalize(location.name)
        const state = location.state ? normalize(location.state) : ''
        return name.includes(q) || state.includes(q) || aliasMatches(location)
      })
    }

    setFilteredLocations(filtered)
  }
  const getDisplayName = (loc: Location) => {
    // Add alias suffix for known places
    if (loc.name === 'Benito Juárez' && loc.state === 'Quintana Roo') {
      return `${loc.name} (Cancún)`
    }
    if (loc.name === 'Solidaridad' && loc.state === 'Quintana Roo') {
      return `${loc.name} (Playa del Carmen)`
    }
    return loc.name
  }

  const handleLocationClick = async (locationId: string) => {
    // Search in allLocations first, then fallback to locations (for backward compatibility)
    const location = allLocations.find(loc => loc.id === locationId) || locations.find(loc => loc.id === locationId)
    if (!location) return

    // Always call onLocationSelect first to update the chart
    onLocationSelect(locationId)

    // For leaf locations (municipalities, metro zones), don't navigate deeper
    if (location.type === 'municipality' || location.type === 'metro_zone') {
      return
    }

    // Enforce strict hierarchy in breadcrumb: [national] -> [national, state]
    let newBreadcrumb: Location[] = []
    if (location.type === 'national') {
      newBreadcrumb = [location]
    } else if (location.type === 'state') {
      // Ensure national exists as the first crumb
      const national = allLocations.find(l => l.type === 'national')
      if (national) newBreadcrumb.push(national)
      newBreadcrumb.push(location)
    } else {
      // For other types we keep current breadcrumb state (though we don't add leaf types)
      newBreadcrumb = [...breadcrumb]
    }
    setBreadcrumb(newBreadcrumb)

    // Update current level
    if (location.type === 'national') {
      setCurrentLevel('state')
    } else if (location.type === 'state') {
      setCurrentLevel('municipality')
    }

    // Load child locations
    try {
      const result = await db.getLocations()
      if (result.error) throw result.error
      if (!result.data) return
      
      const childLocations = result.data.filter(loc => 
        loc.parent_id === locationId || 
        (location.type === 'state' && loc.state === location.name)
      )
      
      setLocations(childLocations)
    } catch (error) {
      console.error('Error loading child locations:', error)
    }
  }

  const handleBreadcrumbClick = async (index: number) => {
    const newBreadcrumb = breadcrumb.slice(0, index + 1)
    setBreadcrumb(newBreadcrumb)

    // Reset to appropriate level
    if (index === -1) {
      setCurrentLevel('national')
      await loadInitialData()
    } else {
      const location = newBreadcrumb[newBreadcrumb.length - 1]
      setCurrentLevel(location.type === 'state' ? 'municipality' : 'state')
      
      // Select the location for chart display
      onLocationSelect(location.id)
      
      // Load locations for this level
      try {
        const result = await db.getLocations()
        if (result.error) throw result.error
        if (!result.data) return
        
        const childLocations = result.data.filter(loc => 
          loc.parent_id === location.id || 
          (location.type === 'state' && loc.state === location.name)
        )
        
        setLocations(childLocations)
      } catch (error) {
        console.error('Error loading locations:', error)
      }
    }
  }

  // Removed getUniqueStates as state dropdown was removed

  const getLocationTypeLabel = (type: string) => {
    switch (type) {
      case 'national':
        return t('navigation.national')
      case 'state':
        return t('navigation.state')
      case 'municipality':
        return t('navigation.municipality')
      case 'metro_zone':
        return t('navigation.metro_zone')
      default:
        return type
    }
  }

  const getSelectedTypeLabel = () => {
    if (selectedType === 'all') return t('navigation.all_types')
    return getLocationTypeLabel(selectedType)
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">{t('loading')}</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {translate('geographic_navigation')}
        </h2>

        {/* Breadcrumb */}
        {breadcrumb.length > 0 && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBreadcrumbClick(-1)}
              className="text-blue-600 hover:text-blue-700"
            >
              {translate('all_locations')}
            </Button>
            {breadcrumb.map((location, index) => (
              <React.Fragment key={location.id}>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBreadcrumbClick(index)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {getDisplayName(location)}
                </Button>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder={getSelectedTypeLabel()} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('navigation.all_types')}</SelectItem>
              <SelectItem value="national">{t('navigation.national')}</SelectItem>
              <SelectItem value="state">{t('navigation.state')}</SelectItem>
              <SelectItem value="municipality">{t('navigation.municipality')}</SelectItem>
              <SelectItem value="metro_zone">{t('navigation.metro_zone')}</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={t('navigation.search_locations')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* State dropdown removed to reduce redundancy */}
        </div>
      </div>

      {/* Locations Grid (scrollable) */}
      <div className="relative">
        <div className="h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredLocations.map((location) => (
              <LocationCard
                key={location.id}
                location={{ ...location, name: getDisplayName(location) }}
                onClick={handleLocationClick}
                className={`${
                  selectedLocationId === location.id ? 'ring-2 ring-blue-500' : ''
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {filteredLocations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>{t('navigation.no_locations_found')}</p>
        </div>
      )}
    </Card>
  )
}

export default GeographicNavigator
