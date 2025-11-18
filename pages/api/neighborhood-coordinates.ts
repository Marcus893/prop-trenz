import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { municipality, municipalities, city } = req.query

    // Build query - filter by municipality(ies) or city if provided
    let query = supabase
      .from('neighborhood_coordinates')
      .select('municipality, neighborhood_name, latitude, longitude')
      .order('municipality')
      .order('neighborhood_name')

    if (municipalities) {
      // Handle multiple municipalities (comma-separated or array)
      const municipalityList = Array.isArray(municipalities) 
        ? municipalities 
        : typeof municipalities === 'string'
        ? municipalities.split(',').map(m => m.trim())
        : []
      if (municipalityList.length > 0) {
        query = query.in('municipality', municipalityList)
      }
    } else if (municipality && typeof municipality === 'string') {
      query = query.eq('municipality', municipality)
    } else if (city && typeof city === 'string') {
      query = query.eq('city', city)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching neighborhood coordinates:', error)
      return res.status(500).json({ error: 'Failed to fetch coordinates' })
    }

    // Convert to the format expected by the frontend: { "Municipality-Neighborhood": [lat, lng] }
    const coordinatesMap: { [key: string]: [number, number] } = {}
    
    if (data) {
      for (const row of data) {
        const key = `${row.municipality}-${row.neighborhood_name}`
        coordinatesMap[key] = [
          parseFloat(row.latitude.toString()),
          parseFloat(row.longitude.toString())
        ]
      }
    }

    return res.status(200).json(coordinatesMap)
  } catch (error) {
    console.error('Error in neighborhood-coordinates API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
