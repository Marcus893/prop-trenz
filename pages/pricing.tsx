import { useState } from 'react'
import { GetStaticProps } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import Link from 'next/link'
import { Check, Zap, Star, Crown, ArrowRight, Shield, Clock, HelpCircle } from 'lucide-react'
import Layout from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { useSubscription, formatPrice, getYearlyDiscount, type PlanType, type Currency } from '@/lib/subscription'
import { SUBSCRIPTION_PRICES } from '@/lib/stripe'

type FrequencyOption = 'monthly' | 'yearly' | 'lifetime'

export default function PricingPage() {
  const { t } = useTranslation('common')
  const { subscription, checkout } = useSubscription()
  const [currency, setCurrency] = useState<Currency>('MXN')
  const [loading, setLoading] = useState<PlanType | null>(null)

  const handleSelectPlan = async (plan: PlanType) => {
    if (!subscription) {
      // Redirect to login if not authenticated
      window.location.href = '/profile?redirect=pricing'
      return
    }

    setLoading(plan)
    try {
      await checkout(plan, currency)
    } catch (error) {
      console.error('Checkout error:', error)
      setLoading(null)
    }
  }

  const plans: {
    id: PlanType
    icon: typeof Zap
    name: string
    description: string
    popular?: boolean
    features: string[]
    color: string
  }[] = [
    {
      id: 'monthly',
      icon: Zap,
      name: t('subscription.monthly_title', 'Monthly'),
      description: t('subscription.monthly_desc', 'Perfect for active buyers or sellers'),
      features: [
        t('subscription.feature_unlimited', 'Unlimited transactions'),
        t('subscription.feature_checklists', 'Stage checklists & tracking'),
        t('subscription.feature_costs', 'Cost tracking & estimates'),
        t('subscription.feature_documents', 'Document management'),
        t('subscription.feature_notes', 'Notes & timeline'),
      ],
      color: 'blue',
    },
    {
      id: 'yearly',
      icon: Star,
      name: t('subscription.yearly_title', 'Yearly'),
      description: t('subscription.yearly_desc', 'Best for long-term investors'),
      popular: true,
      features: [
        t('subscription.feature_unlimited', 'Unlimited transactions'),
        t('subscription.feature_checklists', 'Stage checklists & tracking'),
        t('subscription.feature_costs', 'Cost tracking & estimates'),
        t('subscription.feature_documents', 'Document management'),
        t('subscription.feature_notes', 'Notes & timeline'),
        t('subscription.feature_priority', 'Priority email support'),
      ],
      color: 'purple',
    },
    {
      id: 'lifetime',
      icon: Crown,
      name: t('subscription.lifetime_title', 'Lifetime'),
      description: t('subscription.lifetime_desc', 'For serious real estate professionals'),
      features: [
        t('subscription.feature_unlimited', 'Unlimited transactions'),
        t('subscription.feature_checklists', 'Stage checklists & tracking'),
        t('subscription.feature_costs', 'Cost tracking & estimates'),
        t('subscription.feature_documents', 'Document management'),
        t('subscription.feature_notes', 'Notes & timeline'),
        t('subscription.feature_priority', 'Priority email support'),
        t('subscription.feature_lifetime_updates', 'Lifetime updates'),
        t('subscription.feature_early_access', 'Early access to new features'),
      ],
      color: 'amber',
    },
  ]

  const faqs = [
    {
      q: t('subscription.faq_cancel_q', 'Can I cancel anytime?'),
      a: t('subscription.faq_cancel_a', 'Yes, you can cancel your subscription at any time. Access continues until the end of your billing period.'),
    },
    {
      q: t('subscription.faq_payment_q', 'What payment methods do you accept?'),
      a: t('subscription.faq_payment_a', 'We accept all major credit cards, including Visa, Mastercard, and American Express. Payments are processed securely through Stripe.'),
    },
    {
      q: t('subscription.faq_free_q', 'What\'s included in the free tier?'),
      a: t('subscription.faq_free_a', 'The free tier allows you to track 1 transaction with full access to all features. Perfect for first-time buyers.'),
    },
    {
      q: t('subscription.faq_switch_q', 'Can I switch plans?'),
      a: t('subscription.faq_switch_a', 'Yes, you can upgrade or downgrade your plan at any time through the billing portal.'),
    },
  ]

  const getColorClasses = (color: string, isPopular: boolean) => ({
    card: isPopular
      ? 'bg-gradient-to-b from-purple-50 to-white border-purple-300 shadow-xl scale-105'
      : 'bg-white border-gray-200 hover:border-gray-300',
    icon: color === 'blue' ? 'bg-blue-100 text-blue-600' 
        : color === 'purple' ? 'bg-purple-100 text-purple-600'
        : 'bg-amber-100 text-amber-600',
    button: color === 'blue' ? 'bg-blue-600 hover:bg-blue-700'
        : color === 'purple' ? 'bg-purple-600 hover:bg-purple-700'
        : 'bg-amber-600 hover:bg-amber-700',
    badge: color === 'purple' ? 'bg-purple-600' : 'bg-gray-600',
  })

  return (
    <Layout>
      <Head>
        <title>{t('subscription.pricing_title', 'Pricing - PropTrenz')}</title>
        <meta
          name="description"
          content={t('subscription.pricing_meta', 'Choose the perfect plan for tracking your real estate transactions in Mexico')}
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <div className="pt-16 pb-12 px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t('subscription.pricing_headline', 'Simple, Transparent Pricing')}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            {t('subscription.pricing_subheadline', 'Track your real estate transactions with confidence. Start free, upgrade when you need more.')}
          </p>

          {/* Currency Toggle */}
          <div className="inline-flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setCurrency('MXN')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currency === 'MXN'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🇲🇽 MXN
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currency === 'USD'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🇺🇸 USD
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-6xl mx-auto px-4 pb-16">
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {plans.map((plan) => {
              const priceConfig = SUBSCRIPTION_PRICES[currency][plan.id]
              const price = formatPrice(priceConfig.amount, currency)
              const colors = getColorClasses(plan.color, !!plan.popular)
              const Icon = plan.icon
              const isCurrentPlan = subscription?.tier === plan.id

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 p-8 transition-all ${colors.card}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className={`${colors.badge} text-white px-4 py-1 rounded-full text-sm font-semibold`}>
                        {t('subscription.most_popular', 'Most Popular')}
                      </span>
                    </div>
                  )}

                  {plan.id === 'yearly' && (
                    <div className="absolute top-4 right-4">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                        {t('subscription.save_percent', 'Save {{percent}}%', { percent: getYearlyDiscount() })}
                      </span>
                    </div>
                  )}

                  {plan.id === 'lifetime' && (
                    <div className="absolute top-4 right-4">
                      <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-semibold">
                        {t('subscription.best_value', 'Best Value')}
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${colors.icon} mb-4`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
                  </div>

                  <div className="text-center mb-8">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold text-gray-900">{price}</span>
                    </div>
                    <span className="text-gray-500">
                      {plan.id === 'lifetime'
                        ? t('subscription.one_time', 'one-time')
                        : plan.id === 'yearly'
                        ? t('subscription.per_year', '/year')
                        : t('subscription.per_month', '/month')}
                    </span>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading !== null || isCurrentPlan}
                    className={`w-full ${colors.button} text-white flex items-center justify-center gap-2`}
                  >
                    {isCurrentPlan ? (
                      t('subscription.current_plan', 'Current Plan')
                    ) : loading === plan.id ? (
                      t('subscription.processing', 'Processing...')
                    ) : (
                      <>
                        {t('subscription.get_started', 'Get Started')}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Free Tier Banner */}
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-2">
              {t('subscription.free_tier_title', 'Start for Free')}
            </h3>
            <p className="text-blue-100 mb-6 max-w-xl mx-auto">
              {t('subscription.free_tier_desc', 'Track your first transaction completely free. No credit card required.')}
            </p>
            <Link href="/transactions">
              <Button className="bg-white text-blue-600 hover:bg-blue-50">
                {t('subscription.try_free', 'Try it Free')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="p-6">
              <Shield className="h-10 w-10 text-green-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-1">
                {t('subscription.trust_secure', 'Secure Payments')}
              </h4>
              <p className="text-sm text-gray-500">
                {t('subscription.trust_secure_desc', 'Powered by Stripe with bank-level encryption')}
              </p>
            </div>
            <div className="p-6">
              <Clock className="h-10 w-10 text-blue-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-1">
                {t('subscription.trust_instant', 'Instant Access')}
              </h4>
              <p className="text-sm text-gray-500">
                {t('subscription.trust_instant_desc', 'Start using premium features immediately')}
              </p>
            </div>
            <div className="p-6">
              <HelpCircle className="h-10 w-10 text-purple-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-1">
                {t('subscription.trust_support', 'Friendly Support')}
              </h4>
              <p className="text-sm text-gray-500">
                {t('subscription.trust_support_desc', 'Get help from our team when you need it')}
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto px-4 pb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            {t('subscription.faq_title', 'Frequently Asked Questions')}
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200 p-6"
              >
                <h4 className="font-semibold text-gray-900 mb-2">{faq.q}</h4>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  }
}
