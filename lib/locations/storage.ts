import fs from 'fs'
import path from 'path'
import type { LocationPageContent } from './contentGenerator'
import type { LocationData } from './dataLookup'

export interface LocationPage {
  slug: string
  locationName: string
  locationType: 'neighborhood' | 'municipality' | 'city' | 'state'
  city: 'Ciudad de México' | 'Monterrey' | 'Jalisco'
  municipality?: string
  content: LocationPageContent
  locationData: LocationData
  createdAt: string
  updatedAt: string
}

const LOCATIONS_DIR = path.join(process.cwd(), 'content', 'locations')

export function ensureLocationsDir(): void {
  if (!fs.existsSync(LOCATIONS_DIR)) {
    fs.mkdirSync(LOCATIONS_DIR, { recursive: true })
  }
}

export function saveLocationPage(page: LocationPage): void {
  ensureLocationsDir()
  
  const filePath = path.join(LOCATIONS_DIR, `${page.slug}.json`)
  fs.writeFileSync(filePath, JSON.stringify(page, null, 2), 'utf-8')
  
  console.log(`[Location Page] Saved: ${filePath}`)
}

export function loadLocationPage(slug: string): LocationPage | null {
  const filePath = path.join(LOCATIONS_DIR, `${slug}.json`)
  
  if (!fs.existsSync(filePath)) {
    return null
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`Error loading location page ${slug}:`, error)
    return null
  }
}

export function listLocationPages(): string[] {
  ensureLocationsDir()
  
  if (!fs.existsSync(LOCATIONS_DIR)) {
    return []
  }
  
  return fs.readdirSync(LOCATIONS_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''))
}

export function locationPageExists(slug: string): boolean {
  const filePath = path.join(LOCATIONS_DIR, `${slug}.json`)
  return fs.existsSync(filePath)
}


