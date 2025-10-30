import React from 'react'
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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/', '/', { locale: router.locale })
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <Layout title={t('profile.title')} subtitle={t('profile.subtitle')}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout title={t('profile.title')} subtitle={t('profile.subtitle')}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">Please sign in to access your profile.</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={t('profile.title')} subtitle={t('profile.subtitle')}>
      <div className="max-w-4xl mx-auto">
        <UserProfile />
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  }
}

