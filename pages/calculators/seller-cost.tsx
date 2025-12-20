import Head from 'next/head'
import { Layout } from '@/components/Layout'
import { SellerCostCalculator } from '@/components/calculators/SellerCostCalculator'
import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function SellerCostPage() {
  const { t } = useTranslation('common')

  return (
    <>
      <Head>
        <title>{t('calculators.seller_cost.meta_title', 'Seller Cost Calculator - PropTrenz')}</title>
        <meta name="description" content={t('calculators.seller_cost.meta_description', 'Calculate selling costs for Mexican real estate. Estimate capital gains tax, agent commissions, and fideicomiso cancellation fees.')} />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://proptrenz.com'}/calculators/seller-cost`} />
      </Head>
      <Layout
        title={t('calculators.seller_cost.page_title', 'Seller Cost Calculator')}
        subtitle={t(
          'calculators.seller_cost.page_subtitle',
          'Estimate capital gains tax, commissions, and trust cancellation fees when selling in Mexico.'
        )}
      >
        <SellerCostCalculator />
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
    console.error('[seller-cost] Error loading translations:', error)
    const fallbackTranslations = await serverSideTranslations('en', ['common'])

    return {
      props: {
        ...fallbackTranslations,
      },
    }
  }
}

