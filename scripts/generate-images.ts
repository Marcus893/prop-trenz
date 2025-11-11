// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local first, then fallback to .env
const rootDir = process.cwd()
config({ path: resolve(rootDir, '.env.local') })
config({ path: resolve(rootDir, '.env') })

import { loadGuide, saveGuideDraft } from '../lib/pseo/storage'
import { generateMainImage, generateSectionImage } from '../lib/pseo/imageGeneration'
import type { GuideArticle } from '../lib/pseo/types'

function parseArg(key: string, fallback?: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`--${key}=`))
  if (!match) {
    return fallback
  }
  return match.split('=').slice(1).join('=')
}

async function main() {
  const slug = parseArg('slug')
  const mainOnly = parseArg('main-only') === 'true'

  if (!slug) {
    console.error('Usage: npm run generate-images -- --slug=top-10-places-with-the-highest-ROI-in-Mexico [--main-only=true]')
    console.error('  --main-only: Only generate the main image, skip section images')
    process.exit(1)
  }

  console.log(`[pSEO] Loading guide "${slug}"...`)
  const guide = await loadGuide(slug)
  
  if (!guide) {
    console.error(`[pSEO] Guide not found: ${slug}`)
    process.exit(1)
  }

  console.log(`[pSEO] Generating images for guide "${slug}"...`)

  // Check if guide has image prompts (from draft generation)
  // If not, we can't generate images without prompts
  const hasMainImagePrompt = guide.mainImageUrl === undefined
  const sectionsNeedingImages = guide.sections.filter((section) => !section.imageUrl && section.heading)

  if (!hasMainImagePrompt && sectionsNeedingImages.length === 0) {
    console.log('[pSEO] No images needed - guide already has all images or no image prompts available')
    return
  }

  let updatedGuide: GuideArticle = { ...guide }

  // Generate main image if missing
  if (!guide.mainImageUrl) {
    try {
      console.log('[pSEO] Generating main image...')
      // Use title as prompt if we don't have a stored prompt
      const prompt = `${guide.title}. Professional real estate photography style, high quality, modern, clean composition, suitable for blog header image.`
      const mainImage = await generateMainImage(prompt)
      updatedGuide.mainImageUrl = mainImage.url
      updatedGuide.mainImageAlt = guide.title
      console.log('[pSEO] Main image generated successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[pSEO] Main image generation failed: ${errorMessage}`)
      if (errorMessage.includes('billing') || errorMessage.includes('limit')) {
        console.error('[pSEO] Billing limit reached. Please update your OpenAI account billing settings.')
      }
      return
    }
  } else {
    console.log('[pSEO] Main image already exists, skipping...')
  }

  // Generate section images if not main-only
  if (!mainOnly && sectionsNeedingImages.length > 0) {
    console.log(`[pSEO] Generating ${sectionsNeedingImages.length} section image(s)...`)
    
    const updatedSections = await Promise.all(
      guide.sections.map(async (section) => {
        if (section.imageUrl) {
          return section
        }

        if (!section.heading) {
          return section
        }

        try {
          const prompt = `Infographic-style illustration: ${section.heading}. Context: ${guide.title}. Clean, professional, educational style suitable for real estate guide.`
          const sectionImage = await generateSectionImage(section.heading, guide.title, prompt)
          if (sectionImage) {
            console.log(`[pSEO] Generated image for section: ${section.heading}`)
            return {
              ...section,
              imageUrl: sectionImage.url,
              imageAlt: section.heading
            }
          }
        } catch (error) {
          console.warn(`[pSEO] Section image generation failed for "${section.heading}"`)
        }

        return section
      })
    )

    updatedGuide.sections = updatedSections
  }

  // Save updated guide
  await saveGuideDraft(updatedGuide)
  console.log(`[pSEO] Guide updated with images: ${slug}`)
}

main().catch((error) => {
  console.error('[pSEO] Image generation failed', error)
  process.exit(1)
})

