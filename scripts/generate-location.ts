#!/usr/bin/env ts-node

import * as dotenv from 'dotenv'
import { generateLocationPage } from '../lib/locations/generateLocation'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function main() {
  const locationName = process.argv[2]
  
  if (!locationName) {
    console.error('Usage: npm run generate-location <location-name>')
    console.error('Example: npm run generate-location "Condesa"')
    console.error('Example: npm run generate-location "Monterrey"')
    console.error('Example: npm run generate-location "Baja California"')
    process.exit(1)
  }
  
  try {
    await generateLocationPage({ locationName })
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


