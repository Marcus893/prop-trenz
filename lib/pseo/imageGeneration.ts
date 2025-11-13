const OPENAI_API_BASE = 'https://api.openai.com/v1'

interface DalleImageResponse {
  data?: Array<{
    url: string
    revised_prompt?: string
  }>
  error?: {
    message: string
    type: string
  }
}

// Try to use Bing Image Creator (free) first, fallback to DALL-E API (paid)
const USE_BING_FIRST = process.env.USE_BING_IMAGE_CREATOR !== 'false' // Default to true

export async function generateMainImage(prompt: string): Promise<{ url: string; revisedPrompt?: string }> {
  // Enhance prompt for real estate content
  const enhancedPrompt = `Professional real estate photography style: ${prompt}. High quality, modern, clean composition, suitable for blog header image. Mexican architecture or property context if relevant.`

  // Try Bing Image Creator first (free) if enabled
  if (USE_BING_FIRST) {
    try {
      console.log('[pSEO] Attempting to generate image with Bing Image Creator (free)...')
      const { generateImageWithBing } = await import('./bingImageCreator')
      const result = await generateImageWithBing(enhancedPrompt, {
        headless: false, // Show browser for manual sign-in if needed
        timeout: 180000 // 3 minutes
      })
      console.log('[pSEO] ✓ Image generated successfully with Bing Image Creator')
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn(`[pSEO] Bing Image Creator failed: ${errorMessage}`)
      console.log('[pSEO] Falling back to DALL-E API...')
      // Fall through to DALL-E API
    }
  }

  // Fallback to DALL-E API (paid)
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured and Bing Image Creator failed')
  }

  console.log('[pSEO] Using DALL-E API for image generation...')
  const apiUrl = `${OPENAI_API_BASE}/images/generations`

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1792x1024', // Landscape format for blog headers
      quality: 'hd',
      style: 'natural'
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DALL-E image generation failed (${response.status}): ${errorText}`)
  }

  const json = (await response.json()) as DalleImageResponse

  if (json.error) {
    throw new Error(`DALL-E image generation error: ${json.error.message}`)
  }

  if (!json.data || json.data.length === 0) {
    throw new Error('DALL-E returned no image data')
  }

  const imageData = json.data[0]

  return {
    url: imageData.url,
    revisedPrompt: imageData.revised_prompt || enhancedPrompt
  }
}

export async function generateSectionImage(
  sectionHeading: string,
  topic: string,
  context?: string
): Promise<{ url: string; revisedPrompt?: string } | null> {
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

  const prompt = `Infographic-style illustration: ${sectionHeading}. Context: ${topic}. ${context || ''} Clean, professional, educational style suitable for real estate guide.`

  // Try Bing Image Creator first (free) if enabled
  if (USE_BING_FIRST) {
    try {
      const { generateImageWithBing } = await import('./bingImageCreator')
      const result = await generateImageWithBing(prompt, {
        headless: false,
        timeout: 180000
      })
      return result
    } catch (error) {
      // Fail silently and fall through to DALL-E
    }
  }

  // Fallback to DALL-E API (paid)
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return null // Fail silently for section images
  }

  try {
    const apiUrl = `${OPENAI_API_BASE}/images/generations`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024', // Square format for infographics
        quality: 'standard',
        style: 'natural'
      })
    })

    if (!response.ok) {
      return null // Fail silently
    }

    const json = (await response.json()) as DalleImageResponse

    if (json.error || !json.data || json.data.length === 0) {
      return null
    }

    const imageData = json.data[0]

    return {
      url: imageData.url,
      revisedPrompt: imageData.revised_prompt || prompt
    }
  } catch (error) {
    console.warn('[pSEO] Section image generation failed', error)
    return null
  }
}

