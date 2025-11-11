import type { GuideArticle } from './types'
import { saveGuideDraft, loadGuide } from './storage'
import { generateMainImage, generateSectionImage } from './imageGeneration'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = process.env.OPENAI_PSEO_MODEL || 'gpt-4o-mini'

const SUPPORTED_LOCALES = ['en', 'es', 'zh']
const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  zh: 'Chinese (Simplified)'
}

// Tag mapping to ensure consistent translations across all guides
// English tag -> { es: Spanish tag, zh: Chinese tag }
const TAG_TRANSLATIONS: Record<string, { es: string; zh: string }> = {
  'mexico-real-estate': {
    es: 'inmuebles-mexico',
    zh: '墨西哥房地产'
  },
  'market-intelligence': {
    es: 'inteligencia-de-mercado',
    zh: '市场情报'
  },
  'buying': {
    es: 'compra',
    zh: '购买'
  },
  'notary': {
    es: 'notario',
    zh: '公证人'
  },
  'selling': {
    es: 'venta',
    zh: '出售'
  },
  'ownership': {
    es: 'propiedad',
    zh: '所有权'
  },
  'taxes': {
    es: 'impuestos',
    zh: '税收'
  },
  'legal': {
    es: 'legal',
    zh: '法律'
  },
  'investment': {
    es: 'inversion',
    zh: '投资'
  },
  'regulations': {
    es: 'regulaciones',
    zh: '法规'
  },
  'rent': {
    es: 'renta',
    zh: '租赁'
  }
}

/**
 * Translate tags consistently using the tag mapping dictionary
 */
function translateTags(tags: string[], targetLocale: string): string[] {
  if (targetLocale === 'en') {
    return tags
  }

  return tags.map((tag) => {
    const translation = TAG_TRANSLATIONS[tag]
    if (translation) {
      return targetLocale === 'es' ? translation.es : translation.zh
    }
    // If tag not in mapping, convert to lowercase and replace spaces with hyphens
    // This is a fallback for unknown tags
    return tag.toLowerCase().replace(/\s+/g, '-')
  })
}

interface TranslationResponse {
  title: string
  metaTitle: string
  metaDescription: string
  excerpt: string
  heroKicker: string
  sections: Array<{
    heading: string
    paragraphs: string[]
    bullets?: string[]
    dataPoints?: Array<{ label: string; value: string }>
  }>
  faq?: Array<{ question: string; answer: string }>
}

async function translateContent(sourceGuide: GuideArticle, targetLocale: string): Promise<TranslationResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const sourceLocaleName = LOCALE_NAMES[sourceGuide.locale] || sourceGuide.locale
  const targetLocaleName = LOCALE_NAMES[targetLocale] || targetLocale

  const prompt = `You are a professional translator specializing in real estate and legal content for Mexican property markets.

Translate the following guide from ${sourceLocaleName} to ${targetLocaleName}. Maintain the exact same structure, tone (third-person), and technical accuracy. Preserve all numbers, percentages, and data points exactly as they appear.

CRITICAL: Output ONLY valid JSON. Do not wrap the response in markdown code blocks, do not add any explanation text, and do not use triple backticks. Return pure JSON that can be parsed directly.

Source guide:
Title: ${sourceGuide.title}
Meta Title: ${sourceGuide.metaTitle || sourceGuide.title}
Meta Description: ${sourceGuide.metaDescription}
Excerpt: ${sourceGuide.excerpt || ''}
Hero Kicker: ${sourceGuide.heroKicker || ''}

Sections:
${sourceGuide.sections.map((section, idx) => `
Section ${idx + 1}:
Heading: ${section.heading}
Paragraphs:
${section.paragraphs.map((p, pIdx) => `${pIdx + 1}. ${p}`).join('\n')}
${section.bullets ? `Bullets:\n${section.bullets.map((b, bIdx) => `- ${b}`).join('\n')}` : ''}
${section.dataPoints ? `Data Points:\n${section.dataPoints.map((dp) => `- ${dp.label}: ${dp.value}`).join('\n')}` : ''}
`).join('\n---\n')}

${sourceGuide.faq && sourceGuide.faq.length > 0 ? `FAQ:\n${sourceGuide.faq.map((item, idx) => `Q${idx + 1}: ${item.question}\nA${idx + 1}: ${item.answer}`).join('\n\n')}` : ''}

Output a JSON object with this exact schema:
{
  "title": string,
  "metaTitle": string,
  "metaDescription": string,
  "excerpt": string,
  "heroKicker": string,
  "sections": [
    {
      "heading": string,
      "paragraphs": string[],
      "bullets": string[]?,
      "dataPoints": [{"label": string, "value": string}]?
    }
  ],
  "faq": [{"question": string, "answer": string}]?
}

Requirements:
- Translate all text naturally and accurately
- Keep all numbers, percentages, currency amounts, and dates exactly as they appear
- Maintain third-person voice throughout
- Preserve the same number of sections, paragraphs, and FAQ items
- Ensure technical terms (like "ISAI", "SAT", "fideicomiso") are correctly translated or kept as-is if they're proper nouns
- Data point labels should be translated, but values (numbers) remain unchanged
- Links: Preserve all markdown-style links [text](url) exactly as they appear. Only translate the link text, keep the URL unchanged. For example: [Inmuebles24](https://www.inmuebles24.com) should become [Inmuebles24](https://www.inmuebles24.com) in Spanish (keep the same) or translate the text if appropriate.
- Note: Tags will be handled separately, do not include them in the JSON response`

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2, // Lower temperature for more consistent translations
      messages: [
        { role: 'system', content: 'You are a professional translator specializing in real estate and legal content.' },
        { role: 'user', content: prompt }
      ]
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Translation failed (${response.status}): ${errorText}`)
  }

  const json = await response.json()
  let content = json.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Translation returned empty response')
  }

  // Extract JSON from markdown code blocks if present
  content = content.trim()
  
  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  // Handle multiple formats: ```json\n...\n```, ```\n...\n```, etc.
  const jsonBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    content = jsonBlockMatch[1].trim()
  }
  
  // Also handle cases where JSON might be wrapped in other markdown
  content = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
  
  // Remove any leading/trailing text that's not JSON
  // Try to find the first { and last }
  const firstBrace = content.indexOf('{')
  const lastBrace = content.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    content = content.substring(firstBrace, lastBrace + 1)
  }

  try {
    const parsed = JSON.parse(content) as TranslationResponse
    return parsed
  } catch (error) {
    console.error('[pSEO] Failed to parse translation response', error)
    console.error('[pSEO] Raw content received (first 1000 chars):', content.substring(0, 1000))
    console.error('[pSEO] Raw content length:', content.length)
    
    // Try to fix common JSON issues
    try {
      // Remove trailing commas before closing brackets/braces
      let fixedContent = content
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}')
      
      const parsed = JSON.parse(fixedContent) as TranslationResponse
      console.log('[pSEO] Successfully parsed after fixing trailing commas')
      return parsed
    } catch (fixError) {
      // If that doesn't work, throw the original error
      throw new Error(`Translation response was not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

export async function translateGuideToLocale(
  sourceGuide: GuideArticle,
  targetLocale: string
): Promise<GuideArticle> {
  if (!SUPPORTED_LOCALES.includes(targetLocale)) {
    throw new Error(`Unsupported target locale: ${targetLocale}`)
  }

  if (sourceGuide.locale === targetLocale) {
    throw new Error('Source and target locales are the same')
  }

  console.log(`[pSEO] Translating guide "${sourceGuide.slug}" from ${sourceGuide.locale} to ${targetLocale}...`)

  // Translate content
  const translated = await translateContent(sourceGuide, targetLocale)

  // Generate images for the translated guide (reuse prompts but generate new images)
  let mainImageUrl: string | undefined
  let mainImageAlt: string | undefined

  // Try to reuse the main image URL if it exists, otherwise we'd need to regenerate
  // For now, we'll reuse the existing image since it's visual content
  mainImageUrl = sourceGuide.mainImageUrl
  mainImageAlt = translated.title

  // Translate section images (reuse existing URLs)
  const sectionsWithImages = sourceGuide.sections.map((sourceSection, index) => {
    const translatedSection = translated.sections[index]
    if (!translatedSection) {
      return {
        heading: sourceSection.heading,
        paragraphs: sourceSection.paragraphs,
        bullets: sourceSection.bullets,
        dataPoints: sourceSection.dataPoints,
        imageUrl: sourceSection.imageUrl,
        imageAlt: translated.sections[0]?.heading || sourceSection.heading
      }
    }

    return {
      heading: translatedSection.heading,
      paragraphs: translatedSection.paragraphs,
      bullets: translatedSection.bullets,
      dataPoints: translatedSection.dataPoints,
      imageUrl: sourceSection.imageUrl, // Reuse image URL
      imageAlt: translatedSection.heading
    }
  })

  // Use consistent tag translation mapping instead of AI-translated tags
  const translatedTags = translateTags(sourceGuide.tags, targetLocale)

  const translatedGuide: GuideArticle = {
    slug: sourceGuide.slug,
    locale: targetLocale,
    // If source guide is published, automatically publish translations
    status: sourceGuide.status === 'published' ? 'published' : 'draft',
    accessLevel: sourceGuide.accessLevel,
    tags: translatedTags, // Use consistent tag mapping
    updatedAt: new Date().toISOString(),
    title: translated.title,
    metaTitle: translated.metaTitle,
    metaDescription: translated.metaDescription,
    excerpt: translated.excerpt,
    heroKicker: translated.heroKicker,
    mainImageUrl,
    mainImageAlt,
    sections: sectionsWithImages,
    faq: translated.faq
  }

  return translatedGuide
}

export async function generateAllTranslations(sourceGuide: GuideArticle, forceUpdate?: boolean): Promise<GuideArticle[]> {
  const targetLocales = SUPPORTED_LOCALES.filter((locale) => locale !== sourceGuide.locale)
  const translations: GuideArticle[] = []

  for (const targetLocale of targetLocales) {
    try {
      // Check if translation already exists
      const existingTranslation = await loadGuide(`${sourceGuide.slug}-${targetLocale}`)
      if (existingTranslation && existingTranslation.locale === targetLocale && !forceUpdate) {
        console.log(`[pSEO] Translation to ${targetLocale} already exists, skipping...`)
        translations.push(existingTranslation)
        continue
      }

      const translated = await translateGuideToLocale(sourceGuide, targetLocale)
      // Save with locale-specific slug to avoid conflicts
      translated.slug = `${sourceGuide.slug}-${targetLocale}`
      await saveGuideDraft(translated)
      translations.push(translated)
      console.log(`[pSEO] Translation to ${targetLocale} completed`)
    } catch (error) {
      console.error(`[pSEO] Failed to translate to ${targetLocale}:`, error)
      // Continue with other locales even if one fails
    }
  }

  return translations
}

