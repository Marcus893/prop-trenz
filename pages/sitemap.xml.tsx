import { GetServerSideProps } from 'next'
import { listPublishedGuides } from '@/lib/pseo/storage'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://proptrenz.com'

function generateSiteMap(guides: Array<{ slug: string; locale: string; updatedAt: string }>) {
  const staticPages = [
    { url: '', changefreq: 'daily', priority: '1.0' },
    { url: '/charts', changefreq: 'weekly', priority: '0.8' },
    { url: '/map', changefreq: 'weekly', priority: '0.8' },
    { url: '/calculators', changefreq: 'monthly', priority: '0.9' },
    { url: '/calculators/closing-cost', changefreq: 'monthly', priority: '0.8' },
    { url: '/calculators/ownership-cost', changefreq: 'monthly', priority: '0.8' },
    { url: '/calculators/seller-cost', changefreq: 'monthly', priority: '0.8' },
    { url: '/guides', changefreq: 'weekly', priority: '0.9' }
  ]

  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
           xmlns:xhtml="http://www.w3.org/1999/xhtml">
     ${staticPages
       .map(
         (page) => `
       <url>
           <loc>${SITE_URL}${page.url}</loc>
           <changefreq>${page.changefreq}</changefreq>
           <priority>${page.priority}</priority>
       </url>
     `
       )
       .join('')}
     ${guides
       .map(
         (guide) => `
       <url>
           <loc>${SITE_URL}/guides/${guide.slug}</loc>
           <lastmod>${new Date(guide.updatedAt).toISOString()}</lastmod>
           <changefreq>monthly</changefreq>
           <priority>0.7</priority>
           <xhtml:link rel="alternate" hreflang="${guide.locale}" href="${SITE_URL}/guides/${guide.slug}" />
       </url>
     `
       )
       .join('')}
   </urlset>
 `
}

function SiteMap() {
  // getServerSideProps will do the heavy lifting
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Fetch all published guides
  const enGuides = await listPublishedGuides('en')
  const esGuides = await listPublishedGuides('es')
  const zhGuides = await listPublishedGuides('zh')

  const allGuides = [
    ...enGuides.map((g) => ({ slug: g.slug, locale: 'en', updatedAt: g.updatedAt })),
    ...esGuides.map((g) => ({ slug: g.slug, locale: 'es', updatedAt: g.updatedAt })),
    ...zhGuides.map((g) => ({ slug: g.slug, locale: 'zh', updatedAt: g.updatedAt }))
  ]

  // Generate the XML sitemap with the guides data
  const sitemap = generateSiteMap(allGuides)

  res.setHeader('Content-Type', 'text/xml')
  res.write(sitemap)
  res.end()

  return {
    props: {}
  }
}

export default SiteMap

