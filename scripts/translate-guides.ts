// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local first, then fallback to .env
const rootDir = process.cwd()
config({ path: resolve(rootDir, '.env.local') })
config({ path: resolve(rootDir, '.env') })

import { listGuideFiles, loadGuide } from '../lib/pseo/storage'
import { generateAllTranslations } from '../lib/pseo/translateGuide'

const SUPPORTED_LOCALES = ['en', 'es', 'zh']

async function main() {
  const slugArg = process.argv.find((arg) => arg.startsWith('--slug='))
  const slug = slugArg ? slugArg.split('=')[1] : undefined
  const forceUpdate = process.argv.includes('--force')

  if (slug) {
    // Translate a specific guide
    console.log(`[pSEO] Generating translations for guide "${slug}"...`)
    if (forceUpdate) {
      console.log('[pSEO] Force update enabled - will regenerate existing translations')
    }
    
    const guide = await loadGuide(slug)
    
    if (!guide) {
      console.error(`[pSEO] Guide not found: ${slug}`)
      process.exit(1)
    }

    if (guide.status !== 'published') {
      console.error(`[pSEO] Guide "${slug}" is not published. Please publish it first.`)
      process.exit(1)
    }

    // Check if this is a base guide (not a translation)
    const isBaseGuide = !guide.slug.match(/-en$|-es$|-zh$/)
    if (!isBaseGuide) {
      console.error(`[pSEO] "${slug}" is already a translation. Please use the base guide slug.`)
      process.exit(1)
    }

    try {
      const translations = await generateAllTranslations(guide, forceUpdate)
      console.log(`[pSEO] Generated ${translations.length} translation(s) for "${slug}"`)
    } catch (error) {
      console.error(`[pSEO] Failed to generate translations:`, error)
      process.exit(1)
    }
  } else {
    // Find all published guides and generate missing translations
    console.log('[pSEO] Scanning for published guides with missing translations...')
    
    const files = await listGuideFiles()
    const baseSlugs = new Set<string>()
    
    // Extract base slugs (remove locale suffixes)
    files.forEach((file) => {
      const slug = file.replace(/\.json$/, '')
      const baseSlug = slug.replace(/-en$|-es$|-zh$/, '')
      baseSlugs.add(baseSlug)
    })

    let translatedCount = 0
    let skippedCount = 0
    let errorCount = 0

    // Convert Set to Array to avoid TypeScript iteration issues
    const baseSlugsArray = Array.from(baseSlugs)
    for (const baseSlug of baseSlugsArray) {
      // Try to load the base guide (prefer English, but accept any locale)
      let baseGuide = await loadGuide(baseSlug, 'en')
      if (!baseGuide) {
        // Try other locales
        for (const locale of SUPPORTED_LOCALES) {
          baseGuide = await loadGuide(baseSlug, locale)
          if (baseGuide) break
        }
      }

      if (!baseGuide) {
        console.warn(`[pSEO] Could not load base guide: ${baseSlug}`)
        continue
      }

      if (baseGuide.status !== 'published') {
        skippedCount++
        continue
      }

      // Check which translations already exist
      const existingLocales = new Set<string>()
      for (const locale of SUPPORTED_LOCALES) {
        const translatedGuide = await loadGuide(baseSlug, locale)
        if (translatedGuide && translatedGuide.status === 'published') {
          existingLocales.add(locale)
        }
      }

      // Find missing translations
      const missingLocales = SUPPORTED_LOCALES.filter(
        (locale) => !existingLocales.has(locale)
      )

      if (missingLocales.length === 0) {
        console.log(`[pSEO] ✓ "${baseSlug}" already has all translations`)
        skippedCount++
        continue
      }

      console.log(
        `[pSEO] "${baseSlug}" is missing translations for: ${missingLocales.join(', ')}`
      )

      try {
        const translations = await generateAllTranslations(baseGuide, forceUpdate)
        console.log(
          `[pSEO] ✓ Generated ${translations.length} translation(s) for "${baseSlug}"`
        )
        translatedCount += translations.length
      } catch (error) {
        console.error(`[pSEO] ✗ Failed to translate "${baseSlug}":`, error)
        errorCount++
      }
    }

    console.log('\n[pSEO] Translation summary:')
    console.log(`  ✓ Translated: ${translatedCount}`)
    console.log(`  ⊘ Skipped: ${skippedCount}`)
    console.log(`  ✗ Errors: ${errorCount}`)
  }
}

main().catch((error) => {
  console.error('[pSEO] Translation failed', error)
  process.exit(1)
})

