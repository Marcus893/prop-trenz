import { Layout } from '@/components/Layout'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import type { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { listPublishedGuides } from '@/lib/pseo/storage'
import type { GuideArticle } from '@/lib/pseo/types'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Lock, X } from 'lucide-react'
import Image from 'next/image'

interface GuidesIndexProps {
  guides: Array<Pick<GuideArticle, 'slug' | 'title' | 'excerpt' | 'updatedAt' | 'accessLevel' | 'tags'> & {
    mainImageUrl: string | null
    mainImageAlt: string | null
  }>
  allTags: string[]
}

export default function GuidesIndex({ guides, allTags }: GuidesIndexProps) {
  const { t } = useTranslation('common')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const filteredGuides = useMemo(() => {
    if (selectedTags.length === 0) {
      return guides
    }
    return guides.filter((guide) => selectedTags.every((tag) => guide.tags.includes(tag)))
  }, [guides, selectedTags])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  return (
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
          <div className="grid gap-6 lg:grid-cols-2">
            {filteredGuides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
            >
              {guide.mainImageUrl && guide.mainImageUrl !== null && (
                <div className="relative h-48 w-full overflow-hidden bg-gray-100">
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
                      {guide.accessLevel === 'email_capture'
                        ? t('guides.signup_required_badge', 'Create a free account')
                        : t('guides.login_required_badge', 'Members only')}
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
                <span className="mt-auto pt-4 text-sm font-medium text-blue-600">
                  {t('guides_page.cta_label', 'Read the guide')}
                </span>
              </div>
            </Link>
          ))}
          </div>
        )}
      </section>
    </Layout>
  )
}

export const getStaticProps: GetStaticProps<GuidesIndexProps> = async ({ locale, defaultLocale }) => {
  const validLocale = locale || defaultLocale || 'en'
  const translations = await serverSideTranslations(validLocale, ['common'])
  const guides = await listPublishedGuides(validLocale)

  const trimmedGuides = guides.map((guide) => {
    // Extract base slug (remove locale suffix if present) for routing
    const baseSlug = guide.slug.replace(/-en$|-es$|-zh$/, '')
    return {
      slug: baseSlug, // Use base slug for routing
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
