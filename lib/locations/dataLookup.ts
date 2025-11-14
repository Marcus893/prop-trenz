import fs from 'fs'
import path from 'path'

export interface LocationPriceData {
  colonia: string
  precio: string
  mes: string
}

export interface LocationData {
  name: string
  type: 'neighborhood' | 'municipality' | 'city' | 'state'
  city: 'Ciudad de México' | 'Monterrey'
  municipality?: string
  neighborhoods: LocationPriceData[]
  averagePrice: number
  priceHistory: Array<{
    month: string
    price: number
    date: Date
  }>
}

/**
 * Find location data by name (searches neighborhoods, municipalities, cities, states)
 * Only uses exact matches - no partial matching
 * Returns the first match found (for backward compatibility)
 */
export function findLocationData(locationName: string): LocationData | null {
  const allMatches = findAllLocationData(locationName)
  return allMatches.length > 0 ? allMatches[0] : null
}

/**
 * Find ALL location data matches by name (searches neighborhoods, municipalities, cities, states)
 * Only uses exact matches - no partial matching
 * Returns all matches found, allowing multiple locations with the same name but different types
 */
export function findAllLocationData(locationName: string): LocationData[] {
  const normalizedName = normalizeLocationName(locationName)
  const matches: LocationData[] = []
  
  // Search BOTH cities for exact matches only
  const cdmxData = loadCityData('Ciudad de México')
  const monterreyData = loadCityData('Monterrey')
  
  // Find all exact matches in both cities
  if (cdmxData) {
    const exactMatches = searchInCityDataExactOnlyAll(cdmxData, normalizedName, 'Ciudad de México')
    matches.push(...exactMatches)
  }
  
  if (monterreyData) {
    const exactMatches = searchInCityDataExactOnlyAll(monterreyData, normalizedName, 'Monterrey')
    matches.push(...exactMatches)
  }
  
  return matches
}

function normalizeLocationName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, ' ')
}

function loadCityData(city: 'Ciudad de México' | 'Monterrey'): any {
  const filename = city === 'Ciudad de México' 
    ? 'banorte-neighborhood-data-cdmx.json'
    : 'banorte-neighborhood-data-monterrey.json'
  
  const filePath = path.join(process.cwd(), 'public', 'data', filename)
  
  if (!fs.existsSync(filePath)) {
    return null
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`Error loading ${filename}:`, error)
    return null
  }
}

// Search for exact matches only (neighborhoods first, then municipalities)
// Returns the first match found (for backward compatibility)
function searchInCityDataExactOnly(
  cityData: any,
  searchName: string,
  city: 'Ciudad de México' | 'Monterrey'
): LocationData | null {
  const matches = searchInCityDataExactOnlyAll(cityData, searchName, city)
  return matches.length > 0 ? matches[0] : null
}

// Search for ALL exact matches (neighborhoods first, then municipalities)
function searchInCityDataExactOnlyAll(
  cityData: any,
  searchName: string,
  city: 'Ciudad de México' | 'Monterrey'
): LocationData[] {
  // Get the actual data (structure is { "City Name": { "Municipality": [...] } })
  const cityKey = Object.keys(cityData)[0]
  const actualData = cityData[cityKey]
  const matches: LocationData[] = []
  
  // Track which neighborhoods we've already added to avoid duplicates
  const addedNeighborhoods = new Set<string>()
  
  // First, try exact matches for neighborhoods (highest priority)
  for (const [municipality, neighborhoods] of Object.entries(actualData)) {
    if (Array.isArray(neighborhoods)) {
      for (const neighborhood of neighborhoods) {
        const normalizedColonia = normalizeLocationName(neighborhood.colonia)
        
        // Exact match for neighborhood
        if (normalizedColonia === searchName) {
          const key = `${normalizedColonia}-${municipality}`
          if (!addedNeighborhoods.has(key)) {
            matches.push(
              buildNeighborhoodData(
                neighborhood.colonia,
                municipality,
                neighborhoods as LocationPriceData[],
                city
              )
            )
            addedNeighborhoods.add(key)
          }
        }
      }
    }
  }
  
  // Then try exact municipality match
  for (const [municipality, neighborhoods] of Object.entries(actualData)) {
    const normalizedMunicipality = normalizeLocationName(municipality)
    
    if (normalizedMunicipality === searchName) {
      matches.push(buildMunicipalityData(municipality, neighborhoods as LocationPriceData[], city))
    }
  }
  
  return matches
}


function buildNeighborhoodData(
  colonia: string,
  municipality: string,
  allNeighborhoods: LocationPriceData[],
  city: 'Ciudad de México' | 'Monterrey'
): LocationData {
  // Get all entries for this neighborhood (across all months)
  const neighborhoodEntries = allNeighborhoods.filter(n => 
    normalizeLocationName(n.colonia) === normalizeLocationName(colonia)
  )
  
  // Build price history
  const priceHistory = neighborhoodEntries
    .map(entry => {
      const date = parseMonthDate(entry.mes)
      const price = parseFloat(entry.precio)
      if (!date || isNaN(price) || price <= 0) return null
      
      return {
        month: entry.mes,
        price,
        date
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  
  // Calculate average price (from most recent month)
  const mostRecent = priceHistory[priceHistory.length - 1]
  const averagePrice = mostRecent ? mostRecent.price : 0
  
  return {
    name: colonia,
    type: 'neighborhood',
    city,
    municipality,
    neighborhoods: neighborhoodEntries,
    averagePrice,
    priceHistory
  }
}

function buildMunicipalityData(
  municipality: string,
  neighborhoods: LocationPriceData[],
  city: 'Ciudad de México' | 'Monterrey'
): LocationData {
  // Get unique neighborhoods
  const uniqueNeighborhoods = new Map<string, LocationPriceData>()
  neighborhoods.forEach(n => {
    const key = normalizeLocationName(n.colonia)
    if (!uniqueNeighborhoods.has(key)) {
      uniqueNeighborhoods.set(key, n)
    }
  })
  
  // Build price history (average across all neighborhoods per month)
  const monthMap = new Map<string, number[]>()
  neighborhoods.forEach(n => {
    const date = parseMonthDate(n.mes)
    const price = parseFloat(n.precio)
    if (date && !isNaN(price) && price > 0) {
      const monthKey = n.mes
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, [])
      }
      monthMap.get(monthKey)!.push(price)
    }
  })
  
  const priceHistory = Array.from(monthMap.entries())
    .map(([month, prices]) => {
      const date = parseMonthDate(month)
      if (!date) return null
      
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
      
      return {
        month,
        price: avgPrice,
        date
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  
  const mostRecent = priceHistory[priceHistory.length - 1]
  const averagePrice = mostRecent ? mostRecent.price : 0
  
  return {
    name: municipality,
    type: 'municipality',
    city,
    neighborhoods: Array.from(uniqueNeighborhoods.values()),
    averagePrice,
    priceHistory
  }
}

function parseMonthDate(monthString: string): Date | null {
  // Format: "October 2025" or "Octubre 2025"
  const months: Record<string, number> = {
    'january': 0, 'enero': 0, 'jan': 0,
    'february': 1, 'febrero': 1, 'feb': 1,
    'march': 2, 'marzo': 2, 'mar': 2,
    'april': 3, 'abril': 3, 'apr': 3,
    'may': 4, 'mayo': 4,
    'june': 5, 'junio': 5, 'jun': 5,
    'july': 6, 'julio': 6, 'jul': 6,
    'august': 7, 'agosto': 7, 'aug': 7,
    'september': 8, 'septiembre': 8, 'sep': 8,
    'october': 9, 'octubre': 9, 'oct': 9,
    'november': 10, 'noviembre': 10, 'nov': 10,
    'december': 11, 'diciembre': 11, 'dec': 11
  }
  
  const parts = monthString.toLowerCase().trim().split(' ')
  if (parts.length !== 2) return null
  
  const monthName = parts[0]
  const year = parseInt(parts[1])
  
  if (isNaN(year) || !months[monthName]) return null
  
  return new Date(year, months[monthName], 1)
}

