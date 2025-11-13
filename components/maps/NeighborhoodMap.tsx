'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'next-i18next'

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
  const cityState = city === 'Ciudad de México' ? 'Ciudad de México' : 'Nuevo León'
  const cityName = city === 'Ciudad de México' ? 'Ciudad de México' : 'Monterrey'
  
  for (const name of expandedVariants) {
    queries.push(`${name}, ${municipality}, ${cityState}`)
    queries.push(`${name}, ${municipality}`)
    queries.push(`${name} ${municipality} ${cityState}`)
    
    // For very generic names, try more specific queries
    if (name.length <= 10 || genericNames.some(g => name.includes(g))) {
      queries.push(`${name}, ${municipality}, ${cityName}, ${cityState}`)
      queries.push(`${municipality} ${name}, ${cityState}`)
      queries.push(`${name} colonia ${municipality}, ${cityState}`)
      queries.push(`${name} neighborhood ${municipality}, ${cityState}`)
      // Try searching with the full original name for generic terms
      if (name !== neighborhoodName) {
        queries.push(`${neighborhoodName}, ${municipality}, ${cityState}`)
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

// Load saved coordinates from JSON file
async function loadSavedCoordinates(): Promise<Map<string, [number, number]>> {
  try {
    const response = await fetch('/data/neighborhood-coordinates.json')
    if (!response.ok) {
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
async function saveCoordinates(coordinates: Map<string, [number, number]>): Promise<{ success: boolean; error?: string }> {
  try {
    const coordinatesObj = Object.fromEntries(coordinates)
    console.log(`[Save] Attempting to save ${Object.keys(coordinatesObj).length} coordinates`)
    const response = await fetch('/api/save-coordinates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates: coordinatesObj }),
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
}

// Component to handle map interactions and expose map instance
function MapController({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap()
  
  useEffect(() => {
    onMapReady(map)
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
function NeighborhoodMarker({ 
  marker, 
  onMarkerReady,
  translateDateFn
}: { 
  marker: { key: string; coords: [number, number]; color: string; price: number; neighborhood: Neighborhood }
  onMarkerReady: (key: string, markerInstance: L.Marker) => void
  translateDateFn: (dateString: string) => string
}) {
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
    >
      <Popup>
        <div className="text-center">
          <h3 className="font-bold text-sm mb-1">{marker.neighborhood.colonia}</h3>
          <p className="text-xs text-gray-600 font-semibold">
            ${Math.round(marker.price).toLocaleString('es-MX')}/m²
          </p>
          <p className="text-xs text-gray-500">
            {translateDateFn(marker.neighborhood.mes)}
          </p>
        </div>
      </Popup>
    </Marker>
  )
}

export function NeighborhoodMap({ data }: NeighborhoodMapProps) {
  const { t } = useTranslation('common')
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null)
  
  // Create translateDate function bound to current translation function
  const translateDateFn = useMemo(() => {
    return (dateString: string) => translateDate(dateString, t)
  }, [t])
  
  const [neighborhoodCoords, setNeighborhoodCoords] = useState<Map<string, [number, number]>>(new Map())
  const [geocodingProgress, setGeocodingProgress] = useState<{ current: number; total: number } | null>(null)
  const [savedCoordsLoaded, setSavedCoordsLoaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
  const [isCardCollapsed, setIsCardCollapsed] = useState(false)
  const coordsRef = useRef<Map<string, [number, number]>>(new Map())
  const markerRefs = useRef<Map<string, L.Marker>>(new Map())
  
  // Handle marker ready - store ref
  const handleMarkerReady = (key: string, markerInstance: L.Marker) => {
    markerRefs.current.set(key, markerInstance)
  }
  
  // Handle neighborhood click - pan to marker and open popup
  const handleNeighborhoodClick = (municipality: string, neighborhood: Neighborhood) => {
    const key = `${municipality}-${neighborhood.colonia}`
    const coords = neighborhoodCoords.get(key)
    
    if (coords && mapInstance) {
      // Pan to the neighborhood location
      mapInstance.setView(coords, 15, { animate: true, duration: 0.5 })
      
      // Find and open the marker popup
      const marker = markerRefs.current.get(key)
      if (marker) {
        // Small delay to ensure map has panned
        setTimeout(() => {
          marker.openPopup()
        }, 500)
      }
    }
  }
  
  // Clear search when closing sidebar
  const handleCloseSidebar = () => {
    setSelectedMunicipality(null)
    setSearchQuery('')
    setIsCardCollapsed(false)
  }
  
  // Reset collapsed state when municipality changes
  useEffect(() => {
    setIsCardCollapsed(false)
  }, [selectedMunicipality])

  // Load saved coordinates on mount
  useEffect(() => {
    const loadCoords = async () => {
      console.log('[Load] Loading saved coordinates...')
      const saved = await loadSavedCoordinates()
      console.log(`[Load] Loaded ${saved.size} saved coordinates`)
      setNeighborhoodCoords(saved)
      coordsRef.current = saved // Initialize ref with loaded coordinates
      setSavedCoordsLoaded(true)
    }
    loadCoords()
  }, [])

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

  // Helper function to get the most recent neighborhood entry for a given colonia name
  const getMostRecentNeighborhood = (neighborhoods: Neighborhood[], colonia: string): Neighborhood | null => {
    const sameColonia = neighborhoods.filter(n => n.colonia === colonia)
    if (sameColonia.length === 0) return null
    
    const mostRecentMonth = getMostRecentMonth(sameColonia)
    if (!mostRecentMonth) return sameColonia[0]
    
    return sameColonia.find(n => n.mes === mostRecentMonth) || sameColonia[0]
  }

  // Get current city name from data
  const currentCity = useMemo(() => {
    const cities = Object.keys(data)
    return cities.length > 0 ? cities[0] : 'Monterrey'
  }, [data])

  // Calculate average prices and prepare marker data (using only most recent month)
  const markers = useMemo(() => {
    const result: Array<{
      municipality: string
      position: [number, number]
      avgPrice: number
      neighborhoodCount: number
      neighborhoods: Neighborhood[]
    }> = []

    // Process data for the current city (Monterrey or Ciudad de México)
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
        const cityName = currentCity === 'Ciudad de México' ? 'Ciudad de México' : 'Monterrey'
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
        const saveResult = await saveCoordinates(coordsToSave)
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
    
    console.log(`[Markers] Created ${markers.length} markers for ${selectedData.municipality} (${selectedData.neighborhoods.length} total neighborhoods, ${recentNeighborhoods.length} from most recent month, ${neighborhoodCoords.size} coordinates available)`)
    return markers
  }, [selectedData, neighborhoodCoords])

  // Component to adjust map view when neighborhoods are loaded or city changes
  function MapViewAdjuster() {
    const map = useMap()
    
    useEffect(() => {
      if (neighborhoodMarkers.length > 0 && selectedData) {
        // Create a bounds group that includes the municipality and all neighborhoods
        const allPoints: [number, number][] = [selectedData.position]
        neighborhoodMarkers.forEach(m => {
          allPoints.push(m.coords)
        })
        const bounds = L.latLngBounds(allPoints)
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
      } else if (selectedData) {
        // If no neighborhoods yet, just center on municipality
        map.setView(selectedData.position, 13)
      } else if (markers.length > 0) {
        // If no municipality selected, fit all municipality markers
        const allMunicipalityPoints: [number, number][] = markers.map(m => m.position)
        const bounds = L.latLngBounds(allMunicipalityPoints)
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 })
      } else {
        // Default: center on the city
        const cityCenter = currentCity === 'Ciudad de México' 
          ? [19.4326, -99.1332] 
          : [25.6866, -100.3161]
        map.setView(cityCenter as [number, number], 11)
      }
    }, [neighborhoodMarkers, selectedData, markers, map, currentCity])
    
    return null
  }

  // Default center based on city
  const center: [number, number] = useMemo(() => {
    if (currentCity === 'Ciudad de México') {
      return [19.4326, -99.1332] // CDMX center
    }
    return [25.6866, -100.3161] // Monterrey center
  }, [currentCity])

  return (
    <div className="w-full h-[600px] relative rounded-lg overflow-hidden border" style={{ isolation: 'isolate' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MapContainer
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
          const customIcon = createCustomIcon(color, 20)
          
          return (
            <Marker
              key={marker.municipality}
              position={marker.position}
              icon={customIcon}
              eventHandlers={{
                click: () => setSelectedMunicipality(marker.municipality),
              }}
            >
              <Popup>
                <div className="text-center">
                  <h3 className="font-bold text-sm mb-1">{marker.municipality}</h3>
                  <p className="text-xs text-gray-600">
                    {t('map.avg')}: ${Math.round(marker.avgPrice).toLocaleString('es-MX')}/m²
                  </p>
                  <p className="text-xs text-gray-500">
                    {marker.neighborhoodCount} {t('map.neighborhoods')}
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        })}
        
        {/* Neighborhood markers (smaller, 12px) */}
        {neighborhoodMarkers.map((marker) => (
          <NeighborhoodMarker
            key={marker.key}
            marker={marker}
            onMarkerReady={handleMarkerReady}
            translateDateFn={translateDateFn}
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

      {/* Sidebar with neighborhood details */}
      {selectedData && (
        <div 
          className={`fixed md:absolute left-4 right-4 md:left-auto md:right-auto md:max-w-sm bg-white rounded-t-lg md:rounded-lg shadow-lg flex flex-col overflow-hidden transition-all duration-300 ${
            isCardCollapsed 
              ? 'bottom-0 max-h-[80px] md:top-4 md:max-h-[80px]' 
              : 'bottom-0 max-h-[50vh] md:top-4 md:max-h-[500px]'
          }`} 
          style={{ zIndex: 99999 }}
        >
          {/* Collapse handle - visible on mobile */}
          <div 
            onClick={() => setIsCardCollapsed(!isCardCollapsed)}
            className="md:hidden flex justify-center py-2 cursor-pointer hover:bg-gray-50"
          >
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>
          
          {/* Fixed Header */}
          <div className="flex justify-between items-center p-3 md:p-4 pb-3 border-b bg-white flex-shrink-0">
            <h3 className="font-bold text-base md:text-lg">{selectedData.municipality}</h3>
            <div className="flex items-center gap-2">
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
          <div className="px-3 md:px-4 pt-2 md:pt-3 pb-2 border-b bg-white flex-shrink-0">
            <h4 className="font-semibold text-xs md:text-sm mb-2">{t('map.neighborhoods_label')}</h4>
            {/* Search box */}
            <div className="mb-2">
              <input
                type="text"
                placeholder={t('map.search_neighborhoods')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                .filter(neighborhood => 
                  searchQuery === '' || 
                  neighborhood.colonia.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .sort((a, b) => parseFloat(b.precio) - parseFloat(a.precio))
              
              return (
                <>
                  {displayNeighborhoods.map((neighborhood, idx) => {
                    const key = `${selectedData.municipality}-${neighborhood.colonia}`
                    const hasCoords = neighborhoodCoords.has(key)
                    
                    return (
                      <div 
                        key={`${neighborhood.colonia}-${neighborhood.mes}`}
                        onClick={() => hasCoords && handleNeighborhoodClick(selectedData.municipality, neighborhood)}
                        className={`p-2 rounded text-xs border-l-2 cursor-pointer transition-colors ${
                          hasCoords 
                            ? 'bg-gray-50 border-green-500 hover:bg-gray-100 hover:border-green-600' 
                            : 'bg-gray-50 border-gray-300 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="font-medium flex items-center gap-2">
                          {neighborhood.colonia}
                          {hasCoords && (
                            <span className="text-xs text-green-600">●</span>
                          )}
                        </div>
                        <div className="text-gray-600">
                          ${Math.round(parseFloat(neighborhood.precio)).toLocaleString('es-MX')}/m²
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
    </div>
  )
}

