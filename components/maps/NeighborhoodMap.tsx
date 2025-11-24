'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import { NeighborhoodPriceChart } from './NeighborhoodPriceChart'

// Fix for Leaflet default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

interface Neighborhood {
  colonia: string
  precio: string
  mes: string
}

interface MunicipalityData {
  [municipality: string]: Neighborhood[]
}

interface NeighborhoodData {
  [city: string]: MunicipalityData
}

// Approximate coordinates for municipalities/alcaldías
const MUNICIPALITY_COORDS: { [key: string]: [number, number] } = {
  // Monterrey municipalities
  'Monterrey': [25.6866, -100.3161],
  'San Pedro Garza García': [25.6714, -100.4025],
  'San Nicolás de los Garza': [25.7471, -100.3025],
  'Apodaca': [25.7803, -100.1868],
  'Guadalupe': [25.6774, -100.2605],
  // CDMX alcaldías
  'Álvaro Obregón': [19.3647, -99.1944],
  'Azcapotzalco': [19.4889, -99.1867],
  'Benito Juárez': [19.3722, -99.1569],
  'Coyoacán': [19.3450, -99.1619],
  'Cuajimalpa de Morelos': [19.3575, -99.2903],
  'Cuauhtémoc': [19.4326, -99.1332],
  'Gustavo A. Madero': [19.4897, -99.1108],
  'Iztacalco': [19.3958, -99.0978],
  'Iztapalapa': [19.3575, -99.0925],
  'La Magdalena Contreras': [19.3311, -99.2472],
  'Miguel Hidalgo': [19.4326, -99.2000],
  'Tláhuac': [19.2500, -99.0500],
  'Tlalpan': [19.2833, -99.2333],
  'Venustiano Carranza': [19.4333, -99.1000],
  'Xochimilco': [19.2667, -99.1056],
  // Jalisco municipalities
  'Guadalajara': [20.6597, -103.3496],
  'Tlaquepaque': [20.6409, -103.2933],
  'Tonalá': [20.6244, -103.2342],
  'Zapopan': [20.7236, -103.3848],
}

function getPriceColor(avgPrice: number): string {
  if (avgPrice < 30000) return '#22c55e' // green - low
  if (avgPrice < 50000) return '#84cc16' // lime
  if (avgPrice < 70000) return '#eab308' // yellow
  if (avgPrice < 90000) return '#f97316' // orange
  return '#ef4444' // red - high
}

function createCustomIcon(color: string, size: number = 20) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// Geocode using Photon (free, open-source, excellent Mexico coverage)
async function geocodeWithPhoton(
  query: string,
  neighborhoodName: string,
  city: string = 'Monterrey'
): Promise<[number, number] | null> {
  // Determine city name for geocoding
  const cityName = city === 'Ciudad de México' ? 'Ciudad de México' 
    : (city === 'Jalisco' || city === 'Guadalajara') ? 'Guadalajara' 
    : 'Monterrey'
  try {
    // Clean query - remove problematic special characters
    const cleanQuery = query
      .replace(/[^\w\s,áéíóúÁÉÍÓÚñÑüÜ]/g, '') // Keep only alphanumeric, spaces, commas, and accented letters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
    
    const encodedQuery = encodeURIComponent(cleanQuery)
    const url = `https://photon.komoot.io/api/?q=${encodedQuery}&limit=1`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    if (data?.features && data.features.length > 0) {
      const feature = data.features[0]
      const coords = feature.geometry?.coordinates
      if (coords && Array.isArray(coords) && coords.length >= 2) {
        const [lon, lat] = coords
        // Verify location is within the correct city bounds
        if (city === 'Ciudad de México') {
          // CDMX bounds
          if (lat >= 19.0 && lat <= 20.0 && lon >= -99.4 && lon <= -98.9) {
            return [lat, lon]
          }
        } else if (city === 'Jalisco' || city === 'Guadalajara') {
          // Jalisco/Guadalajara bounds
          if (lat >= 20.4 && lat <= 20.8 && lon >= -103.6 && lon <= -103.1) {
            return [lat, lon]
          }
        } else {
          // Monterrey bounds (Nuevo León)
          if (lat >= 25.0 && lat <= 26.0 && lon >= -100.8 && lon <= -99.5) {
            return [lat, lon]
          }
        }
      }
    }
  } catch (error) {
    // Silently fail
  }
  return null
}

// Geocode a neighborhood name using multiple free services
async function geocodeNeighborhood(
  neighborhoodName: string, 
  municipality: string, 
  city: string = 'Monterrey'
): Promise<[number, number] | null> {
  // Extract name from parentheses (e.g., "Villa Magna (Las Cruces)" -> "Las Cruces")
  const parenthesesMatch = neighborhoodName.match(/\(([^)]+)\)/)
  const parenthesesName = parenthesesMatch ? parenthesesMatch[1].trim() : null
  
  // Expand common abbreviations
  const expandAbbreviations = (name: string): string[] => {
    const variants: string[] = [name]
    
    // Rdcial -> Residencial
    if (name.includes('Rdcial')) {
      variants.push(name.replace(/Rdcial/gi, 'Residencial'))
    }
    // U -> Unidad
    if (name.match(/\bU\s+De\b/i)) {
      variants.push(name.replace(/\bU\s+De\b/gi, 'Unidad De'))
      variants.push(name.replace(/\bU\s+De\b/gi, 'Unidad De Colonos'))
    }
    // Hda -> Hacienda
    if (name.includes('Hda')) {
      variants.push(name.replace(/Hda/gi, 'Hacienda'))
    }
    // Sec -> Sector
    if (name.match(/\bSec\b/i)) {
      variants.push(name.replace(/\bSec\b/gi, 'Sector'))
    }
    
    return variants
  }
  
  // Clean neighborhood name - remove common prefixes/suffixes and normalize
  const cleanName = neighborhoodName
    .replace(/^Colonia\s+/i, '')
    .replace(/\s+\(.*?\)$/g, '') // Remove parentheses content
    .trim()
  
  // Build query list - try both the main name and the name in parentheses
  const nameVariants: string[] = [cleanName, neighborhoodName]
  if (parenthesesName) {
    nameVariants.push(parenthesesName)
    // Also try "main name (parentheses)" format
    nameVariants.push(`${cleanName} (${parenthesesName})`)
  }
  
  // Expand abbreviations for all variants
  const expandedVariants: string[] = []
  for (const variant of nameVariants) {
    expandedVariants.push(variant)
    expandedVariants.push(...expandAbbreviations(variant))
  }
  
  // Build Photon queries - use correct city/state name
  const queries: string[] = []
  const genericNames = ['Hidalgo', 'Terminal', 'Industrial', 'Centro', 'Norte', 'Sur', 'Este', 'Oeste']
  let cityState: string
  let cityName: string
  if (city === 'Ciudad de México') {
    cityState = 'Ciudad de México'
    cityName = 'Ciudad de México'
  } else if (city === 'Jalisco' || city === 'Guadalajara') {
    cityState = 'Jalisco'
    cityName = 'Guadalajara'
  } else {
    cityState = 'Nuevo León'
    cityName = 'Monterrey'
  }
  
  for (const name of expandedVariants) {
    // Base queries for all neighborhoods
    queries.push(`${name}, ${municipality}, ${cityState}`)
    queries.push(`${name}, ${municipality}`)
    queries.push(`${name} ${municipality} ${cityState}`)
    
    // Add city name for better specificity (especially for Jalisco)
    queries.push(`${name}, ${municipality}, ${cityName}, ${cityState}`)
    queries.push(`${name}, ${cityName}, ${cityState}`)
    
    // For very generic names, try more specific queries
    if (name.length <= 10 || genericNames.some(g => name.includes(g))) {
      queries.push(`${municipality} ${name}, ${cityState}`)
      queries.push(`${name} colonia ${municipality}, ${cityState}`)
      queries.push(`${name} neighborhood ${municipality}, ${cityState}`)
      queries.push(`${name} colonia ${municipality}, ${cityName}, ${cityState}`)
      // Try searching with the full original name for generic terms
      if (name !== neighborhoodName) {
        queries.push(`${neighborhoodName}, ${municipality}, ${cityState}`)
        queries.push(`${neighborhoodName}, ${municipality}, ${cityName}, ${cityState}`)
      }
    }
    
    // For Jalisco, add additional queries with "Guadalajara" explicitly
    if (cityState === 'Jalisco') {
      queries.push(`${name}, ${municipality}, Guadalajara, Jalisco`)
      queries.push(`${name}, Guadalajara, Jalisco`)
      if (municipality !== 'Guadalajara') {
        queries.push(`${name}, ${municipality}, Guadalajara`)
      }
    }
  }
  
  // Remove duplicates
  const uniqueQueries = Array.from(new Set(queries))

  // Try all query variants with Photon
  for (const query of uniqueQueries) {
    const coords = await geocodeWithPhoton(query, neighborhoodName, city)
    if (coords) {
      console.log(`[Geocode] ✓ Found ${neighborhoodName} via Photon with: "${query}"`)
      return coords
    }
    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.warn(`[Geocode] ✗ No results for ${neighborhoodName} after trying ${uniqueQueries.length} queries`)
  if (parenthesesName) {
    console.log(`[Geocode]   Tried variants: "${cleanName}", "${neighborhoodName}", "${parenthesesName}"`)
  }
  return null
}

// Load saved coordinates from database for a specific city (all municipalities in that city)
async function loadSavedCoordinates(city?: string): Promise<Map<string, [number, number]>> {
  try {
    const url = city 
      ? `/api/neighborhood-coordinates?city=${encodeURIComponent(city)}`
      : '/api/neighborhood-coordinates'
    const response = await fetch(url)
    if (!response.ok) {
      console.warn('Failed to fetch coordinates from database, falling back to empty map')
      return new Map()
    }
    const data = await response.json()
    return new Map(Object.entries(data))
  } catch (error) {
    console.error('Error loading saved coordinates:', error)
    return new Map()
  }
}

// Save coordinates to server
async function saveCoordinates(coordinates: Map<string, [number, number]>, city?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const coordinatesObj = Object.fromEntries(coordinates)
    console.log(`[Save] Attempting to save ${Object.keys(coordinatesObj).length} coordinates${city ? ` for city: ${city}` : ''}`)
    const response = await fetch('/api/save-coordinates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates: coordinatesObj, ...(city && { city }) }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Save] Failed to save coordinates:', response.status, errorText)
      return { success: false, error: errorText }
    }
    
    const result = await response.json()
    console.log('[Save] Successfully saved coordinates:', result)
    return { success: true }
  } catch (error) {
    console.error('[Save] Error saving coordinates:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

interface NeighborhoodMapProps {
  data: NeighborhoodData
  selectedCity: string
}

// Component to handle map interactions and expose map instance
function MapController({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap()
  
  useEffect(() => {
    onMapReady(map)
    
    // Function to set popup z-index and ensure markers are behind popups
    const setPopupZIndex = () => {
      const container = map.getContainer()
      if (!container) return
      
      // Set marker pane z-index to be lower than popup pane
      const markerPane = map.getPane('markerPane')
      if (markerPane) {
        markerPane.style.zIndex = '300'
      }
      
      // Set z-index on popup pane (higher than markers)
      const popupPane = map.getPane('popupPane')
      if (popupPane) {
        popupPane.style.zIndex = '400'
      }
      
      const popupPaneElement = container.querySelector('.leaflet-popup-pane') as HTMLElement
      if (popupPaneElement) {
        popupPaneElement.style.zIndex = '400'
      }
      
      // Set z-index on all popup elements
      const popups = container.querySelectorAll('.leaflet-popup')
      popups.forEach((popup) => {
        const popupEl = popup as HTMLElement
        popupEl.style.zIndex = '400'
        
        const wrapper = popupEl.querySelector('.leaflet-popup-content-wrapper') as HTMLElement
        if (wrapper) {
          wrapper.style.zIndex = '400'
        }
        
        const tip = popupEl.querySelector('.leaflet-popup-tip') as HTMLElement
        if (tip) {
          tip.style.zIndex = '400'
        }
      })
    }
    
    // Set initially
    setPopupZIndex()
    
    // Set when popup opens
    map.on('popupopen', setPopupZIndex)
    
    // Also set on a slight delay to catch any timing issues
    const timeout = setTimeout(setPopupZIndex, 100)
    
    return () => {
      map.off('popupopen', setPopupZIndex)
      clearTimeout(timeout)
    }
  }, [map, onMapReady])
  
  return null
}

// Helper function to translate month names in date strings
function translateDate(dateString: string, t: (key: string, options?: any) => string): string {
  if (!dateString) return dateString
  
  // Parse format like "October 2025"
  const parts = dateString.trim().split(' ')
  if (parts.length === 2) {
    const monthName = parts[0]
    const year = parts[1]
    
    // Try to translate the month name
    const translatedMonth = t(`map.months.${monthName}`, { defaultValue: monthName })
    
    return `${translatedMonth} ${year}`
  }
  
  // If format doesn't match, return as-is
  return dateString
}

// Component to wrap Marker and store ref
function MunicipalityMarker({ 
  municipality,
  position,
  avgPrice,
  neighborhoodCount,
  color,
  onMarkerReady,
  onMunicipalityClick,
  onChartClick
}: { 
  municipality: string
  position: [number, number]
  avgPrice: number
  neighborhoodCount: number
  color: string
  onMarkerReady: (municipality: string, markerInstance: L.Marker) => void
  onMunicipalityClick: (municipality: string) => void
  onChartClick: (municipality: string) => void
}) {
  const { t } = useTranslation('common')
  const markerRef = useRef<L.Marker | null>(null)
  
  // Use callback ref to capture marker instance
  const setMarkerRef = (markerInstance: L.Marker | null) => {
    markerRef.current = markerInstance
    if (markerInstance) {
      onMarkerReady(municipality, markerInstance)
    }
  }
  
  const customIcon = createCustomIcon(color, 20)
  
  return (
    <Marker
      ref={setMarkerRef}
      position={position}
      icon={customIcon}
      eventHandlers={{
        click: () => onMunicipalityClick(municipality),
      }}
    >
      <Popup 
        className="leaflet-popup-above-panel"
        autoPan={true}
        autoPanPadding={L.point(100, 200)}
      >
        <div className="text-center">
          <h3 className="font-bold text-sm mb-1">{municipality}</h3>
          <p className="text-xs text-gray-600">
            {t('map.avg')}: ${Math.round(avgPrice).toLocaleString('es-MX')}/m²
          </p>
          <p className="text-xs text-gray-500 mb-2">
            {neighborhoodCount} {t('map.neighborhoods')}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onChartClick(municipality)
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            title={t('map.view_chart', 'View price history')}
          >
            {t('map.chart', 'Chart')}
          </button>
        </div>
      </Popup>
    </Marker>
  )
}

function NeighborhoodMarker({ 
  marker, 
  onMarkerReady,
  translateDateFn,
  municipality,
  onShowChart,
  onMarkerClick
}: { 
  marker: { key: string; coords: [number, number]; color: string; price: number; neighborhood: Neighborhood }
  onMarkerReady: (key: string, markerInstance: L.Marker) => void
  translateDateFn: (dateString: string) => string
  municipality: string
  onShowChart: (municipality: string, neighborhood: Neighborhood) => void
  onMarkerClick?: (municipality: string, neighborhood: Neighborhood) => void
}) {
  const { t } = useTranslation('common')
  const markerRef = useRef<L.Marker | null>(null)
  
  // Use callback ref to capture marker instance
  const setMarkerRef = (markerInstance: L.Marker | null) => {
    markerRef.current = markerInstance
    if (markerInstance) {
      onMarkerReady(marker.key, markerInstance)
    }
  }
  
  const customIcon = createCustomIcon(marker.color, 12)
  
  return (
    <Marker
      ref={setMarkerRef}
      position={marker.coords}
      icon={customIcon}
      eventHandlers={{
        click: () => {
          if (onMarkerClick) {
            onMarkerClick(municipality, marker.neighborhood)
          }
        }
      }}
    >
      <Popup 
        className="leaflet-popup-above-panel"
        autoPan={true}
        autoPanPadding={L.point(100, 200)}
      >
        <div className="text-center min-w-[100px]">
          <h3 className="font-bold text-sm">{marker.neighborhood.colonia}</h3>
          <p className="text-xs text-gray-600 font-semibold">
            ${Math.round(marker.price).toLocaleString('es-MX')}/m²
          </p>
          <p className="text-xs text-gray-500">
            {translateDateFn(marker.neighborhood.mes)}
          </p>
          <button
            onClick={() => onShowChart(municipality, marker.neighborhood)}
            className="w-full text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200"
            title={t('map.view_chart', 'View price history')}
          >
            {t('map.chart', 'Chart')}
          </button>
        </div>
      </Popup>
    </Marker>
  )
}

export function NeighborhoodMap({ data, selectedCity: selectedCityProp }: NeighborhoodMapProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null)
  
  // Create translateDate function bound to current translation function
  const translateDateFn = useMemo(() => {
    return (dateString: string) => translateDate(dateString, t)
  }, [t])
  
  const [neighborhoodCoords, setNeighborhoodCoords] = useState<Map<string, [number, number]>>(new Map())
  const [geocodingProgress, setGeocodingProgress] = useState<{ current: number; total: number } | null>(null)
  const [savedCoordsLoaded, setSavedCoordsLoaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPrice, setFilterPrice] = useState<string>('')
  const [filterType, setFilterType] = useState<'less' | 'greater'>('less')
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
  const [isCardCollapsed, setIsCardCollapsed] = useState(false)
  const [selectedNeighborhoodForChart, setSelectedNeighborhoodForChart] = useState<{
    name: string
    municipality: string
    data: Array<{ mes: string; precio: string; date: Date; price: number; displayDate: string }>
  } | null>(null)
  const [selectedMunicipalityForChart, setSelectedMunicipalityForChart] = useState<{
    name: string
    data: Array<{ mes: string; precio: string; date: Date; price: number; displayDate: string }>
  } | null>(null)
  const coordsRef = useRef<Map<string, [number, number]>>(new Map())
  const markerRefs = useRef<Map<string, L.Marker>>(new Map())
  const municipalityMarkerRefs = useRef<Map<string, L.Marker>>(new Map())
  
  const handleMunicipalityMarkerReady = (municipality: string, markerInstance: L.Marker) => {
    municipalityMarkerRefs.current.set(municipality, markerInstance)
  }
  
  // Helper functions for URL encoding/decoding
  const encodeName = (name: string): string => {
    return encodeURIComponent(name.toLowerCase().replace(/ /g, '-'))
  }
  
  const decodeName = (encoded: string): string => {
    if (!encoded) return ''
    try {
      // Handle double-encoded URLs (decode multiple times if needed)
      let decoded = encoded
      let maxDecodes = 5 // Safety limit
      while (decoded.includes('%') && maxDecodes > 0) {
        try {
          const prevDecoded = decoded
          decoded = decodeURIComponent(decoded)
          // If decoding didn't change anything, break
          if (prevDecoded === decoded) break
          maxDecodes--
        } catch (e) {
          // If decode fails, break and use current value
          break
        }
      }
      return decoded.replace(/-/g, ' ')
    } catch (e) {
      // Fallback: just replace dashes and try basic decode
      try {
        return decodeURIComponent(encoded).replace(/-/g, ' ')
      } catch (e2) {
        return encoded.replace(/-/g, ' ')
      }
    }
  }
  
  // Handle marker ready - store ref
  const handleMarkerReady = (key: string, markerInstance: L.Marker) => {
    markerRefs.current.set(key, markerInstance)
  }
  
  // Clear search when closing sidebar
  const handleCloseSidebar = () => {
    // First, clear the chart state
    setSelectedNeighborhoodForChart(null)
    setSelectedMunicipalityForChart(null)
    
    // Then clear municipality state
    setSelectedMunicipality(null)
    setSearchQuery('')
    setFilterPrice('')
    setFilterType('less')
    setIsCardCollapsed(false)
    
    // Remove municipality and neighborhood parameters from URL when panel is closed
    // Do this after a small delay to ensure state updates have processed
    if (router.isReady) {
      setTimeout(() => {
        const query = { ...router.query }
        delete query.municipality
        delete query.neighborhood
        delete query.chart
        delete query.municipalityChart
        
        router.replace(
          {
            pathname: router.pathname,
            query
          },
          undefined,
          { shallow: true }
        )
      }, 0)
    }
    
    // Zoom out to show all municipalities when panel closes
    if (mapInstance && markers.length > 0) {
      try {
        if (!mapInstance.getContainer()) return
        const allMunicipalityPoints: [number, number][] = markers.map(m => m.position)
        const bounds = L.latLngBounds(allMunicipalityPoints)
        mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 })
      } catch (e) {
        console.warn('Error zooming out on sidebar close:', e)
      }
    }
  }
  
  // Reset collapsed state when municipality changes
  useEffect(() => {
    setIsCardCollapsed(false)
  }, [selectedMunicipality])
  
  // Use the selected city from props (which comes from URL or user selection)
  const currentCity = selectedCityProp
  
  // Declare refs for URL sync and restoration
  const municipalitySyncInitializedRef = useRef(false)
  const chartSyncInitializedRef = useRef(false)
  const neighborhoodUpdateInProgressRef = useRef(false)
  const urlRestoredRef = useRef(false)
  const chartRestoredRef = useRef(false)
  const neighborhoodZoomedRef = useRef(false)
  
  // Reset state when city changes (municipality/neighborhood are city-specific)
  useEffect(() => {
    setSelectedMunicipality(null)
    setSelectedNeighborhoodForChart(null)
    setSelectedMunicipalityForChart(null)
    setSearchQuery('')
    setFilterPrice('')
    setFilterType('less')
    // Reset restoration refs when city changes
    urlRestoredRef.current = false
    chartRestoredRef.current = false
    neighborhoodZoomedRef.current = false
    municipalitySyncInitializedRef.current = false
    chartSyncInitializedRef.current = false
  }, [currentCity])
  
  // Sync municipality to URL
  useEffect(() => {
    if (!router.isReady || !data || !currentCity) return
    
    // Don't sync on initial load if municipality is in URL (let restoration handle it)
    if (!municipalitySyncInitializedRef.current && router.query.municipality) {
      municipalitySyncInitializedRef.current = true
      return
    }
    municipalitySyncInitializedRef.current = true
    
    // Verify municipality exists in current city before syncing
    if (selectedMunicipality) {
      const cityData = data[currentCity]
      if (!cityData || !cityData[selectedMunicipality]) {
        // Municipality doesn't exist in current city, don't sync
        return
      }
    }
    
    const currentMunicipality = router.query.municipality as string | undefined
    
    // Only update if we have a selected municipality and it's different from URL
    // Don't remove municipality from URL - let it persist
    if (selectedMunicipality) {
      const newMunicipality = encodeName(selectedMunicipality)
      if (currentMunicipality !== newMunicipality) {
        const query = { ...router.query }
        query.municipality = newMunicipality
      
        router.replace(
          {
            pathname: router.pathname,
            query
          },
          undefined,
          { shallow: true }
        )
      }
    }
    // Note: We don't remove municipality from URL when selectedMunicipality is null
    // This preserves the URL state when restoration hasn't completed yet
  }, [selectedMunicipality, router.isReady, router.query.municipality, data, currentCity])
  
  // Sync chart state to URL
  useEffect(() => {
    if (!router.isReady || !data || !currentCity) return
    
    // Don't sync if we're in the middle of a user-initiated neighborhood update
    if (neighborhoodUpdateInProgressRef.current) {
      return
    }
    
    // Don't sync on initial load if neighborhood is in URL (let restoration handle it)
    if (!chartSyncInitializedRef.current && router.query.neighborhood) {
      chartSyncInitializedRef.current = true
      return
    }
    chartSyncInitializedRef.current = true
    
    // If municipality is null (panel is closed), remove neighborhood and chart from URL
    if (!selectedMunicipality) {
      const currentNeighborhood = router.query.neighborhood as string | undefined
      const currentChart = router.query.chart as string | undefined
      if (currentNeighborhood || currentChart) {
        const query = { ...router.query }
        delete query.neighborhood
        delete query.chart
        router.replace(
          {
            pathname: router.pathname,
            query
          },
          undefined,
          { shallow: true }
        )
      }
      return
    }
    
    // Verify neighborhood exists in current city before syncing
    if (selectedNeighborhoodForChart) {
      const cityData = data[currentCity]
      if (!cityData || !selectedMunicipality || !cityData[selectedMunicipality]) {
        // Municipality doesn't exist in current city, don't sync
        return
      }
      const neighborhoods = cityData[selectedMunicipality]
      const neighborhoodExists = neighborhoods.some(n => n.colonia === selectedNeighborhoodForChart.name)
      if (!neighborhoodExists) {
        // Neighborhood doesn't exist in current city, don't sync
        return
      }
    }
    
    const currentNeighborhood = router.query.neighborhood as string | undefined
    const currentChart = router.query.chart as string | undefined
    
    // Only update if chart state changed
    // Don't update neighborhood here - let handleNeighborhoodClick handle neighborhood changes
    const chartStateChanged = (currentChart === 'true') !== !!selectedNeighborhoodForChart
    
    if (chartStateChanged) {
      const query = { ...router.query }
      if (selectedNeighborhoodForChart) {
        // Chart is open: ensure neighborhood and chart flag are set
        query.neighborhood = encodeName(selectedNeighborhoodForChart.name)
        query.chart = 'true'
      } else {
        // Chart is closed: remove chart flag but keep neighborhood (it will be updated by handleNeighborhoodClick if needed)
        delete query.chart
        // Only remove neighborhood if it doesn't match any active state
        // If neighborhood is in URL, keep it (it will be updated by user actions)
        // We don't remove it here to avoid conflicts with handleNeighborhoodClick
      }
      
      router.replace(
        {
          pathname: router.pathname,
          query
        },
        undefined,
        { shallow: true }
      )
    }
  }, [selectedNeighborhoodForChart, router.isReady, router.query.neighborhood, data, currentCity, selectedMunicipality])
  
  // Restore municipality from URL on mount
  useEffect(() => {
    if (!router.isReady || !data || Object.keys(data).length === 0 || urlRestoredRef.current) return
    
    const urlMunicipality = router.query.municipality as string | undefined
    
    // Restore municipality
    if (urlMunicipality) {
      const decodedMunicipality = decodeName(urlMunicipality)
      const cityData = data[currentCity]
      if (cityData) {
        // Find municipality with case-insensitive match
        const municipalityKeys = Object.keys(cityData)
        const matchedMunicipality = municipalityKeys.find(
          key => key.toLowerCase() === decodedMunicipality.toLowerCase()
        )
        if (matchedMunicipality) {
          setSelectedMunicipality(matchedMunicipality)
        } else {
          // Log for debugging if municipality not found
          console.warn(`[Restore] Municipality not found: "${decodedMunicipality}" (decoded from "${urlMunicipality}")`)
          console.warn(`[Restore] Available municipalities:`, municipalityKeys.slice(0, 5))
        }
      }
    }
    
    urlRestoredRef.current = true
  }, [router.isReady, router.query.municipality, data, currentCity])

  // Load saved coordinates when city changes (loads all municipalities for that city)
  useEffect(() => {
    if (!currentCity) {
      setSavedCoordsLoaded(false)
      return
    }

    const loadCoords = async () => {
      console.log(`[Load] Loading saved coordinates for city: ${currentCity}`)
      const saved = await loadSavedCoordinates(currentCity)
      console.log(`[Load] Loaded ${saved.size} saved coordinates for ${currentCity}`)
      setNeighborhoodCoords(saved)
      coordsRef.current = saved // Initialize ref with loaded coordinates
      setSavedCoordsLoaded(true)
    }
    loadCoords()
  }, [currentCity])

  // Helper function to parse month string and get comparable date
  const parseMonthDate = (mes: string): Date | null => {
    if (!mes) return null
    try {
      // Handle formats like "September 2025", "October 2025"
      const parts = mes.trim().split(' ')
      if (parts.length === 2) {
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                           'july', 'august', 'september', 'october', 'november', 'december']
        const monthIndex = monthNames.findIndex(m => m.startsWith(parts[0].toLowerCase()))
        const year = parseInt(parts[1])
        if (monthIndex >= 0 && !isNaN(year)) {
          return new Date(year, monthIndex, 1)
        }
      }
    } catch (e) {
      // Invalid format
    }
    return null
  }

  // Helper function to get the most recent month from a list of neighborhoods
  const getMostRecentMonth = (neighborhoods: Neighborhood[]): string | null => {
    if (neighborhoods.length === 0) return null
    
    const monthDates = neighborhoods
      .map(n => ({ mes: n.mes, date: parseMonthDate(n.mes) }))
      .filter(item => item.date !== null)
      .sort((a, b) => {
        if (!a.date || !b.date) return 0
        return b.date.getTime() - a.date.getTime() // Most recent first
      })
    
    return monthDates.length > 0 ? monthDates[0].mes : null
  }

  // Helper function to filter neighborhoods to only the most recent month
  const filterToMostRecentMonth = (neighborhoods: Neighborhood[]): Neighborhood[] => {
    const mostRecentMonth = getMostRecentMonth(neighborhoods)
    if (!mostRecentMonth) return neighborhoods
    
    return neighborhoods.filter(n => n.mes === mostRecentMonth)
  }



  // Calculate average prices and prepare marker data (using only most recent month)
  const markers = useMemo(() => {
    const result: Array<{
      municipality: string
      position: [number, number]
      avgPrice: number
      neighborhoodCount: number
      neighborhoods: Neighborhood[]
    }> = []

    // Process data for the current city (Ciudad de México, Jalisco, or Monterrey)
    const cityData = data[currentCity]
    if (cityData) {
      Object.entries(cityData).forEach(([municipality, neighborhoods]) => {
        const coords = MUNICIPALITY_COORDS[municipality]
        if (coords && neighborhoods.length > 0) {
          // Filter to only most recent month
          const recentNeighborhoods = filterToMostRecentMonth(neighborhoods)
          
          // Get unique colonias (in case there are duplicates from different months)
          const uniqueColonias = new Map<string, Neighborhood>()
          recentNeighborhoods.forEach(n => {
            const existing = uniqueColonias.get(n.colonia)
            if (!existing) {
              uniqueColonias.set(n.colonia, n)
            } else {
              // Keep the one with the most recent month
              const existingDate = parseMonthDate(existing.mes)
              const newDate = parseMonthDate(n.mes)
              if (newDate && existingDate && newDate > existingDate) {
                uniqueColonias.set(n.colonia, n)
              }
            }
          })
          
          const uniqueNeighborhoods = Array.from(uniqueColonias.values())
          const prices = uniqueNeighborhoods
            .map(n => parseFloat(n.precio))
            .filter(p => !isNaN(p) && p > 0)
          
          if (prices.length > 0) {
            const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
            result.push({
              municipality,
              position: coords,
              avgPrice,
              neighborhoodCount: uniqueNeighborhoods.length,
              neighborhoods: uniqueNeighborhoods,
            })
          }
        }
      })
    }

    return result.sort((a, b) => b.avgPrice - a.avgPrice)
  }, [data, currentCity])

  const selectedData = useMemo(() => {
    if (!selectedMunicipality) return null
    return markers.find(m => m.municipality === selectedMunicipality)
  }, [selectedMunicipality, markers])

  // Extract all historical data for a neighborhood (from original unfiltered data)
  const getHistoricalDataForNeighborhood = useMemo(() => {
    return (municipality: string, colonia: string) => {
      // Access original unfiltered data from the data prop (not selectedData which is filtered)
      const cityData = data[currentCity]
      if (!cityData || !cityData[municipality]) return []
      
      // Get ALL neighborhoods with the same name from ALL months (not just most recent)
      const allNeighborhoods = cityData[municipality].filter(
        n => n.colonia === colonia
      )
      
      // Convert to chart data format
      return allNeighborhoods
        .map(n => {
          const date = parseMonthDate(n.mes)
          if (!date) return null
          
          const price = parseFloat(n.precio)
          if (isNaN(price) || price <= 0) return null
          
          return {
            mes: n.mes,
            precio: n.precio,
            date,
            price,
            displayDate: translateDateFn(n.mes)
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
    }
  }, [data, currentCity, translateDateFn])

  const getHistoricalDataForMunicipality = useMemo(() => {
    return (municipality: string) => {
      // Access original unfiltered data from the data prop
      const cityData = data[currentCity]
      if (!cityData || !cityData[municipality]) return []
      
      // Get ALL neighborhoods from this municipality from ALL months
      const allNeighborhoods = cityData[municipality]
      
      // Group by month and calculate average price per month
      const monthlyData = new Map<string, { prices: number[]; mes: string }>()
      
      allNeighborhoods.forEach(n => {
        const date = parseMonthDate(n.mes)
        if (!date) return
        
        const price = parseFloat(n.precio)
        if (isNaN(price) || price <= 0) return
        
        const monthKey = n.mes
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { prices: [], mes: n.mes })
        }
        monthlyData.get(monthKey)!.prices.push(price)
      })
      
      // Convert to chart data format with average prices
      return Array.from(monthlyData.entries())
        .map(([monthKey, { mes, prices }]) => {
          const date = parseMonthDate(mes)
          if (!date) return null
          
          // Calculate average price for this month
          const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
          
          return {
            mes,
            precio: avgPrice.toFixed(2),
            date,
            price: avgPrice,
            displayDate: translateDateFn(mes)
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
    }
  }, [data, currentCity, translateDateFn])

  // Restore neighborhood zoom and popup from URL
  useEffect(() => {
    if (!router.isReady || !selectedMunicipality || !mapInstance || !savedCoordsLoaded || neighborhoodZoomedRef.current || !data) return
    
    const urlNeighborhood = router.query.neighborhood as string | undefined
    const urlChart = router.query.chart as string | undefined
    
    // Only zoom if neighborhood is in URL but chart is not open (or if chart is open, we'll handle it separately)
    if (urlNeighborhood && !selectedNeighborhoodForChart) {
      const decodedNeighborhood = decodeName(urlNeighborhood)
      const cityData = data[currentCity]
      
      if (cityData && cityData[selectedMunicipality]) {
        // Find the actual neighborhood object from data to get the exact name
        const neighborhoods = cityData[selectedMunicipality]
        const neighborhood = neighborhoods.find(n => 
          n.colonia.toLowerCase() === decodedNeighborhood.toLowerCase()
        )
        
        if (neighborhood) {
          // Use the actual neighborhood name from data for the key
          const key = `${selectedMunicipality}-${neighborhood.colonia}`
          
          // Try to find the neighborhood coordinates
          const coords = neighborhoodCoords.get(key)
          
          if (coords && mapInstance) {
            try {
              // Check if map is still valid
              if (!mapInstance.getContainer()) {
                neighborhoodZoomedRef.current = true
                return
              }
              // Pan to the neighborhood location
              mapInstance.setView(coords, 15, { animate: true, duration: 0.5 })
              
              // Find and open the marker popup
              const marker = markerRefs.current.get(key)
              if (marker) {
                // Small delay to ensure map has panned
                setTimeout(() => {
                  try {
                    if (marker && mapInstance && mapInstance.getContainer()) {
                      marker.openPopup()
                    }
                  } catch (e) {
                    console.warn('Error opening marker popup:', e)
                  }
                  neighborhoodZoomedRef.current = true
                }, 600)
              } else {
                neighborhoodZoomedRef.current = true
              }
            } catch (e) {
              console.warn('Error zooming to neighborhood:', e)
              neighborhoodZoomedRef.current = true
            }
          } else {
            // Coordinates not loaded yet, wait a bit and try again
            const retryTimeout = setTimeout(() => {
              const retryCoords = neighborhoodCoords.get(key)
              if (retryCoords && mapInstance) {
                try {
                  if (!mapInstance.getContainer()) {
                    neighborhoodZoomedRef.current = true
                    return
                  }
                  // Pan to the neighborhood location
                  mapInstance.setView(retryCoords, 15, { animate: true, duration: 0.5 })
                  const retryMarker = markerRefs.current.get(key)
                  if (retryMarker) {
                    setTimeout(() => {
                      try {
                        if (retryMarker && mapInstance && mapInstance.getContainer()) {
                          retryMarker.openPopup()
                        }
                      } catch (e) {
                        console.warn('Error opening marker popup on retry:', e)
                      }
                      neighborhoodZoomedRef.current = true
                    }, 600)
                  } else {
                    neighborhoodZoomedRef.current = true
                  }
                } catch (e) {
                  console.warn('Error zooming to neighborhood on retry:', e)
                  neighborhoodZoomedRef.current = true
                }
              } else {
                neighborhoodZoomedRef.current = true
              }
            }, 1000)
            
            return () => clearTimeout(retryTimeout)
          }
        } else {
          neighborhoodZoomedRef.current = true
        }
      } else {
        neighborhoodZoomedRef.current = true
      }
    } else if (!urlNeighborhood) {
      neighborhoodZoomedRef.current = true
    }
  }, [router.isReady, router.query.neighborhood, selectedMunicipality, mapInstance, savedCoordsLoaded, neighborhoodCoords, markerRefs, selectedNeighborhoodForChart, data, currentCity])
  
  // Reset zoom ref when neighborhood changes
  useEffect(() => {
    neighborhoodZoomedRef.current = false
  }, [router.query.neighborhood])
  
  // Restore chart from URL after getHistoricalDataForNeighborhood is available
  useEffect(() => {
    if (!router.isReady || !data || Object.keys(data).length === 0 || chartRestoredRef.current || !getHistoricalDataForNeighborhood || !selectedMunicipality) return
    
    const urlNeighborhood = router.query.neighborhood as string | undefined
    const urlChart = router.query.chart as string | undefined
    
    // Restore chart if both neighborhood and chart flag are present
    if (urlChart === 'true' && urlNeighborhood && selectedMunicipality) {
      const decodedNeighborhood = decodeName(urlNeighborhood)
      const cityData = data[currentCity]
      
      if (cityData && cityData[selectedMunicipality]) {
        const neighborhoods = cityData[selectedMunicipality]
        // Find neighborhood with case-insensitive match
        const neighborhood = neighborhoods.find(n => 
          n.colonia.toLowerCase() === decodedNeighborhood.toLowerCase()
        )
        
        if (neighborhood) {
          const historicalData = getHistoricalDataForNeighborhood(selectedMunicipality, neighborhood.colonia)
          if (historicalData.length > 0) {
            setSelectedNeighborhoodForChart({
              name: neighborhood.colonia,
              municipality: selectedMunicipality,
              data: historicalData
            })
            
            // Also zoom to the neighborhood when chart is opened
            if (mapInstance && savedCoordsLoaded) {
              try {
                if (!mapInstance.getContainer()) return
                const key = `${selectedMunicipality}-${neighborhood.colonia}`
                const coords = neighborhoodCoords.get(key)
                if (coords) {
                  // Pan to the neighborhood location
                  mapInstance.setView(coords, 15, { animate: true, duration: 0.5 })
                }
              } catch (e) {
                console.warn('Error zooming to neighborhood for chart:', e)
              }
            }
          }
        }
      }
    }
    
    chartRestoredRef.current = true
  }, [router.isReady, router.query.neighborhood, router.query.chart, data, currentCity, selectedMunicipality, getHistoricalDataForNeighborhood, mapInstance, savedCoordsLoaded, neighborhoodCoords])

  // Restore municipality chart from URL
  useEffect(() => {
    if (!router.isReady || !data || Object.keys(data).length === 0 || !getHistoricalDataForMunicipality || !selectedMunicipality) return
    
    const urlMunicipalityChart = router.query.municipalityChart as string | undefined
    
    // Restore chart if municipalityChart flag is present
    if (urlMunicipalityChart === 'true' && selectedMunicipality) {
      const historicalData = getHistoricalDataForMunicipality(selectedMunicipality)
      if (historicalData.length > 0) {
        setSelectedMunicipalityForChart({
          name: selectedMunicipality,
          data: historicalData
        })
      }
    }
  }, [router.isReady, router.query.municipalityChart, data, currentCity, selectedMunicipality, getHistoricalDataForMunicipality])

  // Sync municipality chart to URL
  useEffect(() => {
    if (!router.isReady) return
    
    const urlMunicipalityChart = router.query.municipalityChart as string | undefined
    const currentChart = urlMunicipalityChart === 'true'
    
    // Only sync if state changed (not on initial load)
    if (currentChart === !!selectedMunicipalityForChart) return
    
    if (selectedMunicipalityForChart) {
      // Chart is open: add municipalityChart flag
      const query = { ...router.query }
      query.municipalityChart = 'true'
      router.replace(
        {
          pathname: router.pathname,
          query
        },
        undefined,
        { shallow: true }
      )
    } else {
      // Chart is closed: remove municipalityChart flag
      const query = { ...router.query }
      delete query.municipalityChart
      router.replace(
        {
          pathname: router.pathname,
          query
        },
        undefined,
        { shallow: true }
      )
    }
  }, [selectedMunicipalityForChart, router.isReady, router.query.municipalityChart])

  // Handle municipality chart click
  const handleMunicipalityChartClick = (municipality?: string) => {
    const targetMunicipality = municipality || selectedMunicipality
    if (!targetMunicipality) {
      console.warn('handleMunicipalityChartClick: No municipality provided')
      return
    }
    
    // Set municipality if provided (for popup clicks) and different from current
    if (municipality && municipality !== selectedMunicipality) {
      setSelectedMunicipality(municipality)
    }
    
    // Ensure municipality is set (for panel button clicks)
    if (!selectedMunicipality && targetMunicipality) {
      setSelectedMunicipality(targetMunicipality)
    }
    
    // Close neighborhood chart if open
    if (selectedNeighborhoodForChart) {
      setSelectedNeighborhoodForChart(null)
    }
    
    const historicalData = getHistoricalDataForMunicipality(targetMunicipality)
    if (historicalData.length > 0) {
      setSelectedMunicipalityForChart({
        name: targetMunicipality,
        data: historicalData
      })
      
      // Update URL immediately with municipalityChart flag
      if (router.isReady) {
        const query = { ...router.query }
        query.municipalityChart = 'true'
        // Ensure municipality is in URL
        if (targetMunicipality) {
          query.municipality = encodeName(targetMunicipality)
        }
        // Remove neighborhood chart params if they exist
        delete query.neighborhood
        delete query.chart
        router.replace(
          {
            pathname: router.pathname,
            query
          },
          undefined,
          { shallow: true }
        )
      }
    } else {
      console.warn('handleMunicipalityChartClick: No historical data found for', targetMunicipality)
    }
  }

  // Handle neighborhood click - show chart or pan to marker
  const handleNeighborhoodClick = (municipality: string, neighborhood: Neighborhood, showChart: boolean = false) => {
    if (showChart) {
      // Close municipality chart if open
      if (selectedMunicipalityForChart) {
        setSelectedMunicipalityForChart(null)
      }
      
      // Show historical chart
      const historicalData = getHistoricalDataForNeighborhood(municipality, neighborhood.colonia)
      if (historicalData.length > 0) {
        setSelectedNeighborhoodForChart({
          name: neighborhood.colonia,
          municipality,
          data: historicalData
        })
        
        // Update URL immediately with chart flag
        if (router.isReady) {
          const query = { ...router.query }
          query.neighborhood = encodeName(neighborhood.colonia)
          query.chart = 'true'
          // Remove municipalityChart param if it exists
          delete query.municipalityChart
          router.replace(
            {
              pathname: router.pathname,
              query
            },
            undefined,
            { shallow: true }
          )
        }
      }
    } else {
      // Close any open chart when clicking a neighborhood (not opening chart)
      if (selectedNeighborhoodForChart) {
        setSelectedNeighborhoodForChart(null)
      }
      // Close municipality chart if open
      if (selectedMunicipalityForChart) {
        setSelectedMunicipalityForChart(null)
      }
      
      // Update URL immediately with new neighborhood (but not chart flag)
      // Do this first to prevent sync effects from overriding with old neighborhood
      if (router.isReady) {
        // Set flag to prevent sync effect from interfering
        neighborhoodUpdateInProgressRef.current = true
        
        const query = { ...router.query }
        query.neighborhood = encodeName(neighborhood.colonia)
        // Remove chart flags if they exist (since we're not opening chart)
        delete query.chart
        delete query.municipalityChart
        
        router.replace(
          {
            pathname: router.pathname,
            query
          },
          undefined,
          { shallow: true }
        )
        
        // Clear flag after a short delay to allow router to update
        setTimeout(() => {
          neighborhoodUpdateInProgressRef.current = false
        }, 200)
      }
      
      // Pan to marker and open popup (original behavior)
      const key = `${municipality}-${neighborhood.colonia}`
      const coords = neighborhoodCoords.get(key)
      
      if (coords && mapInstance) {
        try {
          // Check if map is still valid
          if (!mapInstance.getContainer()) return
          // Pan to the neighborhood location
          mapInstance.setView(coords, 15, { animate: true, duration: 0.5 })
          
          // Find and open the marker popup
          const marker = markerRefs.current.get(key)
          if (marker) {
            // Small delay to ensure map has panned
            setTimeout(() => {
              try {
                if (marker && mapInstance && mapInstance.getContainer()) {
                  marker.openPopup()
                }
              } catch (e) {
                console.warn('Error opening marker popup on click:', e)
              }
            }, 500)
          }
        } catch (e) {
          console.warn('Error zooming to neighborhood on click:', e)
        }
      }
    }
  }
  
  // Keep ref in sync with state
  useEffect(() => {
    coordsRef.current = neighborhoodCoords
  }, [neighborhoodCoords])

  // Geocode neighborhoods when a municipality is selected (only missing ones)
  useEffect(() => {
    if (!selectedData || !savedCoordsLoaded) {
      if (!selectedData) {
        setGeocodingProgress(null)
      }
      return
    }

    const geocodeNeighborhoods = async () => {
      const neighborhoods = selectedData.neighborhoods
      const neighborhoodsToGeocode = neighborhoods.filter(n => {
        const key = `${selectedData.municipality}-${n.colonia}`
        return !coordsRef.current.has(key)
      })

      // If all neighborhoods already have coordinates, we're done
      if (neighborhoodsToGeocode.length === 0) {
        setGeocodingProgress(null)
        return
      }

      setGeocodingProgress({ current: 0, total: neighborhoodsToGeocode.length })
      const newCoords = new Map<string, [number, number]>()
      const coordsToSave = new Map<string, [number, number]>()

      // Geocode only missing neighborhoods
      for (let i = 0; i < neighborhoodsToGeocode.length; i++) {
        const neighborhood = neighborhoodsToGeocode[i]
        const key = `${selectedData.municipality}-${neighborhood.colonia}`
        
        console.log(`[Geocoding] ${i + 1}/${neighborhoodsToGeocode.length}: ${neighborhood.colonia}`)
        
        // Try geocoding
        const cityName = currentCity === 'Ciudad de México' ? 'Ciudad de México' 
          : currentCity === 'Jalisco' ? 'Guadalajara' 
          : 'Monterrey'
        const coords = await geocodeNeighborhood(
          neighborhood.colonia,
          selectedData.municipality,
          cityName
        )
        
        if (coords) {
          console.log(`[Geocoding] ✓ Found coordinates for ${neighborhood.colonia}:`, coords)
          newCoords.set(key, coords)
          coordsToSave.set(key, coords)
        } else {
          console.warn(`[Geocoding] ✗ Failed to geocode ${neighborhood.colonia}`)
        }
        
        setGeocodingProgress({ current: i + 1, total: neighborhoodsToGeocode.length })
        
        // Delay to respect Nominatim rate limits (1 request per second)
        // Also add delay for multiple query attempts per neighborhood
        await new Promise(resolve => setTimeout(resolve, 1500))
      }

      console.log(`[Geocoding] Complete: ${newCoords.size} neighborhoods geocoded out of ${neighborhoodsToGeocode.length}`)

      // Update state with new coordinates
      if (newCoords.size > 0) {
        console.log(`[Geocoding] Updating state with ${newCoords.size} new coordinates`)
        setNeighborhoodCoords(prevCoords => {
          const updatedCoords = new Map(prevCoords)
          newCoords.forEach((coords, key) => {
            updatedCoords.set(key, coords)
          })
          console.log(`[Geocoding] Total coordinates in state: ${updatedCoords.size}`)
          return updatedCoords
        })
        
        // Save new coordinates to server
        console.log(`[Geocoding] Saving ${coordsToSave.size} coordinates to server...`)
        const saveResult = await saveCoordinates(coordsToSave, currentCity)
        console.log(`[Geocoding] Save result:`, saveResult)
      } else {
        console.warn(`[Geocoding] No coordinates to save`)
      }

      setGeocodingProgress(null)
    }

    geocodeNeighborhoods()
  }, [selectedData, savedCoordsLoaded, currentCity])

  // Get neighborhood markers for selected municipality (using only most recent month)
  const neighborhoodMarkers = useMemo(() => {
    if (!selectedData) return []
    
    // Filter to most recent month and get unique colonias
    const recentNeighborhoods = filterToMostRecentMonth(selectedData.neighborhoods)
    const uniqueColonias = new Map<string, Neighborhood>()
    recentNeighborhoods.forEach(n => {
      const existing = uniqueColonias.get(n.colonia)
      if (!existing) {
        uniqueColonias.set(n.colonia, n)
      } else {
        // Keep the one with the most recent month
        const existingDate = parseMonthDate(existing.mes)
        const newDate = parseMonthDate(n.mes)
        if (newDate && existingDate && newDate > existingDate) {
          uniqueColonias.set(n.colonia, n)
        }
      }
    })
    
    const markers = Array.from(uniqueColonias.values())
      .map(neighborhood => {
        const key = `${selectedData.municipality}-${neighborhood.colonia}`
        const coords = neighborhoodCoords.get(key)
        if (!coords) return null
        
        const price = parseFloat(neighborhood.precio)
        const color = getPriceColor(price)
        
        return {
          key,
          neighborhood,
          coords,
          price,
          color,
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
    
    console.log(`[Markers] Created ${markers.length} markers for ${selectedData.municipality} (${selectedData.neighborhoods.length} total neighborhoods, ${neighborhoodCoords.size} coordinates available)`)
    return markers
  }, [selectedData, neighborhoodCoords])

  // Component to adjust map view when neighborhoods are loaded or city changes
  function MapViewAdjuster() {
    const map = useMap()
    const hasAdjustedRef = useRef(false)
    const lastSelectedDataRef = useRef<string | null>(null)
    const previousSelectedMunicipalityRef = useRef<string | null>(selectedMunicipality)
    
    // Helper to check if map is valid
    const isMapValid = () => {
      try {
        return map && map.getContainer() && !(map as any)._destroyed
      } catch {
        return false
      }
    }
    
    // Separate effect to handle zoom out when municipality panel closes
    useEffect(() => {
      if (!isMapValid()) return
      
      const prevValue = previousSelectedMunicipalityRef.current
      const currentValue = selectedMunicipality
      
      // Detect if municipality panel was just closed (selectedMunicipality went from value to null)
      if (prevValue !== null && currentValue === null && markers.length > 0) {
        try {
          // Municipality was just closed - zoom out to show all municipalities
          const allMunicipalityPoints: [number, number][] = markers.map(m => m.position)
          const bounds = L.latLngBounds(allMunicipalityPoints)
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 })
        } catch (e) {
          console.warn('Error zooming out on municipality close:', e)
        }
      }
      // Update ref after checking
      previousSelectedMunicipalityRef.current = currentValue
    }, [selectedMunicipality, markers, map])
    
    useEffect(() => {
      if (!isMapValid()) return
      
      // Only auto-adjust view when municipality first changes, not on every render
      const currentMunicipalityKey = selectedData ? `${selectedData.municipality}-${neighborhoodMarkers.length}` : null
      
      // Reset adjustment flag when municipality changes
      if (lastSelectedDataRef.current !== currentMunicipalityKey) {
        hasAdjustedRef.current = false
        lastSelectedDataRef.current = currentMunicipalityKey
      }
      
      // Skip if already adjusted or if map is zoomed in close (user has manually zoomed)
      let currentZoom: number
      try {
        currentZoom = map.getZoom()
      } catch {
        return
      }
      if (hasAdjustedRef.current || currentZoom >= 14) {
        return
      }
      
      try {
        if (neighborhoodMarkers.length > 0 && selectedData) {
          // Create a bounds group that includes the municipality and all neighborhoods
          const allPoints: [number, number][] = [selectedData.position]
          neighborhoodMarkers.forEach(m => {
            allPoints.push(m.coords)
          })
          const bounds = L.latLngBounds(allPoints)
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
          hasAdjustedRef.current = true
        } else if (selectedData && !hasAdjustedRef.current) {
          // If no neighborhoods yet, just center on municipality (only on first selection)
          map.setView(selectedData.position, 13)
          hasAdjustedRef.current = true
        } else if (markers.length > 0 && !selectedData && !hasAdjustedRef.current) {
          // If no municipality selected, fit all municipality markers (only once)
          const allMunicipalityPoints: [number, number][] = markers.map(m => m.position)
          const bounds = L.latLngBounds(allMunicipalityPoints)
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 })
          hasAdjustedRef.current = true
        } else if (!selectedData && markers.length === 0 && !hasAdjustedRef.current) {
          // Default: center on the city (only once)
          let cityCenter: [number, number]
          if (currentCity === 'Ciudad de México') {
            cityCenter = [19.4326, -99.1332]
          } else if (currentCity === 'Jalisco') {
            cityCenter = [20.6597, -103.3496] // Guadalajara center
          } else {
            cityCenter = [25.6866, -100.3161] // Monterrey center
          }
          map.setView(cityCenter, 11)
          hasAdjustedRef.current = true
        }
      } catch (e) {
        console.warn('Error adjusting map view:', e)
      }
    }, [neighborhoodMarkers, selectedData, markers, map, currentCity])
    
    return null
  }

  // Default center based on city
  const center: [number, number] = useMemo(() => {
    if (currentCity === 'Ciudad de México') {
      return [19.4326, -99.1332] // CDMX center
    } else if (currentCity === 'Jalisco') {
      return [20.6597, -103.3496] // Guadalajara center
    }
    return [25.6866, -100.3161] // Monterrey center
  }, [currentCity])

  return (
    <div className="w-full flex flex-col md:flex-row gap-4">
      {/* Sidebar with neighborhood details - positioned outside map */}
      {selectedData && (
        <div 
          className={`w-full md:w-64 md:flex-shrink-0 bg-white rounded-lg shadow-lg flex flex-col overflow-hidden transition-all duration-300 ${
            isCardCollapsed 
              ? 'max-h-[80px]' 
              : 'max-h-[400px] md:max-h-[600px]'
          }`}
        >
          {/* Collapse handle - visible on mobile */}
          <div 
            onClick={() => setIsCardCollapsed(!isCardCollapsed)}
            className="md:hidden flex justify-center py-2 cursor-pointer hover:bg-gray-50"
          >
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>
          
          {/* Fixed Header */}
          <div className="flex justify-between items-center p-3 md:p-2 border-b bg-white flex-shrink-0">
            <h3 className="font-bold text-base md:text-lg">{selectedData.municipality}</h3>
            <div className="flex items-center gap-2">
              {!isCardCollapsed && selectedData && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleMunicipalityChartClick(selectedData.municipality)
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  title={t('map.view_chart', 'View price history')}
                >
                  {t('map.chart', 'Chart')}
                </button>
              )}
              <button
                onClick={() => setIsCardCollapsed(!isCardCollapsed)}
                className="text-gray-500 hover:text-gray-700 text-sm md:hidden"
                aria-label={isCardCollapsed ? t('map.expand') : t('map.collapse')}
              >
                {isCardCollapsed ? '↑' : '↓'}
              </button>
              <button
                onClick={handleCloseSidebar}
                className="text-gray-500 hover:text-gray-700"
                aria-label={t('map.close')}
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* Collapsible content */}
          {!isCardCollapsed && (
            <>
          
          {/* Fixed Summary Section */}
          <div className="px-3 md:px-4 py-2 md:py-3 border-b bg-white flex-shrink-0">
            <p className="text-xs md:text-sm text-gray-600">
              {t('map.average_price')}: <span className="font-bold text-blue-600">
                ${Math.round(selectedData.avgPrice).toLocaleString('es-MX')}/m²
              </span>
            </p>
            <p className="text-xs text-gray-500">
              {selectedData.neighborhoodCount} {t('map.neighborhoods')}
              {neighborhoodMarkers.length > 0 && (
                <span className="text-green-600"> • {neighborhoodMarkers.length} {t('map.on_map')}</span>
              )}
            </p>
          </div>
          
          {/* Fixed Neighborhoods Header and Search */}
          <div className="px-3 md:px-4 pt-2 md:pt-1 pb-2 border-b bg-white flex-shrink-0 min-w-0">
            <h4 className="font-semibold text-xs md:text-sm mb-1">{t('map.neighborhoods_label')}</h4>
            {/* Search box */}
            <div className="mb-2">
              <input
                type="text"
                placeholder={t('map.search_neighborhoods')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2 md:px-2 py-1.5 md:py-2 text-xs md:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {/* Price filter */}
            <div className="flex gap-1.5 md:gap-2 min-w-0 w-full">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'less' | 'greater')}
                className="px-1.5 md:px-2 py-1.5 md:py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex-shrink-0"
                style={{ width: 'auto', minWidth: '65px', maxWidth: '75px' }}
              >
                <option value="less">{t('map.price_less_than', 'Less than')}</option>
                <option value="greater">{t('map.price_greater_than', 'Greater than')}</option>
              </select>
              <input
                type="number"
                placeholder={t('map.price_filter_placeholder', 'Price (MXN/m²)')}
                value={filterPrice}
                onChange={(e) => setFilterPrice(e.target.value)}
                className="flex-1 min-w-0 px-1.5 md:px-2 py-1.5 md:py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                step="1000"
              />
            </div>
          </div>
          
          {/* Scrollable Neighborhood List - Only show most recent month */}
          <div className="flex-1 overflow-y-auto px-3 md:px-4 py-2 space-y-2 min-h-0">
            {(() => {
              // Filter to most recent month and get unique colonias
              const recentNeighborhoods = filterToMostRecentMonth(selectedData.neighborhoods)
              const uniqueColonias = new Map<string, Neighborhood>()
              recentNeighborhoods.forEach(n => {
                const existing = uniqueColonias.get(n.colonia)
                if (!existing) {
                  uniqueColonias.set(n.colonia, n)
                } else {
                  // Keep the one with the most recent month
                  const existingDate = parseMonthDate(existing.mes)
                  const newDate = parseMonthDate(n.mes)
                  if (newDate && existingDate && newDate > existingDate) {
                    uniqueColonias.set(n.colonia, n)
                  }
                }
              })
              
              const displayNeighborhoods = Array.from(uniqueColonias.values())
                .filter(neighborhood => {
                  // Text search filter
                  const matchesSearch = searchQuery === '' || 
                    neighborhood.colonia.toLowerCase().includes(searchQuery.toLowerCase())
                  
                  // Price filter
                  let matchesPrice = true
                  if (filterPrice && filterPrice.trim() !== '') {
                    const priceValue = parseFloat(filterPrice)
                    if (!isNaN(priceValue) && priceValue > 0) {
                      const neighborhoodPrice = parseFloat(neighborhood.precio)
                      if (!isNaN(neighborhoodPrice)) {
                        if (filterType === 'less') {
                          matchesPrice = neighborhoodPrice < priceValue
                        } else {
                          matchesPrice = neighborhoodPrice > priceValue
                        }
                      } else {
                        matchesPrice = false
                      }
                    }
                  }
                  
                  return matchesSearch && matchesPrice
                })
                .sort((a, b) => parseFloat(b.precio) - parseFloat(a.precio))
              
              return (
                <>
                  {displayNeighborhoods.map((neighborhood, idx) => {
                    const key = `${selectedData.municipality}-${neighborhood.colonia}`
                    const hasCoords = neighborhoodCoords.has(key)
                    
                    return (
                      <div 
                        key={`${neighborhood.colonia}-${neighborhood.mes}`}
                        onClick={() => {
                          if (hasCoords) {
                            handleNeighborhoodClick(selectedData.municipality, neighborhood, false)
                          }
                        }}
                        className={`p-2 rounded text-xs border-l-2 transition-colors ${
                          hasCoords 
                            ? 'bg-gray-50 border-green-500 hover:bg-gray-100 hover:border-green-600 cursor-pointer' 
                            : 'bg-gray-50 border-gray-300 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="font-medium flex items-center gap-2 mb-1">
                          {neighborhood.colonia}
                          {hasCoords && (
                            <span className="text-xs text-green-600">●</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-gray-600 font-semibold">
                            ${Math.round(parseFloat(neighborhood.precio)).toLocaleString('es-MX')}/m²
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleNeighborhoodClick(selectedData.municipality, neighborhood, true)
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                            title={t('map.view_chart', 'View price history')}
                          >
                            {t('map.chart', 'Chart')}
                          </button>
                        </div>
                        <div className="text-gray-500 text-xs">{translateDateFn(neighborhood.mes)}</div>
                      </div>
                    )
                  })}
                  
                  {searchQuery && displayNeighborhoods.length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-4">
                      {t('map.no_neighborhoods_found')} "{searchQuery}"
                    </div>
                  )}
                </>
              )
            })()}
          </div>
          </>
          )}
        </div>
      )}

      {/* Map container */}
      <div className={`w-full h-[600px] relative rounded-lg overflow-hidden border ${selectedData ? 'md:flex-1' : ''}`} style={{ position: 'relative', zIndex: 0 }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <MapContainer
            className="leaflet-map-container"
            center={center}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
        <MapController onMapReady={(map) => setMapInstance(map)} />
        <MapViewAdjuster />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Municipality markers (larger, 20px) */}
        {markers.map((marker) => {
          const color = getPriceColor(marker.avgPrice)
          
          return (
            <MunicipalityMarker
              key={marker.municipality}
              municipality={marker.municipality}
              position={marker.position}
              avgPrice={marker.avgPrice}
              neighborhoodCount={marker.neighborhoodCount}
              color={color}
              onMarkerReady={handleMunicipalityMarkerReady}
              onMunicipalityClick={(municipality) => {
                setSelectedMunicipality(municipality)
                // Center map on municipality marker - let Leaflet handle popup positioning
                if (mapInstance) {
                  try {
                    if (!mapInstance.getContainer()) return
                    mapInstance.setView(marker.position, 13, { animate: true, duration: 0.5 })
                    // Open popup after map has panned
                    setTimeout(() => {
                      if (mapInstance && mapInstance.getContainer()) {
                        const municipalityMarker = municipalityMarkerRefs.current.get(municipality)
                        if (municipalityMarker) {
                          municipalityMarker.openPopup()
                        }
                      }
                    }, 600)
                  } catch (e) {
                    console.warn('Error centering on municipality marker:', e)
                  }
                }
              }}
              onChartClick={handleMunicipalityChartClick}
            />
          )
        })}
        
        {/* Neighborhood markers (smaller, 12px) */}
        {neighborhoodMarkers.map((marker) => (
          <NeighborhoodMarker
            key={marker.key}
            marker={marker}
            onMarkerReady={handleMarkerReady}
            translateDateFn={translateDateFn}
            municipality={selectedData?.municipality || ''}
            onShowChart={(municipality, neighborhood) => {
              // Close municipality chart if open
              if (selectedMunicipalityForChart) {
                setSelectedMunicipalityForChart(null)
              }
              
              const historicalData = getHistoricalDataForNeighborhood(municipality, neighborhood.colonia)
              if (historicalData.length > 0) {
                setSelectedNeighborhoodForChart({
                  name: neighborhood.colonia,
                  municipality,
                  data: historicalData
                })
                
                // Update URL immediately with chart flag
                if (router.isReady) {
                  const query = { ...router.query }
                  query.neighborhood = encodeName(neighborhood.colonia)
                  query.chart = 'true'
                  // Remove municipalityChart param if it exists
                  delete query.municipalityChart
                  router.replace(
                    {
                      pathname: router.pathname,
                      query
                    },
                    undefined,
                    { shallow: true }
                  )
                }
              }
            }}
            onMarkerClick={(municipality, neighborhood) => {
              // Update URL when marker is clicked
              if (router.isReady) {
                const query = { ...router.query }
                query.neighborhood = encodeName(neighborhood.colonia)
                // Remove chart flag if it exists (since we're not opening chart)
                delete query.chart
                
                router.replace(
                  {
                    pathname: router.pathname,
                    query
                  },
                  undefined,
                  { shallow: true }
                )
              }
            }}
          />
        ))}
      </MapContainer>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white p-2 md:p-3 rounded-lg shadow-lg z-[1000] text-xs">
          <div className="font-bold mb-2">{t('map.price_per_m2')}</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span>&lt; $30,000</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-lime-500"></div>
              <span>$30,000 - $50,000</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span>$50,000 - $70,000</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500"></div>
              <span>$70,000 - $90,000</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span>&gt; $90,000</span>
            </div>
          </div>
        </div>

        {/* Geocoding progress indicator */}
        {geocodingProgress && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white p-3 rounded-lg shadow-lg z-[1000] flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-gray-700">
              {t('map.loading_neighborhoods')} ({geocodingProgress.current}/{geocodingProgress.total})
            </span>
          </div>
        )}

        {/* Historical Price Chart Modal - Neighborhood */}
        {selectedNeighborhoodForChart && (
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 z-[100000] flex items-center justify-center p-4"
            onClick={() => setSelectedNeighborhoodForChart(null)}
          >
            <div 
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <NeighborhoodPriceChart
                neighborhoodName={selectedNeighborhoodForChart.name}
                municipality={selectedNeighborhoodForChart.municipality}
                data={selectedNeighborhoodForChart.data}
                onClose={() => setSelectedNeighborhoodForChart(null)}
                translateDate={translateDateFn}
              />
            </div>
          </div>
        )}

        {/* Historical Price Chart Modal - Municipality */}
        {selectedMunicipalityForChart && (
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 z-[100000] flex items-center justify-center p-4"
            onClick={() => setSelectedMunicipalityForChart(null)}
          >
            <div 
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <NeighborhoodPriceChart
                neighborhoodName={selectedMunicipalityForChart.name}
                municipality=""
                data={selectedMunicipalityForChart.data}
                onClose={() => setSelectedMunicipalityForChart(null)}
                translateDate={translateDateFn}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

