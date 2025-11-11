// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local first, then fallback to .env
const rootDir = process.cwd()
config({ path: resolve(rootDir, '.env.local') })
config({ path: resolve(rootDir, '.env') })

import { listGuideFiles, loadGuide, saveGuideDraft } from '../lib/pseo/storage'

const SUPPORTED_LOCALES = ['en', 'es', 'zh']

async function main() {
  console.log('[pSEO] Updating translations to published status if source guide is published...')
  
  const files = await listGuideFiles()
  let updatedCount = 0
  let skippedCount = 0

  // Process all files
  for (const file of files) {
    const slug = file.replace(/\.json$/, '')
    
    // Check if this is a translation (has locale suffix)
    const localeMatch = slug.match(/-(en|es|zh)$/)
    if (!localeMatch) {
      // This is a base guide, skip
      continue
    }

    const locale = localeMatch[1]
    const baseSlug = slug.replace(/-(en|es|zh)$/, '')
    
    // Load the translation
    const translation = await loadGuide(slug)
    if (!translation || translation.locale !== locale) {
      continue
    }

    // Skip if already published
    if (translation.status === 'published') {
      skippedCount++
      continue
    }

    // Find the base guide (try without locale suffix first)
    let baseGuide = await loadGuide(baseSlug)
    
    // If not found, try with English locale
    if (!baseGuide) {
      baseGuide = await loadGuide(baseSlug, 'en')
    }

    if (!baseGuide) {
      console.warn(`[pSEO] Could not find base guide for translation: ${slug}`)
      skippedCount++
      continue
    }

    // Only update if base guide is published
    if (baseGuide.status === 'published') {
      const updated = {
        ...translation,
        status: 'published' as const,
        updatedAt: new Date().toISOString()
      }
      await saveGuideDraft(updated)
      console.log(`[pSEO] ✓ Published translation: ${slug}`)
      updatedCount++
    } else {
      skippedCount++
    }
  }

  console.log('\n[pSEO] Update summary:')
  console.log(`  ✓ Updated: ${updatedCount}`)
  console.log(`  ⊘ Skipped: ${skippedCount}`)
}

main().catch((error) => {
  console.error('[pSEO] Update failed', error)
  process.exit(1)
})

