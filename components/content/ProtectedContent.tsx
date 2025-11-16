'use client'

import { useState } from 'react'
import { useTranslation } from 'next-i18next'
import { AuthForm } from '@/components/auth/AuthForm'
import { useAuth } from '@/lib/auth'
import type { GuideAccessLevel } from '@/lib/pseo/types'

interface ProtectedContentProps {
  accessLevel: GuideAccessLevel
  teaser?: string
  children: React.ReactNode
}

export function ProtectedContent({ accessLevel, teaser, children }: ProtectedContentProps) {
  const { user } = useAuth()
  const { t } = useTranslation('common')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup')

  if (accessLevel === 'public' || user) {
    return <>{children}</>
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white border border-blue-100 shadow-sm rounded-2xl p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          {t('guides.signup_required_title', 'Create a free account to unlock this guide')}
        </h2>
        <p className="text-sm text-gray-600 leading-6 mb-6">
          {t(
            'guides.signup_required_description',
            'Create a complimentary PropTrenz account to unlock premium due diligence guides.'
          )}
        </p>
        {teaser && (
          <div className="mb-6 rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            {teaser}
          </div>
        )}
        <AuthForm mode={authMode} onModeChange={setAuthMode} className="shadow-none border border-gray-100" />
      </div>
    </div>
  )
}

export default ProtectedContent
