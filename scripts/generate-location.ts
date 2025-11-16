#!/usr/bin/env ts-node

import * as dotenv from 'dotenv'
import { generateLocationPage } from '../lib/locations/generateLocation'

// Load environment variables
dotenv.config({ path: '.env.local' })

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

async function main() {
  const args = process.argv.slice(2)
  const locationName = args[0]
  const cityArg = args[1]?.toLowerCase()
  
  if (!locationName) {
    console.error('Usage: npm run generate-location <location-name> [city-filter]')
    console.error('Example: npm run generate-location "Condesa"')
    console.error('Example: npm run generate-location "Providencia" jalisco')
    console.error('Example: npm run generate-location "Monterrey"')
    console.error('\nCity filter options: cdmx, monterrey, jalisco, gdl, guadalajara')
    process.exit(1)
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
    console.log(`📍 City filter enabled: ${cityFilter}\n`)
  }
  
  try {
    await generateLocationPage({ locationName, cityFilter })
    console.log('\n✓ Location page generated successfully!')
  } catch (error) {
    console.error('\n✗ Error generating location page:')
    if (error instanceof Error) {
      console.error(error.message)
    } else {
      console.error(error)
    }
    process.exit(1)
  }
}

main()


