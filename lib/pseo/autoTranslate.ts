import type { GuideArticle } from './types'
import { loadGuide, saveGuideDraft } from './storage'
import { generateAllTranslations } from './translateGuide'

/**
 * Automatically generates translations when a guide is published.
 * Call this after updating a guide's status to 'published'.
 */
export async function autoTranslateOnPublish(guide: GuideArticle): Promise<void> {
  // Only auto-translate if the guide is being published
  if (guide.status !== 'published') {
    return
  }

  // Check if this is a base guide (not a translation)
  // Base guides don't have locale suffix in their slug
  const isBaseGuide = !guide.slug.match(/-en$|-es$|-zh$/)

  if (!isBaseGuide) {
    // This is already a translation, don't auto-translate
    return
  }

  console.log(`[pSEO] Guide "${guide.slug}" published, generating translations...`)

  try {
    const translations = await generateAllTranslations(guide, false)
    console.log(`[pSEO] Generated ${translations.length} translation(s) for "${guide.slug}"`)
  } catch (error) {
    console.error(`[pSEO] Failed to auto-translate guide "${guide.slug}":`, error)
    // Don't throw - we don't want to block publishing if translation fails
  }
}

/**
 * Manually trigger translation generation for a guide.
 * Useful for re-translating after content updates.
 */
export async function regenerateTranslations(slug: string): Promise<GuideArticle[]> {
  // Try to load the base guide (without locale suffix)
  const baseSlug = slug.replace(/-en$|-es$|-zh$/, '')
  const baseGuide = await loadGuide(baseSlug)

  if (!baseGuide) {
    throw new Error(`Base guide not found: ${baseSlug}`)
  }

  if (baseGuide.status !== 'published') {
    throw new Error(`Base guide must be published before generating translations: ${baseSlug}`)
  }

  return await generateAllTranslations(baseGuide)
}

