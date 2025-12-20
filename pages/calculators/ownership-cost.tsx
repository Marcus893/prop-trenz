import Head from 'next/head'
import { Layout } from '@/components/Layout'
import { OwnershipCostCalculator } from '@/components/calculators/OwnershipCostCalculator'
import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function OwnershipCostPage() {
  const { t } = useTranslation('common')

  return (
    <>
      <Head>
        <title>{t('calculators.ownership_cost.meta_title', 'Ownership Cost Calculator - PropTrenz')}</title>
        <meta name="description" content={t('calculators.ownership_cost.meta_description', 'Calculate annual property ownership costs in Mexico. Estimate taxes, maintenance, HOA fees, and utilities for your real estate investment.')} />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://proptrenz.com'}/calculators/ownership-cost`} />
      </Head>
      <Layout
        title={t('calculators.ownership_cost.page_title', 'Ownership Cost Calculator')}
        subtitle={t(
          'calculators.ownership_cost.page_subtitle',
          'Estimate annual holding costs across taxes, maintenance, and services.'
        )}
      >
        <OwnershipCostCalculator />
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
    console.error('[ownership-cost] Error loading translations:', error)
    const fallbackTranslations = await serverSideTranslations('en', ['common'])

    return {
      props: {
        ...fallbackTranslations,
      },
    }
  }
}

