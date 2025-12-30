import { promises as fs } from 'fs'
import path from 'path'
import type { GuideArticle } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'guides')

async function ensureDirectory() {
  await fs.mkdir(CONTENT_DIR, { recursive: true })
}

export async function listGuideFiles(): Promise<string[]> {
  try {
    await ensureDirectory()
    const files = await fs.readdir(CONTENT_DIR)
    return files.filter((file) => file.endsWith('.json'))
  } catch (error) {
    console.error('[pSEO] Failed to read guides directory', error)
    return []
  }
}

export async function loadGuide(slug: string, locale?: string): Promise<GuideArticle | null> {
  try {
    await ensureDirectory()
    
    // Try locale-specific file first if locale is provided
    if (locale) {
      const localeSpecificPath = path.join(CONTENT_DIR, `${slug}-${locale}.json`)
      try {
        const file = await fs.readFile(localeSpecificPath, 'utf-8')
        const parsed = JSON.parse(file) as GuideArticle
        if (parsed.locale === locale) {
          return parsed
        }
      } catch {
        // Fall through to base slug
      }
    }
    
    // Try base slug
    const filePath = path.join(CONTENT_DIR, `${slug}.json`)
    const file = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(file) as GuideArticle
    
    // If locale was specified, only return if it matches
    if (locale && parsed.locale !== locale) {
      return null
    }
    
    return parsed
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    console.error('[pSEO] Failed to load guide', slug, error)
    return null
  }
}

export async function listPublishedGuides(locale: string): Promise<GuideArticle[]> {
  const files = await listGuideFiles()
  const guides: GuideArticle[] = []
  const seenSlugs = new Set<string>()
  
  for (const file of files) {
    const fullSlug = file.replace(/\.json$/, '')
    
    // Extract base slug (remove locale suffix if present)
    const baseSlug = fullSlug.replace(/-en$|-es$|-zh$/, '')
    
    // Skip if we've already processed this base slug for this locale
    const key = `${baseSlug}-${locale}`
    if (seenSlugs.has(key)) {
      continue
    }
    
    const guide = await loadGuide(fullSlug, locale)
    if (guide && guide.status === 'published' && guide.locale === locale) {
      guides.push(guide)
      seenSlugs.add(key)
    }
  }
  guides.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))
  return guides
}

export async function saveGuideDraft(guide: GuideArticle): Promise<void> {
  await ensureDirectory()
  
  // If slug already has locale suffix, use it; otherwise add it for translations
  const isBaseSlug = !guide.slug.match(/-en$|-es$|-zh$/)
  const fileName = isBaseSlug && guide.locale !== 'en' 
    ? `${guide.slug}-${guide.locale}.json`
    : `${guide.slug}.json`
  
  const filePath = path.join(CONTENT_DIR, fileName)
  await fs.writeFile(filePath, JSON.stringify(guide, null, 2), 'utf-8')
}

/**
 * Find related guides based on shared tags
 */
export async function findRelatedGuides(
  currentGuide: GuideArticle,
  limit: number = 3
): Promise<Array<{
  slug: string
  title: string
  excerpt: string // Always provided (falls back to metaDescription which is required)
  mainImageUrl?: string
  mainImageAlt?: string
}>> {
  const allGuides = await listPublishedGuides(currentGuide.locale)
  
  // Filter out the current guide and calculate similarity score
  const relatedGuides = allGuides
    .filter((guide) => {
      // Remove locale suffix for comparison
      const currentBaseSlug = currentGuide.slug.replace(/-en$|-es$|-zh$/, '')
      const guideBaseSlug = guide.slug.replace(/-en$|-es$|-zh$/, '')
      return guideBaseSlug !== currentBaseSlug && guide.locale === currentGuide.locale
    })
    .map((guide) => {
      // Calculate similarity based on shared tags
      const currentTags = new Set(currentGuide.tags || [])
      const guideTags = new Set(guide.tags || [])
      // Use Array.from to avoid TypeScript iteration issues
      const sharedTags = Array.from(currentTags).filter((tag) => guideTags.has(tag))
      const similarityScore = sharedTags.length

      return {
        guide,
        similarityScore,
        sharedTags
      }
    })
    .filter((item) => item.similarityScore > 0) // Only include guides with at least one shared tag
    .sort((a, b) => b.similarityScore - a.similarityScore) // Sort by similarity (most similar first)
    .slice(0, limit) // Take top N related guides
    .map((item) => {
      const baseSlug = item.guide.slug.replace(/-en$|-es$|-zh$/, '') // Return base slug for routing
      // metaDescription is required, so this will always be a string
      const excerpt = item.guide.excerpt || item.guide.metaDescription
      
      return {
        slug: item.guide.slug,
        title: item.guide.title,
        excerpt, // Always a string (falls back to metaDescription which is required)
        mainImageUrl: item.guide.mainImageUrl,
        mainImageAlt: item.guide.mainImageAlt
      }
    })

  return relatedGuides
}
