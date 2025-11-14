import { GoogleGenerativeAI } from '@google/generative-ai'
import type { LocationData } from './dataLookup'

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

export interface LocationPageContent {
  title: string
  metaTitle: string
  metaDescription: string
  introduction: string
  mustVisitSpots: Array<{
    name: string
    description: string
  }>
  priceInsights: string
  slug: string
}

export async function generateLocationContent(
  locationData: LocationData
): Promise<LocationPageContent> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: MODEL })

  const locationType = locationData.type === 'neighborhood' ? 'colonia' : 
                      locationData.type === 'municipality' ? 'municipio' : 
                      locationData.type === 'city' ? 'ciudad' : 'estado'
  
  const averagePrice = Math.round(locationData.averagePrice)
  const priceFormatted = `$${averagePrice.toLocaleString('es-MX')}/m²`
  
  const monthsOfData = locationData.priceHistory.length
  const priceTrend = monthsOfData >= 2 
    ? locationData.priceHistory[monthsOfData - 1].price > locationData.priceHistory[0].price
      ? 'aumentando'
      : 'disminuyendo'
    : 'estable'

  const prompt = `Eres un experto en bienes raíces mexicanos y escritor de contenido SEO. Genera contenido en español para una página web sobre precios de propiedades en ${locationData.name}, ${locationData.city}.

INFORMACIÓN DEL LUGAR:
- Nombre: ${locationData.name}
- Tipo: ${locationType}
- Ciudad: ${locationData.city}
${locationData.municipality ? `- Municipio: ${locationData.municipality}` : ''}
- Precio promedio actual: ${priceFormatted}
- Tendencia de precios: ${priceTrend}
- Meses de datos disponibles: ${monthsOfData}

INSTRUCCIONES:
1. Escribe TODO en español mexicano
2. El contenido debe ser natural, conversacional y útil
3. Usa voz activa, contracciones y lenguaje directo
4. Evita sonar como IA - escribe como un experto local
5. Incluye datos específicos cuando sea relevante
6. El tono debe ser profesional pero accesible

GENERA EL SIGUIENTE CONTENIDO:

1. TÍTULO PRINCIPAL (H1): 
   - Máximo 60 caracteres
   - Debe incluir "Cuánto cuesta comprar en [nombre del lugar]"
   - SEO optimizado con palabras clave naturales

2. META TÍTULO:
   - Máximo 60 caracteres
   - Incluye precio promedio y ubicación
   - Ejemplo: "Precios en ${locationData.name} ${locationData.city} 2025 | ${priceFormatted}"

3. META DESCRIPCIÓN:
   - Máximo 160 caracteres
   - Incluye precio promedio, ubicación y valor único
   - Llamado a la acción implícito

4. INTRODUCCIÓN (2-3 párrafos):
   - Presenta ${locationData.name} como lugar para comprar propiedad
   - Menciona el precio promedio actual (${priceFormatted})
   - Contexto sobre la ubicación y su atractivo
   - Menciona brevemente la tendencia de precios si hay datos históricos

5. LUGARES QUE DEBES VISITAR (3-5 lugares):
   - Nombres específicos y reales de ${locationData.name}
   - Descripción breve (1-2 oraciones) de cada lugar
   - Pueden ser parques, restaurantes, puntos de interés, etc.
   - Si no conoces lugares específicos, menciona tipos de lugares típicos del área

6. INSIGHTS DE PRECIOS (1-2 párrafos):
   - Análisis del precio promedio (${priceFormatted})
   - Comparación con el contexto de ${locationData.city}
   - Tendencia de precios si hay datos históricos
   - Factores que pueden influir en los precios

7. CONCLUSIÓN:
   - NO incluyas una sección de conclusión
   - El contenido debe terminar con el análisis de precios

FORMATO DE RESPUESTA (JSON):
{
  "title": "Título principal",
  "metaTitle": "Meta título",
  "metaDescription": "Meta descripción",
  "introduction": "Texto de introducción...",
  "mustVisitSpots": [
    {
      "name": "Nombre del lugar",
      "description": "Descripción breve"
    }
  ],
  "priceInsights": "Análisis de precios..."
}

IMPORTANTE: Responde SOLO con el JSON, sin markdown, sin explicaciones adicionales.`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }
    
    // Clean JSON: remove or escape control characters that break JSON.parse()
    // First, try to escape control characters in string values properly
    // We'll process the JSON character by character to handle string values correctly
    let cleanedJson = ''
    let inString = false
    let escapeNext = false
    
    for (let i = 0; i < jsonText.length; i++) {
      const char = jsonText[i]
      const charCode = char.charCodeAt(0)
      
      if (escapeNext) {
        cleanedJson += char
        escapeNext = false
        continue
      }
      
      if (char === '\\') {
        cleanedJson += char
        escapeNext = true
        continue
      }
      
      if (char === '"') {
        inString = !inString
        cleanedJson += char
        continue
      }
      
      if (inString) {
        // Inside a string, escape control characters
        if (charCode >= 0x00 && charCode <= 0x1F) {
          // Control character - escape it
          if (char === '\n') cleanedJson += '\\n'
          else if (char === '\r') cleanedJson += '\\r'
          else if (char === '\t') cleanedJson += '\\t'
          else {
            // Other control characters - remove them
            continue
          }
        } else {
          cleanedJson += char
        }
      } else {
        // Outside strings, remove control characters
        if (charCode >= 0x00 && charCode <= 0x1F && char !== '\n' && char !== '\r' && char !== '\t') {
          // Remove control characters outside strings
          continue
        }
        cleanedJson += char
      }
    }
    
    // Try to parse JSON, with better error handling
    let content: Omit<LocationPageContent, 'slug'>
    try {
      content = JSON.parse(cleanedJson) as Omit<LocationPageContent, 'slug'>
    } catch (parseError) {
      // If parsing still fails, log for debugging
      const errorPos = parseError instanceof SyntaxError && (parseError as any).message.match(/position (\d+)/)?.[1]
      console.error('JSON parse error after cleaning.')
      console.error('Error:', parseError instanceof Error ? parseError.message : String(parseError))
      if (errorPos) {
        const pos = parseInt(errorPos)
        console.error('Error at position:', pos)
        console.error('Context around error:', cleanedJson.substring(Math.max(0, pos - 50), Math.min(cleanedJson.length, pos + 50)))
      }
      throw new Error(
        `Failed to parse JSON response from Gemini: ${parseError instanceof Error ? parseError.message : String(parseError)}. ` +
        `This usually means Gemini returned malformed JSON. Please try again.`
      )
    }
    
    // Generate slug from location name
    const slug = generateSlug(locationData.name)
    
    return {
      ...content,
      slug
    }
  } catch (error) {
    console.error('Error generating location content:', error)
    throw error
  }
}

function generateSlug(locationName: string): string {
  // Generate slug in format: cuanto-cuesta-comprar-en-[location]
  const locationSlug = locationName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
  
  return `cuanto-cuesta-comprar-en-${locationSlug}`
}

