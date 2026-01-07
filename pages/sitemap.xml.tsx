import { GetServerSideProps } from 'next'
import { listGuideFiles, loadGuide } from '@/lib/pseo/storage'
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

// Helper to generate hreflang links for a guide group (uses per-locale slugs)
function generateHreflangLinksForGroup(localesMap: Record<string, string>): string {
  const locales = Object.keys(localesMap)
  const links = locales.map((locale) => {
    const slug = localesMap[locale]
    return `<xhtml:link rel=\"alternate\" hreflang=\"${locale}\" href=\"${getLocalizedUrl(`/guides/${slug}`, locale)}\" />`
  })
  // Add x-default pointing to English (or first available)
  const defaultLocale = locales.includes('en') ? 'en' : locales[0]
  const defaultSlug = localesMap[defaultLocale]
  links.push(`<xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"${getLocalizedUrl(`/guides/${defaultSlug}`, defaultLocale)}\" />`)
  return links.join('\n           ')
}

interface GuideGroup {
  groupKey: string
  updatedAt: string
  locales: Record<string, string> // locale -> localized slug
}

function generateSiteMap(
  groups: GuideGroup[],
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
    { url: '/insights', changefreq: 'weekly', priority: '0.7' },
    { url: '/privacy', changefreq: 'yearly', priority: '0.3' },
    { url: '/terms', changefreq: 'yearly', priority: '0.3' }
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

  // Generate guide entries - one entry per localized slug with proper hreflang across the group's locales
  const guideEntries = groups.flatMap((group) => {
    // Build the list of locales present in this group
    const availableLocales = Object.keys(group.locales)
    return availableLocales.map((locale) => {
      const slug = group.locales[locale]
      return `
       <url>
           <loc>${getLocalizedUrl(`/guides/${slug}`, locale)}</loc>
           <lastmod>${new Date(group.updatedAt).toISOString()}</lastmod>
           <changefreq>monthly</changefreq>
           <priority>0.7</priority>
           ${generateHreflangLinksForGroup(group.locales)}
       </url>`
    })
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
  // Read all guide files and group them by a stable group key derived from mainImageUrl or slug
  const files = await listGuideFiles()

  const groupMap = new Map<string, { groupKey: string; updatedAt: string; locales: Record<string, string> }>()

  const getGroupKey = (g: any) => {
    if (g.mainImageUrl) {
      const m = String(g.mainImageUrl).match(/\/blogs\/([^\/\.]*)/)
      if (m && m[1]) return m[1]
    }
    return String(g.slug).replace(/-en$|-es$|-zh$/i, '')
  }

  for (const file of files) {
    const fileSlug = file.replace(/\.json$/, '')
    const g = await loadGuide(fileSlug)
    if (!g || g.status !== 'published') continue

    const key = getGroupKey(g)
    const existing = groupMap.get(key)
    if (existing) {
      existing.locales[g.locale] = g.slug
      if (new Date(g.updatedAt) > new Date(existing.updatedAt)) {
        existing.updatedAt = g.updatedAt
      }
    } else {
      groupMap.set(key, { groupKey: key, updatedAt: g.updatedAt, locales: { [g.locale]: g.slug } })
    }
  }

  const allGuides = Array.from(groupMap.values())

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

