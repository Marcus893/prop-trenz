import { Layout } from '@/components/Layout'
import { ROICalculator } from '@/components/calculators/ROICalculator'
import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function ROICalculatorPage() {
  const { t } = useTranslation('common')

  return (
    <Layout
      title={t('calculators.roi.page_title', 'Rental ROI Calculator')}
      subtitle={t(
        'calculators.roi.page_subtitle',
        'Model cash flow, cap rates, and cash-on-cash returns for Mexican rental properties.'
      )}
    >
      <ROICalculator />
    </Layout>
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


