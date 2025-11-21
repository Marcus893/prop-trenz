/**
 * Fetch actual data from the app to provide context for guide generation
 * This allows guides to reference real neighborhoods, prices, and trends
 */

import { db } from '@/lib/supabase'

export interface NeighborhoodData {
  name: string
  municipality: string
  city: string
  avgPrice?: number
  growthRate?: number
}

export interface MunicipalityData {
  name: string
  city: string
  avgPrice?: number
  neighborhoodCount?: number
  growthRate?: number
}

/**
 * Fetch top neighborhoods by price or growth for a given city
 */
export async function fetchTopNeighborhoods(
  city: string,
  limit: number = 10,
  sortBy: 'price' | 'growth' = 'price'
): Promise<NeighborhoodData[]> {
  // This would query your actual data source
  // For now, returning a structure that can be populated
  // You'll need to implement the actual query based on your data structure
  
  try {
    // Example: Query neighborhoods from your data
    // This is a placeholder - adjust based on your actual data schema
    const neighborhoods: NeighborhoodData[] = []
    
    // TODO: Implement actual query to fetch neighborhoods
    // This might involve:
    // 1. Finding the city location ID
    // 2. Finding municipalities in that city
    // 3. Finding neighborhoods with price data
    // 4. Sorting by price or growth
    // 5. Returning top N results
    
    return neighborhoods
  } catch (error) {
    console.error('Error fetching neighborhoods:', error)
    return []
  }
}

/**
 * Fetch top municipalities by price or growth for a given city
 */
export async function fetchTopMunicipalities(
  city: string,
  limit: number = 10,
  sortBy: 'price' | 'growth' = 'price'
): Promise<MunicipalityData[]> {
  try {
    const municipalities: MunicipalityData[] = []
    
    // TODO: Implement actual query
    // Similar to fetchTopNeighborhoods but for municipalities
    
    return municipalities
  } catch (error) {
    console.error('Error fetching municipalities:', error)
    return []
  }
}

/**
 * Format neighborhood data for guide generation context
 */
export function formatNeighborhoodDataForGuide(neighborhoods: NeighborhoodData[]): string {
  if (neighborhoods.length === 0) {
    return 'No neighborhood data available'
  }
  
  return neighborhoods
    .map((n, index) => {
      const price = n.avgPrice ? `$${Math.round(n.avgPrice).toLocaleString()}/m²` : 'Price data available'
      const growth = n.growthRate ? `${n.growthRate > 0 ? '+' : ''}${n.growthRate.toFixed(1)}%` : ''
      return `${index + 1}. ${n.name} (${n.municipality}, ${n.city}): ${price}${growth ? ` - Growth: ${growth}` : ''}`
    })
    .join('\n')
}

/**
 * Format municipality data for guide generation context
 */
export function formatMunicipalityDataForGuide(municipalities: MunicipalityData[]): string {
  if (municipalities.length === 0) {
    return 'No municipality data available'
  }
  
  return municipalities
    .map((m, index) => {
      const price = m.avgPrice ? `$${Math.round(m.avgPrice).toLocaleString()}/m²` : 'Price data available'
      const neighborhoods = m.neighborhoodCount ? `${m.neighborhoodCount} neighborhoods` : ''
      const growth = m.growthRate ? ` - Growth: ${m.growthRate > 0 ? '+' : ''}${m.growthRate.toFixed(1)}%` : ''
      return `${index + 1}. ${m.name} (${m.city}): ${price}${neighborhoods ? ` - ${neighborhoods}` : ''}${growth}`
    })
    .join('\n')
}


