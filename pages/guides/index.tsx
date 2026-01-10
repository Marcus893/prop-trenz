import Head from 'next/head'
import { Layout } from '@/components/Layout'
import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import type { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import { listPublishedGuides } from '@/lib/pseo/storage'
import type { GuideArticle } from '@/lib/pseo/types'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Lock, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'

const GUIDES_PER_PAGE = 6

interface GuidesIndexProps {
  guides: Array<Pick<GuideArticle, 'slug' | 'title' | 'excerpt' | 'updatedAt' | 'accessLevel' | 'tags'> & {
    mainImageUrl: string | null
    mainImageAlt: string | null
  }>
  allTags: string[]
}

export default function GuidesIndex({ guides, allTags }: GuidesIndexProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  // Clear tag filters and reset page when switching language so users see results immediately
  useEffect(() => {
    setSelectedTags([])
    setCurrentPage(1)
  }, [router.locale])

  const filteredGuides = useMemo(() => {
    if (selectedTags.length === 0) {
      return guides
    }
    return guides.filter((guide) => selectedTags.every((tag) => guide.tags.includes(tag)))
  }, [guides, selectedTags])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedTags])

  // Pagination calculations
  const totalPages = Math.ceil(filteredGuides.length / GUIDES_PER_PAGE)
  const startIndex = (currentPage - 1) * GUIDES_PER_PAGE
  const endIndex = startIndex + GUIDES_PER_PAGE
  const paginatedGuides = filteredGuides.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of guides section
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://proptrenz.com'
  let currentPath = router.asPath.split('?')[0] // Remove query params
  
  // Remove locale prefix from path if present
  if (currentPath.startsWith('/es/') || currentPath.startsWith('/zh/')) {
    currentPath = currentPath.replace(/^\/es\/|\/zh\//, '/')
  }
  if (currentPath === '/es' || currentPath === '/zh') {
    currentPath = '/'
  }
  
  // Build hreflang URLs for all language versions
  const hreflangUrls = {
    en: `${baseUrl}${currentPath}`,
    es: `${baseUrl}/es${currentPath}`,
    zh: `${baseUrl}/zh${currentPath}`
  }

  return (
    <>
      <Head>
        <title>{t('guides_page.meta_title', 'Mexican Real Estate Guides | Expert Insights - PropTrenz')}</title>
        <meta name="description" content={t('guides_page.meta_description', 'Comprehensive guides on buying property in Mexico. Learn about taxes, regulations, market dynamics, and investment strategies for every stage of the property lifecycle.')} />
        <link rel="canonical" href={hreflangUrls.en} />
        
        {/* Hreflang tags for multilingual SEO */}
        <link rel="alternate" hrefLang="en" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="es" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="zh" href={hreflangUrls.zh} />
        <link rel="alternate" hrefLang="x-default" href={hreflangUrls.en} />
        
        {/* Spanish-speaking countries (LATAM) -> Spanish version */}
        <link rel="alternate" hrefLang="es-MX" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-AR" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-CO" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-CL" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-PE" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-EC" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-VE" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-GT" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-CU" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-BO" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-DO" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-HN" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-PY" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-SV" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-NI" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-CR" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-PA" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-UY" href={hreflangUrls.es} />
        <link rel="alternate" hrefLang="es-PR" href={hreflangUrls.es} />
        
        {/* English-speaking countries -> English version */}
        <link rel="alternate" hrefLang="en-US" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="en-GB" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="en-CA" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="en-AU" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="en-NZ" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="en-IE" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="en-ZA" href={hreflangUrls.en} />
        
        {/* Chinese-speaking countries/regions -> Chinese version */}
        <link rel="alternate" hrefLang="zh-CN" href={hreflangUrls.zh} />
        <link rel="alternate" hrefLang="zh-TW" href={hreflangUrls.zh} />
        <link rel="alternate" hrefLang="zh-HK" href={hreflangUrls.zh} />
      </Head>
      <Layout
      title={t('guides_page.title', 'Mexican Real Estate Guides')}
      subtitle={t(
        'guides_page.subtitle',
        'Data-backed articles that explain taxes, regulations, and market dynamics for every stage of the property lifecycle.'
      )}
    >
      <section className="space-y-6">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-sm text-blue-800">
          {t(
            'guides_page.intro_banner',
            'PropTrenz curates data-backed playbooks for buying, owning, and selling property in Mexico. These living documents include tax rates, regulator references, and actionable checklists sourced from SAT circulars, SHF data, and local notaries.'
          )}
        </div>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
              {t('guides_page.filter_by_tags', 'Filter by category')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const isSelected = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-300 hover:text-blue-700'
                    }`}
                  >
                    {tag.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    {isSelected && <X className="h-3 w-3" />}
                  </button>
                )
              })}
            </div>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {t('guides_page.clear_filters', 'Clear filters')}
              </button>
            )}
          </div>
        )}

        {filteredGuides.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-lg text-gray-600">
              {t('guides_page.no_guides', 'No guides available in this language yet. Check back soon!')}
            </p>
          </div>
        ) : (
          <>
            {/* Results count */}
            {filteredGuides.length > GUIDES_PER_PAGE && (
              <div className="text-sm text-gray-600">
                {t('guides_page.showing_results', 'Showing {{start}}-{{end}} of {{total}} guides', {
                  start: startIndex + 1,
                  end: Math.min(endIndex, filteredGuides.length),
                  total: filteredGuides.length
                })}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {paginatedGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                {guide.mainImageUrl && guide.mainImageUrl !== null && (
                  <div className="relative h-64 w-full overflow-hidden bg-gray-100">
                    {guide.mainImageUrl.startsWith('data:') ? (
                      <img
                        src={guide.mainImageUrl}
                        alt={guide.mainImageAlt || guide.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <Image
                        src={guide.mainImageUrl}
                        alt={guide.mainImageAlt || guide.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    )}
                  </div>
                )}
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
                    <span className="flex items-center gap-1 text-gray-600">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(guide.updatedAt))}
                    </span>
                    {guide.accessLevel !== 'public' && (
                      <Badge variant="outline" className="flex items-center gap-1 border-blue-200 text-blue-700">
                        <Lock className="h-3 w-3" />
                        {t('guides.signup_required_badge', 'Create a free account')}
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-gray-900 group-hover:text-blue-700">
                    {guide.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {guide.excerpt}
                  </p>
                  {guide.tags && guide.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {guide.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs border-gray-200 text-gray-600"
                        >
                          {tag.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-8">
                {/* Previous button */}
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('guides_page.previous', 'Previous')}
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = page === 1 || 
                                     page === totalPages || 
                                     Math.abs(page - currentPage) <= 1

                    // Show ellipsis
                    const showEllipsisBefore = page === currentPage - 2 && currentPage > 3
                    const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2

                    if (showEllipsisBefore || showEllipsisAfter) {
                      return (
                        <span key={page} className="px-2 text-gray-400">
                          ...
                        </span>
                      )
                    }

                    if (!showPage) return null

                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`min-w-[40px] rounded-lg px-3 py-2 text-sm font-medium transition ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>

                {/* Next button */}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                >
                  {t('guides_page.next', 'Next')}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>
      </Layout>
    </>
  )
}

export const getStaticProps: GetStaticProps<GuidesIndexProps> = async ({ locale, defaultLocale }) => {
  const validLocale = locale || defaultLocale || 'en'
  const translations = await serverSideTranslations(validLocale, ['common'])
  const guides = await listPublishedGuides(validLocale)

  const trimmedGuides = guides.map((guide) => {
    // Use the locale-specific slug for routing so links point to the correct localized URL
    return {
      slug: guide.slug,
      title: guide.title,
      excerpt: guide.excerpt || guide.metaDescription,
      updatedAt: guide.updatedAt,
      accessLevel: guide.accessLevel,
      tags: guide.tags || [],
      mainImageUrl: guide.mainImageUrl || null,
      mainImageAlt: guide.mainImageAlt || null
    }
  })

  // Extract all unique tags
  const allTags = Array.from(new Set(guides.flatMap((guide) => guide.tags || []))).sort()

  return {
    props: {
      ...translations,
      guides: trimmedGuides,
      allTags
    },
    revalidate: 60 * 60 // refresh every hour
  }
}
