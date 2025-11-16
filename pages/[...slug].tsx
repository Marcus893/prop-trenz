import Head from 'next/head'
import type { GetStaticPaths, GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { loadLocationPage, listLocationPages } from '@/lib/locations/storage'
import type { LocationPage } from '@/lib/locations/storage'
import { Card } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useMemo } from 'react'

interface LocationPageProps {
  page: LocationPage
  canonicalUrl: string
}

export default function LocationPageComponent({ page, canonicalUrl }: LocationPageProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://proptrenz.com'
  const { content, locationData } = page
  const { t } = useTranslation('common')
  const router = useRouter()

  // Prepare chart data
  const chartData = useMemo(() => {
    return locationData.priceHistory
      .map(point => ({
        month: point.month,
        price: Math.round(point.price),
        date: point.date instanceof Date ? point.date : new Date(point.date)
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [locationData.priceHistory])

  // Helper function to get quarter from date
  const getQuarter = (date: Date): { year: number; quarter: number } => {
    const month = date.getMonth() // 0-11
    const quarter = Math.floor(month / 3) + 1 // 1-4
    return { year: date.getFullYear(), quarter }
  }

  // Calculate growth metrics
  const growthMetrics = useMemo(() => {
    if (chartData.length < 2) return null

    const latest = chartData[chartData.length - 1]

    // Quarter-over-quarter growth (QoQ)
    // Group data by quarter and calculate average price per quarter
    const quarters = new Map<string, { prices: number[]; dates: Date[] }>()
    
    chartData.forEach(point => {
      const { year, quarter } = getQuarter(point.date)
      const key = `${year}-Q${quarter}`
      
      if (!quarters.has(key)) {
        quarters.set(key, { prices: [], dates: [] })
      }
      
      const quarterData = quarters.get(key)!
      quarterData.prices.push(point.price)
      quarterData.dates.push(point.date)
    })

    const quarterEntries = Array.from(quarters.entries())
      .map(([key, data]) => ({
        key,
        avgPrice: data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length,
        dates: data.dates
      }))
      .sort((a, b) => {
        // Sort by earliest date in quarter
        const aDate = new Date(Math.min(...a.dates.map(d => d.getTime())))
        const bDate = new Date(Math.min(...b.dates.map(d => d.getTime())))
        return aDate.getTime() - bDate.getTime()
      })

    let qoqGrowth: number | null = null
    if (quarterEntries.length >= 2) {
      const latestQuarter = quarterEntries[quarterEntries.length - 1]
      const previousQuarter = quarterEntries[quarterEntries.length - 2]
      
      if (previousQuarter.avgPrice > 0) {
        qoqGrowth = ((latestQuarter.avgPrice - previousQuarter.avgPrice) / previousQuarter.avgPrice) * 100
      }
    }

    // Year-over-year growth (only if we have data from the same month one year ago)
    let yoyGrowth: number | null = null
    if (chartData.length > 0) {
      const latestDate = latest.date
      const oneYearAgo = new Date(latestDate)
      oneYearAgo.setFullYear(latestDate.getFullYear() - 1)
      
      // Find data point from approximately one year ago (same month, previous year)
      const yearAgoData = chartData.find(point => {
        const pointDate = point.date
        return pointDate.getFullYear() === oneYearAgo.getFullYear() &&
               pointDate.getMonth() === oneYearAgo.getMonth()
      })
      
      if (yearAgoData && yearAgoData.price > 0) {
        yoyGrowth = ((latest.price - yearAgoData.price) / yearAgoData.price) * 100
      }
    }

    return {
      qoq: qoqGrowth,
      yoy: yoyGrowth
    }
  }, [chartData])

  // Format month for display in Spanish
  const formatMonth = (monthString: string): string => {
    // Extract month and year from "October 2025" format
    const parts = monthString.split(' ')
    if (parts.length === 2) {
      const monthName = parts[0]
      const year = parts[1]
      
      // Map English month names to Spanish
      const monthMap: Record<string, string> = {
        'January': 'Enero',
        'February': 'Febrero',
        'March': 'Marzo',
        'April': 'Abril',
        'May': 'Mayo',
        'June': 'Junio',
        'July': 'Julio',
        'August': 'Agosto',
        'September': 'Septiembre',
        'October': 'Octubre',
        'November': 'Noviembre',
        'December': 'Diciembre'
      }
      
      const translatedMonth = monthMap[monthName] || monthName
      return `${translatedMonth} ${year}`
    }
    return monthString
  }

  // Calculate Y-axis domain to center the line
  const getYAxisDomain = () => {
    if (chartData.length === 0) return [0, 100000]
    const prices = chartData.map(d => d.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min
    const padding = range * 5
    return [Math.max(0, min - padding), max + padding]
  }

  // Generate title in format: "¿Cuánto cuesta un inmueble en [location]?"
  const pageTitle = `¿Cuánto cuesta un inmueble en ${locationData.name}?`

  // Social sharing image
  const ogImage = `${baseUrl}/og.jpeg`
  
  // Structured data for WebPage and Place
  const webpageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageTitle,
    description: content.metaDescription,
    url: canonicalUrl,
    inLanguage: 'es-MX',
    publisher: {
      '@type': 'Organization',
      name: 'PropTrenz',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo-icon.svg`
      }
    },
    mainEntity: {
      '@type': 'Place',
      name: locationData.name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: locationData.municipality || locationData.city,
        addressRegion: locationData.city,
        addressCountry: 'MX'
      }
    }
  }

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={content.metaDescription} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={content.metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="es_MX" />
        <meta property="og:site_name" content="PropTrenz" />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:alt" content={`Precios de propiedades en ${locationData.name}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={content.metaDescription} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:image:alt" content={`Precios de propiedades en ${locationData.name}`} />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageSchema) }}
        />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Header with CTA */}
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center">
                <span className="text-xl font-bold text-blue-600">PropTrenz</span>
              </Link>
              <a
                href="/#signup"
                onClick={(e) => {
                  e.preventDefault()
                  if (typeof window !== 'undefined') {
                    // Set flag before navigation
                    localStorage.setItem('showSignupModal', 'true')
                    // Navigate and ensure hash is preserved
                    router.push('/').then(() => {
                      window.location.hash = '#signup'
                    })
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Únete a PropTrenz →
              </a>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left: Content */}
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  {pageTitle}
                </h1>
                <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
                  {content.introduction.split('\n')[0]}
                </p>
                
                {/* Price Summary */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-100 mb-2">Precio promedio por m²</p>
                      <p className="text-sm text-blue-200">
                        {locationData.type === 'neighborhood' && locationData.municipality 
                          ? `${locationData.name}, ${locationData.municipality}, ${locationData.city}`
                          : locationData.municipality 
                            ? `${locationData.name}, ${locationData.municipality}, ${locationData.city}`
                            : `${locationData.name}, ${locationData.city}`
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl md:text-4xl font-bold text-white">
                        ${Math.round(locationData.averagePrice).toLocaleString('es-MX')}/m²
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Signup CTA Card */}
              <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 flex flex-col justify-center">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Explora más datos
                  </h2>
                  <p className="text-gray-600">
                    Únete a PropTrenz para acceder a mapas interactivos, calculadoras y análisis detallados del mercado inmobiliario mexicano.
                  </p>
                </div>
                <a
                  href="/#signup"
                  onClick={(e) => {
                    e.preventDefault()
                    if (typeof window !== 'undefined') {
                      // Set flag before navigation
                      localStorage.setItem('showSignupModal', 'true')
                      // Navigate and ensure hash is preserved
                      router.push('/').then(() => {
                        window.location.hash = '#signup'
                      })
                    }
                  }}
                  className="block w-full text-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mb-4"
                >
                  Únete a PropTrenz →
                </a>
                <p className="text-xs text-gray-500 text-center">
                  Si ya tienes una cuenta, te iniciaremos sesión automáticamente
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Introduction (skip first paragraph as it's already in hero) */}
          {content.introduction.split('\n').length > 1 && (
            <div className="prose prose-lg max-w-none mb-12">
              <div 
                className="text-gray-700 leading-relaxed text-lg"
                dangerouslySetInnerHTML={{ 
                  __html: content.introduction
                    .split('\n')
                    .slice(1) // Skip first paragraph
                    .join('\n')
                    .replace(/\n/g, '<br />') 
                }}
              />
            </div>
          )}

          {/* Price Chart */}
          {chartData.length > 0 && (
            <Card className="p-6 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Evolución de Precios
              </h2>
              
              {/* Growth Metrics */}
              {growthMetrics && (
                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
                  {growthMetrics.qoq !== null && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('map.qoq_growth', 'Crecimiento Trimestral (QoQ)')}</p>
                      <div className={`flex items-center gap-1 ${growthMetrics.qoq >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {growthMetrics.qoq >= 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span className="font-semibold">
                          {growthMetrics.qoq >= 0 ? '+' : ''}{growthMetrics.qoq.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                  {growthMetrics.yoy !== null && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('map.yoy_growth', 'Crecimiento Anual (YoY)')}</p>
                      <div className={`flex items-center gap-1 ${growthMetrics.yoy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {growthMetrics.yoy >= 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span className="font-semibold">
                          {growthMetrics.yoy >= 0 ? '+' : ''}{growthMetrics.yoy.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      stroke="#6b7280"
                      fontSize={12}
                      tick={{ fill: '#6b7280' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tickFormatter={formatMonth}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tick={{ fill: '#6b7280' }}
                      tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                      domain={getYAxisDomain()}
                    />
                    <Tooltip
                      formatter={(value: number) => `$${Math.round(value).toLocaleString('es-MX')}/m²`}
                      labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '8px 12px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Must Visit Spots */}
          {content.mustVisitSpots && content.mustVisitSpots.length > 0 && (
            <Card className="p-6 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Lugares que Debes Visitar
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {content.mustVisitSpots.map((spot, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{spot.name}</h3>
                    <p className="text-sm text-gray-600">{spot.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Price Insights */}
          {content.priceInsights && (
            <Card className="p-6 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Análisis de Precios
              </h2>
              <div 
                className="text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: content.priceInsights.replace(/\n/g, '<br />') }}
              />
            </Card>
          )}

          {/* Final CTA */}
          <Card className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              ¿Quieres explorar más datos?
            </h3>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              Explora nuestros mapas interactivos y calculadoras para obtener más información sobre el mercado inmobiliario mexicano.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/map"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Ver Mapa Interactivo
              </a>
              <a
                href="/calculators"
                className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                Calculadoras
              </a>
            </div>
          </Card>
        </main>

      </div>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = listLocationPages()
  
  // Only include slugs that match the "cuanto-cuesta-comprar-en-*" pattern
  const locationSlugs = slugs.filter(slug => slug.startsWith('cuanto-cuesta-comprar-en-'))
  
  const paths = locationSlugs.map(slug => ({
    params: { slug: slug.split('/') } // Split into array for catch-all route
  }))
  
  return {
    paths,
    fallback: 'blocking'
  }
}

export const getStaticProps: GetStaticProps = async ({ params, locale }) => {
  const slugArray = params?.slug as string[]
  
  if (!slugArray || !Array.isArray(slugArray)) {
    return {
      notFound: true
    }
  }
  
  // Join slug array back into string
  const slug = slugArray.join('/')
  
  // Only handle location pages (cuanto-cuesta-comprar-en-*)
  if (!slug.startsWith('cuanto-cuesta-comprar-en-')) {
    return {
      notFound: true
    }
  }
  
  const page = loadLocationPage(slug)
  
  if (!page) {
    return {
      notFound: true
    }
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://proptrenz.com'
  const canonicalUrl = `${baseUrl}/${slug}`
  
  return {
    props: {
      page,
      canonicalUrl,
      ...(await serverSideTranslations(locale || 'es', ['common']))
    },
    revalidate: 86400 // Revalidate once per day
  }
}
