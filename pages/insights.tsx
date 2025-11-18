import React, { useMemo } from 'react'
import Head from 'next/head'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import { Zap, ChevronRight } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts'
import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { db } from '@/lib/supabase'
import { useTracking } from '@/lib/useTracking'

type TopMover = { id: string; name: string; growthYoY: number; state?: string }

interface InsightsProps {
  nationalSnapshot: {
    latest: number
    yoy: number
    qoq: number
  }
  nationalTrend: Array<{ year: number; quarter: number; index_value: number }>
  topMoversStates: TopMover[]
  topMoversCities: TopMover[]
}

export default function InsightsPage({ nationalSnapshot, nationalTrend = [], topMoversStates, topMoversCities }: InsightsProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { track } = useTracking()

  // Format trend data for chart
  const chartData = useMemo(() => {
    return nationalTrend.map((point) => ({
      period: `${point.year}Q${point.quarter}`,
      value: Number(point.index_value),
      year: point.year,
      quarter: point.quarter
    }))
  }, [nationalTrend])

  const handleExploreCharts = () => {
    track('insights_explore_charts_clicked')
    router.push('/charts')
  }

  return (
    <>
      <Head>
        <title>{t('insights.page_title', 'Market Insights - PropTrenz')}</title>
        <meta name="description" content={t('insights.page_description', 'Explore real estate market insights, top movers, and national trends in Mexico.')} />
      </Head>
      <Layout hideHeader>
        <div className="min-h-screen bg-gray-50 relative -my-6 lg:-mr-8 lg:ml-0 lg:pr-8">
          {/* Header */}
          <section className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white py-12 md:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:pr-8">
              {/* Title and Language Selector Row */}
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                  {t('insights.page_title', 'Market Insights')}
                </h1>
                <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-1">
                  <LanguageSwitcher />
                </div>
              </div>
              <p className="text-xl md:text-2xl text-blue-100 max-w-3xl">
                {t('insights.page_subtitle', 'Real-time data across Mexico\'s real estate market')}
              </p>
            </div>
          </section>

          {/* Quick Insights - National Snapshot */}
          {nationalSnapshot && (
            <section className="bg-white py-16 md:py-20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:pr-8">
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{t('home.national_snapshot', 'National Snapshot')}</h3>
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1">
                        <div className="text-gray-600 text-sm">{t('home.yoy', 'YoY')}</div>
                        <div className={`text-3xl font-bold ${nationalSnapshot.yoy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <AnimatedCounter value={nationalSnapshot.yoy} suffix="%" decimals={1} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-gray-600 text-sm">{t('home.qoq', 'QoQ')}</div>
                        <div className={`text-3xl font-bold ${nationalSnapshot.qoq >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <AnimatedCounter value={nationalSnapshot.qoq} suffix="%" decimals={1} />
                        </div>
                      </div>
                    </div>
                    
                    {chartData.length > 0 && (
                      <div className="mt-4 h-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData.slice(-8)}>
                            <defs>
                              <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#3b82f6" 
                              strokeWidth={2}
                              fill="url(#colorTrend)"
                              dot={false}
                            />
                            <XAxis 
                              dataKey="period" 
                              tick={{ fontSize: 10 }}
                              interval="preserveStartEnd"
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'white', 
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '12px'
                              }}
                              formatter={(value: number) => [`${value.toFixed(1)}`, 'Index']}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </Card>

                  <Card className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{t('home.top_movers_states_yoy', 'Top Movers (States) – YoY')}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleExploreCharts}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {t('home.view_all', 'View All')}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {topMoversStates.slice(0, 5).map((m, idx) => (
                        <div
                          key={`${m.name}-${idx}`}
                          className="w-full flex items-start justify-between rounded-md border border-gray-200 px-3 py-2 bg-white"
                        >
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <span className={`text-xs w-6 h-6 inline-flex items-center justify-center rounded font-semibold ${
                              idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                              idx === 1 ? 'bg-gray-100 text-gray-700' :
                              idx === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-50 text-blue-600'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="whitespace-normal break-words leading-snug text-left">{m.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`font-semibold ${m.growthYoY >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {m.growthYoY >= 0 ? '+' : ''}{m.growthYoY.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{t('home.top_movers_municipalities_yoy', 'Top Movers (Municipalities) – YoY')}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleExploreCharts}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {t('home.view_all', 'View All')}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {topMoversCities.slice(0, 5).map((m, idx) => {
                        const displayName = (m.name === 'Benito Juárez' && m.state === 'Quintana Roo') 
                          ? `${m.name} (Cancún)` 
                          : m.name
                        return (
                          <div
                            key={`${m.state || 'na'}-${m.name}-${idx}`}
                            className="w-full flex items-start justify-between rounded-md border border-gray-200 px-3 py-2 bg-white"
                          >
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <span className={`text-xs w-6 h-6 inline-flex items-center justify-center rounded font-semibold ${
                                idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                idx === 1 ? 'bg-gray-100 text-gray-700' :
                                idx === 2 ? 'bg-orange-100 text-orange-700' :
                                'bg-green-50 text-green-700'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className="whitespace-normal break-words leading-snug text-left">{displayName}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`font-semibold ${m.growthYoY >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {m.growthYoY >= 0 ? '+' : ''}{m.growthYoY.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                </div>
              </div>
            </section>
          )}
        </div>
      </Layout>
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale, defaultLocale }) => {
  const validLocale = locale || defaultLocale || 'en'
  
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
  } catch (e) {
    console.error('Error fetching insights:', e)
  }

  const translations = await serverSideTranslations(validLocale, ['common'])
  
  return {
    props: {
      ...translations,
      nationalSnapshot,
      nationalTrend,
      topMoversStates,
      topMoversCities,
    },
    revalidate: 60 * 60
  }
}

