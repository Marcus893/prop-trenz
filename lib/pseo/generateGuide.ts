import type { GenerateGuideParams, GuideArticle } from './types'
import { generateGuideDraft } from './openai'
import { saveGuideDraft } from './storage'
import { generateMainImage, generateSectionImage } from './imageGeneration'

const DEFAULT_TAGS = ['mexico-real-estate', 'market-intelligence']

export async function generateGuide(params: GenerateGuideParams): Promise<GuideArticle> {
  const accessLevel = params.accessLevel ?? 'public'

  console.log('[pSEO] Generating guide content...')
  const draft = await generateGuideDraft(params)
  
  // Determine tags: prefer AI-generated tags, then provided tags, then defaults
  const tags = draft.tags && draft.tags.length > 0 
    ? draft.tags 
    : (params.tags && params.tags.length > 0 ? params.tags : DEFAULT_TAGS)

  // Generate images (unless skipped)
  let mainImageUrl: string | undefined
  let mainImageAlt: string | undefined
  let sectionsWithImages = draft.sections

  if (!params.skipImages) {
    // Generate main image
    if (draft.mainImagePrompt) {
      try {
        console.log('[pSEO] Generating main image...')
        const mainImage = await generateMainImage(draft.mainImagePrompt)
        mainImageUrl = mainImage.url
        mainImageAlt = draft.title
        console.log('[pSEO] Main image generated successfully')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('billing') || errorMessage.includes('limit')) {
          console.warn('[pSEO] Image generation skipped due to billing/limit issue. Guide will be saved without images.')
          console.warn('[pSEO] You can generate images later or use --skip-images=true to skip image generation entirely.')
        } else {
          console.warn('[pSEO] Main image generation failed, continuing without image:', errorMessage)
        }
      }
    }

    // Generate section images
    sectionsWithImages = await Promise.all(
      draft.sections.map(async (section) => {
        if (!section.imagePrompt) {
          return section
        }

        try {
          const sectionImage = await generateSectionImage(section.heading, params.topic, section.imagePrompt)
          if (sectionImage) {
            return {
              ...section,
              imageUrl: sectionImage.url,
              imageAlt: section.heading
            }
          }
        } catch (error) {
          // Silently skip section images if they fail
        }

        return section
      })
    )
  } else {
    console.log('[pSEO] Skipping image generation as requested')
  }

  const article: GuideArticle = {
    slug: params.slug,
    locale: params.locale,
    status: 'draft',
    accessLevel,
    tags,
    updatedAt: new Date().toISOString(),
    metaDescription: draft.metaDescription,
    metaTitle: draft.metaTitle,
    title: draft.title,
    excerpt: draft.excerpt,
    heroKicker: draft.heroKicker,
    mainImageUrl,
    mainImageAlt,
    sections: sectionsWithImages,
    faq: draft.faq
  }

  await saveGuideDraft(article)
  console.log('[pSEO] Guide generation complete:', article.slug)
  return article
}
