'use client'

import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { Card } from '@/components/ui/card'
import { TrendingUp, TrendingDown, X as XIcon } from 'lucide-react'
import { useTranslation } from 'next-i18next'

interface NeighborhoodDataPoint {
  mes: string
  precio: string
  date: Date
  price: number
  displayDate: string
}

interface NeighborhoodPriceChartProps {
  neighborhoodName: string
  municipality: string
  data: NeighborhoodDataPoint[]
  onClose: () => void
  translateDate: (dateString: string) => string
}

export function NeighborhoodPriceChart({
  neighborhoodName,
  municipality,
  data,
  onClose,
  translateDate
}: NeighborhoodPriceChartProps) {
  const { t, i18n } = useTranslation('common')

  // Sort data by date
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [data])

  // Helper function to get quarter from date
  const getQuarter = (date: Date): { year: number; quarter: number } => {
    const month = date.getMonth() // 0-11
    const quarter = Math.floor(month / 3) + 1 // 1-4
    return { year: date.getFullYear(), quarter }
  }

  // Calculate growth metrics
  const growthMetrics = useMemo(() => {
    if (sortedData.length < 2) return null

    const latest = sortedData[sortedData.length - 1]
    const oldest = sortedData[0]

    // Quarter-over-quarter growth (QoQ)
    // Group data by quarter and calculate average price per quarter
    const quarters = new Map<string, { prices: number[]; dates: Date[] }>()
    
    sortedData.forEach(point => {
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

    // Year-over-year growth (only if we have at least 12 months of data)
    // Check if there's data from the same month one year ago
    let yoyGrowth: number | null = null
    if (sortedData.length > 0) {
      const latestDate = latest.date
      const oneYearAgo = new Date(latestDate)
      oneYearAgo.setFullYear(latestDate.getFullYear() - 1)
      
      // Find data point from approximately one year ago (same month, previous year)
      const yearAgoData = sortedData.find(point => {
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
  }, [sortedData])

  const formatPrice = (value: number) => {
    return `$${Math.round(value).toLocaleString('es-MX')}/m²`
  }

  const formatTooltipValue = (value: number) => {
    return formatPrice(value)
  }

  // Calculate Y-axis domain to center the line
  const getYAxisDomain = useMemo(() => {
    if (sortedData.length === 0) return [0, 100000] as [number, number]
    const prices = sortedData.map(d => d.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min
    
    // Use 15% padding on each side for better visualization
    // If range is very small (less than 10% of min), use 10% of min as minimum padding
    const minPadding = min * 0.1
    const rangePadding = range * 3
    const padding = Math.max(minPadding, rangePadding)
    
    return [Math.max(0, min - padding), max + padding] as [number, number]
  }, [sortedData])

  // Determine if we should show quarterly labels (if there's a year or more of data)
  const shouldShowQuarterlyLabels = useMemo(() => {
    if (sortedData.length < 12) return false
    const firstDate = sortedData[0].date
    const lastDate = sortedData[sortedData.length - 1].date
    const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                       (lastDate.getMonth() - firstDate.getMonth())
    return monthsDiff >= 12
  }, [sortedData])

  // Get unique quarters from the data for quarterly labeling
  const uniqueQuarters = useMemo(() => {
    if (!shouldShowQuarterlyLabels) return new Set<string>()
    
    const quarters = new Set<string>()
    sortedData.forEach(point => {
      const date = point.date
      const year = date.getFullYear()
      const quarter = Math.floor(date.getMonth() / 3) + 1
      quarters.add(`${year}-Q${quarter}`)
    })
    return quarters
  }, [shouldShowQuarterlyLabels, sortedData])

  // Custom tick formatter for X-axis - always show quarterly labels for consistency
  const formatXAxisTick = useMemo(() => {
    // Get current language for quarter label format
    const locale = i18n.language?.slice(0, 2) || 'en'
    
    // Determine quarter prefix based on language
    // English: Q, Spanish: T (Trimestre), Chinese: Q
    const quarterPrefix = locale === 'es' ? 'T' : 'Q'
    
    // Always use quarterly labels for consistency across all cities
    return (tickItem: string) => {
      // Find the data point that matches this displayDate
      const dataPoint = sortedData.find(d => d.displayDate === tickItem)
      if (!dataPoint) return ''
      
      const date = dataPoint.date
      const year = date.getFullYear()
      const month = date.getMonth() // 0-11
      const quarter = Math.floor(month / 3) + 1 // 1-4
      const quarterKey = `${year}-${quarterPrefix}${quarter}`
      
      // Show label if this is the first occurrence of this quarter in the data
      // Check if this is the first data point for this quarter
      const isFirstInQuarter = sortedData.findIndex(d => {
        const dYear = d.date.getFullYear()
        const dQuarter = Math.floor(d.date.getMonth() / 3) + 1
        return `${dYear}-${quarterPrefix}${dQuarter}` === quarterKey
      }) === sortedData.findIndex(d => d.displayDate === tickItem)
      
      if (isFirstInQuarter) {
        return `${year}/${quarterPrefix}${quarter}`
      }
      return ''
    }
  }, [sortedData, i18n.language])

  return (
    <Card className="p-4 md:p-6 bg-white shadow-lg">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">
            {neighborhoodName}
          </h3>
          {municipality && <p className="text-sm text-gray-600">{municipality}</p>}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={t('map.close')}
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Growth Metrics */}
      {growthMetrics && (
        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
          {growthMetrics.qoq !== null && (
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('map.qoq_growth', 'QoQ Growth')}</p>
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
              <p className="text-xs text-gray-500 mb-1">{t('map.yoy_growth', 'YoY Growth')}</p>
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

      {/* Chart */}
      {sortedData.length > 0 ? (
        <div className="w-full" style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sortedData} margin={{ top: 5, right: 25, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="displayDate"
                stroke="#6b7280"
                fontSize={11}
                tick={{ fill: '#6b7280' }}
                angle={0}
                textAnchor="middle"
                height={20}
                interval={0}
                tickFormatter={formatXAxisTick}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
                tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                domain={getYAxisDomain}
                width={50}
                label={{ 
                  value: t('map.selling_price_per_m2', 'Selling Price per m²'), 
                  angle: -90, 
                  position: 'left',
                  style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
                }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatTooltipValue(value),
                  t('map.selling_price_per_m2', 'Selling Price per m²')
                ]}
                labelFormatter={(label) => label}
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
      ) : (
        <div className="text-center py-8 text-gray-500">
          {t('map.no_historical_data', 'No historical data available')}
        </div>
      )}
    </Card>
  )
}

