import Link from 'next/link'
import Head from 'next/head'
import { Layout } from '@/components/Layout'
import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { Calculator } from 'lucide-react'

const calculatorLinks = [
  {
    href: '/calculators/closing-cost',
    titleKey: 'calculators_page.closing_cost_title',
    descriptionKey: 'calculators_page.closing_cost_description',
  },
  {
    href: '/calculators/ownership-cost',
    titleKey: 'calculators_page.ownership_cost_title',
    descriptionKey: 'calculators_page.ownership_cost_description',
  },
  {
    href: '/calculators/seller-cost',
    titleKey: 'calculators_page.seller_cost_title',
    descriptionKey: 'calculators_page.seller_cost_description',
  },
  {
    href: '/calculators/roi',
    titleKey: 'calculators_page.roi_title',
    descriptionKey: 'calculators_page.roi_description',
  },
]

export default function CalculatorsOverviewPage() {
  const { t } = useTranslation('common')

  return (
    <>
      <Head>
        <title>{t('calculators_page.meta_title', 'Real Estate Calculators - PropTrenz')}</title>
        <meta name="description" content={t('calculators_page.meta_description', 'Free real estate calculators for Mexico. Estimate closing costs, ownership expenses, selling costs, and ROI for your property investment.')} />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://proptrenz.com'}/calculators`} />
      </Head>
      <Layout
        title={t('calculators_page.title', 'Real Estate Calculators')}
        subtitle={t(
          'calculators_page.subtitle',
          'Quickly estimate the costs involved in buying, owning, and selling property in Mexico.'
        )}
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {calculatorLinks.map((calculator) => (
          <Link
            key={calculator.href}
            href={calculator.href}
            className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {t(calculator.titleKey, 'Calculator')}
              </h3>
              <Calculator className="h-6 w-6 text-blue-500 group-hover:text-blue-600" />
            </div>
            <p className="mt-3 text-sm text-gray-600">
              {t(
                calculator.descriptionKey,
                'Estimate the costs associated with this stage of the property lifecycle.'
              )}
            </p>
            <p className="mt-4 text-sm font-medium text-blue-600 group-hover:underline">
              {t('calculators_page.learn_more', 'Open calculator')}
            </p>
          </Link>
        ))}
        </div>
      </Layout>
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale, defaultLocale }) => {
  const validLocale = locale || defaultLocale || 'en'

  try {
    const translations = await serverSideTranslations(validLocale, ['common'])

    return {
      props: {
        ...translations,
      },
    }
  } catch (error) {
    console.error('[calculators] Error loading translations:', error)
    const fallbackTranslations = await serverSideTranslations('en', ['common'])

    return {
      props: {
        ...fallbackTranslations,
      },
    }
  }
}

