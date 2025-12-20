import Head from 'next/head'
import { Layout } from '@/components/Layout'
import { ROICalculator } from '@/components/calculators/ROICalculator'
import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function ROICalculatorPage() {
  const { t } = useTranslation('common')

  return (
    <>
      <Head>
        <title>{t('calculators.roi.meta_title', 'Rental ROI Calculator - PropTrenz')}</title>
        <meta name="description" content={t('calculators.roi.meta_description', 'Calculate rental property ROI in Mexico. Model cash flow, cap rates, and cash-on-cash returns for your real estate investment.')} />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://proptrenz.com'}/calculators/roi`} />
      </Head>
      <Layout
        title={t('calculators.roi.page_title', 'Rental ROI Calculator')}
        subtitle={t(
          'calculators.roi.page_subtitle',
          'Model cash flow, cap rates, and cash-on-cash returns for Mexican rental properties.'
        )}
      >
        <ROICalculator />
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
        ...translations
      }
    }
  } catch (error) {
    console.error('[roi-calculator] Error loading translations:', error)
    const fallbackTranslations = await serverSideTranslations('en', ['common'])

    return {
      props: {
        ...fallbackTranslations
      }
    }
  }
}








