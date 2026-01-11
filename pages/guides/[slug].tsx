import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { Layout } from "@/components/Layout";
import {
  loadGuide,
  listGuideFiles,
  findRelatedGuides,
} from "@/lib/pseo/storage";
import type { GuideArticle } from "@/lib/pseo/types";
import { ProtectedContent } from "@/components/content/ProtectedContent";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { parseTextWithReferences } from "@/lib/pseo/parseDataReferences";
import { Accordion } from "@/components/ui/accordion";
import { LeadCTA } from "@/components/leads/LeadCTA";
import { useState, useEffect } from "react";

interface RelatedGuide {
  slug: string;
  title: string;
  excerpt: string; // Always provided (falls back to metaDescription)
  mainImageUrl?: string | null;
  mainImageAlt?: string | null;
}

interface GuidePageProps {
  guide: GuideArticle;
  canonicalUrl: string;
  hreflangUrls: {
    en?: string;
    es?: string;
    zh?: string;
  };
  isFallbackLocale?: boolean;
  relatedGuides?: RelatedGuide[];
  translationsMap?: Record<string, string>; // locale -> localized slug
}

export default function GuidePage({
  guide,
  canonicalUrl,
  hreflangUrls,
  isFallbackLocale,
  relatedGuides = [],
}: GuidePageProps) {
  const { t } = useTranslation("common");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://proptrenz.com";
  const ogImage =
    guide.mainImageUrl ||
    `${baseUrl}/api/og?title=${encodeURIComponent(
      guide.metaTitle || guide.title
    )}`;

  // Scroll detection for auto-showing CTA
  const [hasScrolledEnough, setHasScrolledEnough] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 1800) {
        // Show after scrolling 800px
        setHasScrolledEnough(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Structured data for Organization
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PropTrenz",
    url: baseUrl,
    logo: `${baseUrl}/logo-icon.svg`,
    description:
      "Mexican real estate market intelligence and analytics platform",
    sameAs: [
      // Add social media profiles when available
    ],
  };

  // Structured data for BreadcrumbList
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Guides",
        item: `${baseUrl}/guides`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: guide.title,
        item: canonicalUrl,
      },
    ],
  };

  // Structured data for Article schema
  const articleSchema: any = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.metaTitle || guide.title,
    description: guide.metaDescription,
    datePublished: guide.updatedAt,
    dateModified: guide.updatedAt,
    author: {
      "@type": "Organization",
      name: "PropTrenz",
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "PropTrenz",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo-icon.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    articleSection: guide.tags?.[0] || "Real Estate",
    keywords: (guide.keywords ?? guide.tags).join(", "),
    inLanguage:
      guide.locale === "en"
        ? "en-US"
        : guide.locale === "es"
        ? "es-MX"
        : "zh-CN",
  };

  if (guide.mainImageUrl) {
    articleSchema.image = {
      "@type": "ImageObject",
      url: guide.mainImageUrl,
      width: 1792,
      height: 1024,
    };
  }

  // Structured data for FAQPage if FAQs exist
  const faqSchema =
    guide.faq && guide.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: guide.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null;

  return (
    <Layout title={guide.title} subtitle={guide.excerpt}>
      <Head>
        <title>{guide.metaTitle || guide.title}</title>
        {guide.metaDescription && (
          <meta name="description" content={guide.metaDescription} />
        )}
        <link rel="canonical" href={canonicalUrl} />
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
        <meta name="keywords" content={(guide.keywords ?? guide.tags).join(", ")} />

        {/* Hreflang tags for multilingual SEO - tells Google which language version to show */}
        {/* Only include hreflang tags for versions that actually exist */}
        {hreflangUrls.en && (
          <link rel="alternate" hrefLang="en" href={hreflangUrls.en} />
        )}
        {hreflangUrls.es && (
          <link rel="alternate" hrefLang="es" href={hreflangUrls.es} />
        )}
        {hreflangUrls.zh && (
          <link rel="alternate" hrefLang="zh" href={hreflangUrls.zh} />
        )}
        {/* x-default should point to the primary version (English if available, otherwise first available) */}
        <link
          rel="alternate"
          hrefLang="x-default"
          href={
            hreflangUrls.en ||
            hreflangUrls.es ||
            hreflangUrls.zh ||
            canonicalUrl
          }
        />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={guide.metaTitle || guide.title} />
        {guide.metaDescription && (
          <meta property="og:description" content={guide.metaDescription} />
        )}
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
        {guide.metaDescription && (
          <meta name="twitter:description" content={guide.metaDescription} />
        )}
        <meta name="twitter:image" content={ogImage} />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
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
      <article
        itemScope
        itemType="https://schema.org/Article"
        className="space-y-8 overflow-hidden max-w-full"
      >
        <header>
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-4 overflow-hidden">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
              <li>
                <Link
                  href="/"
                  className="hover:text-blue-600 transition-colors"
                >
                  {t("common.home", "Home")}
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li>
                <Link
                  href="/guides"
                  className="hover:text-blue-600 transition-colors"
                >
                  {t("common.guides", "Guides")}
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li
                className="text-gray-900 font-medium truncate max-w-md"
                title={guide.title}
              >
                {guide.title}
              </li>
            </ol>
          </nav>

          {isFallbackLocale && (
            <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              {t(
                "guides.fallback_message",
                `This guide is currently only available in ${
                  guide.locale === "en"
                    ? "English"
                    : guide.locale === "es"
                    ? "Spanish"
                    : "Chinese"
                }. We're working on translating it to your selected language.`
              )}
            </div>
          )}
          {guide.heroKicker && (
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-700"
            >
              {guide.heroKicker}
            </Badge>
          )}
          <h1 itemProp="headline" className="sr-only">
            {guide.title}
          </h1>
          <time
            itemProp="datePublished"
            dateTime={guide.updatedAt}
            className="sr-only"
          >
            {new Date(guide.updatedAt).toISOString()}
          </time>
          {guide.mainImageUrl && (
            <div className="relative mt-6 h-96 w-full overflow-hidden rounded-2xl bg-gray-100 md:h-[36rem]">
              {guide.mainImageUrl.startsWith("data:") ? (
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
        <ProtectedContent
          accessLevel={guide.accessLevel}
          teaser={guide.excerpt}
        >
          <div itemProp="articleBody" className="space-y-12">
            {guide.sections.map((section) => (
              <section key={section.heading} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {section.heading}
                  </h2>
                  {section.imageUrl && (
                    <div className="relative mt-4 h-96 w-full overflow-hidden rounded-xl bg-gray-100 md:h-96">
                      {section.imageUrl.startsWith("data:") ? (
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
                    <p
                      key={index}
                      className="mt-3 text-base leading-7 text-gray-700"
                    >
                      {parseTextWithReferences(paragraph)}
                    </p>
                  ))}
                </div>
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="list-disc space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4 pl-8 text-sm text-gray-700">
                    {section.bullets.map((bullet, index) => (
                      <li key={index}>{parseTextWithReferences(bullet)}</li>
                    ))}
                  </ul>
                )}
                {section.dataPoints && section.dataPoints.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {section.dataPoints.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"
                      >
                        <p className="text-xs uppercase tracking-wide text-blue-600">
                          {item.label}
                        </p>
                        <p className="mt-1 text-lg font-semibold">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}

            {/* CTA Section */}
            <LeadCTA
              source="guide"
              context={{
                guideTitle: guide.title,
                guideSlug: guide.slug,
              }}
              titleKey="leads.guide_cta_title"
              descriptionKey="leads.guide_cta_description"
              titleDefault="Want to invest in Mexican real estate?"
              descriptionDefault="Connect with a vetted real estate professional who can help you every step of the way."
              autoShow={hasScrolledEnough}
            />

            {guide.faq && guide.faq.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Frequently asked questions
                </h2>
                <Accordion
                  items={guide.faq.map((item) => ({
                    question: item.question,
                    answer: <div>{parseTextWithReferences(item.answer)}</div>,
                  }))}
                />
              </section>
            )}

            {relatedGuides && relatedGuides.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {t("guides.related_articles", "Related Articles")}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {t(
                    "guides.related_articles_description",
                    "Continue reading with these related guides"
                  )}
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
                          {related.mainImageUrl.startsWith("data:") ? (
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
                          {t("guides.read_more", "Read more")}
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
  );
}

export const getStaticPaths: GetStaticPaths = async ({ locales }) => {
  // Build paths only for the actual localized guide slugs we have in `content/guides`
  const files = await listGuideFiles();
  const paths: Array<{ params: { slug: string }; locale?: string }> = [];

  for (const file of files) {
    const slugFile = file.replace(/\.json$/, "");
    // Try to load the guide directly to get its locale and slug
    const guide = await loadGuide(slugFile);
    if (!guide) continue;
    if (guide.status !== 'published') continue;

    // Push the actual slug and its locale
    paths.push({ params: { slug: guide.slug }, locale: guide.locale });
  }

  return {
    paths,
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<GuidePageProps> = async ({
  params,
  locale,
  defaultLocale,
}) => {
  const slug = params?.slug;
  if (typeof slug !== "string") {
    return { notFound: true };
  }

  const validLocale = locale || defaultLocale || "en";

  // Use the requested slug from the route
  const requestedSlug = slug;

  // Try to load the guide using the requested slug and locale
  let guide = await loadGuide(requestedSlug, validLocale);

  // If not found for this locale, try to load without forcing locale (allow file to match by name)
  if (!guide) {
    guide = await loadGuide(requestedSlug);
  }

  // If still not found, try to fallback to English explicitly
  if (!guide && validLocale !== 'en') {
    guide = await loadGuide(requestedSlug, 'en');
  }

  if (!guide) {
    return { notFound: true };
  }

  if (guide.status !== 'published') {
    return { notFound: true };
  }

  const translations = await serverSideTranslations(validLocale, ["common"]);

  // If guide locale doesn't match requested locale (fallback case), we still show it
  // but note that it's in a different language
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://proptrenz.com";

  // Canonical should point to the current page (use the actual localized slug)
  const canonicalUrl =
    validLocale === "en"
      ? `${baseUrl}/guides/${guide.slug}`
      : `${baseUrl}/${validLocale}/guides/${guide.slug}`;

  // Grouping helper: prefer mainImageUrl-derived key for cross-locale matching
  const getGroupKey = (g: any) => {
    if (g.mainImageUrl) {
      const m = String(g.mainImageUrl).match(/\/blogs\/([^\/\.]*)/);
      if (m && m[1]) return m[1];
    }
    return String(g.slug).replace(/-en$|-es$|-zh$/i, "");
  };

  const currentGroupKey = getGroupKey(guide);

  // Build a mapping of available locales -> localized slugs for this group
  const allFiles = await listGuideFiles();
  const localeSlugMap: Record<string, { slug: string; updatedAt: string }> = {};

  for (const file of allFiles) {
    const fileSlug = file.replace(/\.json$/, "");
    const g = await loadGuide(fileSlug);
    if (!g || g.status !== 'published') continue;
    const key = getGroupKey(g);
    if (key === currentGroupKey) {
      localeSlugMap[g.locale] = { slug: g.slug, updatedAt: g.updatedAt };
    }
  }

  const hreflangUrls: { en?: string; es?: string; zh?: string } = {};
  if (localeSlugMap.en) hreflangUrls.en = `${baseUrl}/guides/${localeSlugMap.en.slug}`;
  if (localeSlugMap.es) hreflangUrls.es = `${baseUrl}/es/guides/${localeSlugMap.es.slug}`;
  if (localeSlugMap.zh) hreflangUrls.zh = `${baseUrl}/zh/guides/${localeSlugMap.zh.slug}`;

  // Find related guides based on shared tags
  const relatedGuides = await findRelatedGuides(guide, 3);

  // Convert undefined to null for JSON serialization (Next.js cannot serialize undefined)
  const serializedRelatedGuides = relatedGuides.map((related) => ({
    slug: related.slug,
    title: related.title,
    excerpt: related.excerpt,
    mainImageUrl: related.mainImageUrl ?? null,
    mainImageAlt: related.mainImageAlt ?? null,
  }));

  const translationsMap: Record<string, string> = {}
  for (const [loc, entry] of Object.entries(localeSlugMap)) {
    translationsMap[loc] = entry.slug
  }

  return {
    props: {
      ...translations,
      guide,
      canonicalUrl,
      hreflangUrls,
      isFallbackLocale: guide.locale !== validLocale,
      relatedGuides: serializedRelatedGuides,
      translationsMap
    },
    revalidate: 60 * 60,
  };
};
