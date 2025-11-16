import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { Layout } from '@/components/Layout'
import { GeographicNavigator } from '@/components/navigation/GeographicNavigator'
import { PriceChart } from '@/components/charts/PriceChart'
import { Card } from '@/components/ui/card'
import { db } from '@/lib/supabase'
import { GetServerSideProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'

export default function ChartsPage() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [selectedLocationName, setSelectedLocationName] = useState<string>('')
  const [selectedLocationType, setSelectedLocationType] = useState<string>('')

  const handleLocationSelect = async (locationId: string) => {
    setSelectedLocationId(locationId)
    
    // Fetch location details to get the actual name and type
    try {
      const result = await db.getLocationById(locationId)
      if (result.data) {
        const loc = result.data as any
        const displayName = (loc.name === 'Benito Juárez' && loc.state === 'Quintana Roo')
          ? `${loc.name} (Cancún)`
          : loc.name
        setSelectedLocationName(displayName)
        setSelectedLocationType(result.data.type)
      } else {
        setSelectedLocationName('Unknown Location')
        setSelectedLocationType('unknown')
      }
    } catch (error) {
      console.error('Error fetching location details:', error)
      setSelectedLocationName('Unknown Location')
      setSelectedLocationType('unknown')
    }
  }

  // Load location from query parameter if present
  useEffect(() => {
    const locationId = router.query.location as string
    if (locationId && locationId !== selectedLocationId && router.isReady) {
      handleLocationSelect(locationId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.location, router.isReady])

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
      <Layout title={t('charts.title')} subtitle={t('charts.subtitle')}>
        <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GeographicNavigator
            onLocationSelect={handleLocationSelect}
            selectedLocationId={selectedLocationId}
          />

          {selectedLocationId ? (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedLocationName}
                    </h3>
                    <p className="text-sm text-gray-600 capitalize">
                      {t(`navigation.${selectedLocationType}`)} {t('charts.level')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{t('charts.selected_location')}</p>
                  </div>
                </div>
              </Card>
              
              <PriceChart
                key={selectedLocationId}
                locationId={selectedLocationId}
                locationName={selectedLocationName}
              />
            </div>
          ) : (
            <Card className="p-6 flex items-center justify-center h-96">
              <div className="text-center text-gray-500">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('charts.no_location_title')}</h3>
                <p className="text-gray-600">{t('charts.no_location_help')}</p>
              </div>
            </Card>
          )}
        </div>
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

