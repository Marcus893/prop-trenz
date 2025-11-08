'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'next-i18next'

type PercentageBase = 'transaction' | 'custom'

type BaseCostItem = {
  id: string
  labelKey: string
  labelDefault: string
  helperKey: string
  helperDefault: string
  noteKey: string
  noteDefault: string
  required: boolean
}

type PercentageCostItem = BaseCostItem & {
  type: 'percentage'
  defaultPercent: number
  locked?: boolean
  percentageBase?: PercentageBase
  baseItems?: string[]
}

type AmountCostItem = BaseCostItem & {
  type: 'amount'
  defaultAmount: number
}

type CostItem = PercentageCostItem | AmountCostItem

const COST_ITEMS: CostItem[] = [
  {
    id: 'isai',
    type: 'percentage',
    labelKey: 'calculators.closing_cost.items.isai.label',
    labelDefault: 'Property Acquisition Tax (ISAI)',
    helperKey: 'calculators.closing_cost.items.isai.helper',
    helperDefault: 'Typical: 2% - 4.5% of property value',
    noteKey: 'calculators.closing_cost.items.isai.note',
    noteDefault: 'A state-level transfer tax. The percentage varies by state and municipality.',
    defaultPercent: 3,
    required: true,
  },
  {
    id: 'notaryFees',
    type: 'percentage',
    labelKey: 'calculators.closing_cost.items.notaryFees.label',
    labelDefault: 'Notary Fees',
    helperKey: 'calculators.closing_cost.items.notaryFees.helper',
    helperDefault: 'Typical: 0.5% - 2% of property value',
    noteKey: 'calculators.closing_cost.items.notaryFees.note',
    noteDefault: 'Covers the government-appointed notary who certifies the transaction.',
    defaultPercent: 1,
    required: true,
  },
  {
    id: 'registrationFees',
    type: 'percentage',
    labelKey: 'calculators.closing_cost.items.registrationFees.label',
    labelDefault: 'Property Registration Fees',
    helperKey: 'calculators.closing_cost.items.registrationFees.helper',
    helperDefault: 'Typical: 0.5% - 1% of property value',
    noteKey: 'calculators.closing_cost.items.registrationFees.note',
    noteDefault: 'Official registration in the Public Registry.',
    defaultPercent: 0.75,
    required: true,
  },
  {
    id: 'fideicomisoSetup',
    type: 'amount',
    labelKey: 'calculators.closing_cost.items.fideicomisoSetup.label',
    labelDefault: 'Fideicomiso (Bank Trust) Setup',
    helperKey: 'calculators.closing_cost.items.fideicomisoSetup.helper',
    helperDefault: 'Typical fixed fee: $1500 - $2,000 USD',
    noteKey: 'calculators.closing_cost.items.fideicomisoSetup.note',
    noteDefault: 'Required one-time setup for foreign buyers in restricted zones.',
    defaultAmount: 35000,
    required: true,
  },
  {
    id: 'foreignAffairsPermit',
    type: 'amount',
    labelKey: 'calculators.closing_cost.items.foreignAffairsPermit.label',
    labelDefault: 'Foreign Affairs Ministry Permit',
    helperKey: 'calculators.closing_cost.items.foreignAffairsPermit.helper',
    helperDefault: 'Typical fixed fee: ~$7,500 MXN',
    noteKey: 'calculators.closing_cost.items.foreignAffairsPermit.note',
    noteDefault: 'Permit from the Secretaría de Relaciones Exteriores for foreign buyers.',
    defaultAmount: 7500,
    required: true,
  },
  {
    id: 'legalFees',
    type: 'amount',
    labelKey: 'calculators.closing_cost.items.legalFees.label',
    labelDefault: 'Legal / Attorney Services',
    helperKey: 'calculators.closing_cost.items.legalFees.helper',
    helperDefault: 'Typical: $1,500 - $3,000+ USD',
    noteKey: 'calculators.closing_cost.items.legalFees.note',
    noteDefault: 'Due diligence, contract review, and transaction oversight.',
    defaultAmount: 30000,
    required: false,
  },
  {
    id: 'iva',
    type: 'percentage',
    labelKey: 'calculators.closing_cost.items.iva.label',
    labelDefault: 'IVA (Value Added Tax)',
    helperKey: 'calculators.closing_cost.items.iva.helper',
    helperDefault: 'Typical: 16% applied to professional services',
    noteKey: 'calculators.closing_cost.items.iva.note',
    noteDefault: 'Often applied to notary and legal service fees.',
    defaultPercent: 16,
    required: true,
    locked: true,
    percentageBase: 'custom',
    baseItems: ['notaryFees', 'legalFees'],
  },
  {
    id: 'appraisalFees',
    type: 'amount',
    labelKey: 'calculators.closing_cost.items.appraisalFees.label',
    labelDefault: 'Appraisal Fees',
    helperKey: 'calculators.closing_cost.items.appraisalFees.helper',
    helperDefault: 'Typical fixed fee: $300 - $600 USD',
    noteKey: 'calculators.closing_cost.items.appraisalFees.note',
    noteDefault: 'Assessment of the property value for tax and due diligence.',
    defaultAmount: 7000,
    required: false,
  },
  {
    id: 'titleInsurance',
    type: 'percentage',
    labelKey: 'calculators.closing_cost.items.titleInsurance.label',
    labelDefault: 'Title Insurance',
    helperKey: 'calculators.closing_cost.items.titleInsurance.helper',
    helperDefault: 'Typical: 0.5% - 1% of property value (optional)',
    noteKey: 'calculators.closing_cost.items.titleInsurance.note',
    noteDefault: 'Protection against title disputes. Optional depending on risk tolerance.',
    defaultPercent: 0.75,
    required: false,
  },
  {
    id: 'escrowFees',
    type: 'amount',
    labelKey: 'calculators.closing_cost.items.escrowFees.label',
    labelDefault: 'Escrow Fees',
    helperKey: 'calculators.closing_cost.items.escrowFees.helper',
    helperDefault: 'Typical fixed fee: ~$500 USD',
    noteKey: 'calculators.closing_cost.items.escrowFees.note',
    noteDefault: 'Neutral third party to hold funds during the transaction.',
    defaultAmount: 10000,
    required: false,
  },
]

const COST_ITEM_MAP = COST_ITEMS.reduce<Record<string, CostItem>>((acc, item) => {
  acc[item.id] = item
  return acc
}, {})

type FormState = {
  transactionPrice: string
  percentageValues: Record<string, string>
  amountValues: Record<string, string>
  included: Record<string, boolean>
  exchangeRate: string
  needsFideicomiso: boolean
}

export function ClosingCostCalculator() {
  const { t } = useTranslation('common')
  const [state, setState] = useState<FormState>(() => ({
    transactionPrice: '',
    percentageValues: COST_ITEMS.filter((item): item is PercentageCostItem => item.type === 'percentage')
      .reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.defaultPercent.toString()
        return acc
      }, {}),
    amountValues: COST_ITEMS.filter((item): item is AmountCostItem => item.type === 'amount')
      .reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = item.defaultAmount.toString()
        return acc
      }, {}),
    included: COST_ITEMS.reduce<Record<string, boolean>>((acc, item) => {
      acc[item.id] = item.required
      return acc
    }, {}),
    exchangeRate: '17',
    needsFideicomiso: false,
  }))
  const [rateStatus, setRateStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [rateError, setRateError] = useState<string | null>(null)
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(null)

  const transactionPrice = parseFloat(state.transactionPrice) || 0
  const exchangeRate = parseFloat(state.exchangeRate) || 0

  const totals = useMemo(() => {
    return COST_ITEMS.reduce(
      (acc, item) => {
    const baseIncluded = state.included[item.id]
    const isFideicomisoItem = item.id === 'fideicomisoSetup' || item.id === 'foreignAffairsPermit'
    const isIncluded = baseIncluded && (!isFideicomisoItem || state.needsFideicomiso)

    if (!isIncluded) {
      acc.breakdown[item.id] = 0
      return acc
    }

    let amount = 0
    if (item.type === 'percentage') {
      const percentValue = parseFloat(state.percentageValues[item.id])
      const normalizedPercent = Number.isFinite(percentValue) && percentValue > 0 ? percentValue : 0

      let baseAmount = transactionPrice
      if (item.percentageBase === 'custom' && item.baseItems?.length) {
        baseAmount = item.baseItems.reduce((sum, baseId) => {
          const baseValue = acc.breakdown[baseId]
          return sum + (Number.isFinite(baseValue) ? baseValue : 0)
        }, 0)
      }

      const effectivePercent =
        normalizedPercent > 0
          ? normalizedPercent
          : item.locked || item.required
            ? item.defaultPercent
            : 0

      if (effectivePercent > 0 && baseAmount > 0) {
        amount = (baseAmount * effectivePercent) / 100
      }
    } else {
      const rawAmount = parseFloat(state.amountValues[item.id])
      if (Number.isFinite(rawAmount) && rawAmount > 0) {
        amount = rawAmount
      } else if (item.required) {
        amount = item.defaultAmount
      }
    }

        if (item.required) {
          acc.required += amount
        } else {
          acc.optional += amount
        }
        acc.total += amount
        acc.breakdown[item.id] = amount
        return acc
      },
      {
        required: 0,
        optional: 0,
        total: 0,
        breakdown: {} as Record<string, number>,
      }
    )
  }, [state.included, state.percentageValues, state.amountValues, transactionPrice, state.needsFideicomiso])

  const handleTransactionPriceChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '')
    setState((prev) => ({
      ...prev,
      transactionPrice: sanitized,
    }))
  }

  const handleExchangeRateChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '')
    setState((prev) => ({
      ...prev,
      exchangeRate: sanitized,
    }))
  }

  const fetchExchangeRate = useCallback(async () => {
    setRateStatus('loading')
    setRateError(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      const rate = data?.rates?.MXN
      if (typeof rate === 'number' && rate > 0) {
        setState((prev) => ({
          ...prev,
          exchangeRate: rate.toFixed(4),
        }))
        setRateStatus('success')
        setRateUpdatedAt(new Date().toISOString())
      } else {
        throw new Error('Invalid response payload from open.er-api.com')
      }
    } catch (error) {
      console.error('[ClosingCostCalculator] Failed to fetch exchange rate:', error)
      setRateStatus('error')
      setRateError(error instanceof Error ? error.message : String(error))
    } finally {
      clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    fetchExchangeRate().catch((error) => {
      console.error('[ClosingCostCalculator] Unexpected error during initial exchange rate fetch:', error)
    })
  }, [fetchExchangeRate])

  const handlePercentageChange = (id: string, value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '')
    setState((prev) => ({
      ...prev,
      percentageValues: {
        ...prev.percentageValues,
        [id]: sanitized,
      },
    }))
  }

  const enforceRequiredPercentage = (id: string) => {
    const item = COST_ITEM_MAP[id]
    if (!item || item.type !== 'percentage' || !item.required) {
      return
    }
    const current = parseFloat(state.percentageValues[id])
    if (!Number.isFinite(current) || current <= 0) {
      setState((prev) => ({
        ...prev,
        percentageValues: {
          ...prev.percentageValues,
          [id]: item.defaultPercent.toString(),
        },
      }))
    }
  }

  const handleAmountChange = (id: string, value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '')
    setState((prev) => ({
      ...prev,
      amountValues: {
        ...prev.amountValues,
        [id]: sanitized,
      },
    }))
  }

  const enforceRequiredAmount = (id: string) => {
    const item = COST_ITEM_MAP[id]
    if (!item || item.type !== 'amount' || !item.required) {
      return
    }
    const current = parseFloat(state.amountValues[id])
    if (!Number.isFinite(current) || current <= 0) {
      setState((prev) => ({
        ...prev,
        amountValues: {
          ...prev.amountValues,
          [id]: item.defaultAmount.toString(),
        },
      }))
    }
  }

  const toggleIncluded = (id: string) => {
    setState((prev) => ({
      ...prev,
      included: {
        ...prev.included,
        [id]: !prev.included[id],
      },
    }))
  }

  const formatCurrencyMXN = (amount: number) => {
    if (!Number.isFinite(amount)) return '$0'
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatCurrencyUSD = (amount: number) => {
    if (!Number.isFinite(amount)) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    if (!Number.isFinite(value)) return '0%'
    return `${value.toFixed(2)}%`
  }

  return (
    <div className="space-y-8">
      <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('calculators.closing_cost.transaction_price_label', 'Transaction Price')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t(
            'calculators.closing_cost.transaction_price_helper',
            'Enter the agreed purchase price to calculate percentage-based fees.'
          )}
        </p>
        <div className="relative rounded-md shadow-sm max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={state.transactionPrice}
            onChange={(event) => handleTransactionPriceChange(event.target.value)}
            className="block w-full rounded-md border border-gray-300 pl-7 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="3,000,000"
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {t(
            'calculators.closing_cost.transaction_price_disclaimer',
            'Enter the property price in MXN. USD estimates are shown in parentheses using the exchange rate below.'
          )}
        </p>
      </section>

      <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('calculators.closing_cost.exchange_rate_label', 'MXN to USD exchange rate')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t(
            'calculators.closing_cost.exchange_rate_helper',
            'Used to show USD reference values. Adjust to match the current market rate.'
          )}
        </p>
        <div className="relative rounded-md shadow-sm max-w-xs">
          <input
            type="text"
            inputMode="decimal"
            value={state.exchangeRate}
            onChange={(event) => handleExchangeRateChange(event.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="17"
            aria-label={t('calculators.closing_cost.exchange_rate_label', 'MXN to USD exchange rate')}
          />
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={fetchExchangeRate}
            disabled={rateStatus === 'loading'}
            className="inline-flex items-center justify-center rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rateStatus === 'loading'
              ? t('calculators.closing_cost.exchange_rate_fetching', 'Fetching latest rate...')
              : t('calculators.closing_cost.exchange_rate_refresh', 'Refresh rate')}
          </button>
          {rateStatus === 'success' && rateUpdatedAt && (
            <p className="text-xs text-gray-500">
              {t('calculators.closing_cost.exchange_rate_last_updated', 'Last updated {{value}}', {
                value: new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(rateUpdatedAt)),
              })}
            </p>
          )}
          {rateStatus === 'error' && (
            <p className="text-xs text-red-600">
              {t(
                'calculators.closing_cost.exchange_rate_fetch_error',
                'We could not fetch the latest rate. Please try again or enter it manually.'
              )}
              {rateError ? ` (${rateError})` : ''}
            </p>
          )}
        </div>
      </section>

      <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          {t(
            'calculators.closing_cost.fideicomiso_prompt_title',
            'Are you a non-Mexican citizen purchasing in a restricted zone (coastal/border)?'
          )}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t(
            'calculators.closing_cost.fideicomiso_prompt_helper',
            'If yes, bank trust (fideicomiso) setup and a foreign affairs permit are required and will be added to the calculation.'
          )}
        </p>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={state.needsFideicomiso}
            onChange={(event) =>
              setState((prev) => ({
                ...prev,
                needsFideicomiso: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {t('calculators.closing_cost.fideicomiso_prompt_checkbox', 'Yes')}
        </label>
      </section>

      <section className="space-y-6">
        {COST_ITEMS.map((item) => {
          const isFideicomisoItem = item.id === 'fideicomisoSetup' || item.id === 'foreignAffairsPermit'
          const isIncludedBase = state.included[item.id]
          const isIncluded = isIncludedBase && (!isFideicomisoItem || state.needsFideicomiso)
          const shouldRender = !isFideicomisoItem || state.needsFideicomiso
          if (!shouldRender) {
            return null
          }

          const amount = totals.breakdown[item.id] ?? 0
          const amountUSD = exchangeRate > 0 ? amount / exchangeRate : 0

          return (
            <div
              key={item.id}
              className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 space-y-6 transition-shadow"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2 md:flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t(item.labelKey, item.labelDefault)}
                    </h3>
                    {!item.required && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-0.5 text-xs font-medium text-blue-700">
                        {t('calculators.closing_cost.optional_label', 'Optional')}
                      </span>
                    )}
                  </div>
                  {!item.required && (!isFideicomisoItem || state.needsFideicomiso) && (
                    <label className="inline-flex items-center gap-2 text-sm text-gray-600 md:self-start md:ml-auto md:-mt-8 md:relative md:left-0 md:right-0 md:justify-end">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={() => toggleIncluded(item.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {t('calculators.closing_cost.include_item', 'Include in calculation')}
                    </label>
                  )}
                  <p className="text-sm text-gray-600">
                    {t(item.helperKey, item.helperDefault)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t(item.noteKey, item.noteDefault)}
                  </p>
                </div>
                {!item.required && (!isFideicomisoItem || state.needsFideicomiso) && (
                  <label className="inline-flex items-center gap-2 text-sm text-gray-600 md:self-start md:ml-6">
                    <input
                      type="checkbox"
                      checked={isIncluded}
                      onChange={() => toggleIncluded(item.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {t('calculators.closing_cost.include_item', 'Include in calculation')}
                  </label>
                )}
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="w-full md:max-w-xs">
                  {item.type === 'percentage' ? (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {t('calculators.closing_cost.percentage_label', 'Percentage')}
                      </label>
                      <div className="relative rounded-lg">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={state.percentageValues[item.id] || ''}
                          onChange={(event) => handlePercentageChange(item.id, event.target.value)}
                          disabled={!isIncluded || item.locked}
                          onBlur={() => enforceRequiredPercentage(item.id)}
                          className="block w-full rounded-lg border border-gray-300 pr-10 py-2 px-3 focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
                          placeholder={item.defaultPercent.toString()}
                          readOnly={item.locked}
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-gray-500 sm:text-sm">%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {t('calculators.closing_cost.amount_label', 'Amount')}
                      </label>
                      <div className="relative rounded-lg">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={state.amountValues[item.id] || ''}
                          onChange={(event) => handleAmountChange(item.id, event.target.value)}
                          disabled={!isIncluded}
                          onBlur={() => enforceRequiredAmount(item.id)}
                          className="block w-full rounded-lg border border-gray-300 pl-7 py-2 px-3 focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
                          placeholder={item.defaultAmount.toString()}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6 md:text-right md:justify-end">
                  <div className="flex flex-col gap-1 md:items-end">
                    <div className="flex items-baseline gap-3 md:justify-end">
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        {t('calculators.closing_cost.estimated_cost', 'Estimated cost')}
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {formatCurrencyMXN(amount)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {exchangeRate > 0
                        ? t('calculators.closing_cost.usd_reference', 'USD reference: {{value}}', {
                            value: formatCurrencyUSD(amountUSD),
                          })
                        : t(
                            'calculators.closing_cost.usd_reference_unavailable',
                            'USD reference unavailable (update exchange rate)'
                          )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <section className="bg-white shadow-lg rounded-lg border border-blue-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('calculators.closing_cost.summary_title', 'Closing Cost Summary')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t('calculators.closing_cost.mandatory_total', 'Mandatory fees')}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrencyMXN(totals.required)}</p>
            {exchangeRate > 0 && (
              <p className="text-xs text-gray-500">
                {t('calculators.closing_cost.usd_reference_inline', '({{value}} USD)', {
                  value: formatCurrencyUSD(totals.required / exchangeRate),
                })}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t('calculators.closing_cost.optional_total', 'Optional fees')}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrencyMXN(totals.optional)}</p>
            {exchangeRate > 0 && (
              <p className="text-xs text-gray-500">
                {t('calculators.closing_cost.usd_reference_inline', '({{value}} USD)', {
                  value: formatCurrencyUSD(totals.optional / exchangeRate),
                })}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
            <p className="text-xs uppercase tracking-wide text-blue-700">
              {t('calculators.closing_cost.total_closing_cost', 'Total closing costs')}
            </p>
            <p className="mt-1 text-2xl font-semibold text-blue-900">
              {formatCurrencyMXN(totals.total)}
            </p>
            {exchangeRate > 0 && (
              <p className="text-xs text-blue-600">
                {t('calculators.closing_cost.usd_reference_inline', '({{value}} USD)', {
                  value: formatCurrencyUSD(totals.total / exchangeRate),
                })}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t('calculators.closing_cost.total_percentage_of_price', 'Percent of purchase price')}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {transactionPrice > 0 ? formatPercentage((totals.total / transactionPrice) * 100) : '0.00%'}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          {t(
            'calculators.closing_cost.disclaimer',
            'Actual closing costs vary by municipality, currency, and service providers. Consult your local advisor before committing to a transaction.'
          )}
        </p>
      </section>
    </div>
  )
}

