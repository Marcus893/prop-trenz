import { findAllLocationData } from './dataLookup'
import { generateLocationContent } from './contentGenerator'
import { saveLocationPage, locationPageExists, type LocationPage } from './storage'

export interface GenerateLocationParams {
  locationName: string
  skipImages?: boolean
}

export interface GenerateLocationResult {
  pages: LocationPage[]
  total: number
  successful: number
  failed: number
}

export async function generateLocationPage(
  params: GenerateLocationParams
): Promise<LocationPage> {
  const results = await generateLocationPages(params)
  if (results.pages.length === 0) {
    throw new Error(
      `No se encontraron datos para "${params.locationName}". ` +
      `Asegúrate de que el nombre sea correcto y que existan datos para esta ubicación.`
    )
  }
  // Return the first page for backward compatibility
  return results.pages[0]
}

export async function generateLocationPages(
  params: GenerateLocationParams
): Promise<GenerateLocationResult> {
  const { locationName } = params
  
  console.log(`[Location Page] Looking up data for: ${locationName}`)
  
  // Find ALL location data matches (can be multiple if same name, different types)
  const allLocationData = findAllLocationData(locationName)
  
  if (allLocationData.length === 0) {
    throw new Error(
      `No se encontraron datos para "${locationName}". ` +
      `Asegúrate de que el nombre sea correcto y que existan datos para esta ubicación.`
    )
  }
  
  console.log(`[Location Page] Found ${allLocationData.length} match(es) for "${locationName}"`)
  
  // If there are multiple matches, only generate page for municipality type
  // Otherwise, generate page for the single match
  const locationDataToProcess = allLocationData.length > 1
    ? allLocationData.filter(data => data.type === 'municipality')
    : allLocationData
  
  if (locationDataToProcess.length === 0 && allLocationData.length > 1) {
    console.log(`[Location Page] Multiple matches found but no municipality. Skipping generation.`)
    return {
      pages: [],
      total: allLocationData.length,
      successful: 0,
      failed: 0
    }
  }
  
  if (locationDataToProcess.length === 0) {
    throw new Error(
      `No se encontraron datos para "${locationName}". ` +
      `Asegúrate de que el nombre sea correcto y que existan datos para esta ubicación.`
    )
  }
  
  const pages: LocationPage[] = []
  let successful = 0
  let failed = 0
  
  // Generate a page for each match (should only be one now)
  for (let i = 0; i < locationDataToProcess.length; i++) {
    const locationData = locationDataToProcess[i]
    try {
      console.log(`[Location Page] Processing: ${locationData.name} (${locationData.type})`)
      console.log(`[Location Page] Average price: $${Math.round(locationData.averagePrice).toLocaleString('es-MX')}/m²`)
      console.log(`[Location Page] Price history points: ${locationData.priceHistory.length}`)
      
      // Generate content
      console.log(`[Location Page] Generating content with Gemini...`)
      const content = await generateLocationContent(locationData)
      
      // Check if page already exists
      if (locationPageExists(content.slug)) {
        console.warn(`[Location Page] Page with slug "${content.slug}" already exists. It will be overwritten.`)
      }
      
      // Create page object
      const page: LocationPage = {
        slug: content.slug,
        locationName: locationData.name,
        locationType: locationData.type,
        city: locationData.city,
        municipality: locationData.municipality,
        content,
        locationData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // Save page
      saveLocationPage(page)
      
      console.log(`[Location Page] ✓ Successfully generated page: ${content.slug}`)
      console.log(`[Location Page] URL: /${content.slug}`)
      
      pages.push(page)
      successful++
      
      // Add delay between pages for the same location to avoid rate limits
      if (i < locationDataToProcess.length - 1) {
        console.log(`   ⏸️  Waiting 5s before generating next page for this location...`)
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    } catch (error) {
      failed++
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[Location Page] ✗ Failed to generate page for ${locationData.name} (${locationData.type}): ${errorMessage}`)
      
      // If it's a rate limit error, throw it up so the retry logic can handle it
      if (errorMessage.includes('429') || 
          errorMessage.includes('Resource exhausted') ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('Too Many Requests')) {
        throw error // Re-throw rate limit errors so they can be retried
      }
    }
  }
  
  return {
    pages,
    total: locationDataToProcess.length,
    successful,
    failed
  }
}

