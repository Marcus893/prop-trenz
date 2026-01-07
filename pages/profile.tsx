import React from 'react'
import Head from 'next/head'
import { Layout } from '@/components/Layout'
import { UserProfile } from '@/components/auth/UserProfile'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { GetServerSideProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { t } = useTranslation('common')
  const [loadingTimeout, setLoadingTimeout] = React.useState(false)

  // Timeout to prevent infinite loading spinner
  useEffect(() => {
    if (loading) {
      const timeoutId = setTimeout(() => {
        setLoadingTimeout(true)
      }, 5000) // 5 second timeout
      return () => clearTimeout(timeoutId)
    }
  }, [loading])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/', '/', { locale: router.locale })
    }
  }, [user, loading, router])

  if (loading && !loadingTimeout) {
    return (
      <>
        <Head>
          <title>{t('profile.meta_title', 'My Profile - PropTrenz')}</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <Layout title={t('profile.title')} subtitle={t('profile.subtitle')}>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </>
    )
  }

  // Loading timed out - show retry option
  if (loading && loadingTimeout) {
    return (
      <>
        <Head>
          <title>{t('profile.meta_title', 'My Profile - PropTrenz')}</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <Layout title={t('profile.title')} subtitle={t('profile.subtitle')}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-600 mb-4">{t('common.loading_slow', 'Loading is taking longer than expected...')}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {t('common.retry', 'Retry')}
              </button>
            </div>
          </div>
        </Layout>
      </>
    )
  }

  if (!user) {
    return (
      <>
        <Head>
          <title>{t('profile.meta_title', 'My Profile - PropTrenz')}</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <Layout title={t('profile.title')} subtitle={t('profile.subtitle')}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">Please sign in to access your profile.</p>
            </div>
          </div>
        </Layout>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{t('profile.meta_title', 'My Profile - PropTrenz')}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <Layout title={t('profile.title')} subtitle={t('profile.subtitle')}>
        <div className="max-w-4xl mx-auto">
          <UserProfile />
        </div>
      </Layout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ locale, defaultLocale }) => {
  // CRITICAL FIX: When locale is undefined (default locale route), use defaultLocale
  const validLocale = locale || defaultLocale || 'en'
  
  return {
    props: {
      ...(await serverSideTranslations(validLocale, ['common'])),
    },
  }
}

