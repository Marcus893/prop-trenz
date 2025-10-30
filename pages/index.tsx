import React, { useState } from 'react'
import { Layout } from '@/components/Layout'
import { GeographicNavigator } from '@/components/navigation/GeographicNavigator'
import { PriceChart } from '@/components/charts/PriceChart'
import { Card } from '@/components/ui/card'
import { useTranslation } from 'next-i18next'
import { TrendingUp, MapPin, BarChart3 } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { db, Location } from '@/lib/supabase'

type TopMover = { id: string; name: string; growthYoY: number; state?: string }

interface HomeProps {
  nationalSnapshot: {
    latest: number
    yoy: number
    qoq: number
  }
  nationalTrend: Array<{ year: number; quarter: number; index_value: number }>
  topMoversStates: TopMover[]
  topMoversCities: TopMover[]
}

export default function HomePage({ nationalSnapshot, nationalTrend = [], topMoversStates, topMoversCities }: HomeProps) {
  const { t } = useTranslation('common')
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [selectedLocationName, setSelectedLocationName] = useState<string>('')

  const getMiniYAxisDomain = () => {
    if (!nationalTrend || nationalTrend.length === 0) return [0, 100]
    const values = nationalTrend.map(p => Number(p.index_value))
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = Math.max(1, max - min)
    const pad = range * 0.15
    return [Math.max(0, min - pad), max + pad]
  }

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId)
    // In a real app, you'd fetch the location name from the database
    setSelectedLocationName('Selected Location')
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Hero Section */}
        <Card className="p-8 text-center bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <h1 className="text-4xl font-bold mb-4">PropTrenz</h1>
          <p className="text-xl mb-6">
            {t('home.hero_description')}
          </p>
          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <span>{t('home.years_of_data')}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <span>{t('home.states_and_cities')}</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <span>{t('home.interactive_charts')}</span>
            </div>
          </div>
        </Card>

        {/* Quick Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">{t('home.national_snapshot', 'National Snapshot')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-gray-600 text-sm">{t('home.yoy', 'YoY')}</div>
                <div className={`text-2xl font-semibold ${nationalSnapshot.yoy >= 0 ? 'text-green-600' : 'text-red-600'}`}>{nationalSnapshot.yoy.toFixed(1)}%</div>
              </div>
              <div className="space-y-1">
                <div className="text-gray-600 text-sm">{t('home.qoq', 'QoQ')}</div>
                <div className={`text-2xl font-semibold ${nationalSnapshot.qoq >= 0 ? 'text-green-600' : 'text-red-600'}`}>{nationalSnapshot.qoq.toFixed(1)}%</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">{t('home.top_movers_states_yoy', 'Top Movers (States) – YoY')}</h3>
            <div className="space-y-2">
              {topMoversStates.map((m, idx) => (
                <div key={`${m.name}-${idx}`} className="flex items-start justify-between rounded-md border border-gray-200 px-3 py-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-xs w-6 h-6 inline-flex items-center justify-center rounded bg-blue-50 text-blue-600 font-semibold">{idx + 1}</span>
                    <span className="whitespace-normal break-words hyphens-auto leading-snug">{m.name}</span>
                  </div>
                  <span className={`${m.growthYoY >= 0 ? 'text-green-600' : 'text-red-600'} font-semibold ml-3 shrink-0`}>{m.growthYoY.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">{t('home.top_movers_municipalities_yoy', 'Top Movers (Municipalities) – YoY')}</h3>
            <div className="space-y-2">
              {topMoversCities.map((m, idx) => (
                <div key={`${m.state || 'na'}-${m.name}-${idx}`} className="flex items-start justify-between rounded-md border border-gray-200 px-3 py-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-xs w-6 h-6 inline-flex items-center justify-center rounded bg-green-50 text-green-700 font-semibold">{idx + 1}</span>
                    <span className="whitespace-normal break-words hyphens-auto leading-snug">{(m.name === 'Benito Juárez' && m.state === 'Quintana Roo') ? `${m.name} (Cancún)` : m.name}</span>
                  </div>
                  <span className={`${m.growthYoY >= 0 ? 'text-green-600' : 'text-red-600'} font-semibold ml-3 shrink-0`}>{m.growthYoY.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        {/* Main Content removed from home to keep page focused */}

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold mb-2">{t('home.historical_data_title')}</h3>
            <p className="text-gray-600">
              {t('home.historical_data_description')}
            </p>
          </Card>

          <Card className="p-6 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h3 className="text-lg font-semibold mb-2">{t('home.geographic_coverage_title')}</h3>
            <p className="text-gray-600">
              {t('home.geographic_coverage_description')}
            </p>
          </Card>

          <Card className="p-6 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-purple-600" />
            <h3 className="text-lg font-semibold mb-2">{t('home.interactive_charts_title')}</h3>
            <p className="text-gray-600">
              {t('home.interactive_charts_description')}
            </p>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  // Read precomputed insights from DB; fall back safely if not present
  let nationalSnapshot = { latest: 0, yoy: 0, qoq: 0 }
  let nationalTrend: Array<{ year: number; quarter: number; index_value: number }> = []
  let topMoversStates: TopMover[] = []
  let topMoversCities: TopMover[] = []

  try {
    const { data: insights } = await db.getInsights()
    if (insights) {
      nationalSnapshot = { latest: 0, yoy: Number(insights.national_yoy) || 0, qoq: Number(insights.national_qoq) || 0 }
      topMoversStates = (insights.top_states || []).map((x: any) => ({ id: x.id, name: x.name, growthYoY: Number(x.growthYoY) }))
      topMoversCities = (insights.top_municipalities || []).map((x: any) => ({ id: x.id, name: x.name, state: x.state, growthYoY: Number(x.growthYoY) }))
    }
  } catch (e) {}

  return {
    props: {
      ...(await serverSideTranslations((locale as string) || 'en', ['common'])),
      nationalSnapshot,
      nationalTrend,
      topMoversStates,
      topMoversCities,
    },
    revalidate: 60 * 60 // revalidate hourly; can be increased
  }
}

