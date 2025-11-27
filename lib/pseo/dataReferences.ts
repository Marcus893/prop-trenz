/**
 * Data Reference System for Guides
 * 
 * Allows guides to reference actual data from the PropTrenz app, creating
 * interactive links to maps, charts, and specific data points.
 */

export type DataReferenceType = 
  | 'neighborhood' 
  | 'municipality' 
  | 'city' 
  | 'state' 
  | 'chart' 
  | 'map' 
  | 'price' 
  | 'growth'

export interface DataReference {
  type: DataReferenceType
  location?: string // neighborhood, municipality, city, or state name
  city?: string // city name for context
  municipality?: string // municipality name for context
  label?: string // display label (defaults to location name)
  action?: 'view' | 'chart' | 'explore' // what action to take
}

/**
 * Parse data references from guide content
 * Format: {{data:type:location:label}} or {{data:type:location}}
 * Examples:
 * - {{data:neighborhood:Polanco:Polanco neighborhood}}
 * - {{data:municipality:Cuauhtémoc}}
 * - {{data:chart:neighborhood:Polanco:View Polanco price chart}}
 * - {{data:map:city:Ciudad de México:Explore Mexico City map}}
 */
export function parseDataReferences(text: string): Array<{ 
  match: string
  reference: DataReference
  startIndex: number
  endIndex: number
}> {
  const references: Array<{ 
    match: string
    reference: DataReference
    startIndex: number
    endIndex: number
  }> = []
  
  // Match pattern: {{data:type:location:label}} or {{data:type:location}}
  // Also support: {{data:type:city:location:label}} for city-specific references
  // Supports formats like:
  // - {{data:municipality:San Pedro Garza García:Nuevo León:Explore San Pedro Garza García}}
  // - {{data:neighborhood:Polanco:Miguel Hidalgo:Ciudad de México:View Polanco prices}} (5 parts)
  // - {{data:neighborhood:Polanco:Cuauhtémoc:Ciudad de México:Explore Roma Norte}} (5 parts)
  // - {{data:neighborhood:Polanco:label}} (3 parts)
  // Use non-greedy matching and ensure we stop at the closing }}
  const regex = /\{\{data:([^:]+):([^:]+)(?::([^:}]+))?(?::([^:}]+))?(?::([^}]+))?\}\}/g
  let match
  
  while ((match = regex.exec(text)) !== null) {
    const type = match[1] as DataReferenceType
    const location = match[2]
    const optional1 = match[3] // could be city, municipality, or label
    const optional2 = match[4] // could be city, municipality, or label
    const optional3 = match[5] // could be label
    
    let reference: DataReference = { type, location }
    
    // Determine structure based on type and number of parts
    if (type === 'neighborhood' || type === 'municipality') {
      // Format for municipality: {{data:municipality:San Pedro Garza García:Nuevo León:Explore San Pedro Garza García}}
      // Format for neighborhood: {{data:neighborhood:Polanco:Miguel Hidalgo:Ciudad de México:View Polanco prices}} (5 parts)
      // Format for neighborhood: {{data:neighborhood:Roma Norte:Cuauhtémoc:Ciudad de México:Explore Roma Norte}} (5 parts)
      // Or simpler: {{data:neighborhood:Polanco:label}} (3 parts)
      if (optional3) {
        // Has 5 parts: type:location:optional1:optional2:optional3
        // Format: {{data:neighborhood:Polanco:Miguel Hidalgo:Ciudad de México:View Polanco prices}}
        // location = neighborhood, optional1 = municipality, optional2 = city, optional3 = label
        reference.municipality = optional1
        reference.city = optional2
        reference.label = optional3
      } else if (optional2) {
        // Has 4 parts: type:location:optional1:optional2
        if (type === 'municipality') {
          // Format: {{data:municipality:San Pedro Garza García:Nuevo León:Explore...}}
          // location = municipality name, optional1 = city/state, optional2 = label
          reference.city = optional1
          reference.label = optional2
        } else {
          // For neighborhood with 4 parts, check if optional1 looks like municipality
          // Format could be: {{data:neighborhood:Polanco:Cuauhtémoc:label}}
          if (optional1.includes(' ') && optional1.match(/^[A-Z]/)) {
            reference.municipality = optional1
            reference.label = optional2
          } else {
            // neighborhood:city:label
            reference.city = optional1
            reference.label = optional2
          }
        }
      } else if (optional1) {
        // 3 parts: type:location:optional1
        // Could be municipality, city, or label
        // Check if it looks like a municipality name (has spaces, capital letters)
        if (optional1.includes(' ') || optional1.match(/^[A-Z]/)) {
          reference.municipality = optional1
          reference.label = location
        } else {
          reference.label = optional1
        }
      }
    } else if (type === 'chart' || type === 'map') {
      // Format: {{data:chart:neighborhood:Polanco:View chart}}
      // or: {{data:map:city:Ciudad de México:Explore map}}
      const subType = location as DataReferenceType
      reference.type = subType
      reference.location = optional1
      reference.label = optional2 || optional1 || 'View'
      if (subType === 'neighborhood' && optional2) {
        reference.municipality = optional1
        reference.location = optional2
        reference.label = match[5] || 'View'
      }
    } else {
      // Simple format: {{data:type:location:label}}
      reference.label = optional1 || location
    }
    
    references.push({
      match: match[0],
      reference,
      startIndex: match.index!,
      endIndex: match.index! + match[0].length
    })
  }
  
  return references
}

/**
 * Map state names to city names (for data references that use state instead of city)
 */
function normalizeCityName(cityOrState: string | undefined): string | undefined {
  if (!cityOrState) return cityOrState
  
  const cityMap: { [key: string]: string } = {
    'nuevo león': 'Monterrey',
    'nuevo leon': 'Monterrey',
    'jalisco': 'Jalisco', // Jalisco is both state and city name in the data
    'ciudad de méxico': 'Ciudad de México',
    'ciudad de mexico': 'Ciudad de México',
    'cdmx': 'Ciudad de México',
    'df': 'Ciudad de México'
  }
  
  const normalized = cityOrState.toLowerCase().trim()
  return cityMap[normalized] || cityOrState
}

/**
 * Infer city from municipality name (for neighborhoods that only have municipality)
 */
function inferCityFromMunicipality(municipality: string | undefined): string | undefined {
  if (!municipality) return undefined
  
  // Known municipalities and their cities
  const municipalityToCity: { [key: string]: string } = {
    'san pedro garza garcía': 'Monterrey',
    'san pedro garza garcia': 'Monterrey',
    'monterrey': 'Monterrey',
    'apodaca': 'Monterrey',
    'san nicolás de los garza': 'Monterrey',
    'san nicolas de los garza': 'Monterrey',
    'guadalupe': 'Monterrey',
    'santa catarina': 'Monterrey',
    'escobedo': 'Monterrey',
    'garcía': 'Monterrey',
    'san nicolás': 'Monterrey',
    'san nicolas': 'Monterrey',
    // CDMX municipalities
    'cuauhtémoc': 'Ciudad de México',
    'cuauhtemoc': 'Ciudad de México',
    'miguel hidalgo': 'Ciudad de México',
    'benito juárez': 'Ciudad de México',
    'benito juarez': 'Ciudad de México',
    'coyoacán': 'Ciudad de México',
    'coyoacan': 'Ciudad de México',
    'álvaro obregón': 'Ciudad de México',
    'alvaro obregon': 'Ciudad de México',
    // Jalisco municipalities
    'guadalajara': 'Jalisco',
    'zapopan': 'Jalisco',
    'tlaquepaque': 'Jalisco',
    'tonalá': 'Jalisco',
    'tonala': 'Jalisco'
  }
  
  const normalized = municipality.toLowerCase().trim()
  return municipalityToCity[normalized]
}

/**
 * Generate URL for a data reference
 */
export function getDataReferenceUrl(reference: DataReference, baseUrl: string = ''): string {
  const { type, location, city, municipality, action = 'view' } = reference
  
  // Normalize city name (map states to cities)
  const normalizedCity = normalizeCityName(city)
  
  switch (type) {
    case 'neighborhood':
      // For neighborhoods, we need both municipality and city
      // If we only have one, try to infer the other
      let finalCity = normalizedCity
      let finalMunicipality = municipality
      
      if (!finalCity && finalMunicipality) {
        // We have municipality but no city - infer city from municipality
        finalCity = inferCityFromMunicipality(finalMunicipality)
      }
      
      if (!finalMunicipality && finalCity) {
        // We have city but no municipality - infer municipality from city
        // For Monterrey, neighborhoods like "Cumbres" and "Mitras Centro" are in "Monterrey" municipality
        // For other cities, use the city name as municipality (common pattern)
        const cityToMunicipalityMap: { [key: string]: string } = {
          'Monterrey': 'Monterrey',
          'Ciudad de México': 'Cuauhtémoc', // Default to most common municipality
          'Jalisco': 'Guadalajara'
        }
        finalMunicipality = cityToMunicipalityMap[finalCity] || finalCity
      }
      
      if (finalMunicipality && finalCity && location) {
        // Encode names for URL using the cityToSlug logic from map.tsx
        const citySlug = finalCity.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[áéíóúñü]/g, (char) => {
            const map: { [key: string]: string } = {
              'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
              'ñ': 'n', 'ü': 'u'
            }
            return map[char] || char
          })
        const municipalitySlug = encodeURIComponent(finalMunicipality.toLowerCase().replace(/\s+/g, '-'))
        const neighborhoodSlug = encodeURIComponent(location.toLowerCase().replace(/\s+/g, '-'))
        
        if (action === 'chart') {
          return `${baseUrl}/map?city=${citySlug}&municipality=${municipalitySlug}&neighborhood=${neighborhoodSlug}&chart=true`
        }
        return `${baseUrl}/map?city=${citySlug}&municipality=${municipalitySlug}&neighborhood=${neighborhoodSlug}`
      }
      // Fallback to map page
      return `${baseUrl}/map`
      
    case 'municipality':
      if (normalizedCity && location) {
        const citySlug = normalizedCity.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[áéíóúñü]/g, (char) => {
            const map: { [key: string]: string } = {
              'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
              'ñ': 'n', 'ü': 'u'
            }
            return map[char] || char
          })
        const municipalitySlug = encodeURIComponent(location.toLowerCase().replace(/\s+/g, '-'))
        
        if (action === 'chart') {
          return `${baseUrl}/map?city=${citySlug}&municipality=${municipalitySlug}&municipalityChart=true`
        }
        return `${baseUrl}/map?city=${citySlug}&municipality=${municipalitySlug}`
      }
      return `${baseUrl}/map`
      
    case 'city':
      if (!location) {
        return `${baseUrl}/map`
      }
      const normalizedCityName = normalizeCityName(location)
      if (!normalizedCityName) {
        return `${baseUrl}/map`
      }
      const citySlug = normalizedCityName.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[áéíóúñü]/g, (char) => {
          const map: { [key: string]: string } = {
            'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
            'ñ': 'n', 'ü': 'u'
          }
          return map[char] || char
        })
      return `${baseUrl}/map?city=${citySlug}`
      
    case 'chart':
      // Chart references are handled by their sub-type
      return getDataReferenceUrl({ ...reference, type: reference.location as DataReferenceType }, baseUrl)
      
    case 'map':
      // Map references point to the map page, possibly with filters
      if (location) {
        return getDataReferenceUrl({ ...reference, type: location as DataReferenceType }, baseUrl)
      }
      return `${baseUrl}/map`
      
    default:
      return `${baseUrl}/map`
  }
}

/**
 * Get display text for a data reference
 */
export function getDataReferenceLabel(reference: DataReference): string {
  return reference.label || reference.location || 'View data'
}

