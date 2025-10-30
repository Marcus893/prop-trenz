import React, { useState } from 'react'
import { Layout } from '@/components/Layout'
import { GeographicNavigator } from '@/components/navigation/GeographicNavigator'
import { PriceChart } from '@/components/charts/PriceChart'
import { Card } from '@/components/ui/card'
import { db } from '@/lib/supabase'
import { GetServerSideProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function ChartsPage() {
  const { t } = useTranslation('common')
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

  return (
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
  )
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  }
}

