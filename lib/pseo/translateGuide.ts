import type { GuideArticle } from './types'
import { saveGuideDraft, loadGuide } from './storage'
import { generateMainImage, generateSectionImage } from './imageGeneration'
import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

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

// Regex for extracting markdown links - defined at module level to avoid scope issues
const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g

/**
 * Extract markdown links from text
 */
function extractLinks(text: string): Array<{ original: string; text: string; url: string }> {
  const links: Array<{ original: string; text: string; url: string }> = []
  let match
  // Reset regex lastIndex to avoid issues with global regex
  linkRegex.lastIndex = 0
  while ((match = linkRegex.exec(text)) !== null) {
    links.push({
      original: match[0],
      text: match[1],
      url: match[2]
    })
  }
  return links
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
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const sourceLocaleName = LOCALE_NAMES[sourceGuide.locale] || sourceGuide.locale
  const targetLocaleName = LOCALE_NAMES[targetLocale] || targetLocale

  const prompt = `You are a professional translator specializing in real estate and legal content for Mexican property markets.

Translate the following guide from ${sourceLocaleName} to ${targetLocaleName}. Maintain the exact same structure, tone (third-person), and technical accuracy. Preserve all numbers, percentages, and data points exactly as they appear.

CRITICAL: Output ONLY valid JSON. Do not wrap the response in markdown code blocks, do not add any explanation text, and do not use triple backticks. Return pure JSON that can be parsed directly.

IMPORTANT ABOUT LINKS:
- The source text contains markdown-style links in the format [link text](url)
- You MUST preserve these links in your translation using the EXACT same format: [translated link text](original url)
- Translate ONLY the link text inside the square brackets, but keep the URL inside parentheses EXACTLY as it appears in the source
- Example: If source has "Websites like [Inmuebles24](https://www.inmuebles24.com) and [Vivanuncios](https://www.vivanuncios.com.mx)", the translation should have "[Inmuebles24](https://www.inmuebles24.com)" and "[Vivanuncios](https://www.vivanuncios.com.mx)" (you may translate the link text if the website name should be translated, but keep the URL unchanged)
- DO NOT remove the markdown link format, DO NOT convert links to plain text, and DO NOT change the URLs

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
- Data point labels MUST be translated
- Data point values: If a value contains descriptive text (e.g., "5-10% of the purchase price", "Approximately $500 - $1,000 annually"), translate the descriptive parts while preserving the numbers, percentages, and currency amounts. For example: "5-10% of the purchase price" should become "5-10% del precio de compra" (Spanish) or "购买价格的5-10%" (Chinese). If a value is only a number or percentage without descriptive text, keep it unchanged.
- LINKS: CRITICAL - You MUST preserve all markdown-style links [text](url) in the translated text. Translate the link text but keep the URL exactly as it appears. If the source has "[Inmuebles24](https://www.inmuebles24.com)", your translation MUST include "[Inmuebles24](https://www.inmuebles24.com)" or translate "Inmuebles24" to the target language while keeping "(https://www.inmuebles24.com)" unchanged.
- Note: Tags will be handled separately, do not include them in the JSON response`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: MODEL })
    
    const fullPrompt = `You are a professional translator specializing in real estate and legal content for Mexican property markets.\n\n${prompt}`
    
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    let content = response.text()
    
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
      
      // Post-process to ensure markdown links are preserved
      // The AI might have removed markdown format, so we restore it from source
      const restoreLinks = (sourceText: string, translatedText: string): string => {
        const sourceLinks = extractLinks(sourceText)
        if (sourceLinks.length === 0) {
          return translatedText // No links to restore
        }
        
        // Check if translated text already has markdown links
        linkRegex.lastIndex = 0
        const hasLinks = linkRegex.test(translatedText)
        if (hasLinks) {
          return translatedText // Links are already present
        }
        
        // Restore links by finding the link text in translated text
        // For proper nouns like "Inmuebles24" or "Vivanuncios", they might not be translated
        let restored = translatedText
        for (const link of sourceLinks) {
          // For brand names, try exact match first (case-insensitive)
          const escapedText = link.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const exactMatch = new RegExp(`\\b${escapedText}\\b`, 'gi')
          
          // Check if the text exists in the translated text and is not already a link
          let matchFound = false
          exactMatch.lastIndex = 0
          let match: RegExpExecArray | null
          
          while ((match = exactMatch.exec(restored)) !== null) {
            const matchIndex = match.index
            const matchText = match[0]
            
            // Check if this match is already inside a markdown link
            // Look at a window around the match
            const windowStart = Math.max(0, matchIndex - 100)
            const windowEnd = Math.min(restored.length, matchIndex + matchText.length + 100)
            const window = restored.substring(windowStart, windowEnd)
            const relativeIndex = matchIndex - windowStart
            
            // Check if there's an unclosed '[' before this position
            const beforeMatch = window.substring(0, relativeIndex)
            const openBrackets = (beforeMatch.match(/\[/g) || []).length
            const closeBrackets = (beforeMatch.match(/\]/g) || []).length
            const hasOpenBracket = openBrackets > closeBrackets
            
            // Check if there's an unopened ')' after this position
            const afterMatch = window.substring(relativeIndex + matchText.length)
            const openParens = (afterMatch.match(/\(/g) || []).length
            const closeParens = (afterMatch.match(/\)/g) || []).length
            const hasCloseParen = closeParens > openParens
            
            // If we're already inside a link, skip this match
            if (hasOpenBracket || hasCloseParen) {
              continue
            }
            
            // Replace this occurrence with markdown link
            const before = restored.substring(0, matchIndex)
            const after = restored.substring(matchIndex + matchText.length)
            restored = before + `[${matchText}](${link.url})` + after
            matchFound = true
            break // Only replace the first valid occurrence
          }
          
          if (!matchFound) {
            // If exact match fails, the link text might have been translated
            // Log a warning but don't fail
            console.warn(`[pSEO] Could not find link text "${link.text}" in translated text. Expected markdown link may be missing.`)
          }
        }
        
        return restored
      }
      
      // Restore links in paragraphs
      parsed.sections = parsed.sections.map((section, sectionIdx) => {
        const sourceSection = sourceGuide.sections[sectionIdx]
        if (!sourceSection) return section
        
        return {
          ...section,
          paragraphs: section.paragraphs.map((para, paraIdx) => {
            const sourcePara = sourceSection.paragraphs[paraIdx]
            if (!sourcePara) return para
            return restoreLinks(sourcePara, para)
          }),
          bullets: section.bullets?.map((bullet, bulletIdx) => {
            const sourceBullet = sourceSection.bullets?.[bulletIdx]
            if (!sourceBullet) return bullet
            return restoreLinks(sourceBullet, bullet)
          }),
          dataPoints: section.dataPoints
        }
      })
      
      // Restore links in FAQ answers
      if (parsed.faq && sourceGuide.faq) {
        parsed.faq = parsed.faq.map((faq, faqIdx) => {
          const sourceFaq = sourceGuide.faq?.[faqIdx]
          if (!sourceFaq) return faq
          
          return {
            question: faq.question,
            answer: restoreLinks(sourceFaq.answer, faq.answer)
          }
        })
      }
      
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
  } catch (apiError) {
    // Handle Gemini API errors
    if (apiError instanceof Error) {
      throw new Error(`Translation failed: ${apiError.message}`)
    }
    throw new Error(`Translation failed: ${String(apiError)}`)
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

