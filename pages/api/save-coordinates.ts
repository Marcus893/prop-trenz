import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

interface CoordinatesData {
  [key: string]: [number, number]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { coordinates } = req.body as { coordinates: CoordinatesData }

    if (!coordinates || typeof coordinates !== 'object') {
      return res.status(400).json({ error: 'Invalid coordinates data' })
    }

    // Save to data directory (source of truth)
    const dataPath = path.join(process.cwd(), 'data', 'neighborhood-coordinates.json')
    const publicPath = path.join(process.cwd(), 'public', 'data', 'neighborhood-coordinates.json')

    // Read existing coordinates
    let existingData: CoordinatesData = {}
    if (fs.existsSync(dataPath)) {
      const existingContent = fs.readFileSync(dataPath, 'utf-8')
      existingData = JSON.parse(existingContent)
    }

    // Merge new coordinates with existing ones
    const mergedData = { ...existingData, ...coordinates }

    // Save to both locations
    fs.mkdirSync(path.dirname(dataPath), { recursive: true })
    fs.mkdirSync(path.dirname(publicPath), { recursive: true })
    
    fs.writeFileSync(dataPath, JSON.stringify(mergedData, null, 2))
    fs.writeFileSync(publicPath, JSON.stringify(mergedData, null, 2))

    return res.status(200).json({ 
      success: true, 
      saved: Object.keys(coordinates).length 
    })
  } catch (error) {
    console.error('Error saving coordinates:', error)
    return res.status(500).json({ error: 'Failed to save coordinates' })
  }
}


