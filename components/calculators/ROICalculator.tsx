'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'next-i18next'
import { InfoIcon } from '@/components/ui/tooltip'
import { LeadForm } from '@/components/leads/LeadForm'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'

type RoiFormState = {
  purchasePrice: string
  closingCostPercent: string
  renovationCosts: string
  downPaymentPercent: string
  interestRate: string
  loanTermYears: string
  monthlyRent: string
  otherMonthlyIncome: string
  occupancyRate: string
  operatingExpensePercent: string
  managementPercent: string
  annualTaxes: string
  annualInsurance: string
  annualOtherExpenses: string
  appreciationRate: string
}

const sanitizeNumberInput = (value: string) => value.replace(/[^0-9.]/g, '')

const parseNumber = (value: string) => {
  if (!value) return 0
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const clampPercentage = (value: number) => {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 100)
}

export function ROICalculator() {
  const { t } = useTranslation('common')
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [state, setState] = useState<RoiFormState>({
    purchasePrice: '',
    closingCostPercent: '',
    renovationCosts: '',
    downPaymentPercent: '',
    interestRate: '',
    loanTermYears: '',
    monthlyRent: '',
    otherMonthlyIncome: '',
    occupancyRate: '',
    operatingExpensePercent: '',
    managementPercent: '',
    annualTaxes: '',
    annualInsurance: '',
    annualOtherExpenses: '',
    appreciationRate: ''
  })

  const handleChange = (key: keyof RoiFormState, value: string) => {
    const sanitized = sanitizeNumberInput(value)
    setState((prev) => ({
      ...prev,
      [key]: sanitized
    }))
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number.isFinite(value) ? value : 0)

  const formatPercentage = (value: number) =>
    `${Number.isFinite(value) ? value.toFixed(2) : '0.00'}%`

  // Check if purchase price is entered
  const hasPurchasePrice = useMemo(() => {
    return parseNumber(state.purchasePrice) > 0
  }, [state.purchasePrice])

  // Check if financing is being used (down payment entered)
  const hasFinancing = useMemo(() => {
    const downPayment = parseNumber(state.downPaymentPercent)
    return downPayment > 0
  }, [state.downPaymentPercent])

  // Validation: closing costs are required when purchase price is entered
  const closingCostRequired = hasPurchasePrice && !state.closingCostPercent.trim()

  // Validation: interest rate and loan term are required when financing is used
  const interestRateRequired = hasFinancing && !state.interestRate.trim()
  const loanTermRequired = hasFinancing && !state.loanTermYears.trim()

  const metrics = useMemo(() => {
    const purchasePrice = parseNumber(state.purchasePrice)
    const closingCostPercent = clampPercentage(parseNumber(state.closingCostPercent))
    const renovationCosts = parseNumber(state.renovationCosts)
    const downPaymentPercent = clampPercentage(parseNumber(state.downPaymentPercent))
    const interestRate = clampPercentage(parseNumber(state.interestRate))
    const loanTermYears = Math.max(parseNumber(state.loanTermYears), 0)
    const monthlyRent = parseNumber(state.monthlyRent)
    const otherIncome = parseNumber(state.otherMonthlyIncome)
    // Default to 100% occupancy if not specified
    const occupancyRateValue = state.occupancyRate.trim()
      ? clampPercentage(parseNumber(state.occupancyRate))
      : 100
    const occupancyRate = occupancyRateValue / 100
    const operatingExpensePercent = clampPercentage(parseNumber(state.operatingExpensePercent))
    const managementPercent = clampPercentage(parseNumber(state.managementPercent))
    const annualTaxes = parseNumber(state.annualTaxes)
    const annualInsurance = parseNumber(state.annualInsurance)
    const annualOther = parseNumber(state.annualOtherExpenses)
    const appreciationRate = clampPercentage(parseNumber(state.appreciationRate))

    const closingCosts = (purchasePrice * closingCostPercent) / 100
    const downPaymentAmount = (purchasePrice * downPaymentPercent) / 100
    // If no financing (down payment is 0), use full purchase price; otherwise use down payment
    const actualCashOutlay = downPaymentAmount > 0 ? downPaymentAmount : purchasePrice
    const totalCashInvested = actualCashOutlay + closingCosts + renovationCosts

    // Only calculate loan amount if financing is being used (down payment > 0)
    const loanAmount = downPaymentAmount > 0 ? Math.max(purchasePrice - downPaymentAmount, 0) : 0
    const monthlyInterestRate = interestRate > 0 ? interestRate / 100 / 12 : 0
    const totalPayments = Math.round(loanTermYears * 12)

    let monthlyDebtService = 0
    // Only calculate debt service if financing is being used (down payment > 0)
    if (downPaymentAmount > 0 && loanAmount > 0 && totalPayments > 0) {
      if (monthlyInterestRate === 0) {
        monthlyDebtService = loanAmount / totalPayments
      } else {
        const factor = Math.pow(1 + monthlyInterestRate, totalPayments)
        monthlyDebtService = loanAmount * ((monthlyInterestRate * factor) / (factor - 1))
      }
    }

    const annualDebtService = monthlyDebtService * 12
    const monthlyGrossIncome = (monthlyRent + otherIncome) * occupancyRate
    const annualGrossIncome = monthlyGrossIncome * 12

    const operatingExpenses = (annualGrossIncome * operatingExpensePercent) / 100
    const managementExpenses = (annualGrossIncome * managementPercent) / 100
    const fixedExpenses = annualTaxes + annualInsurance + annualOther
    const totalOperatingExpenses = operatingExpenses + managementExpenses + fixedExpenses

    const netOperatingIncome = annualGrossIncome - totalOperatingExpenses
    const annualCashFlow = netOperatingIncome - annualDebtService

    const capRate = purchasePrice > 0 ? (netOperatingIncome / purchasePrice) * 100 : 0
    const cashOnCash =
      totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0

    const appreciationGain = (purchasePrice * appreciationRate) / 100
    const totalRoi =
      totalCashInvested > 0
        ? ((annualCashFlow + appreciationGain) / totalCashInvested) * 100
        : 0

    return {
      purchasePrice,
      closingCosts,
      renovationCosts,
      downPaymentAmount,
      totalCashInvested,
      loanAmount,
      annualGrossIncome,
      operatingExpenses,
      managementExpenses,
      fixedExpenses,
      totalOperatingExpenses,
      netOperatingIncome,
      annualDebtService,
      annualCashFlow,
      capRate,
      cashOnCash,
      appreciationGain,
      totalRoi
    }
  }, [state])

  const renderCurrencyInput = (
    key: keyof RoiFormState,
    label: string,
    placeholder: string,
    tooltipContent?: string
  ) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
        {label}
        {tooltipContent && <InfoIcon content={tooltipContent} />}
      </label>
      <div className="relative rounded-md">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-gray-500 sm:text-sm">$</span>
        </div>
        <input
          type="text"
          inputMode="decimal"
          value={state[key]}
          onChange={(event) => handleChange(key, event.target.value)}
          className="block w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder={placeholder}
        />
      </div>
    </div>
  )

  const renderPercentInput = (
    key: keyof RoiFormState,
    label: string,
    placeholder: string,
    required?: boolean,
    hasError?: boolean,
    errorMessage?: string,
    tooltipContent?: string
  ) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {tooltipContent && <InfoIcon content={tooltipContent} />}
      </label>
      <div className="relative rounded-md">
        <input
          type="text"
          inputMode="decimal"
          value={state[key]}
          onChange={(event) => handleChange(key, event.target.value)}
          className={`block w-full rounded-md border pr-8 py-2 px-3 focus:ring-blue-500 sm:text-sm ${
            hasError
              ? 'border-red-300 focus:border-red-500'
              : 'border-gray-300 focus:border-blue-500'
          }`}
          placeholder={placeholder}
          required={required}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <span className="text-gray-500 sm:text-sm">%</span>
        </div>
      </div>
      {hasError && (
        <p className="text-sm text-red-600">
          {errorMessage || 'This field is required'}
        </p>
      )}
    </div>
  )

  return (
    <div className="space-y-8">
      <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('calculators.roi.property_section_title', 'Purchase & renovation')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t(
            'calculators.roi.property_section_helper',
            'Estimate your upfront investment to understand the cash needed before collecting rent.'
          )}
        </p>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
          {renderCurrencyInput(
            'purchasePrice',
            t('calculators.roi.purchase_price_label', 'Purchase price (MXN)'),
            '3,500,000',
            t('calculators.roi.purchase_price_tooltip', 'The total purchase price of the property in Mexican Pesos (MXN). This is the base amount used to calculate closing costs and other percentage-based fees.')
          )}
          {renderPercentInput(
            'closingCostPercent',
            t('calculators.roi.closing_cost_percent_label', 'Closing costs (% of price)'),
            '5',
            hasPurchasePrice,
            closingCostRequired,
            'This field is required when a purchase price is entered',
            t('calculators.roi.closing_cost_tooltip', 'Closing costs include notary fees, property acquisition tax (ISAI) and other transaction-related expenses. Typically ranges from 5% to 8% of the purchase price.')
          )}
          {renderCurrencyInput(
            'renovationCosts',
            t('calculators.roi.renovation_label', 'Upfront improvements'),
            '150,000',
            t('calculators.roi.renovation_tooltip', 'Costs for repairs, renovations, or improvements needed before renting the property. This is added to your total cash investment.')
          )}
        </div>
      </section>

      <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('calculators.roi.financing_section_title', 'Financing assumptions')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t(
            'calculators.roi.financing_section_helper',
            'Adjust leverage to see how mortgage payments impact cash-on-cash returns.'
          )}
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {renderPercentInput(
            'downPaymentPercent',
            t('calculators.roi.down_payment_percent_label', 'Down payment'),
            '30',
            false,
            false,
            undefined,
            t('calculators.roi.down_payment_tooltip', 'The percentage of the purchase price paid upfront. If left empty, the calculator assumes a cash purchase (100% down payment). Typical down payments range from 20% to 50% in Mexico.')
          )}
          {renderPercentInput(
            'interestRate',
            t('calculators.roi.interest_rate_label', 'Interest rate (annual)'),
            '10',
            hasFinancing,
            interestRateRequired,
            'This field is required when using financing',
            t('calculators.roi.interest_rate_tooltip', 'The annual interest rate on your mortgage loan. Typical rates in Mexico range from 8% to 12% for foreign buyers, depending on creditworthiness and lender.')
          )}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
              {t('calculators.roi.loan_term_label', 'Loan term (years)')}
              {hasFinancing && <span className="text-red-500 ml-1">*</span>}
              <InfoIcon
                content={t('calculators.roi.loan_term_tooltip', 'The number of years over which the loan will be repaid. Common terms are 15, 20, or 30 years. Longer terms result in lower monthly payments but higher total interest paid.')}
              />
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={state.loanTermYears}
              onChange={(event) => handleChange('loanTermYears', event.target.value)}
              className={`block w-full rounded-md border px-3 py-2 focus:ring-blue-500 sm:text-sm ${
                loanTermRequired
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="20"
              required={hasFinancing}
            />
            {loanTermRequired && (
              <p className="text-sm text-red-600">This field is required when using financing</p>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('calculators.roi.income_section_title', 'Rental income')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t(
            'calculators.roi.income_section_helper',
            'Project rent, parking, and other income with your expected occupancy.'
          )}
        </p>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
          {renderCurrencyInput(
            'monthlyRent',
            t('calculators.roi.monthly_rent_label', 'Monthly rent'),
            '30,000',
            t('calculators.roi.monthly_rent_tooltip', 'The expected monthly rental income from the property. Research comparable properties in the area to estimate market rent.')
          )}
          {renderCurrencyInput(
            'otherMonthlyIncome',
            t('calculators.roi.other_income_label', 'Other monthly income'),
            '2,000',
            t('calculators.roi.other_income_tooltip', 'Additional monthly income such as parking fees, storage fees, or other services provided to tenants.')
          )}
          {renderPercentInput(
            'occupancyRate',
            t('calculators.roi.occupancy_rate_label', 'Occupancy rate'),
            '90',
            false,
            false,
            undefined,
            t('calculators.roi.occupancy_rate_tooltip', 'The percentage of time the property is expected to be rented. If left empty, defaults to 100%. Account for vacancy periods between tenants. Typical rates range from 85% to 95% for well-managed properties.')
          )}
        </div>
      </section>

      <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('calculators.roi.expenses_section_title', 'Operating expenses')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t(
            'calculators.roi.expenses_section_helper',
            'Blend percentage-based expenses with fixed annual costs for a realistic NOI.'
          )}
        </p>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
          {renderPercentInput(
            'operatingExpensePercent',
            t('calculators.roi.operating_expense_percent_label', 'Operating expenses'),
            '25',
            false,
            false,
            undefined,
            t('calculators.roi.operating_expense_tooltip', 'Percentage of gross rental income allocated to operating expenses such as maintenance, repairs, utilities, landscaping, and other ongoing costs. Typically ranges from 20% to 35% of gross income.')
          )}
          {renderPercentInput(
            'managementPercent',
            t('calculators.roi.management_percent_label', 'Property management'),
            '8',
            false,
            false,
            undefined,
            t('calculators.roi.management_tooltip', 'The percentage of rental income paid to a property management company for handling tenant relations, rent collection, maintenance coordination, and other management services. Typical rates range from 6% to 10% in Mexico.')
          )}
          {renderCurrencyInput(
            'annualTaxes',
            t('calculators.roi.annual_taxes_label', 'Annual property taxes'),
            '5,000',
            t('calculators.roi.annual_taxes_tooltip', 'Annual property tax (predial) paid to the municipality. Tax rates vary by location and property value, typically ranging from 0.1% to 0.5% of assessed value.')
          )}
          {renderCurrencyInput(
            'annualInsurance',
            t('calculators.roi.annual_insurance_label', 'Annual insurance'),
            '10,000',
            t('calculators.roi.annual_insurance_tooltip', 'Annual property insurance premium covering fire, theft, liability, and natural disasters. Costs vary based on property value, location, and coverage level.')
          )}
          {renderCurrencyInput(
            'annualOtherExpenses',
            t('calculators.roi.annual_other_label', 'Other annual expenses'),
            '10,000',
            t('calculators.roi.annual_other_tooltip', 'Other fixed annual expenses such as security services, accounting fees, fideicomiso fees, or any other recurring costs not covered elsewhere.')
          )}
        </div>
      </section>

      <section className="bg-white shadow-sm rounded-lg p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('calculators.roi.appreciation_section_title', 'Appreciation assumptions')}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t(
            'calculators.roi.appreciation_section_helper',
            'Include long-term appreciation to compare total return scenarios.'
          )}
        </p>
        <div className="max-w-sm">
          {renderPercentInput(
            'appreciationRate',
            t('calculators.roi.appreciation_rate_label', 'Expected annual appreciation'),
            '5',
            false,
            false,
            undefined,
            t('calculators.roi.appreciation_rate_tooltip', 'The expected annual percentage increase in property value over time. Historical appreciation rates in Mexico vary by region, typically ranging from 3% to 7% annually. This is included in the Total ROI calculation but is not part of cash flow.')
          )}
        </div>
      </section>

      <section className="bg-white shadow-lg rounded-lg border border-blue-100 p-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('calculators.roi.summary_title', 'ROI summary')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2">
              {t('calculators.roi.total_cash_label', 'Total cash invested')}
              <InfoIcon
                content={t('calculators.roi.total_cash_tooltip', 'The total amount of cash you need to invest upfront, including down payment (or full purchase price for cash purchases), closing costs, and renovation expenses.')}
              />
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatCurrency(metrics.totalCashInvested)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2">
              {t('calculators.roi.annual_income_label', 'Annual gross income')}
              <InfoIcon
                content={t('calculators.roi.annual_income_tooltip', 'Total annual rental income before any expenses, calculated as (monthly rent + other monthly income) × 12 × occupancy rate.')}
              />
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatCurrency(metrics.annualGrossIncome)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2">
              {t('calculators.roi.noi_label', 'Net operating income')}
              <InfoIcon
                content={t('calculators.roi.noi_tooltip', 'Annual gross income minus all operating expenses (maintenance, management fees, taxes, insurance, etc.). This represents the property\'s income before debt service.')}
              />
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatCurrency(metrics.netOperatingIncome)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2">
              {t('calculators.roi.debt_service_label', 'Annual debt service')}
              <InfoIcon
                content={t('calculators.roi.debt_service_tooltip', 'Total annual mortgage payments (principal + interest). This is $0 for cash purchases. Calculated using the loan amount, interest rate, and loan term.')}
              />
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatCurrency(metrics.annualDebtService)}
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
            <div className="text-xs uppercase tracking-wide text-blue-700 flex items-center gap-2">
              {t('calculators.roi.cash_flow_label', 'Annual cash flow')}
              <InfoIcon
                content={t('calculators.roi.cash_flow_tooltip', 'Net operating income minus debt service. This is the actual cash you receive (or pay) each year after all expenses and mortgage payments. Positive cash flow means the property generates income; negative means it costs money to own.')}
              />
            </div>
            <p className="mt-1 text-3xl font-semibold text-blue-900">
              {formatCurrency(metrics.annualCashFlow)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2">
              {t('calculators.roi.cap_rate_label', 'Cap rate')}
              <InfoIcon
                content={t('calculators.roi.cap_rate_tooltip', 'Net Operating Income divided by Purchase Price, expressed as a percentage. This metric measures the property\'s income-generating ability relative to its price, without considering financing. Higher cap rates indicate better income potential.')}
              />
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatPercentage(metrics.capRate)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2">
              {t('calculators.roi.cash_on_cash_label', 'Cash-on-cash ROI')}
              <InfoIcon
                content={t('calculators.roi.cash_on_cash_tooltip', 'Annual Cash Flow divided by Total Cash Invested, expressed as a percentage. This measures the return on your actual cash investment, accounting for financing. It shows how much cash you earn relative to what you put in.')}
              />
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatPercentage(metrics.cashOnCash)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 flex items-center gap-2">
              {t('calculators.roi.total_roi_label', 'Total ROI (cash flow + appreciation)')}
              <InfoIcon
                content={t('calculators.roi.total_roi_tooltip', 'Combines annual cash flow returns with expected property appreciation. Calculated as (Annual Cash Flow + Appreciation Gain) / Total Cash Invested. This gives a more complete picture of total returns including both income and value growth.')}
              />
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatPercentage(metrics.totalRoi)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">
            {t('calculators.roi.breakdown_title', 'Annual cash flow breakdown')}
          </h4>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-gray-600 flex items-center gap-2">
                {t('calculators.roi.gross_income_label', 'Gross income')}
                <InfoIcon
                  content={t('calculators.roi.gross_income_breakdown_tooltip', 'Total annual rental income before any expenses are deducted.')}
                />
              </dt>
              <dd className="font-medium text-gray-900">{formatCurrency(metrics.annualGrossIncome)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-600 flex items-center gap-2">
                {t('calculators.roi.operating_expenses_label', 'Operating expenses')}
                <InfoIcon
                  content={t('calculators.roi.operating_expenses_breakdown_tooltip', 'Variable expenses such as maintenance, repairs, utilities, and landscaping, calculated as a percentage of gross income.')}
                />
              </dt>
              <dd className="font-medium text-gray-900">{formatCurrency(-metrics.operatingExpenses)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-600 flex items-center gap-2">
                {t('calculators.roi.management_expenses_label', 'Management fees')}
                <InfoIcon
                  content={t('calculators.roi.management_expenses_breakdown_tooltip', 'Fees paid to property management company for handling tenant relations, rent collection, and maintenance coordination.')}
                />
              </dt>
              <dd className="font-medium text-gray-900">{formatCurrency(-metrics.managementExpenses)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-600 flex items-center gap-2">
                {t('calculators.roi.fixed_expenses_label', 'Fixed costs (taxes, insurance, other)')}
                <InfoIcon
                  content={t('calculators.roi.fixed_expenses_breakdown_tooltip', 'Fixed annual costs including property taxes, insurance premiums, and other recurring expenses that don\'t vary with income.')}
                />
              </dt>
              <dd className="font-medium text-gray-900">{formatCurrency(-metrics.fixedExpenses)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-2 mt-2">
              <dt className="text-gray-600 flex items-center gap-2">
                {t('calculators.roi.debt_service_breakdown_label', 'Debt service')}
                <InfoIcon
                  content={t('calculators.roi.debt_service_breakdown_tooltip', 'Total annual mortgage payments (principal + interest). This is $0 for cash purchases.')}
                />
              </dt>
              <dd className="font-medium text-gray-900">{formatCurrency(-metrics.annualDebtService)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-2 mt-2">
              <dt className="text-gray-900 font-semibold flex items-center gap-2">
                {t('calculators.roi.cash_flow_label', 'Annual cash flow')}
                <InfoIcon
                  content={t('calculators.roi.cash_flow_breakdown_tooltip', 'The remaining cash after all expenses and debt service. This is what you actually receive (or pay) each year.')}
                />
              </dt>
              <dd className="text-lg font-semibold text-blue-700">
                {formatCurrency(metrics.annualCashFlow)}
              </dd>
            </div>
          </dl>
        </div>

        <p className="text-xs text-gray-500">
          {t(
            'calculators.roi.disclaimer',
            'Outputs are estimates only. Actual rent, vacancies, expenses, and financing terms will vary by market and lender.'
          )}
        </p>

        {/* CTA Section */}
        <div className="mt-8 rounded-lg bg-blue-50 border border-blue-100 p-6">
          <div className="flex items-start gap-4">
            <MessageCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('leads.cta_title', 'Need help with this deal?')}
              </h3>
              <p className="text-gray-600 mb-2">
                {t('leads.cta_description', 'Connect with a vetted real estate expert who can help you analyze this property and find similar opportunities.')}
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
      </section>

      <LeadForm
        isOpen={showLeadForm}
        onClose={() => setShowLeadForm(false)}
        source="roi_calculator"
        context={{
          purchasePrice: state.purchasePrice,
          monthlyRent: state.monthlyRent,
          cashOnCash: metrics.cashOnCash,
          capRate: metrics.capRate,
        }}
      />
    </div>
  )
}


