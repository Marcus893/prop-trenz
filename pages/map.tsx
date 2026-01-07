import React, { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { MapPin, Loader2, Share2, Check, MessageCircle } from 'lucide-react'
import { GetServerSideProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { LeadForm } from '@/components/leads/LeadForm'
import { Button } from '@/components/ui/button'

// Dynamically import the map component (client-side only)
const NeighborhoodMap = dynamic(
  () => import('@/components/maps/NeighborhoodMap').then(mod => ({ default: mod.NeighborhoodMap })),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }
)

interface NeighborhoodData {
  [city: string]: {
    [municipality: string]: Array<{
      colonia: string
      precio: string
      mes: string
    }>
  }
}

interface MetaTags {
  title: string
  description: string
  url: string
  image: string
}

interface MapPageProps {
  initialMetaTags?: MetaTags
}

// Helper function to generate meta tags (used both server-side and client-side)
function generateMetaTags(
  city: string | undefined,
  municipality: string | undefined,
  neighborhood: string | undefined,
  chart: string | undefined,
  baseUrl: string,
  currentPath: string,
  t: (key: string, options?: any) => string
): MetaTags {
  // Decode names for display
  const decodeName = (encoded: string): string => {
    if (!encoded) return ''
    try {
      return decodeURIComponent(encoded).replace(/-/g, ' ')
    } catch {
      return encoded.replace(/-/g, ' ')
    }
  }
  
  const cityName = city ? decodeName(city) : 'Ciudad de México'
  const municipalityName = municipality ? decodeName(municipality) : null
  const neighborhoodName = neighborhood ? decodeName(neighborhood) : null
  
  // Build title and description using translations
  let title = t('map.meta.default_title')
  let description = t('map.meta.default_description')
  
  if (neighborhoodName && municipalityName) {
    if (chart === 'true') {
      title = t('map.meta.neighborhood_chart_title', { neighborhood: neighborhoodName, municipality: municipalityName })
      description = t('map.meta.neighborhood_chart_description', { neighborhood: neighborhoodName, municipality: municipalityName, city: cityName })
    } else {
      title = t('map.meta.neighborhood_title', { neighborhood: neighborhoodName, municipality: municipalityName })
      description = t('map.meta.neighborhood_description', { neighborhood: neighborhoodName, municipality: municipalityName, city: cityName })
    }
  } else if (municipalityName) {
    title = t('map.meta.municipality_title', { municipality: municipalityName, city: cityName })
    description = t('map.meta.municipality_description', { municipality: municipalityName, city: cityName })
  } else if (cityName) {
    title = t('map.meta.city_title', { city: cityName })
    description = t('map.meta.city_description', { city: cityName })
  }
  
  // Build URL
  const queryParams = new URLSearchParams()
  if (city) queryParams.set('city', city)
  if (municipality) queryParams.set('municipality', municipality)
  if (neighborhood) queryParams.set('neighborhood', neighborhood)
  if (chart === 'true') queryParams.set('chart', 'true')
  
  const queryString = queryParams.toString()
  const currentUrl = queryString ? `${baseUrl}${currentPath}?${queryString}` : `${baseUrl}${currentPath}`
  
  // Select OG image based on city
  let ogImage = `${baseUrl}/og-image.png` // Default fallback
  const normalizedCityName = cityName?.toLowerCase() || ''
  if (normalizedCityName.includes('monterrey')) {
    ogImage = `${baseUrl}/og-monterrey.jpeg`
  } else if (normalizedCityName.includes('ciudad de méxico') || normalizedCityName.includes('cdmx') || normalizedCityName.includes('mexico city')) {
    ogImage = `${baseUrl}/og-cdmx.jpeg`
  } else if (normalizedCityName.includes('jalisco') || normalizedCityName.includes('guadalajara')) {
    ogImage = `${baseUrl}/og-guadalajara.jpeg`
  }
  
  return {
    title,
    description,
    url: currentUrl,
    image: ogImage,
  }
}

export default function MapPage({ initialMetaTags }: MapPageProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [data, setData] = useState<NeighborhoodData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string>('Ciudad de México')
  const cityRestoredRef = useRef(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [showLeadForm, setShowLeadForm] = useState(false)
  
  // Helper function to create URL-friendly slug from city name
  const cityToSlug = (city: string): string => {
    return city.toLowerCase()
      .replace(/ /g, '-')
      .replace(/[áéíóúñü]/g, (char) => {
        const map: { [key: string]: string } = {
          'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
          'ñ': 'n', 'ü': 'u'
        }
        return map[char] || char
      })
  }
  
  // Helper function to convert slug back to city name
  const slugToCity = (slug: string, availableCities: string[]): string | null => {
    const normalizedSlug = slug.toLowerCase()
    // Try exact match first
    for (const city of availableCities) {
      if (cityToSlug(city) === normalizedSlug) {
        return city
      }
    }
    // Try case-insensitive match
    for (const city of availableCities) {
      if (city.toLowerCase() === normalizedSlug) {
        return city
      }
    }
    return null
  }

  useEffect(() => {
    // Load neighborhood data for all cities
    const loadData = async () => {
      try {
        setLoading(true)
        const allData: NeighborhoodData = {}
        
        // Load Monterrey data
        try {
          const monterreyResponse = await fetch('/data/banorte-neighborhood-data-monterrey.json')
          if (monterreyResponse.ok) {
            const monterreyData = await monterreyResponse.json()
            Object.assign(allData, monterreyData)
          }
        } catch (err) {
          console.warn('Failed to load Monterrey data:', err)
        }
        
        // Load CDMX data
        try {
          const cdmxResponse = await fetch('/data/banorte-neighborhood-data-cdmx.json')
          if (cdmxResponse.ok) {
            const cdmxData = await cdmxResponse.json()
            Object.assign(allData, cdmxData)
          }
        } catch (err) {
          console.warn('Failed to load CDMX data:', err)
        }
        
        // Load Jalisco data
        try {
          const jaliscoResponse = await fetch('/data/banorte-neighborhood-data-jalisco.json')
          if (jaliscoResponse.ok) {
            const jaliscoData = await jaliscoResponse.json()
            Object.assign(allData, jaliscoData)
          }
        } catch (err) {
          console.warn('Failed to load Jalisco data:', err)
        }
        
        if (Object.keys(allData).length === 0) {
          throw new Error('Failed to load neighborhood data')
        }
        
        setData(allData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Read city from URL on initial load
  useEffect(() => {
    if (!data || Object.keys(data).length === 0 || !router.isReady || cityRestoredRef.current) return
    
    const cities = Object.keys(data)
    const urlCity = router.query.city as string | undefined
    
    if (urlCity) {
      const decodedCity = slugToCity(decodeURIComponent(urlCity), cities)
      if (decodedCity && cities.includes(decodedCity)) {
        setSelectedCity(decodedCity)
        cityRestoredRef.current = true
        return
      }
    }
    
    // No valid city in URL, set default only if current selectedCity is not valid
    const currentCityIsValid = cities.includes(selectedCity)
    if (!currentCityIsValid) {
      const preferredCity = cities.includes('Ciudad de México') ? 'Ciudad de México' : cities[0]
      setSelectedCity(preferredCity)
    }
    cityRestoredRef.current = true
  }, [data, router.query.city, router.isReady])
  
  // Track previous city to detect user-initiated changes
  const previousCityRef = useRef<string | null>(null)
  
  // Sync city changes to URL (only for user-initiated changes, not restoration)
  useEffect(() => {
    // Don't sync until restoration is complete
    if (!cityRestoredRef.current) {
      // Store initial city for comparison
      if (selectedCity) {
        previousCityRef.current = selectedCity
      }
      return
    }
    if (!data || !selectedCity || Object.keys(data).length === 0 || !router.isReady) return
    
    const currentCitySlug = router.query.city as string | undefined
    const newCitySlug = cityToSlug(selectedCity)
    
    // Normalize both slugs for comparison (handle URL encoding)
    const normalizedCurrent = currentCitySlug ? decodeURIComponent(currentCitySlug).toLowerCase() : null
    const normalizedNew = newCitySlug.toLowerCase()
    
    // Only update URL if:
    // 1. The city slug in URL doesn't match the selected city, AND
    // 2. This is a user-initiated change (city actually changed from previous value)
    const isUserChange = previousCityRef.current !== null && previousCityRef.current !== selectedCity
    const urlNeedsUpdate = normalizedCurrent !== normalizedNew
    
    // If URL already has the correct city, don't update (preserve all params)
    if (!urlNeedsUpdate) {
      previousCityRef.current = selectedCity
      return
    }
    
    // Only update if this is a user-initiated change
    if (isUserChange) {
      const query: Record<string, string> = { city: newCitySlug }
      // When city changes, remove municipality and neighborhood (they're city-specific)
      // Don't copy other query params that might be invalid for the new city
      
      router.replace(
        {
          pathname: router.pathname,
          query
        },
        undefined,
        { shallow: true }
      )
    }
    
    // Update previous city ref
    previousCityRef.current = selectedCity
  }, [selectedCity, data, router.isReady, router.query.city])

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

  // Get meta tags - use server-side props on initial load, then update client-side
  const [metaTags, setMetaTags] = useState<MetaTags>(initialMetaTags || {
    title: t('map.meta.default_title'),
    description: t('map.meta.default_description'),
    url: `${baseUrl}${currentPath}`,
    image: `${baseUrl}/og-image.png`,
  })
  
  // Update meta tags when URL changes
  useEffect(() => {
    if (!router.isReady) return
    
    const city = router.query.city as string | undefined
    const municipality = router.query.municipality as string | undefined
    const neighborhood = router.query.neighborhood as string | undefined
    const chart = router.query.chart as string | undefined
    
    const newMetaTags = generateMetaTags(city, municipality, neighborhood, chart, baseUrl, currentPath, t)
    setMetaTags(newMetaTags)
  }, [router.isReady, router.query.city, router.query.municipality, router.query.neighborhood, router.query.chart, baseUrl, currentPath, t])

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{metaTags.title}</title>
        <meta name="title" content={metaTags.title} />
        <meta name="description" content={metaTags.description} />
        <link rel="canonical" href={`${baseUrl}/map`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={metaTags.url} />
        <meta property="og:title" content={metaTags.title} />
        <meta property="og:description" content={metaTags.description} />
        <meta property="og:image" content={metaTags.image} />
        <meta property="og:site_name" content="PropTrenz" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={metaTags.url} />
        <meta name="twitter:title" content={metaTags.title} />
        <meta name="twitter:description" content={metaTags.description} />
        <meta name="twitter:image" content={metaTags.image} />
        
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
      <Layout title={t('map.title')} subtitle={t('map.subtitle')}>
        <div className="space-y-4 sm:space-y-6">
          <Card className="p-3 sm:p-6">
              {loading && (
                <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">{t('map.loading_neighborhood_data')}</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">{t('map.error_loading_data')}: {error}</p>
                  <p className="text-sm text-red-500 mt-2">
                    {t('map.data_files_required')}
                    <br />• /public/data/banorte-neighborhood-data-monterrey.json
                    <br />• /public/data/banorte-neighborhood-data-cdmx.json
                    <br />• /public/data/banorte-neighborhood-data-jalisco.json
                  </p>
                </div>
              )}

              {data && !loading && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <label className="text-sm font-medium whitespace-nowrap">{t('map.city')}:</label>
                      <div className="flex-1 sm:flex-none">
                        <Select value={selectedCity} onValueChange={setSelectedCity}>
                          <SelectTrigger className="w-full sm:w-[200px]">
                            <span>{selectedCity}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(data).map(city => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Share Button */}
                    <button
                      onClick={async () => {
                        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
                        const currentPath = router.asPath.split('?')[0]
                        const shareableUrl = `${baseUrl}${currentPath}?${new URLSearchParams(router.query as Record<string, string>).toString()}`
                        try {
                          await navigator.clipboard.writeText(shareableUrl)
                          setShareCopied(true)
                          setTimeout(() => setShareCopied(false), 2000)
                        } catch (err) {
                          console.error('Failed to copy URL:', err)
                          // Fallback: select text in a temporary input
                          const input = document.createElement('input')
                          input.value = shareableUrl
                          document.body.appendChild(input)
                          input.select()
                          document.execCommand('copy')
                          document.body.removeChild(input)
                          setShareCopied(true)
                          setTimeout(() => setShareCopied(false), 2000)
                        }
                      }}
                      className="bg-white hover:bg-gray-50 px-3 py-2 rounded-lg shadow-sm flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors border border-gray-200"
                      title={shareCopied ? t('map.link_copied', 'Link copied!') : t('map.share_map', 'Share map')}
                    >
                      {shareCopied ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-green-600">{t('map.copied', 'Copied!')}</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="h-4 w-4" />
                          <span>{t('map.share', 'Share')}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Lead Form CTA - Show when neighborhood is selected */}
                  {router.query.neighborhood && (
                    <div className="mb-6 rounded-lg bg-blue-50 border border-blue-100 p-6">
                      <div className="flex items-start gap-4">
                        <MessageCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {t('leads.map_cta_title', 'Need help finding your perfect property?')}
                          </h3>
                          <p className="text-gray-600 mb-2">
                            {t('leads.map_cta_description', 'Connect with a vetted real estate expert who can find you great opportunities.')}
                          </p>
                          <p className="text-sm text-gray-600 italic mb-1">
                            {t('leads.cta_social_proof', '47 investors got connected last month 🤝')}
                          </p>
                          <Button
                            onClick={() => setShowLeadForm(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {t('leads.cta_button', 'Get Expert Help >')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {data[selectedCity] && (
                    <NeighborhoodMap 
                      key={selectedCity}
                      data={{ [selectedCity]: data[selectedCity] }}
                      selectedCity={selectedCity}
                    />
                  )}
                </div>
              )}
          </Card>
        </div>

        <LeadForm
          isOpen={showLeadForm}
          onClose={() => setShowLeadForm(false)}
          source="map"
          context={{
            city: router.query.city ? (() => {
              const encoded = router.query.city as string
              try {
                return decodeURIComponent(encoded).replace(/-/g, ' ')
              } catch {
                return encoded.replace(/-/g, ' ')
              }
            })() : selectedCity,
            municipality: router.query.municipality ? (() => {
              const encoded = router.query.municipality as string
              try {
                return decodeURIComponent(encoded).replace(/-/g, ' ')
              } catch {
                return encoded.replace(/-/g, ' ')
              }
            })() : undefined,
            neighborhood: router.query.neighborhood ? (() => {
              const encoded = router.query.neighborhood as string
              try {
                return decodeURIComponent(encoded).replace(/-/g, ' ')
              } catch {
                return encoded.replace(/-/g, ' ')
              }
            })() : undefined,
          }}
        />
      </Layout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ locale, defaultLocale, query, req }) => {
  // CRITICAL FIX: When locale is undefined (default locale route), use defaultLocale
  const validLocale = locale || defaultLocale || 'en'
  
  // Load translations for server-side rendering
  const { _nextI18Next } = await serverSideTranslations(validLocale, ['common'])
  const translations = _nextI18Next?.initialI18nStore?.[validLocale]?.common || {}
  
  // Create a simple translation function for server-side use
  const t = (key: string, options?: any): string => {
    let value = translations
    const keys = key.split('.')
    for (const k of keys) {
      value = value?.[k]
    }
    if (typeof value !== 'string') return key
    
    // Simple interpolation for {{variable}} placeholders
    if (options) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return options[varName] || match
      })
    }
    return value
  }
  
  // Generate meta tags server-side based on query parameters
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (req.headers.host ? `https://${req.headers.host}` : 'https://proptrenz.com')
  const currentPath = '/map'
  
  const city = query.city as string | undefined
  const municipality = query.municipality as string | undefined
  const neighborhood = query.neighborhood as string | undefined
  const chart = query.chart as string | undefined
  
  const initialMetaTags = generateMetaTags(city, municipality, neighborhood, chart, baseUrl, currentPath, t)
  
  return {
    props: {
      ...(await serverSideTranslations(validLocale, ['common'])),
      initialMetaTags,
    },
  }
}

