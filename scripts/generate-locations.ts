#!/usr/bin/env ts-node

import * as dotenv from 'dotenv'
import { generateLocationPages } from '../lib/locations/generateLocation'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Parse command line arguments
const args = process.argv.slice(2)
const cityArg = args[0]?.toLowerCase()

// Map city argument to city name
const CITY_MAP: Record<string, 'Ciudad de México' | 'Monterrey' | 'Jalisco'> = {
  'cdmx': 'Ciudad de México',
  'mexico-city': 'Ciudad de México',
  'mexico city': 'Ciudad de México',
  'monterrey': 'Monterrey',
  'mty': 'Monterrey',
  'jalisco': 'Jalisco',
  'gdl': 'Jalisco',
  'guadalajara': 'Jalisco'
}

const cityFilter: 'Ciudad de México' | 'Monterrey' | 'Jalisco' | undefined = cityArg 
  ? CITY_MAP[cityArg] 
  : undefined

if (cityArg && !cityFilter) {
  console.error(`❌ Invalid city argument: "${cityArg}"`)
  console.error('Valid options: cdmx, monterrey, jalisco, gdl, guadalajara')
  process.exit(1)
}

if (cityFilter) {
  console.log(`\n📍 City filter enabled: ${cityFilter}`)
  console.log('   Only searching in this city\'s dataset\n')
}

// ============================================
// CONFIGURATION: Add your location names here
// ============================================
const LOCATIONS: string[] = [
    // Monterrey
    "Monterrey",
    "Apodaca",
    "Guadalupe",
    "San Nicolás de los Garza",
    "San Pedro Garza García",
    "Valle Del Campestre",
    "Jardines del Campestre",
    "Del Valle",
    "Valle Oriente",
    "Cumbres Elite",
    "Mitras Norte",
    "Mitras Sur",
    "Mitras Centro",
    "Contry La Silla",
    "Contry Sol",
    "Colinas De San Jeronimo",
    "Obispado",
    "Ladrillera",
    "Anahuac",
    "Vista Hermosa",
    "Potrero Anahuac",
    "Rincon De Las Puentes",
    "Las Puentes 4 Sec",
    "Cuauhtemoc 3 Sector",
    "Lomas Del Roble",
    "Tampiquito",
    "Valle De Chipinque",
    "Alfonso Reyes",
    "Fuentes Del Valle",
    "San Agustin",
    "Los Colorines",

    // CDMX
    "Álvaro Obregón",
    "Azcapotzalco",
    "Benito Juárez",
    "Coyoacán",
    "Cuajimalpa de Morelos",
    "Cuauhtémoc",
    "Gustavo A. Madero",
    "Iztacalco",
    "Iztapalapa",
    "La Magdalena Contreras",
    "Miguel Hidalgo",
    "Tlahuac",
    "Tlalpan",
    "Venustiano Carranza",
    "Xochimilco",
    "Polanco V Seccion",
    "Polanco Iv Seccion",
    "Lomas De Chapultepec I Seccion",
    "Bosques de las Lomas",
    "Condesa",
    "Roma Norte",
    "Hipodromo",
    "Roma Sur",
    "Tacubaya",
    "Juarez",
    "Doctores",
    "San Rafael",
    "Santa Maria La Ribera",
    "Del Valle Norte",
    "Del Valle Sur",
    "Del Valle Centro",
    "Napoles",
    "Narvarte Poniente",
    "San Angel",
    "Pueblo Tizapan",
    "Chimalistac",
    "Lomas De Plateros",
    "Claveria",
    "Nueva Santa Maria",
    "Centro De Azcapotzalco",
    "Unidad Cuitlahuac",
    "Barrio Santa Catarina",
    "Barrio La Concepcion",
    "San Diego Churubusco",
    "Parque San Andres",
    "Jardines De Coyoacan",
    "Campestre Churubusco",
    "Santa Fe Cuajimalpa",
    "Lomas De Vista Hermosa",
    "Contadero",
    "Lindavista Norte",
    "Lindavista Sur",
    "Aragon La Villa",
    "Industrial",
    "Agricola Oriental",
    "Granjas Mexico",
    "Agricola Pantitlan",
    "Viaducto Piedad",
    "Lomas Estrella",
    "Escuadron 201",
    "Paseos De Churubusco",
    "Prado Churubusco",
    "Sinatel",
    "El Prado",
    "Unidad Modelo",
    "Justo Sierra",
    "Banjidal",
    "San Jeronimo Lidice",
    "Barranca Seca",
    "Santa Teresa",
    "San Miguel Chapultepec I Seccion",
    "San Miguel Chapultepec Ii Seccion",
    "Anzures",
    "Veronica Anzures",
    "Tacuba",
    "Granada",
    "Ampliacion Granada",
    "Anahuac I Seccion",
    "Pensil Norte",
    "Popotla",
    "Tlalpan Centro",
    "Jardines En La Montaña",
    "Valle De Tepepan",
    "Granjas Coapa",
    "Villa Coapa",
    "Jardin Balbuena",
    "Jamaica",
    "Romero Rubio",
    "General Ignacio Zaragoza",
    "Valentin Gomez Farias",
    "Pueblo Santa Maria Nativitas",
    "Pueblo Santiago Tepalcatlalpan",
    "San Lorenzo La Cebada",

    // Jalisco
    "Guadalajara",
    "Zapopan",
    "Tlaquepaque",
    "Tonalá",
    "Americana",
    "Providencia",
    "Chapalita",
    "Ladron De Guevara",
    "Arcos Vallarta",
    "Jardines Del Bosque",
    "Colinas de San Javier",
    "Guadalajara Centro",
    "Ciudad Granja",
    "Zapopan Centro",
    "Loma Real",
    "La Estancia",
    "Seattle",
    "Las Fuentes"
]

// ============================================

interface GenerationResult {
  locationName: string
  success: boolean
  skipped?: boolean
  pages?: Array<{ slug: string; type: string }>
  error?: string
  total?: number
  successful?: number
  failed?: number
}

// Delay helper function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Check if error is a rate limit error
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes('429') || 
           message.includes('resource exhausted') ||
           message.includes('rate limit') ||
           message.includes('too many requests') ||
           message.includes('quota exceeded')
  }
  // Also check for GoogleGenerativeAI errors
  if (error && typeof error === 'object') {
    const err = error as any
    if (err.status === 429 || err.statusText === 'Too Many Requests') {
      return true
    }
  }
  return false
}

// Retry with exponential backoff
async function generateWithRetry(
  locationName: string,
  maxRetries: number = 3
): Promise<{ success: boolean; result?: any; error?: string }> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateLocationPages({ locationName, cityFilter })
      return { success: true, result }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // If it's a rate limit error, wait longer before retrying
      if (isRateLimitError(error)) {
        // Exponential backoff: 20s, 40s, 80s
        const waitTime = Math.min(20000 * Math.pow(2, attempt - 1), 300000)
        console.log(`\n   ⏳ Rate limit hit (attempt ${attempt}/${maxRetries}). Waiting ${waitTime / 1000}s before retry...`)
        await delay(waitTime)
        console.log(`   🔄 Retrying...\n`)
      } else {
        // For other errors, don't retry
        console.log(`   ✗ Non-retriable error, skipping retry`)
        return { success: false, error: lastError.message }
      }
    }
  }
  
  // If we exhausted all retries, return failure
  console.log(`   ✗ Exhausted all ${maxRetries} retry attempts`)
  return { success: false, error: lastError?.message || 'Unknown error' }
}

async function main() {
  if (LOCATIONS.length === 0) {
    console.error('❌ No locations specified!')
    console.error('Please add location names to the LOCATIONS array in the script.')
    process.exit(1)
  }

  console.log(`\n🚀 Starting batch generation for ${LOCATIONS.length} location(s)...\n`)
  console.log('='.repeat(60))

  const results: GenerationResult[] = []
  let successCount = 0
  let failureCount = 0
  let skippedCount = 0

  // Process each location
  for (let i = 0; i < LOCATIONS.length; i++) {
    const locationName = LOCATIONS[i]
    const current = i + 1
    const total = LOCATIONS.length

    console.log(`\n[${current}/${total}] Processing: ${locationName}`)
    console.log('-'.repeat(60))

    const result = await generateWithRetry(locationName)
    
    if (result.success && result.result) {
      // Check if location was skipped (multiple matches but no municipality)
      const isSkipped = result.result.successful === 0 && 
                       result.result.failed === 0 && 
                       result.result.total > 0
      
      if (isSkipped) {
        results.push({
          locationName,
          success: true,
          skipped: true,
          total: result.result.total,
          successful: 0,
          failed: 0
        })
        skippedCount++
        console.log(`⏭️  Skipped: Multiple matches found but no municipality type`)
      } else {
        const pages = result.result.pages.map((p: { slug: string; locationType: string }) => ({ slug: p.slug, type: p.locationType }))
        results.push({
          locationName,
          success: true,
          skipped: false,
          pages,
          total: result.result.total,
          successful: result.result.successful,
          failed: result.result.failed
        })
        successCount += result.result.successful
        failureCount += result.result.failed
        
        if (result.result.successful > 0) {
          console.log(`✓ Successfully generated ${result.result.successful} page(s):`)
          pages.forEach((p: { slug: string; type: string }) => {
            console.log(`   • ${p.slug} (${p.type})`)
          })
        }
        if (result.result.failed > 0) {
          console.error(`✗ Failed to generate ${result.result.failed} page(s)`)
        }
      }
    } else {
      results.push({
        locationName,
        success: false,
        skipped: false,
        error: result.error
      })
      failureCount++
      console.error(`✗ Failed: ${result.error}`)
    }

    // Add delay between requests to avoid rate limiting
    // Longer delay after every 3 requests to stay under rate limits
    if (i < LOCATIONS.length - 1) {
      const isEveryThird = (i + 1) % 3 === 0
      const delayTime = isEveryThird ? 20000 : 7000 // 20s after every 3rd, 7s otherwise
      console.log(`   ⏸️  Waiting ${delayTime / 1000}s before next request...`)
      await delay(delayTime)
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 SUMMARY\n')
  console.log(`Total locations: ${LOCATIONS.length}`)
  console.log(`✓ Successful: ${successCount}`)
  console.log(`✗ Failed: ${failureCount}`)
  console.log(`⏭️  Skipped: ${skippedCount}`)

  if (successCount > 0) {
    console.log('\n✅ Successfully generated pages:')
    results
      .filter(r => r.success && r.pages && r.pages.length > 0)
      .forEach(r => {
        r.pages!.forEach(p => {
          console.log(`   • ${r.locationName} (${p.type}) → /${p.slug}`)
        })
      })
  }

  if (skippedCount > 0) {
    console.log('\n⏭️  Skipped locations:')
    results
      .filter(r => r.skipped)
      .forEach(r => {
        console.log(`   • ${r.locationName} (${r.total} match(es) found, but no municipality type)`)
      })
  }

  if (failureCount > 0) {
    console.log('\n❌ Failed locations:')
    results
      .filter(r => !r.success && !r.skipped)
      .forEach(r => {
        console.log(`   • ${r.locationName}: ${r.error}`)
      })
  }

  console.log('\n' + '='.repeat(60))

  // Exit with error code if any failed
  if (failureCount > 0) {
    process.exit(1)
  }
}

main()

