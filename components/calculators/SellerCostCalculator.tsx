'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'next-i18next'

const DEFAULT_PRIMARY_RESIDENCE_EXEMPTION = '5500000'

type FormState = {
  residencyStatus: 'resident' | 'nonresident'
  salePrice: string
  adjustedBasis: string
  improvements: string
  deductibleCosts: string
  capitalGainsRate: string
  agentRate: string
  fideicomisoCancellation: string
  attorneyFee: string
  primaryResidence: boolean
  primaryResidenceExemption: string
  includeAgent: boolean
  includeFideicomisoCancellation: boolean
  includeAttorney: boolean
}

export function SellerCostCalculator() {
  const { t } = useTranslation('common')
  const [state, setState] = useState<FormState>(() => ({
    residencyStatus: 'resident',
    salePrice: '',
    adjustedBasis: '',
    improvements: '',
    deductibleCosts: '',
    capitalGainsRate: '35',
    agentRate: '6',
    fideicomisoCancellation: '20000',
    attorneyFee: '30000',
    primaryResidence: false,
    primaryResidenceExemption: DEFAULT_PRIMARY_RESIDENCE_EXEMPTION,
    includeAgent: true,
    includeFideicomisoCancellation: false,
    includeAttorney: false,
  }))

  const salePrice = parseFloat(state.salePrice) || 0
  const hasSalePrice = state.salePrice.trim().length > 0 && salePrice > 0
  const adjustedBasis = parseFloat(state.adjustedBasis) || 0
  const hasPurchasePrice = state.adjustedBasis.trim().length > 0 && adjustedBasis > 0
  const improvements = parseFloat(state.improvements) || 0
  const deductibleCosts = parseFloat(state.deductibleCosts) || 0
  const capitalGainsRate = parseFloat(state.capitalGainsRate) || 0
  const agentRate = parseFloat(state.agentRate) || 0
  const serviceIvaMultiplier = 1.16
  const fideicomisoCancellation = parseFloat(state.fideicomisoCancellation) || 0
  const attorneyFeeValue = parseFloat(state.attorneyFee) || 0
  const primaryResidenceExemption =
    state.residencyStatus === 'resident' &&
    state.primaryResidence &&
    state.primaryResidenceExemption.trim().length > 0
      ? parseFloat(state.primaryResidenceExemption) || 0
      : 0

  const canCalculateGain = hasSalePrice && hasPurchasePrice

  const taxableGain = useMemo(() => {
    if (!canCalculateGain) {
      return null
    }
    const baseGain = salePrice - adjustedBasis - improvements - deductibleCosts
    const gainAfterExemption = Math.max(baseGain - primaryResidenceExemption, 0)
    return Math.max(gainAfterExemption, 0)
  }, [canCalculateGain, salePrice, adjustedBasis, improvements, deductibleCosts, primaryResidenceExemption])

  const calculateResidentTax = (gain: number) => {
    if (gain <= 0) return 0
    if (gain <= 250000) {
      return gain * (capitalGainsRate / 100)
    }
    const baseTax = 250000 * (capitalGainsRate / 100)
    const excess = gain - 250000
    return baseTax + excess * 0.35
  }

  const capitalGainsTax =
    taxableGain !== null
      ? state.residencyStatus === 'resident'
        ? calculateResidentTax(taxableGain)
        : taxableGain * 0.35
      : null
  const agentCommissionBase =
    state.includeAgent && hasSalePrice ? salePrice * (agentRate / 100) : 0
  const agentCommission =
    state.includeAgent && hasSalePrice ? agentCommissionBase * serviceIvaMultiplier : 0
  const fideicomisoFee =
    state.includeFideicomisoCancellation ? fideicomisoCancellation : 0
  const attorneyFee = state.includeAttorney ? attorneyFeeValue * serviceIvaMultiplier : 0

  const totalEstimatedCosts =
    (capitalGainsTax ?? 0) + agentCommission + fideicomisoFee + attorneyFee
  const otherCostsTotal = fideicomisoFee + attorneyFee
  const percentOfSalePrice = salePrice > 0 ? (totalEstimatedCosts / salePrice) * 100 : null

  const formatCurrencyMXN = (amount: number) => {
    if (!Number.isFinite(amount)) return '$0'
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatCurrencyMaybe = (amount: number | null) => {
    if (amount === null) {
      return '—'
    }
    return formatCurrencyMXN(amount)
  }

  const formatPercentMaybe = (value: number | null) => {
    if (value === null) {
      return '—'
    }
    return `${value.toFixed(2)}%`
  }

  useEffect(() => {
    if (state.residencyStatus === 'nonresident') {
      setState((prev) => ({
        ...prev,
        primaryResidence: false,
        primaryResidenceExemption: DEFAULT_PRIMARY_RESIDENCE_EXEMPTION,
        capitalGainsRate: '35',
      }))
    }
  }, [state.residencyStatus])

  const handleChange = (field: keyof FormState) => (value: string | boolean) => {
    setState((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handlePrimaryResidenceToggle = (checked: boolean) => {
    setState((prev) => ({
      ...prev,
      primaryResidence: checked,
      primaryResidenceExemption:
        checked && (!prev.primaryResidenceExemption.trim() || prev.primaryResidenceExemption === '0')
          ? DEFAULT_PRIMARY_RESIDENCE_EXEMPTION
          : prev.primaryResidenceExemption,
    }))
  }

  return (
    <div className="space-y-8">
      <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('calculators.seller_cost.residency_title', 'Residency status')}
        </h2>
        <p className="text-sm text-gray-600">
          {t(
            'calculators.seller_cost.residency_helper',
            'Capital gains treatment differs for residents with RFC and non-residents.'
          )}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="residency"
              checked={state.residencyStatus === 'resident'}
              onChange={() => handleChange('residencyStatus')('resident')}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            {t('calculators.seller_cost.residency_resident', 'Resident (RFC + CURP)')}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="residency"
              checked={state.residencyStatus === 'nonresident'}
              onChange={() => handleChange('residencyStatus')('nonresident')}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            {t('calculators.seller_cost.residency_nonresident', 'Non-resident')}
          </label>
        </div>
      </section>

      <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('calculators.seller_cost.sale_price_label', 'Expected sale price')}
        </h2>
        <p className="text-sm text-gray-600">
          {t(
            'calculators.seller_cost.sale_price_helper',
            'Enter the agreed sale price. All calculations are in MXN.'
          )}
        </p>
        <div className="relative rounded-md shadow-sm max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={state.salePrice}
            onChange={(event) => handleChange('salePrice')(event.target.value.replace(/[^0-9.]/g, ''))}
            className="block w-full rounded-md border border-gray-300 pl-7 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="5,500,000"
          />
        </div>
      </section>

      <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('calculators.seller_cost.cost_basis_title', 'Cost basis & deductible amounts')}
          </h2>
          <p className="text-sm text-gray-600">
            {t(
              'calculators.seller_cost.cost_basis_helper',
              'Include the original purchase price, facturable capital improvements, and allowable selling expenses.'
            )}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('calculators.seller_cost.purchase_price_label', 'Original purchase price')}
            </label>
            <div className="relative rounded-lg">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={state.adjustedBasis}
                onChange={(event) =>
                  handleChange('adjustedBasis')(event.target.value.replace(/[^0-9.]/g, ''))
                }
                className="block w-full rounded-lg border border-gray-300 pl-7 py-2 px-3 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="3,800,000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('calculators.seller_cost.improvements_label', 'Capital improvements (facturas)')}
            </label>
            <div className="relative rounded-lg">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={state.improvements}
                onChange={(event) =>
                  handleChange('improvements')(event.target.value.replace(/[^0-9.]/g, ''))
                }
                className="block w-full rounded-lg border border-gray-300 pl-7 py-2 px-3 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="400,000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('calculators.seller_cost.deductible_costs_label', 'Allowable closing deductions')}
            </label>
            <div className="relative rounded-lg">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={state.deductibleCosts}
                onChange={(event) =>
                  handleChange('deductibleCosts')(event.target.value.replace(/[^0-9.]/g, ''))
                }
                className="block w-full rounded-lg border border-gray-300 pl-7 py-2 px-3 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="120,000"
              />
            </div>
          </div>
          {state.residencyStatus === 'resident' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t(
                  'calculators.seller_cost.primary_residence_exemption_label',
                  'Primary residence exemption (MXN)'
                )}
              </label>
              <div className="relative rounded-lg">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={state.primaryResidenceExemption}
                  onChange={(event) =>
                    handleChange('primaryResidenceExemption')(event.target.value.replace(/[^0-9.]/g, ''))
                  }
                  className="block w-full rounded-lg border border-gray-300 pl-7 py-2 px-3 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="5,500,000"
                  disabled={!state.primaryResidence}
                />
              </div>
              <label className="inline-flex items-start gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={state.primaryResidence}
                  onChange={(event) => handlePrimaryResidenceToggle(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  {t(
                    'calculators.seller_cost.primary_residence_helper',
                    'Apply exemption (up to ~700,000 UDIs) if you qualify per SAT rules—must be primary residence, RFC, CURP, and sale not exempted in the last 3 years.'
                  )}
                </span>
              </label>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 space-y-6 transition-shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 md:flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('calculators.seller_cost.capital_gains_title', 'Capital gains tax (ISR)')}
            </h3>
            <p className="text-sm text-gray-600">
              {t(
                'calculators.seller_cost.capital_gains_helper',
                'Typical effective rates range from 10% to 35% of the taxable gain depending on deductions, proof of basis, and personal tax situation.'
              )}
            </p>
          </div>
          <div className="space-y-2 md:w-60">
            <label className="block text-sm font-medium text-gray-700">
              {t('calculators.seller_cost.capital_gains_rate_label', 'Estimated tax rate (%)')}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={state.capitalGainsRate}
              onChange={(event) =>
                handleChange('capitalGainsRate')(event.target.value.replace(/[^0-9.]/g, ''))
              }
              className="block w-full rounded-lg border border-gray-300 py-2 px-3 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="35"
              disabled={state.residencyStatus === 'nonresident'}
            />
            <p className="text-xs text-gray-500">
              {state.residencyStatus === 'nonresident'
                ? t(
                    'calculators.seller_cost.capital_gains_nonresident_hint',
                    'A 35% flat rate tax on net gain applies to Non-residents.'
                  )
                : t(
                    'calculators.seller_cost.capital_gains_resident_hint',
                    'Residents use progressive ISR rates (10%-35%) after exemptions and deductions.'
                  )}
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{t('calculators.seller_cost.taxable_gain_label', 'Taxable gain')}</span>
            <span>{formatCurrencyMaybe(taxableGain)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>{t('calculators.seller_cost.capital_gains_rate_applied', 'Rate applied')}</span>
            <span>{formatPercentMaybe(canCalculateGain ? capitalGainsRate : null)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-blue-900">
            <span>{t('calculators.seller_cost.capital_gains_due', 'Estimated ISR due')}</span>
            <span>{formatCurrencyMaybe(capitalGainsTax)}</span>
          </div>
        </div>
      </section>

      <section className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 space-y-6 transition-shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 md:flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('calculators.seller_cost.agent_commission_title', 'Real estate agent commission')}
            </h3>
            <p className="text-sm text-gray-600">
              {t(
                'calculators.seller_cost.agent_commission_helper',
                'Typical commission is 5% - 8% of the sale price plus 16% VAT.'
              )}
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-600 md:self-center">
            <input
              type="checkbox"
              checked={state.includeAgent}
              onChange={(event) => handleChange('includeAgent')(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            {t('calculators.seller_cost.include_item', 'Include in calculation')}
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('calculators.seller_cost.agent_rate_label', 'Commission rate (%)')}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={state.agentRate}
              onChange={(event) => handleChange('agentRate')(event.target.value.replace(/[^0-9.]/g, ''))}
              className="block w-full rounded-lg border border-gray-300 py-2 px-3 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="6"
              disabled={!state.includeAgent}
            />
          </div>
          <div className="rounded-lg bg-gray-50 p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t('calculators.seller_cost.agent_commission_estimate', 'Estimated commission')}
            </p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrencyMXN(agentCommission)}
            </p>
            <p className="text-xs text-gray-500">
              {t('calculators.seller_cost.agent_commission_breakdown', 'Includes IVA on commission')}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 space-y-6 transition-shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 md:flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('calculators.seller_cost.attorney_title', 'Legal or closing advisor')}
            </h3>
            <p className="text-sm text-gray-600">
              {t(
                'calculators.seller_cost.attorney_helper',
                'Sellers often engage an independent lawyer or advisor to review contract terms and assist with negotiations.'
              )}
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-600 md:self-center">
            <input
              type="checkbox"
              checked={state.includeAttorney}
              onChange={(event) => handleChange('includeAttorney')(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            {t('calculators.seller_cost.include_item', 'Include in calculation')}
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('calculators.seller_cost.attorney_amount_label', 'Estimated fee')}
            </label>
            <div className="relative rounded-lg">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={state.attorneyFee}
                onChange={(event) => handleChange('attorneyFee')(event.target.value.replace(/[^0-9.]/g, ''))}
                className="block w-full rounded-lg border border-gray-300 pl-7 py-2 px-3 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="30,000"
                disabled={!state.includeAttorney}
              />
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t('calculators.seller_cost.attorney_estimate_label', 'Estimated cost')}
            </p>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrencyMXN(attorneyFee)}</p>
            <p className="text-xs text-gray-500">
              {t('calculators.seller_cost.professional_fee_breakdown', 'Includes IVA on professional fees')}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 space-y-6 transition-shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 md:flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('calculators.seller_cost.fideicomiso_title', 'Fideicomiso (bank trust) cancellation')}
            </h3>
            <p className="text-sm text-gray-600">
              {t(
                'calculators.seller_cost.fideicomiso_helper',
                'Banks typically charge an administrative fee to cancel the trust and release title when a foreign owner sells.'
              )}
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-600 md:self-center">
            <input
              type="checkbox"
              checked={state.includeFideicomisoCancellation}
              onChange={(event) => handleChange('includeFideicomisoCancellation')(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            {t('calculators.seller_cost.include_item', 'Include in calculation')}
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {t('calculators.seller_cost.fideicomiso_amount_label', 'Estimated fee')}
            </label>
            <div className="relative rounded-lg">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={state.fideicomisoCancellation}
                onChange={(event) =>
                  handleChange('fideicomisoCancellation')(event.target.value.replace(/[^0-9.]/g, ''))
                }
                className="block w-full rounded-lg border border-gray-300 pl-7 py-2 px-3 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="20,000"
                disabled={!state.includeFideicomisoCancellation}
              />
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t('calculators.seller_cost.fideicomiso_estimate_label', 'Estimated cost')}
            </p>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrencyMXN(fideicomisoFee)}</p>
          </div>
        </div>
      </section>

      <section className="bg-white shadow-lg rounded-lg border border-blue-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('calculators.seller_cost.summary_title', 'Seller cost summary')}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t('calculators.seller_cost.capital_gains_due', 'Estimated ISR due')}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {formatCurrencyMaybe(capitalGainsTax)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t('calculators.seller_cost.agent_commission_estimate', 'Estimated commission')}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrencyMXN(agentCommission)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t('calculators.seller_cost.other_costs_label', 'Estimated other costs')}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {formatCurrencyMXN(otherCostsTotal)}
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 border border-blue-100">
            <p className="text-xs uppercase tracking-wide text-blue-700">
              {t('calculators.seller_cost.total_costs', 'Estimated total costs')}
            </p>
            <p className="mt-1 text-2xl font-semibold text-blue-900">
              {formatCurrencyMXN(totalEstimatedCosts)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t('calculators.seller_cost.percent_of_sale', 'Percent of sale price')}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-900">
              {percentOfSalePrice !== null ? `${percentOfSalePrice.toFixed(2)}%` : '—'}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          {t(
            'calculators.seller_cost.disclaimer',
            'Actual tax is determined by your Notary Public and SAT. Ensure you keep facturas for improvements and consult professionals for exemptions and precise calculations.'
          )}
        </p>
      </section>
    </div>
  )
}

