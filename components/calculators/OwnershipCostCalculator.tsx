'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'next-i18next'
import { InfoIcon } from '@/components/ui/tooltip'
import { LeadForm } from '@/components/leads/LeadForm'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'

type PercentageBase = 'propertyValue' | 'rentalIncome'

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
  base: PercentageBase
  locked?: boolean
  includeToggle?: boolean
}

type AmountCostItem = BaseCostItem & {
  type: 'amount'
  defaultAmount: number
  includeToggle?: boolean
  isMonthly?: boolean
}

type CostItem = PercentageCostItem | AmountCostItem

const COST_ITEMS: CostItem[] = [
  {
    id: 'propertyTaxes',
    type: 'percentage',
    labelKey: 'calculators.ownership_cost.items.propertyTaxes.label',
    labelDefault: 'Property Taxes (Predial)',
    helperKey: 'calculators.ownership_cost.items.propertyTaxes.helper',
    helperDefault: 'Typical annual rate: 0.1% - 0.15% of cadastral value',
    noteKey: 'calculators.ownership_cost.items.propertyTaxes.note',
    noteDefault: 'Paid annually based on government-assessed value. Discounts often available for early payment.',
    defaultPercent: 0.12,
    required: true,
    base: 'propertyValue',
    locked: false,
  },
  {
    id: 'hoaFees',
    type: 'amount',
    labelKey: 'calculators.ownership_cost.items.hoaFees.label',
    labelDefault: 'Homeowners Association (HOA) Fees',
    helperKey: 'calculators.ownership_cost.items.hoaFees.helper',
    helperDefault: 'Typical monthly fee: MXN 2,000 – 6,000',
    noteKey: 'calculators.ownership_cost.items.hoaFees.note',
    noteDefault: 'Mandatory for condos/gated communities; covers shared amenities, security, and maintenance.',
    defaultAmount: 2000,
    required: false,
    includeToggle: true,
    isMonthly: true,
  },
  {
    id: 'fideicomisoAnnual',
    type: 'amount',
    labelKey: 'calculators.ownership_cost.items.fideicomisoAnnual.label',
    labelDefault: 'Fideicomiso (Bank Trust) Fee',
    helperKey: 'calculators.ownership_cost.items.fideicomisoAnnual.helper',
    helperDefault: 'Typical annual fee: MXN 10,000 – 20,000 ($500 - $900 USD)',
    noteKey: 'calculators.ownership_cost.items.fideicomisoAnnual.note',
    noteDefault: 'Required for foreign owners in restricted zones (coasts/borders). Paid to the trustee bank.',
    defaultAmount: 12000,
    required: true,
  },
  {
    id: 'insurance',
    type: 'amount',
    labelKey: 'calculators.ownership_cost.items.insurance.label',
    labelDefault: 'Insurance',
    helperKey: 'calculators.ownership_cost.items.insurance.helper',
    helperDefault: 'Typical annual premium: MXN 8,000 – 20,000 (coverage dependent)',
    noteKey: 'calculators.ownership_cost.items.insurance.note',
    noteDefault: 'Recommended for natural disaster coverage (hurricanes, earthquakes) and theft.',
    defaultAmount: 10000,
    required: false,
    includeToggle: true,
  },
  {
    id: 'propertyManagement',
    type: 'percentage',
    labelKey: 'calculators.ownership_cost.items.propertyManagement.label',
    labelDefault: 'Property Management Fees',
    helperKey: 'calculators.ownership_cost.items.propertyManagement.helper',
    helperDefault: 'Typical: 8% - 15% of annual rental income',
    noteKey: 'calculators.ownership_cost.items.propertyManagement.note',
    noteDefault: 'Applied if renting the property out and using a third-party management service.',
    defaultPercent: 10,
    required: false,
    base: 'rentalIncome',
    includeToggle: true,
  },
]

const COST_ITEM_MAP = COST_ITEMS.reduce<Record<string, CostItem>>((acc, item) => {
  acc[item.id] = item
  return acc
}, {})

type FormState = {
  propertyValue: string
  annualRentalIncome: string
  percentageValues: Record<string, string>
  amountValues: Record<string, string>
  included: Record<string, boolean>
  needsFideicomiso: boolean
}

export function OwnershipCostCalculator() {
  const { t } = useTranslation('common')
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [state, setState] = useState<FormState>(() => ({
    propertyValue: '',
    annualRentalIncome: '',
    percentageValues: COST_ITEMS.filter((item): item is PercentageCostItem => item.type === 'percentage').reduce<
      Record<string, string>
    >((acc, item) => {
      acc[item.id] = item.defaultPercent.toString()
      return acc
    }, {}),
    amountValues: COST_ITEMS.filter((item): item is AmountCostItem => item.type === 'amount').reduce<
      Record<string, string>
    >((acc, item) => {
      acc[item.id] = item.defaultAmount.toString()
      return acc
    }, {}),
    included: COST_ITEMS.reduce<Record<string, boolean>>((acc, item) => {
      acc[item.id] = item.required || !item.includeToggle
      return acc
    }, {}),
    needsFideicomiso: false,
  }))

  const propertyValue = parseFloat(state.propertyValue) || 0
  const rentalIncome = parseFloat(state.annualRentalIncome) || 0

  const totals = useMemo(() => {
    return COST_ITEMS.reduce(
      (acc, item) => {
        const baseIncluded = state.included[item.id]
        const isFideicomisoItem = item.id === 'fideicomisoAnnual'
        const isIncluded = baseIncluded && (!isFideicomisoItem || state.needsFideicomiso)

        if (!isIncluded) {
          acc.breakdown[item.id] = 0
          return acc
        }

        let amount = 0

        if (item.type === 'percentage') {
          const percentValue = parseFloat(state.percentageValues[item.id])
          const normalizedPercent = Number.isFinite(percentValue) && percentValue > 0 ? percentValue : item.defaultPercent

          const baseAmount = item.base === 'propertyValue' ? propertyValue : rentalIncome

          if (normalizedPercent > 0 && baseAmount > 0) {
            amount = (baseAmount * normalizedPercent) / 100
          }
        } else {
          const rawAmount = parseFloat(state.amountValues[item.id])
          const baseAmount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : item.defaultAmount
          amount = item.isMonthly ? baseAmount * 12 : baseAmount
        }

        if (item.required || !item.includeToggle) {
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
  }, [propertyValue, rentalIncome, state.included, state.needsFideicomiso, state.amountValues, state.percentageValues])

  const handlePropertyValueChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '')
    setState((prev) => ({
      ...prev,
      propertyValue: sanitized,
    }))
  }

  const handleRentalIncomeChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '')
    setState((prev) => ({
      ...prev,
      annualRentalIncome: sanitized,
    }))
  }

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

  return (
    <div className="space-y-8">
      <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('calculators.ownership_cost.property_value_label', 'Property value (cadastral)')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t(
            'calculators.ownership_cost.property_value_helper',
            'Used to estimate annual predial taxes. Enter the assessed value in MXN.'
          )}
        </p>
        <div className="relative rounded-md shadow-sm max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={state.propertyValue}
            onChange={(event) => handlePropertyValueChange(event.target.value)}
            className="block w-full rounded-md border border-gray-300 pl-7 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="2,500,000"
          />
        </div>
      </section>

      <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('calculators.ownership_cost.rental_income_label', 'Annual rental income')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t(
            'calculators.ownership_cost.rental_income_helper',
            'Used for property management fee estimates. Enter zero if the property is not rented.'
          )}
        </p>
        <div className="relative rounded-md shadow-sm max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={state.annualRentalIncome}
            onChange={(event) => handleRentalIncomeChange(event.target.value)}
            className="block w-full rounded-md border border-gray-300 pl-7 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="300,000"
          />
        </div>
      </section>

      <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          {t(
            'calculators.ownership_cost.fideicomiso_prompt_title',
            'Are you a foreign owner with property in a restricted zone (coastal/border)?'
          )}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t(
            'calculators.ownership_cost.fideicomiso_prompt_helper',
            'If yes, the annual fideicomiso fee is required and included below.'
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
          {t('calculators.ownership_cost.fideicomiso_prompt_checkbox', 'Yes, include fideicomiso fee')}
        </label>
      </section>

      <section className="space-y-6">
        {COST_ITEMS.map((item) => {
          const isFideicomisoItem = item.id === 'fideicomisoAnnual'
          const isIncludedBase = state.included[item.id]
          const isIncluded = isIncludedBase && (!isFideicomisoItem || state.needsFideicomiso)
          const shouldRender = !isFideicomisoItem || state.needsFideicomiso
          if (!shouldRender) {
            return null
          }

          const amount = totals.breakdown[item.id] ?? 0

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
                    <InfoIcon
                      content={t(`${item.labelKey.replace('.label', '.glossary')}`, item.noteDefault)}
                      className="flex-shrink-0"
                    />
                    {!item.required && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-0.5 text-xs font-medium text-blue-700">
                        {t('calculators.ownership_cost.optional_label', 'Optional')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {t(item.helperKey, item.helperDefault)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t(item.noteKey, item.noteDefault)}
                  </p>
                </div>
                {item.includeToggle && (
                  <label className="inline-flex items-center gap-2 text-sm text-gray-600 md:self-center">
                    <input
                      type="checkbox"
                      checked={isIncluded}
                      onChange={() => toggleIncluded(item.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {t('calculators.ownership_cost.include_item', 'Include in calculation')}
                  </label>
                )}
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="w-full md:max-w-xs">
                  {item.type === 'percentage' ? (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {item.base === 'propertyValue'
                          ? t('calculators.ownership_cost.percentage_label_value', 'Percentage of property value')
                          : t('calculators.ownership_cost.percentage_label_rental', 'Percentage of rental income')}
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
                        {item.isMonthly
                          ? t('calculators.ownership_cost.amount_label_monthly', 'Monthly amount')
                          : t('calculators.ownership_cost.amount_label', 'Annual amount')}
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
                <div className="flex flex-col md:items-end md:text-right">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {t('calculators.ownership_cost.estimated_cost', 'Estimated annual cost')}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrencyMXN(amount)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <section className="bg-white shadow-lg rounded-lg border border-blue-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('calculators.ownership_cost.summary_title', 'Ownership Cost Summary')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t('calculators.ownership_cost.mandatory_total', 'Mandatory costs')}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrencyMXN(totals.required)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t('calculators.ownership_cost.optional_total', 'Optional costs')}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrencyMXN(totals.optional)}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
            <p className="text-xs uppercase tracking-wide text-blue-700">
              {t('calculators.ownership_cost.total_annual_cost', 'Total annual ownership cost')}
            </p>
            <p className="mt-1 text-2xl font-semibold text-blue-900">
              {formatCurrencyMXN(totals.total)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t('calculators.ownership_cost.monthly_average', 'Monthly average')}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {formatCurrencyMXN(totals.total / 12)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          {t(
            'calculators.ownership_cost.disclaimer',
            'Actual costs vary by municipality, property type, and service level. Consult local professionals for precise budgeting.'
          )}
        </p>
      </section>

      {/* CTA Section */}
      <div className="mt-8 rounded-lg bg-blue-50 border border-blue-100 p-6">
        <div className="flex items-start gap-4">
          <MessageCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('leads.ownership_cost_cta_title', 'Need help managing your property?')}
            </h3>
            <p className="text-gray-600 mb-2">
              {t('leads.ownership_cost_cta_description', 'Get personalized advice from local real estate experts on optimizing your property expenses and maximizing your investment returns.')}
            </p>
            <p className="text-sm text-gray-600 italic mb-1">
              {t('leads.cta_social_proof', '47 investors got connected last month 🤝')}
            </p>
            <Button
              onClick={() => setShowLeadForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t('leads.cta_button', 'Get Expert Help >')}
            </Button>
          </div>
        </div>
      </div>

      <LeadForm
        isOpen={showLeadForm}
        onClose={() => setShowLeadForm(false)}
        source="ownership_cost_calculator"
        context={{
          propertyValue: state.propertyValue,
          annualOwnershipCost: totals?.total || 0,
        }}
      />
    </div>
  )
}

