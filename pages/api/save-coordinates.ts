import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use anon key for reads (respects RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Use service role key for writes (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

interface CoordinatesData {
  [key: string]: [number, number] // Format: "Municipality-Neighborhood": [lat, lng]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    const { coordinates, city } = req.body as { coordinates: CoordinatesData; city?: string }

    if (!coordinates || typeof coordinates !== 'object') {
      return res.status(400).json({ error: 'Invalid coordinates data' })
    }

    // Parse coordinates - format is "Municipality-Neighborhood": [lat, lng]
    const coordinatesToInsert: Array<{
      municipality: string
      neighborhood_name: string
      latitude: number
      longitude: number
      city: string
    }> = []

    // Extract municipality and neighborhood from keys
    for (const [key, [latitude, longitude]] of Object.entries(coordinates)) {
      // Key format: "Municipality-Neighborhood"
      // Split on first hyphen only (municipality names typically don't have hyphens)
      const firstHyphenIndex = key.indexOf('-')
      if (firstHyphenIndex === -1) {
        console.warn(`Invalid coordinate key format: ${key}, expected "Municipality-Neighborhood"`)
        continue
      }
      
      const municipality = key.substring(0, firstHyphenIndex)
      const neighborhoodName = key.substring(firstHyphenIndex + 1)

      if (!city) {
        console.warn(`⚠️  Missing city for coordinate: ${key}, skipping`)
        continue
      }
      
      coordinatesToInsert.push({
        municipality,
        neighborhood_name: neighborhoodName,
        latitude: parseFloat(latitude.toString()),
        longitude: parseFloat(longitude.toString()),
        city, // City is required
      })
    }

    if (coordinatesToInsert.length === 0) {
      return res.status(400).json({ error: 'No valid coordinates to save' })
    }

    // Fetch existing coordinates to filter out duplicates
    // Build a set of existing (municipality, neighborhood_name) pairs
    const municipalities = Array.from(new Set(coordinatesToInsert.map(c => c.municipality)))
    const { data: existingRecords, error: fetchError } = await supabase
      .from('neighborhood_coordinates')
      .select('municipality, neighborhood_name')
      .in('municipality', municipalities)

    if (fetchError) {
      console.error('Error fetching existing coordinates:', fetchError)
      return res.status(500).json({ error: 'Failed to fetch existing coordinates' })
    }

    // Create a set of existing (municipality, neighborhood_name) pairs for quick lookup
    const existingKeys = new Set(
      (existingRecords || []).map(record => `${record.municipality}-${record.neighborhood_name}`)
    )

    // Filter to only new records
    const newCoordinates = coordinatesToInsert.filter(coord => {
      const key = `${coord.municipality}-${coord.neighborhood_name}`
      return !existingKeys.has(key)
    })

    let saved = 0
    const skipped = coordinatesToInsert.length - newCoordinates.length

    // Only insert new records if there are any
    if (newCoordinates.length > 0) {
      // Use admin client to bypass RLS for inserts
      const { data, error } = await supabaseAdmin
        .from('neighborhood_coordinates')
        .insert(newCoordinates)
        .select()

      if (error) {
        console.error('Error saving coordinates to database:', error)
        return res.status(500).json({ error: 'Failed to save coordinates to database', details: error.message })
      }

      saved = data?.length || 0
    }

    return res.status(200).json({ 
      success: true, 
      saved,
      skipped,
      total: coordinatesToInsert.length
    })
  } catch (error) {
    console.error('Error saving coordinates:', error)
    return res.status(500).json({ error: 'Failed to save coordinates' })
  }
}


