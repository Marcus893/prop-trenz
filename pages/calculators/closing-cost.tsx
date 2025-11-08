import { Layout } from '@/components/Layout'
import { ClosingCostCalculator } from '@/components/calculators/ClosingCostCalculator'
import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function ClosingCostPage() {
  const { t } = useTranslation('common')

  return (
    <Layout
      title={t('calculators.closing_cost.page_title', 'Buyer Closing Cost Calculator')}
      subtitle={t(
        'calculators.closing_cost.page_subtitle',
        'Know your additional costs before you make the final decision to buy!'
      )}
    >
      <ClosingCostCalculator />
    </Layout>
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
    console.error('[closing-cost] Error loading translations:', error)
    const fallbackTranslations = await serverSideTranslations('en', ['common'])

    return {
      props: {
        ...fallbackTranslations,
      },
    }
  }
}

