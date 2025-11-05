import React, { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { MapPin, Loader2 } from 'lucide-react'
import { GetServerSideProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
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
  const [data, setData] = useState<NeighborhoodData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string>('Ciudad de México')

  useEffect(() => {
    // Load neighborhood data for both cities
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

  return (
    <Layout>
      <div className="space-y-6">
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            {t('map.title')}
          </h1>
          <p className="text-gray-600 mb-4">
            {t('map.subtitle')}
          </p>

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
              </p>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">{t('map.city')}:</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  {Object.keys(data).map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
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
  )
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  }
}

