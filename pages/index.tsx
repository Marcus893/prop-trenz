import React, { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogoSVG } from '@/components/ui/Logo'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { AuthForm } from '@/components/auth/AuthForm'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import { 
  TrendingUp, 
  MapPin, 
  BarChart3, 
  Calculator, 
  ArrowRight,
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Area, AreaChart } from 'recharts'
import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { db } from '@/lib/supabase'
import { useTracking } from '@/lib/useTracking'

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
  const router = useRouter()
  const { track } = useTracking()
  const [showAuth, setShowAuth] = useState(false)

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup')

  // Check for signup modal trigger (localStorage or hash)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const checkSignup = () => {
      // Check hash first (most reliable)
      if (window.location.hash === '#signup') {
        console.log('[Signup] Hash detected, opening modal')
        setShowAuth(true)
        setAuthMode('signup')
        // Remove hash from URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        return true
      }
      
      // Check localStorage flag
      const showSignup = localStorage.getItem('showSignupModal')
      if (showSignup === 'true') {
        console.log('[Signup] localStorage flag detected, opening modal')
        setShowAuth(true)
        setAuthMode('signup')
        localStorage.removeItem('showSignupModal')
        return true
      }
      
      return false
    }
    
    // Check immediately on mount
    checkSignup()
    
    // Check after router events
    const handleRouteChangeComplete = () => {
      setTimeout(() => checkSignup(), 100)
    }
    
    router.events.on('routeChangeComplete', handleRouteChangeComplete)
    
    // Also check on hash change
    const handleHashChange = () => {
      checkSignup()
    }
    window.addEventListener('hashchange', handleHashChange)
    
    // Check periodically for localStorage changes (when navigating from another page)
    const interval = setInterval(() => {
      if (!showAuth) { // Only check if modal isn't already open
        checkSignup()
      }
    }, 200)
    
    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete)
      window.removeEventListener('hashchange', handleHashChange)
      clearInterval(interval)
    }
  }, [router, showAuth])

  // Format trend data for chart
  const chartData = nationalTrend.map((point) => ({
    period: `${point.year}Q${point.quarter}`,
    value: Number(point.index_value),
    year: point.year,
    quarter: point.quarter
  }))

  const getMiniYAxisDomain = () => {
    if (!chartData || chartData.length === 0) return [0, 100]
    const values = chartData.map(p => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = Math.max(1, max - min)
    const pad = range * 0.15
    return [Math.max(0, min - pad), max + pad]
  }

  const handleExploreCharts = () => {
    track('home_explore_charts_clicked')
    router.push('/charts')
  }

  const handleExploreCalculators = () => {
    track('home_explore_calculators_clicked')
    router.push('/calculators')
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Hero Section */}
        <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400 opacity-10 rounded-full -ml-24 -mb-24"></div>
          
          <div className="relative z-10">
            <div className="flex justify-center mb-6 animate-fade-in">
              <LogoSVG showText={true} size="lg" className="text-white" style={{ height: '80px', width: 'auto' }} />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 animate-slide-up">
              {t('home.hero_title', 'Mexican Real Estate Intelligence')}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 animate-slide-up delay-100">
              {t('home.hero_description', 'Explore Price Trends, Calculate Costs, and Make Informed Decisions')}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8 animate-slide-up delay-200">
              <Button
                onClick={handleExploreCharts}
                className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <BarChart3 className="mr-2 h-5 w-5" />
                {t('home.explore_charts', 'Explore Charts')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                onClick={handleExploreCalculators}
                className="bg-blue-500 text-white hover:bg-blue-400 px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 border-blue-400"
              >
                <Calculator className="mr-2 h-5 w-5" />
                {t('home.calculate_costs', 'Calculate Costs')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 md:gap-8 animate-slide-up delay-300">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 hover:bg-white/20 transition-colors">
                <TrendingUp className="h-5 w-5" />
                <span className="font-semibold">{t('home.years_of_data', '20+ Years of Data')}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 hover:bg-white/20 transition-colors">
                <MapPin className="h-5 w-5" />
                <span className="font-semibold">{t('home.states_and_cities', '32 States & 100+ Cities')}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 hover:bg-white/20 transition-colors">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold">{t('home.interactive_tools', 'Interactive Tools')}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-lg transition-shadow duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('home.national_snapshot', 'National Snapshot')}</h3>
              <Zap className="h-5 w-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
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
            
            {/* Mini Trend Chart */}
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

          <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
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
              {topMoversStates.map((m, idx) => (
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
                    <span className="whitespace-normal break-words hyphens-auto leading-snug text-left">{m.name}</span>
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

          <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
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
              {topMoversCities.map((m, idx) => {
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
                      <span className="whitespace-normal break-words hyphens-auto leading-snug text-left">{displayName}</span>
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
        {/* Main Content removed from home to keep page focused */}

        {/* Quick Actions */}
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <h2 className="text-2xl font-bold mb-4 text-center text-gray-900">
            {t('home.quick_actions_title', 'Get Started')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleExploreCharts}
              className="p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all duration-300 text-left group"
            >
              <BarChart3 className="h-8 w-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900">
                {t('home.explore_charts_action', 'Explore Price Charts')}
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                {t('home.explore_charts_action_desc', 'View interactive charts for any location')}
              </p>
              <span className="text-blue-600 font-medium text-sm flex items-center group-hover:translate-x-1 transition-transform">
                {t('home.get_started', 'Get Started')}
                <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </button>

            <button
              onClick={handleExploreCalculators}
              className="p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-green-500 hover:shadow-lg transition-all duration-300 text-left group"
            >
              <Calculator className="h-8 w-8 text-green-600 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900">
                {t('home.calculate_costs_action', 'Calculate Costs')}
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                {t('home.calculate_costs_action_desc', 'Estimate buying, owning, and selling costs')}
              </p>
              <span className="text-green-600 font-medium text-sm flex items-center group-hover:translate-x-1 transition-transform">
                {t('home.calculate_now', 'Calculate Now')}
                <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </button>

            <button
              onClick={() => router.push('/map')}
              className="p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-purple-500 hover:shadow-lg transition-all duration-300 text-left group"
            >
              <MapPin className="h-8 w-8 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900">
                {t('home.explore_map_action', 'Explore Map')}
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                {t('home.explore_map_action_desc', 'Visualize data on an interactive map')}
              </p>
              <span className="text-purple-600 font-medium text-sm flex items-center group-hover:translate-x-1 transition-transform">
                {t('home.view_map', 'View Map')}
                <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </button>
          </div>
        </Card>
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAuth(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <AuthForm 
                mode={authMode} 
                onModeChange={setAuthMode}
                onClose={() => setShowAuth(false)}
                className="border-0"
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale, defaultLocale }) => {
  // CRITICAL FIX: When locale is undefined (default locale route), Next.js doesn't pass it
  // but defaultLocale is available. We must use defaultLocale if locale is undefined
  // For the default locale route (/), locale can be undefined, so we need to explicitly use 'en'
  const validLocale = locale || defaultLocale || 'en'
  
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

  // Always load translations - this is critical for the default locale
  // Pass the i18n config to ensure proper locale resolution
  const translations = await serverSideTranslations(validLocale, ['common'])
  
  return {
    props: {
      ...translations,
      nationalSnapshot,
      nationalTrend,
      topMoversStates,
      topMoversCities,
    },
    revalidate: 60 * 60 // revalidate hourly; can be increased
  }
}

