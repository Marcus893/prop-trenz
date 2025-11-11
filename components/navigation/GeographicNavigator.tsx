'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { LocationCard } from '@/components/ui/LocationCard'
import { Search, MapPin, Filter, ChevronRight, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useTranslation } from 'next-i18next'
import { useTracking } from '@/lib/useTracking'

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
  const { track } = useTracking()
  const [allLocations, setAllLocations] = useState<Location[]>([]) // All locations for filtering
  const [locations, setLocations] = useState<Location[]>([]) // Current view locations
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  // Removed redundant state dropdown; state can be filtered via search or type
  const [breadcrumb, setBreadcrumb] = useState<Location[]>([])
  const [currentLevel, setCurrentLevel] = useState<'national' | 'state' | 'municipality'>('national')
  const [mounted, setMounted] = useState(false)
  const isMountedRef = useRef(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Ensure component is mounted before rendering translations
  useEffect(() => {
    setMounted(true)
    isMountedRef.current = true
    
    return () => {
      isMountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
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
    // Only load data if component is mounted
    if (isMountedRef.current) {
      loadInitialData()
    }
    
    return () => {
      // Cleanup: clear timeout if component unmounts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    filterLocations()
  }, [locations, allLocations, searchTerm, selectedType, currentLevel])

  const loadInitialData = async (retryCount = 0) => {
    // Don't proceed if component is unmounted
    if (!isMountedRef.current) return
    
    setLoading(true)
    setError(null)
    
    let timeoutId: NodeJS.Timeout | null = null
    let hasCompleted = false
    
    try {
      // Start the query
      const queryPromise = db.getLocations()
      
      // Set up timeout that will reject if query takes too long
      let timeoutReject: ((error: Error) => void) | null = null
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutReject = reject
        timeoutId = setTimeout(() => {
          if (!hasCompleted) {
            hasCompleted = true
            reject(new Error('Request timeout'))
          }
        }, 30000)
        timeoutRef.current = timeoutId
      })
      
      // Wait for query, but also race against timeout
      const result = await Promise.race([
        queryPromise.then((res) => {
          hasCompleted = true
          // Clear timeout since query completed
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutRef.current = null
            timeoutId = null
          }
          return res
        }).catch((err) => {
          hasCompleted = true
          // Clear timeout on error
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutRef.current = null
            timeoutId = null
          }
          throw err
        }),
        timeoutPromise
      ]) as Awaited<ReturnType<typeof db.getLocations>>
      
      // Clear timeout if we got here (query succeeded)
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutRef.current = null
        timeoutId = null
      }
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return
      
      if (result.error) {
        // If it's a network error and we haven't retried, try once more
        if (retryCount < 1 && (result.error.message?.includes('network') || result.error.message?.includes('fetch'))) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
          return loadInitialData(retryCount + 1)
        }
        throw result.error
      }
      
      if (!result.data || result.data.length === 0) {
        if (!isMountedRef.current) {
          setLoading(false)
          return
        }
        setError(translate('no_locations_found') || 'No locations found')
        setAllLocations([])
        setLocations([])
        setLoading(false)
        return
      }
      
      // Remove test locations and enforce uniqueness by name+type
      const unique = new Map<string, Location>()
      for (const loc of result.data) {
        if (loc.name?.toLowerCase().startsWith('test_')) continue
        const key = `${loc.name}|${loc.type}|${loc.state || ''}`
        if (!unique.has(key)) unique.set(key, loc)
      }
      const allUniqueLocations = Array.from(unique.values())
      
      // Only update state if component is still mounted
      if (!isMountedRef.current) {
        setLoading(false)
        return
      }
      
      setAllLocations(allUniqueLocations) // Store all locations
      setLocations(allUniqueLocations) // Set current view
      setBreadcrumb([])
      setCurrentLevel('national')
      setError(null)
      setLoading(false) // CRITICAL: Set loading to false on success
    } catch (error) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutRef.current = null
      }
      
      // Only update state if component is still mounted
      if (!isMountedRef.current) return
      
      console.error('Error loading locations:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load locations'
      
      // Provide more helpful error messages
      let userFriendlyMessage = errorMessage
      if (errorMessage.includes('timeout')) {
        userFriendlyMessage = 'Connection timeout. Please check your internet connection and try again.'
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userFriendlyMessage = 'Network error. Please check your connection and try again.'
      } else if (errorMessage.includes('JWT') || errorMessage.includes('auth')) {
        userFriendlyMessage = 'Authentication error. Please refresh the page.'
      }
      
      setError(userFriendlyMessage)
      setAllLocations([])
      setLocations([])
    } finally {
      // Only update loading state if component is still mounted
      if (isMountedRef.current) {
        setLoading(false)
      }
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

      filtered = filtered.filter((location: Location) => {
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
    const location = allLocations.find((loc: Location) => loc.id === locationId) || locations.find((loc: Location) => loc.id === locationId)
    if (!location) return

    // Track location selection
    track('location_selected', {
      location_id: locationId,
      location_name: location.name,
      location_type: location.type,
    })

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
      const national = allLocations.find((l: Location) => l.type === 'national')
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
      
      const childLocations = result.data.filter((loc: Location) => 
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
        
        const childLocations = result.data.filter((loc: Location) =>
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
          <Select value={selectedType} onValueChange={(value) => {
            setSelectedType(value)
            track('filter_applied', { filter_type: 'location_type', value })
          }}>
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim().length > 0) {
                  track('search_performed', { 
                    search_term: searchTerm.trim(),
                    result_count: filteredLocations.length 
                  })
                }
              }}
              className="pl-10"
            />
          </div>

          {/* State dropdown removed to reduce redundancy */}
        </div>
      </div>

      {/* Locations Grid (scrollable) */}
      <div className="relative">
        <div className="h-[60vh] overflow-y-auto pr-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">{t('navigation.loading')}</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-700 mb-4 font-medium">{error}</p>
                <Button
                  onClick={() => loadInitialData(0)}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('common.retry') || 'Retry'}
                </Button>
              </div>
            </div>
          ) : filteredLocations.length > 0 ? (
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
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>{t('navigation.no_locations_found')}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default GeographicNavigator
