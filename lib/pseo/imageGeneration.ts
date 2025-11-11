const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const MODEL = 'gemini-2.0-flash-exp:generateContent'

interface GeminiImageResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        inlineData?: {
          mimeType: string
          data: string // base64 encoded
        }
        text?: string
      }>
    }
  }>
  error?: {
    message: string
    code: number
  }
}

async function uploadImageToStorage(base64Data: string, mimeType: string): Promise<string> {
  // Convert base64 to data URL for immediate use
  // Note: For production, consider uploading to Supabase Storage, Cloudinary, or similar
  // and returning a public URL instead of data URLs
  return `data:${mimeType};base64,${base64Data}`
}

export async function generateMainImage(prompt: string): Promise<{ url: string; revisedPrompt?: string }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GOOGLE_AI_API_KEY is not configured')
  }

  // Enhance prompt for real estate content
  const enhancedPrompt = `Generate a professional real estate photography style image: ${prompt}. High quality, modern, clean composition, suitable for blog header image (landscape format, 1792x1024). Mexican architecture or property context if relevant.`

  const apiUrl = `${GEMINI_API_BASE}/models/${MODEL}?key=${apiKey}`

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: enhancedPrompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 4096
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini image generation failed (${response.status}): ${errorText}`)
  }

  const json = (await response.json()) as GeminiImageResponse

  if (json.error) {
    throw new Error(`Gemini image generation error: ${json.error.message}`)
  }

  if (!json.candidates || json.candidates.length === 0) {
    throw new Error('Gemini returned no image data')
  }

  const candidate = json.candidates[0]
  const imagePart = candidate.content.parts.find((part) => part.inlineData)

  if (!imagePart?.inlineData) {
    throw new Error('Gemini response did not contain image data')
  }

  const imageUrl = await uploadImageToStorage(imagePart.inlineData.data, imagePart.inlineData.mimeType)

  return {
    url: imageUrl,
    revisedPrompt: enhancedPrompt
  }
}

export async function generateSectionImage(
  sectionHeading: string,
  topic: string,
  context?: string
): Promise<{ url: string; revisedPrompt?: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    return null // Fail silently for section images
  }

  // Only generate images for sections that would benefit from visual content
  const shouldGenerate = sectionHeading.toLowerCase().includes('tax') ||
    sectionHeading.toLowerCase().includes('cost') ||
    sectionHeading.toLowerCase().includes('process') ||
    sectionHeading.toLowerCase().includes('requirement') ||
    sectionHeading.toLowerCase().includes('checklist') ||
    sectionHeading.toLowerCase().includes('timeline')

  if (!shouldGenerate) {
    return null
  }

  const prompt = `Generate an infographic-style illustration: ${sectionHeading}. Context: ${topic}. ${context || ''} Clean, professional, educational style suitable for real estate guide. Square format (1024x1024).`

  try {
    const apiUrl = `${GEMINI_API_BASE}/models/${MODEL}?key=${apiKey}`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096
        }
      })
    })

    if (!response.ok) {
      return null // Fail silently
    }

    const json = (await response.json()) as GeminiImageResponse

    if (json.error || !json.candidates || json.candidates.length === 0) {
      return null
    }

    const candidate = json.candidates[0]
    const imagePart = candidate.content.parts.find((part) => part.inlineData)

    if (!imagePart?.inlineData) {
      return null
    }

    const imageUrl = await uploadImageToStorage(imagePart.inlineData.data, imagePart.inlineData.mimeType)

    return {
      url: imageUrl,
      revisedPrompt: prompt
    }
  } catch (error) {
    console.warn('[pSEO] Section image generation failed', error)
    return null
  }
}

