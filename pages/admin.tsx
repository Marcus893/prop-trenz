import React from 'react'
import { Layout } from '@/components/Layout'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { GetServerSideProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

// List of authorized admin emails
const ADMIN_EMAILS = [
  '43uy75@gmail.com',
  'marcusding1@gmail.com'
]

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/', '/', { locale: router.locale })
        return
      }
      
      // Check if user is authorized admin
      const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')
      setIsAuthorized(isAdmin)
      setCheckingAuth(false)
      
      if (!isAdmin) {
        router.push('/', '/', { locale: router.locale })
      }
    }
  }, [user, loading, router])

  if (loading || checkingAuth) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (!user || !isAuthorized) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access the admin panel.</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <AdminPanel />
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
