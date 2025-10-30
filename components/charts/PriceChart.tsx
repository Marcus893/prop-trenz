'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useTranslation } from 'next-i18next'

interface PriceDataPoint {
  year: number
  quarter: number
  index_value: number
  growth_rate?: number
  period: string
}

interface PriceChartProps {
  locationId: string
  locationName: string
  propertyTypeId?: string
  yearsBack?: number
  className?: string
}

type TimePeriod = '1y' | '2y' | '5y' | '10y' | 'max'

export function PriceChart({ 
  locationId, 
  locationName, 
  propertyTypeId, 
  yearsBack = 20,
  className 
}: PriceChartProps) {
  const { t, i18n } = useTranslation('common')
  const [data, setData] = useState<PriceDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>(propertyTypeId || 'all')
  const [propertyTypes, setPropertyTypes] = useState<any[]>([])
  const [availablePropertyTypes, setAvailablePropertyTypes] = useState<string[]>([])
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>('max')
  const [displayMode, setDisplayMode] = useState<'index' | 'mxn'>('mxn')

  // National anchor method: convert index to MXN by a fixed multiplier
  // Multiplier = national nominal price (MXN) / national current index value
  const NATIONAL_PRICE_MXN = 1862524
  const NATIONAL_INDEX_CURRENT = 191.89
  const INDEX_TO_MXN = NATIONAL_PRICE_MXN / NATIONAL_INDEX_CURRENT

  const getPropertyTypeLabel = (id: string) => {
    if (id === 'all') return t('charts.all_property_types')
    const type = propertyTypes.find((pt) => pt.id === id)
    if (!type) return t('charts.select_property_type')
    const locale = i18n.language?.slice(0, 2) || 'en'
    return (
      (locale === 'es' && type.display_name_es) ||
      (locale === 'zh' && type.display_name_zh) ||
      type.display_name_en
    )
  }

  const getTimePeriodYears = (period: TimePeriod): number => {
    switch (period) {
      case '1y': return 1
      case '2y': return 2
      case '5y': return 5
      case '10y': return 10
      case 'max': return yearsBack
      default: return yearsBack
    }
  }

  const handleTimePeriodChange = (period: TimePeriod) => {
    setSelectedTimePeriod(period)
  }

  const getTimePeriodLabel = (period: TimePeriod): string => {
    const labels = {
      '1y': t('charts.time_periods.1y', '1Y'),
      '2y': t('charts.time_periods.2y', '2Y'),
      '5y': t('charts.time_periods.5y', '5Y'),
      '10y': t('charts.time_periods.10y', '10Y'),
      'max': t('charts.time_periods.max', 'Max')
    }
    return labels[period] || period.toUpperCase()
  }

  const formatMX = (value: number) => {
    if (value == null || isNaN(value)) return ''
    return `$${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)}`
  }

  useEffect(() => {
    loadPropertyTypes()
  }, [])

  useEffect(() => {
    if (locationId) {
      // Reset state when location changes to ensure fresh data
      setData([])
      setError(null)
      loadPriceData()
      loadAvailableTypes()
    }
  }, [locationId, selectedPropertyType, selectedTimePeriod])

  const loadPropertyTypes = async () => {
    try {
      const result = await db.getPropertyTypes()
      if (result.error) throw result.error
      setPropertyTypes(result.data)
    } catch (error) {
      console.error('Error loading property types:', error)
    }
  }

  const loadPriceData = async () => {
    setLoading(true)
    setError(null)

    try {
      const timePeriodYears = getTimePeriodYears(selectedTimePeriod)
      let result = await db.getPriceTrend(
        locationId, 
        selectedPropertyType === 'all' ? undefined : selectedPropertyType,
        timePeriodYears
      )

      if (result.error) throw result.error

      // If no data for selected type, fall back to all types
      if (!result.data || result.data.length === 0) {
        if (selectedPropertyType !== 'all') {
          result = await db.getPriceTrend(locationId, undefined, timePeriodYears)
        }
      }

      const formattedData = (result.data || []).map((point: any) => ({
        ...point,
        period: `${point.year} Q${point.quarter}`,
        growth_rate: point.growth_rate || 0
      }))

      setData(formattedData)
    } catch (error) {
      console.error('Error loading price data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Determine which property types actually have data for the selected location
  const loadAvailableTypes = async () => {
    try {
      if (!locationId || propertyTypes.length === 0) return
      const timePeriodYears = getTimePeriodYears(selectedTimePeriod)
      const checks = await Promise.all(
        propertyTypes.map(async (pt) => {
          const res = await db.getPriceTrend(locationId, pt.id, timePeriodYears)
          return { id: pt.id, hasData: !!res.data && res.data.length > 0 }
        })
      )
      const ids = checks.filter(c => c.hasData).map(c => c.id)
      setAvailablePropertyTypes(ids)
      // If the currently selected type has no data, fall back to 'all'
      if (selectedPropertyType !== 'all' && !ids.includes(selectedPropertyType)) {
        setSelectedPropertyType('all')
      }
    } catch (e) {
      // On error, just hide the filter
      setAvailablePropertyTypes([])
    }
  }

  const formatTooltipValue = (value: number) => {
    if (displayMode === 'mxn') {
      return formatMX(value)
    }
    return value.toFixed(2)
  }

  const formatTooltipLabel = (label: string) => {
    return `${t('charts.period')}: ${label}`
  }

  const calculateGrowthRate = () => {
    if (data.length < 2) return 0
    const first = data[0].index_value
    const last = data[data.length - 1].index_value
    return ((last - first) / first) * 100
  }

  const getGrowthIcon = () => {
    const growth = calculateGrowthRate()
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (growth < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return null
  }

  const getGrowthColor = () => {
    const growth = calculateGrowthRate()
    if (growth > 0) return 'text-green-600'
    if (growth < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const chartData = useMemo(() => {
    if (displayMode !== 'mxn') return data
    return data.map(d => ({ ...d, price_mxn: d.index_value * INDEX_TO_MXN }))
  }, [data, displayMode])

  const getYAxisDomain = () => {
    if (chartData.length === 0) return [0, 100]
    
    const values = chartData.map(d => (displayMode === 'mxn' ? (d as any).price_mxn ?? 0 : d.index_value))
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const range = maxValue - minValue
    
    // If the range is very small, use a minimum range
    const minRange = Math.max(range, maxValue * 0.1)
    
    // Add 15% padding above and below the data range for better visualization
    const padding = minRange * 0.15
    const domainMin = Math.max(0, minValue - padding)
    const domainMax = maxValue + padding
    
    // Ensure we have a reasonable minimum range
    const finalRange = domainMax - domainMin
    if (finalRange < maxValue * 0.2) {
      const center = (domainMin + domainMax) / 2
      const newRange = maxValue * 0.2
      return [Math.max(0, center - newRange / 2), center + newRange / 2]
    }
    
    return [domainMin, domainMax]
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">{t('loading')}</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>{t('error')}: {error}</p>
          <Button onClick={loadPriceData} className="mt-4">
            {t('retry')}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            {t('charts.price_trend')} - {locationName}
          </h3>
          <div className="flex items-center gap-4">
            {/* Display mode toggle */}
            <div className="flex items-center gap-1">
              {(['mxn', 'index'] as const).map(mode => (
                <Button
                  key={mode}
                  variant={displayMode === mode ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setDisplayMode(mode)}
                  className={`px-3 py-1 text-sm ${displayMode === mode ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                >
                  {mode === 'mxn' ? 'MXN' : t('charts.price_index')}
                </Button>
              ))}
            </div>
            {(availablePropertyTypes.length > 1) && (
            <Select value={selectedPropertyType} onValueChange={setSelectedPropertyType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={getPropertyTypeLabel(selectedPropertyType)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('charts.all_property_types')}</SelectItem>
                {propertyTypes.map((type) => {
                  const locale = i18n.language?.slice(0, 2) || 'en'
                  const label =
                    (locale === 'es' && type.display_name_es) ||
                    (locale === 'zh' && type.display_name_zh) ||
                    type.display_name_en
                  return (
                    <SelectItem key={type.id} value={type.id}>
                      {label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            )}
          </div>
        </div>

        {/* Time Period Selector */}
        <div className="flex items-center gap-1 mb-4">
          {(['1y', '2y', '5y', '10y', 'max'] as TimePeriod[]).map((period) => (
            <Button
              key={period}
              variant={selectedTimePeriod === period ? "primary" : "secondary"}
              size="sm"
              onClick={() => handleTimePeriodChange(period)}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                selectedTimePeriod === period
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {getTimePeriodLabel(period)}
            </Button>
          ))}
        </div>

        {data.length > 0 && (
          <div className="flex items-center gap-4 mb-4">
            <div className="text-sm text-gray-600">
              {t('charts.period_range')}: {data[0].period} - {data[data.length - 1].period}
            </div>
            <div className={`flex items-center gap-2 ${getGrowthColor()}`}>
              {getGrowthIcon()}
              <span className="text-sm font-medium">
                {t('charts.total_growth')}: {calculateGrowthRate().toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 16, right: 56, left: 64, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="period" 
              stroke="#666"
              fontSize={12}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => displayMode === 'mxn' ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value) : value.toFixed(0)}
              domain={getYAxisDomain()}
              label={{ value: displayMode === 'mxn' ? 'MXN' : t('charts.price_index'), angle: -90, position: 'left', offset: 0, style: { fill: '#666' } }}
            />
            <Tooltip
              formatter={(value: any) => formatTooltipValue(value)}
              labelFormatter={(label: any) => formatTooltipLabel(label)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Line
              type="monotone"
              dataKey={displayMode === 'mxn' ? 'price_mxn' : 'index_value'}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              name={displayMode === 'mxn' ? 'MXN' : t('charts.price_index')}
            />
            {chartData.length > 0 && (
              <ReferenceLine 
                y={displayMode === 'mxn' ? (chartData[0] as any).price_mxn : chartData[0].index_value} 
                stroke="#10b981" 
                strokeDasharray="5 5"
                label={{ value: displayMode === 'mxn' ? (t('charts.starting_price')) : t('charts.starting_value'), position: 'insideRight', style: { fill: '#10b981' } }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {chartData.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="font-medium text-gray-700">{displayMode === 'mxn' ? t('charts.starting_price') : t('charts.starting_value')}</div>
            <div className="text-base font-semibold tracking-tight tabular-nums whitespace-nowrap overflow-hidden text-ellipsis text-right">{displayMode === 'mxn' ? formatMX((chartData[0] as any).price_mxn) : chartData[0].index_value.toFixed(2)}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="font-medium text-gray-700">{displayMode === 'mxn' ? t('charts.current_price') : t('charts.current_value')}</div>
            <div className="text-base font-semibold tracking-tight tabular-nums whitespace-nowrap overflow-hidden text-ellipsis text-right">{displayMode === 'mxn' ? formatMX((chartData[chartData.length - 1] as any).price_mxn) : chartData[chartData.length - 1].index_value.toFixed(2)}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="font-medium text-gray-700">{t('charts.total_growth')}</div>
            <div className={`text-lg font-semibold ${getGrowthColor()} text-right`}>
              {calculateGrowthRate().toFixed(1)}%
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default PriceChart

