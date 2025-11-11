import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import type { GetStaticPaths, GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { Layout } from '@/components/Layout'
import { loadGuide, listGuideFiles, findRelatedGuides } from '@/lib/pseo/storage'
import type { GuideArticle } from '@/lib/pseo/types'
import { ProtectedContent } from '@/components/content/ProtectedContent'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'
import { parseLinks } from '@/lib/pseo/parseLinks'

interface RelatedGuide {
  slug: string
  title: string
  excerpt: string // Always provided (falls back to metaDescription)
  mainImageUrl?: string | null
  mainImageAlt?: string | null
}

interface GuidePageProps {
  guide: GuideArticle
  canonicalUrl: string
  isFallbackLocale?: boolean
  relatedGuides?: RelatedGuide[]
}

export default function GuidePage({ guide, canonicalUrl, isFallbackLocale, relatedGuides = [] }: GuidePageProps) {
  const { t } = useTranslation('common')
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://proptrenz.com'
  const ogImage = guide.mainImageUrl || `${baseUrl}/api/og?title=${encodeURIComponent(guide.metaTitle || guide.title)}`

  // Structured data for Organization
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PropTrenz',
    url: baseUrl,
    logo: `${baseUrl}/logo-icon.svg`,
    description: 'Mexican real estate market intelligence and analytics platform',
    sameAs: [
      // Add social media profiles when available
    ]
  }

  // Structured data for BreadcrumbList
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Guides',
        item: `${baseUrl}/guides`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: guide.title,
        item: canonicalUrl
      }
    ]
  }

  // Structured data for Article schema
  const articleSchema: any = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.metaTitle || guide.title,
    description: guide.metaDescription,
    datePublished: guide.updatedAt,
    dateModified: guide.updatedAt,
    author: {
      '@type': 'Organization',
      name: 'PropTrenz',
      url: baseUrl
    },
    publisher: {
      '@type': 'Organization',
      name: 'PropTrenz',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo-icon.svg`
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl
    },
    articleSection: guide.tags?.[0] || 'Real Estate',
    keywords: guide.tags.join(', '),
    inLanguage: guide.locale
  }

  if (guide.mainImageUrl) {
    articleSchema.image = {
      '@type': 'ImageObject',
      url: guide.mainImageUrl,
      width: 1792,
      height: 1024
    }
  }

  // Structured data for FAQPage if FAQs exist
  const faqSchema = guide.faq && guide.faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  } : null

  return (
    <Layout title={guide.title} subtitle={guide.excerpt}>
      <Head>
        <title>{guide.metaTitle || guide.title}</title>
        {guide.metaDescription && <meta name="description" content={guide.metaDescription} />}
        <link rel="canonical" href={canonicalUrl} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="keywords" content={guide.tags.join(', ')} />
        
        {/* Hreflang tags for multilingual SEO */}
        <link rel="alternate" hrefLang="en" href={`${baseUrl}/en/guides/${guide.slug.replace(/-en$|-es$|-zh$/, '')}`} />
        <link rel="alternate" hrefLang="es" href={`${baseUrl}/es/guides/${guide.slug.replace(/-en$|-es$|-zh$/, '')}`} />
        <link rel="alternate" hrefLang="zh" href={`${baseUrl}/zh/guides/${guide.slug.replace(/-en$|-es$|-zh$/, '')}`} />
        <link rel="alternate" hrefLang="x-default" href={`${baseUrl}/guides/${guide.slug.replace(/-en$|-es$|-zh$/, '')}`} />
        
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={guide.metaTitle || guide.title} />
        {guide.metaDescription && <meta property="og:description" content={guide.metaDescription} />}
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="PropTrenz" />
        <meta property="article:published_time" content={guide.updatedAt} />
        <meta property="article:modified_time" content={guide.updatedAt} />
        {guide.tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={guide.metaTitle || guide.title} />
        {guide.metaDescription && <meta name="twitter:description" content={guide.metaDescription} />}
        <meta name="twitter:image" content={ogImage} />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
        {faqSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
          />
        )}
      </Head>
      <article itemScope itemType="https://schema.org/Article" className="space-y-8">
        <header>
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li>
                <Link href="/" className="hover:text-blue-600 transition-colors">
                  {t('common.home', 'Home')}
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li>
                <Link href="/guides" className="hover:text-blue-600 transition-colors">
                  {t('common.guides', 'Guides')}
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li className="text-gray-900 font-medium truncate max-w-md" title={guide.title}>
                {guide.title}
              </li>
            </ol>
          </nav>

          {isFallbackLocale && (
            <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              {t('guides.fallback_message', `This guide is currently only available in ${guide.locale === 'en' ? 'English' : guide.locale === 'es' ? 'Spanish' : 'Chinese'}. We're working on translating it to your selected language.`)}
            </div>
          )}
          {guide.heroKicker && (
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
              {guide.heroKicker}
            </Badge>
          )}
          <h1 itemProp="headline" className="sr-only">{guide.title}</h1>
          <time itemProp="datePublished" dateTime={guide.updatedAt} className="sr-only">
            {new Date(guide.updatedAt).toISOString()}
          </time>
          {guide.mainImageUrl && (
            <div className="relative mt-6 h-64 w-full overflow-hidden rounded-2xl bg-gray-100 md:h-96">
              {guide.mainImageUrl.startsWith('data:') ? (
                <img
                  src={guide.mainImageUrl}
                  alt={guide.mainImageAlt || guide.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={guide.mainImageUrl}
                  alt={guide.mainImageAlt || guide.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="100vw"
                />
              )}
            </div>
          )}
        </header>
        <ProtectedContent accessLevel={guide.accessLevel} teaser={guide.excerpt}>
          <div itemProp="articleBody" className="space-y-12">
            {guide.sections.map((section) => (
              <section key={section.heading} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{section.heading}</h2>
                  {section.imageUrl && (
                    <div className="relative mt-4 h-64 w-full overflow-hidden rounded-xl bg-gray-100 md:h-80">
                      {section.imageUrl.startsWith('data:') ? (
                        <img
                          src={section.imageUrl}
                          alt={section.imageAlt || section.heading}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Image
                          src={section.imageUrl}
                          alt={section.imageAlt || section.heading}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 80vw"
                        />
                      )}
                    </div>
                  )}
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={index} className="mt-3 text-base leading-7 text-gray-700">
                      {parseLinks(paragraph)}
                    </p>
                  ))}
                </div>
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="list-disc space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4 pl-8 text-sm text-gray-700">
                    {section.bullets.map((bullet, index) => (
                      <li key={index}>{parseLinks(bullet)}</li>
                    ))}
                  </ul>
                )}
                {section.dataPoints && section.dataPoints.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {section.dataPoints.map((item) => (
                      <div key={item.label} className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                        <p className="text-xs uppercase tracking-wide text-blue-600">{item.label}</p>
                        <p className="mt-1 text-lg font-semibold">{item.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}

            {guide.faq && guide.faq.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-gray-900">Frequently asked questions</h2>
                <div className="mt-4 space-y-6">
                  {guide.faq.map((item) => (
                    <div key={item.question}>
                      <h3 className="text-lg font-medium text-gray-900">{item.question}</h3>
                      <p className="mt-2 text-sm leading-6 text-gray-700">{parseLinks(item.answer)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {relatedGuides && relatedGuides.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {t('guides.related_articles', 'Related Articles')}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {t('guides.related_articles_description', 'Continue reading with these related guides')}
                </p>
                <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {relatedGuides.map((related) => (
                    <Link
                      key={related.slug}
                      href={`/guides/${related.slug}`}
                      locale={guide.locale}
                      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                    >
                        {related.mainImageUrl && (
                          <div className="relative h-40 w-full overflow-hidden bg-gray-100">
                            {related.mainImageUrl.startsWith('data:') ? (
                              <img
                                src={related.mainImageUrl}
                                alt={related.mainImageAlt || related.title}
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <Image
                                src={related.mainImageUrl}
                                alt={related.mainImageAlt || related.title}
                                fill
                                className="object-cover transition-transform group-hover:scale-105"
                                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              />
                            )}
                          </div>
                        )}
                        <div className="flex flex-1 flex-col p-4">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 line-clamp-2">
                            {related.title}
                          </h3>
                          {related.excerpt && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                              {related.excerpt}
                            </p>
                          )}
                          <span className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                            {t('guides.read_more', 'Read more')}
                            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </Link>
                    ))}
                </div>
              </section>
            )}
          </div>
        </ProtectedContent>
      </article>
    </Layout>
  )
}

export const getStaticPaths: GetStaticPaths = async ({ locales }) => {
  const files = await listGuideFiles()
  const paths: Array<{ params: { slug: string }; locale?: string }> = []
  
  // Extract unique base slugs (remove locale suffixes)
  const baseSlugs = new Set<string>()
  files.forEach((file) => {
    const slug = file.replace(/\.json$/, '')
    const baseSlug = slug.replace(/-en$|-es$|-zh$/, '')
    baseSlugs.add(baseSlug)
  })
  
  // Generate paths for each locale
  const supportedLocales = locales || ['en', 'es', 'zh']
  baseSlugs.forEach((baseSlug) => {
    supportedLocales.forEach((locale) => {
      paths.push({
        params: { slug: baseSlug },
        locale
      })
    })
  })
  
  return {
    paths,
    fallback: 'blocking'
  }
}

export const getStaticProps: GetStaticProps<GuidePageProps> = async ({ params, locale, defaultLocale }) => {
  const slug = params?.slug
  if (typeof slug !== 'string') {
    return { notFound: true }
  }

  const validLocale = locale || defaultLocale || 'en'
  
  // Extract base slug (remove locale suffix if present)
  const baseSlug = slug.replace(/-en$|-es$|-zh$/, '')
  
  // Try to load locale-specific version first
  let guide = await loadGuide(baseSlug, validLocale)
  
  // If guide doesn't exist in requested locale, try to fallback to English
  if (!guide && validLocale !== 'en') {
    guide = await loadGuide(baseSlug, 'en')
  }
  
  if (!guide) {
    return { notFound: true }
  }

  if (guide.status !== 'published') {
    return { notFound: true }
  }

  const translations = await serverSideTranslations(validLocale, ['common'])

  // If guide locale doesn't match requested locale (fallback case), we still show it
  // but note that it's in a different language
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://proptrenz.com'
  const canonicalUrl = `${baseUrl}/guides/${slug}`

  // Find related guides based on shared tags
  const relatedGuides = await findRelatedGuides(guide, 3)

  // Convert undefined to null for JSON serialization (Next.js cannot serialize undefined)
  const serializedRelatedGuides = relatedGuides.map((related) => ({
    slug: related.slug,
    title: related.title,
    excerpt: related.excerpt,
    mainImageUrl: related.mainImageUrl ?? null,
    mainImageAlt: related.mainImageAlt ?? null
  }))

  return {
    props: {
      ...translations,
      guide,
      canonicalUrl,
      isFallbackLocale: guide.locale !== validLocale,
      relatedGuides: serializedRelatedGuides
    },
    revalidate: 60 * 60
  }
}
