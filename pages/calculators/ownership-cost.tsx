import { Layout } from '@/components/Layout'
import { OwnershipCostCalculator } from '@/components/calculators/OwnershipCostCalculator'
import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function OwnershipCostPage() {
  const { t } = useTranslation('common')

  return (
    <Layout
      title={t('calculators.ownership_cost.page_title', 'Ownership Cost Calculator')}
      subtitle={t(
        'calculators.ownership_cost.page_subtitle',
        'Estimate annual holding costs across taxes, maintenance, and services.'
      )}
    >
      <OwnershipCostCalculator />
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
    console.error('[ownership-cost] Error loading translations:', error)
    const fallbackTranslations = await serverSideTranslations('en', ['common'])

    return {
      props: {
        ...fallbackTranslations,
      },
    }
  }
}

