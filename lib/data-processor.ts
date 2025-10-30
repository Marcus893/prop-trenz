import { db, supabase } from '@/lib/supabase'
import { Location, ResidentialPropertyType, ResidentialPriceIndex } from '@/lib/supabase'

export interface SHFDataRow {
  consecutivo: number
  global: string
  estado: string
  municipio: string
  trimestre: number
  año: number
  indice: string
}

export interface ProcessedLocation {
  type: 'national' | 'state' | 'municipality' | 'metro_zone'
  name: string
  state?: string
  parent_id?: string
}

export interface ProcessedPriceData {
  location_id: string
  property_type_id?: string
  quarter: number
  year: number
  index_value: number
}

export class SHFDataProcessor {
  private propertyTypeMap: Map<string, string> = new Map()
  private locationMap: Map<string, string> = new Map()
  private supabaseClient = supabase

  constructor() {
    this.initializePropertyTypeMap()
  }

  setSupabaseClient(client: any) {
    this.supabaseClient = client
  }

  private initializePropertyTypeMap() {
    this.propertyTypeMap.set('Nueva', 'nueva')
    this.propertyTypeMap.set('Usada', 'usada')
    this.propertyTypeMap.set('Casa sola', 'casa_sola')
    this.propertyTypeMap.set('Casa en condominio - depto.', 'condominio')
    this.propertyTypeMap.set('Media - Residencial', 'media_residencial')
  }

  async processCSV(csvContent: string, filename: string): Promise<{
    success: boolean
    recordsProcessed: number
    error?: string
  }> {
    console.log(`🚀 Starting CSV processing for: ${filename}`)
    
    try {
      // Create upload log (must use authenticated client for RLS)
      console.log('📝 Creating upload log...')
      const { data: createdLog, error: createErr } = await this.supabaseClient
        .from('data_upload_logs')
        .insert({ filename, status: 'processing', records_processed: 0 })
        .select()
        .single()

      if (createErr) {
        throw new Error(`Failed to create upload log: ${createErr.message}`)
      }

      const logId = createdLog.id
      console.log(`✅ Upload log created with ID: ${logId}`)

      // Parse CSV
      console.log('📊 Parsing CSV content...')
      const rows = this.parseCSV(csvContent)
      console.log(`📈 Total rows parsed: ${rows.length}`)
      
      // Filter for residential data only (exclude Económica-Social)
      // Include both property type rows AND rows with actual location data
      const residentialRows = rows.filter(row => 
        row.global !== 'Economica - Social' && // Note: CSV uses "Economica" not "Económica"
        (row.global === 'Media - Residencial' ||
         this.propertyTypeMap.has(row.global) ||
         row.global === 'Nacional' ||
         row.global.startsWith('ZM ') ||
         (row.estado && row.estado.trim() !== '') ||
         (row.municipio && row.municipio.trim() !== ''))
      )
      console.log(`🏠 Residential rows after filtering: ${residentialRows.length}`)

      // Process locations
      console.log('📍 Processing locations...')
      const locations = await this.processLocations(residentialRows)
      console.log(`✅ Locations processed: ${locations.size} unique locations`)
      
      // Process property types
      console.log('🏘️ Processing property types...')
      await this.processPropertyTypes()
      console.log('✅ Property types verified')
      
      // Process price data
      console.log('💰 Processing price data...')
      const priceData = await this.processPriceData(residentialRows, locations)
      console.log(`📊 Price data prepared: ${priceData.length} records`)

      // Update upload log (use authenticated client)
      console.log('📝 Updating upload log...')
      const { error: updateErr } = await this.supabaseClient
        .from('data_upload_logs')
        .update({ status: 'completed', records_processed: priceData.length })
        .eq('id', logId)
      if (updateErr) throw updateErr

      console.log(`🎉 CSV processing completed successfully! Processed ${priceData.length} records`)
      return {
        success: true,
        recordsProcessed: priceData.length
      }

    } catch (error) {
      console.error('❌ Error processing CSV:', error)
      return {
        success: false,
        recordsProcessed: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Convert Windows-1252/ISO-8859-1 to UTF-8
  // Many CSV files from Excel are encoded as Windows-1252
  private convertToUTF8(text: string): string {
    if (!text) return text
    
    try {
      // Common Windows-1252 to UTF-8 character mappings
      const encodingMap: { [key: string]: string } = {
        '\u00C3\u00A1': '\u00E1', // Ã¡ -> á
        '\u00C3\u00A9': '\u00E9', // Ã© -> é
        '\u00C3\u00AD': '\u00ED', // Ã­ -> í
        '\u00C3\u00B3': '\u00F3', // Ã³ -> ó
        '\u00C3\u00BA': '\u00FA', // Ãº -> ú
        '\u00C3\u0081': '\u00C1', // Ã -> Á
        '\u00C3\u0089': '\u00C9', // Ã‰ -> É
        '\u00C3\u008D': '\u00CD', // Ã -> Í
        '\u00C3\u0093': '\u00D3', // Ã" -> Ó
        '\u00C3\u009A': '\u00DA', // Ãš -> Ú
        '\u00C3\u00B1': '\u00F1', // Ã± -> ñ
        '\u00C3\u0091': '\u00D1', // Ã' -> Ñ
        '\u00C3\u00BC': '\u00FC', // Ã¼ -> ü
        '\u00C3\u009C': '\u00DC', // Ã -> Ü
      }
      
      // Replace common Windows-1252 mis-encodings
      let converted = text
      for (const [wrong, correct] of Object.entries(encodingMap)) {
        converted = converted.replace(new RegExp(wrong, 'g'), correct)
      }
      
      // Also handle the replacement character () - fix common Mexican location name patterns
      // These patterns account for missing accented characters
      const locationPatterns = [
        // States
        { pattern: /\bLen\b/g, replacement: 'León' },
        { pattern: /\bNuevo Len\b/g, replacement: 'Nuevo León' },
        { pattern: /\bMxico\b/g, replacement: 'México' },
        { pattern: /\bCiudad de Mxico\b/g, replacement: 'Ciudad de México' },
        { pattern: /\bQutaro\b/g, replacement: 'Querétaro' },
        { pattern: /\bQuertaro\b/g, replacement: 'Querétaro' },
        { pattern: /\bZacatecas\b/g, replacement: 'Zacatecas' },
        
        // Municipalities/Cities
        { pattern: /\bJurez\b/g, replacement: 'Juárez' },
        { pattern: /\bBenito Jurez\b/g, replacement: 'Benito Juárez' },
        { pattern: /\bAcapulco de Jurez\b/g, replacement: 'Acapulco de Juárez' },
        { pattern: /\bBaha\b/g, replacement: 'Bahía' },
        { pattern: /\bBah?a de Banderas\b/g, replacement: 'Bahía de Banderas' },
        { pattern: /\bGutrrez\b/g, replacement: 'Gutiérrez' },
        { pattern: /\bTuxtla Gutrrez\b/g, replacement: 'Tuxtla Gutiérrez' },
        { pattern: /\bCuliacn\b/g, replacement: 'Culiacán' },
        { pattern: /\bGarca\b/g, replacement: 'García' },
        
        // Metro zones
        { pattern: /\bZM Qutaro\b/g, replacement: 'ZM Querétaro' },
        { pattern: /\bZM Quertaro\b/g, replacement: 'ZM Querétaro' },
        { pattern: /\bZM Len\b/g, replacement: 'ZM León' },
        { pattern: /\bZM Mxico\b/g, replacement: 'ZM México' },
        { pattern: /\bZM Valle Mxico\b/g, replacement: 'ZM Valle México' },
      ]
      
      for (const { pattern, replacement } of locationPatterns) {
        converted = converted.replace(pattern, replacement)
      }
      
      return converted
    } catch (error) {
      console.error('Error converting text:', error)
      return text
    }
  }

  // Normalize text to ensure proper UTF-8 encoding
  private normalizeText(text: string): string {
    if (!text) return text
    // First convert common encoding issues, then normalize
    const converted = this.convertToUTF8(text)
    return converted
  }

  private parseCSV(csvContent: string): SHFDataRow[] {
    const lines = csvContent.split('\n')
    const rows: SHFDataRow[] = []

    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim()
      if (!line) continue

      const columns = line.split(';')
      
      if (columns.length < 7) {
        continue
      }

      try {
        const row: SHFDataRow = {
          consecutivo: parseInt(columns[0]) || 0,
          global: this.normalizeText(columns[1]?.trim() || ''),
          estado: this.normalizeText(columns[2]?.trim() || ''),
          municipio: this.normalizeText(columns[3]?.trim() || ''),
          trimestre: parseInt(columns[4]) || 0,
          año: parseInt(columns[5]) || 0,
          indice: columns[6]?.trim() || '0'
        }

        // Convert comma decimal to dot decimal
        row.indice = row.indice.replace(',', '.')

        rows.push(row)
      } catch (error) {
        continue
      }
    }

    return rows
  }

  private async processLocations(rows: SHFDataRow[]): Promise<Map<string, string>> {
    const locationMap = new Map<string, string>()
    const locationsToCreate: ProcessedLocation[] = []

    // Extract unique locations
    const locationSet = new Set<string>()

    for (const row of rows) {
      if (row.global === 'Nacional') {
        locationSet.add('Nacional|national|')
      } else if (row.global.startsWith('ZM ')) {
        locationSet.add(`${row.global}|metro_zone|`)
      } else if (row.estado && row.estado.trim() !== '' && !row.municipio) {
        locationSet.add(`${row.estado}|state|`)
      } else if (row.estado && row.estado.trim() !== '' && row.municipio && row.municipio.trim() !== '') {
        locationSet.add(`${row.municipio}|municipality|${row.estado}`)
      } else if (this.propertyTypeMap.has(row.global) || row.global === 'Media - Residencial') {
        // Property type rows are national-level data
        locationSet.add('Nacional|national|')
      }
    }

    console.log(`🔍 Extracted ${locationSet.size} unique location keys`)

    // Create location objects
    for (const locationKey of Array.from(locationSet)) {
      const [name, type, state] = locationKey.split('|')
      
      const location: ProcessedLocation = {
        type: type as any,
        name: this.normalizeText(name.trim()),
        state: state ? this.normalizeText(state) : undefined
      }

      locationsToCreate.push(location)
    }

    console.log(`📋 Created ${locationsToCreate.length} location objects to process`)

    // Insert locations into database
    let createdCount = 0
    let existingCount = 0
    
    for (const location of locationsToCreate) {
      try {
        const result = await db.getLocations().then(async (response) => {
          if (response.error) throw response.error
          
          // Check if location already exists
          const existing = response.data?.find(loc => 
            loc.name === location.name && 
            loc.type === location.type &&
            loc.state === location.state
          )

          if (existing) {
            locationMap.set(`${location.name}|${location.type}|${location.state || ''}`, existing.id)
            existingCount++
            return existing
          }

          // Create new location
          const createResult = await this.supabaseClient.from('locations').insert(location).select().single()
          if (createResult.error) throw createResult.error
          
          locationMap.set(`${location.name}|${location.type}|${location.state || ''}`, createResult.data.id)
          createdCount++
          return createResult.data
        })
      } catch (error) {
        console.error(`❌ Error processing location ${location.name}:`, error)
      }
    }

    console.log(`📍 Location processing complete: ${createdCount} created, ${existingCount} existing`)
    return locationMap
  }

  private async processPropertyTypes(): Promise<void> {
    // Property types are already inserted in the schema
    // This method can be used to update or verify property types
    const result = await db.getPropertyTypes()
    if (result.error) {
      throw new Error(`Failed to get property types: ${result.error.message}`)
    }
  }

  private async processPriceData(
    rows: SHFDataRow[], 
    locationMap: Map<string, string>
  ): Promise<ProcessedPriceData[]> {
    const priceDataToInsert: ProcessedPriceData[] = []
    let processedRows = 0
    let skippedRows = 0

    console.log(`💰 Processing ${rows.length} rows for price data...`)

    for (const row of rows) {
      try {
        // Determine location key
        let locationKey: string
        if (row.global === 'Nacional') {
          locationKey = `Nacional|national|`
        } else if (row.global.startsWith('ZM ')) {
          locationKey = `${row.global}|metro_zone|`
        } else if (row.estado && !row.municipio) {
          locationKey = `${row.estado}|state|`
        } else if (row.estado && row.municipio) {
          locationKey = `${row.municipio}|municipality|${row.estado}`
        } else {
          skippedRows++
          continue // Skip rows we can't categorize
        }

        const locationId = locationMap.get(locationKey)
        if (!locationId) {
          skippedRows++
          continue
        }

        // Determine property type
        let propertyTypeId: string | undefined
        if (this.propertyTypeMap.has(row.global)) {
          const propertyTypeName = this.propertyTypeMap.get(row.global)!
          const propertyTypes = await db.getPropertyTypes()
          if (!propertyTypes.error) {
            const propertyType = propertyTypes.data.find(pt => pt.name === propertyTypeName)
            propertyTypeId = propertyType?.id
          }
        }

        const priceData: ProcessedPriceData = {
          location_id: locationId,
          property_type_id: propertyTypeId,
          quarter: row.trimestre,
          year: row.año,
          index_value: parseFloat(row.indice)
        }

        priceDataToInsert.push(priceData)
        processedRows++
      } catch (error) {
        skippedRows++
        continue
      }
    }

    console.log(`📊 Price data preparation: ${processedRows} processed, ${skippedRows} skipped`)

    // Insert price data in batches
    const batchSize = 1000
    let totalBatches = Math.ceil(priceDataToInsert.length / batchSize)
    console.log(`💾 Inserting ${priceDataToInsert.length} records in ${totalBatches} batches...`)

    for (let i = 0; i < priceDataToInsert.length; i += batchSize) {
      const batch = priceDataToInsert.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      
      try {
        console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)...`)
        const result = await this.supabaseClient
          .from('residential_price_indices')
          .upsert(batch, { 
            onConflict: 'location_id,property_type_id,quarter,year',
            ignoreDuplicates: false 
          })
        
        if (result.error) {
          console.error(`❌ Error in batch ${batchNumber}:`, result.error)
        } else {
          console.log(`✅ Batch ${batchNumber} completed successfully`)
        }
      } catch (error) {
        console.error(`❌ Error processing batch ${batchNumber}:`, error)
      }
    }

    console.log(`🎯 Price data insertion complete!`)
    return priceDataToInsert
  }
}

// Utility function to process uploaded CSV file
export async function processSHFCSV(file: File, authenticatedSupabase?: any): Promise<{
  success: boolean
  recordsProcessed: number
  error?: string
}> {
  const processor = new SHFDataProcessor()
  
  // Use authenticated client if provided, otherwise use default
  if (authenticatedSupabase) {
    processor.setSupabaseClient(authenticatedSupabase)
  }
  
  try {
    // Read file as ArrayBuffer to handle encoding properly
    const arrayBuffer = await file.arrayBuffer()
    
    // Try to detect and convert encoding
    // Most Excel CSV files are Windows-1252, but we'll try multiple encodings
    let csvContent: string
    
    try {
      // Try multiple encodings - Excel CSV files are often Windows-1252 or ISO-8859-1
      const encodings = ['windows-1252', 'iso-8859-1', 'utf-8']
      csvContent = ''
      let bestContent = ''
      let bestEncoding = 'utf-8'
      
      for (const encoding of encodings) {
        try {
          const decoder = new TextDecoder(encoding, { fatal: false })
          const decoded = decoder.decode(arrayBuffer)
          
          // Check for replacement characters - fewer is better
          const replacementCharCount = (decoded.match(/\uFFFD/g) || []).length
          
          if (replacementCharCount === 0) {
            // Perfect match, use this encoding
            csvContent = decoded
            bestEncoding = encoding
            console.log(`✅ Successfully decoded as ${encoding}`)
            break
          } else {
            // Track the encoding with fewest replacement characters
            if (!bestContent || replacementCharCount < (bestContent.match(/\uFFFD/g) || []).length) {
              bestContent = decoded
              bestEncoding = encoding
            }
          }
        } catch (e) {
          // Try next encoding
          continue
        }
      }
      
      // If we didn't find a perfect match, use the best one we found
      if (!csvContent && bestContent) {
        csvContent = bestContent
        console.log(`⚠️ Using ${bestEncoding} encoding (may contain some replacement characters)`)
      } else if (!csvContent) {
        // Fallback to UTF-8
        const utf8Decoder = new TextDecoder('utf-8', { fatal: false })
        csvContent = utf8Decoder.decode(arrayBuffer)
        console.log('⚠️ Fallback to UTF-8 encoding')
      }
    } catch (encodingError) {
      console.warn('Encoding detection failed, using UTF-8:', encodingError)
      // Fallback to UTF-8
      const utf8Decoder = new TextDecoder('utf-8', { fatal: false })
      csvContent = utf8Decoder.decode(arrayBuffer)
    }
    
    console.log('📄 File read successfully, length:', csvContent.length)
    return await processor.processCSV(csvContent, file.name)
  } catch (error) {
    return {
      success: false,
      recordsProcessed: 0,
      error: error instanceof Error ? error.message : 'Failed to read file'
    }
  }
}
