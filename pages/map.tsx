import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { MapPin, Loader2 } from 'lucide-react'
import { GetServerSideProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'

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

export default function MapPage() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [data, setData] = useState<NeighborhoodData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string>('Ciudad de México')

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

  // Set default city when data is loaded (prefer CDMX)
  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      const cities = Object.keys(data)
      if (!cities.includes(selectedCity)) {
        // Prefer Ciudad de México if available, otherwise use first city
        const preferredCity = cities.includes('Ciudad de México') ? 'Ciudad de México' : cities[0]
        setSelectedCity(preferredCity)
      }
    }
  }, [data, selectedCity])

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
        <div className="space-y-6">
          <Card className="p-6">
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
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">{t('map.city')}:</label>
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger className="w-[200px]">
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
                  
                  {data[selectedCity] && (
                    <NeighborhoodMap 
                      key={selectedCity} 
                      data={{ [selectedCity]: data[selectedCity] }} 
                    />
                  )}
                </div>
              )}
          </Card>
        </div>
      </Layout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ locale, defaultLocale }) => {
  // CRITICAL FIX: When locale is undefined (default locale route), use defaultLocale
  const validLocale = locale || defaultLocale || 'en'
  
  return {
    props: {
      ...(await serverSideTranslations(validLocale, ['common'])),
    },
  }
}

