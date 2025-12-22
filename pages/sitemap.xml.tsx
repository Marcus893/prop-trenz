import { GetServerSideProps } from 'next'
import { listPublishedGuides } from '@/lib/pseo/storage'
import { listLocationPages, loadLocationPage } from '@/lib/locations/storage'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://proptrenz.com'
const LOCALES = ['en', 'es', 'zh'] as const

// Helper to generate URL with locale prefix
function getLocalizedUrl(path: string, locale: string): string {
  if (locale === 'en') {
    return `${SITE_URL}${path}`
  }
  return `${SITE_URL}/${locale}${path}`
}

// Helper to generate hreflang links for a page
function generateHreflangLinks(path: string, availableLocales: string[]): string {
  const links = availableLocales.map(
    (locale) => `<xhtml:link rel="alternate" hreflang="${locale}" href="${getLocalizedUrl(path, locale)}" />`
  )
  // Add x-default pointing to English (or first available)
  const defaultLocale = availableLocales.includes('en') ? 'en' : availableLocales[0]
  links.push(`<xhtml:link rel="alternate" hreflang="x-default" href="${getLocalizedUrl(path, defaultLocale)}" />`)
  return links.join('\n           ')
}

interface GuideWithLocales {
  slug: string
  updatedAt: string
  availableLocales: string[]
}

function generateSiteMap(
  guides: GuideWithLocales[],
  locationPages: Array<{ slug: string; updatedAt: string }>
) {
  const staticPages = [
    { url: '', changefreq: 'daily', priority: '1.0' },
    { url: '/charts', changefreq: 'weekly', priority: '0.8' },
    { url: '/map', changefreq: 'weekly', priority: '0.8' },
    { url: '/rent-map', changefreq: 'weekly', priority: '0.8' },
    { url: '/calculators', changefreq: 'monthly', priority: '0.9' },
    { url: '/calculators/closing-cost', changefreq: 'monthly', priority: '0.8' },
    { url: '/calculators/ownership-cost', changefreq: 'monthly', priority: '0.8' },
    { url: '/calculators/seller-cost', changefreq: 'monthly', priority: '0.8' },
    { url: '/calculators/roi', changefreq: 'monthly', priority: '0.8' },
    { url: '/guides', changefreq: 'weekly', priority: '0.9' },
    { url: '/insights', changefreq: 'weekly', priority: '0.7' }
  ]

  // Generate static page entries for all locales with proper hreflang
  const staticPageEntries = staticPages.flatMap((page) => {
    return LOCALES.map((locale) => `
       <url>
           <loc>${getLocalizedUrl(page.url, locale)}</loc>
           <changefreq>${page.changefreq}</changefreq>
           <priority>${page.priority}</priority>
           ${generateHreflangLinks(page.url, [...LOCALES])}
       </url>`)
  })

  // Generate guide entries - one entry per locale version with proper hreflang
  const guideEntries = guides.flatMap((guide) => {
    return guide.availableLocales.map((locale) => `
       <url>
           <loc>${getLocalizedUrl(`/guides/${guide.slug}`, locale)}</loc>
           <lastmod>${new Date(guide.updatedAt).toISOString()}</lastmod>
           <changefreq>monthly</changefreq>
           <priority>0.7</priority>
           ${generateHreflangLinks(`/guides/${guide.slug}`, guide.availableLocales)}
       </url>`)
  })

  // Generate location page entries (these may not have translations)
  const locationEntries = locationPages.map(
    (location) => `
       <url>
           <loc>${SITE_URL}/${location.slug}</loc>
           <lastmod>${new Date(location.updatedAt).toISOString()}</lastmod>
           <changefreq>monthly</changefreq>
           <priority>0.8</priority>
       </url>`
  )

  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
           xmlns:xhtml="http://www.w3.org/1999/xhtml">
     ${staticPageEntries.join('')}
     ${guideEntries.join('')}
     ${locationEntries.join('')}
   </urlset>
 `
}

function SiteMap() {
  // getServerSideProps will do the heavy lifting
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Fetch all published guides for each locale
  const enGuides = await listPublishedGuides('en')
  const esGuides = await listPublishedGuides('es')
  const zhGuides = await listPublishedGuides('zh')

  // Build a map of unique guide slugs with their available locales
  const guideMap = new Map<string, { slug: string; updatedAt: string; availableLocales: string[] }>()

  // Process English guides
  for (const g of enGuides) {
    guideMap.set(g.slug, {
      slug: g.slug,
      updatedAt: g.updatedAt,
      availableLocales: ['en']
    })
  }

  // Process Spanish guides
  for (const g of esGuides) {
    const existing = guideMap.get(g.slug)
    if (existing) {
      existing.availableLocales.push('es')
      // Use most recent updatedAt
      if (new Date(g.updatedAt) > new Date(existing.updatedAt)) {
        existing.updatedAt = g.updatedAt
      }
    } else {
      guideMap.set(g.slug, {
        slug: g.slug,
        updatedAt: g.updatedAt,
        availableLocales: ['es']
      })
    }
  }

  // Process Chinese guides
  for (const g of zhGuides) {
    const existing = guideMap.get(g.slug)
    if (existing) {
      existing.availableLocales.push('zh')
      // Use most recent updatedAt
      if (new Date(g.updatedAt) > new Date(existing.updatedAt)) {
        existing.updatedAt = g.updatedAt
      }
    } else {
      guideMap.set(g.slug, {
        slug: g.slug,
        updatedAt: g.updatedAt,
        availableLocales: ['zh']
      })
    }
  }

  const allGuides = Array.from(guideMap.values())

  // Fetch all location pages
  const locationSlugs = listLocationPages()
  const locationPages = locationSlugs
    .map((slug) => {
      const page = loadLocationPage(slug)
      return page ? { slug: page.slug, updatedAt: page.updatedAt } : null
    })
    .filter((page): page is { slug: string; updatedAt: string } => page !== null)

  // Generate the XML sitemap with the guides and location pages data
  const sitemap = generateSiteMap(allGuides, locationPages)

  res.setHeader('Content-Type', 'text/xml')
  // Cache for 1 hour, stale-while-revalidate for 1 day
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400')
  res.write(sitemap)
  res.end()

  return {
    props: {}
  }
}

export default SiteMap

