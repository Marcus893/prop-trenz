'use client'

import { useState } from 'react'
import { useSubscription } from '@/lib/subscription'
import { AuthForm } from '@/components/auth/AuthForm'

export function AuthModalWithContext() {
  const { isAuthModalOpen, closeAuthModal } = useSubscription()
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')

  if (!isAuthModalOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity"
          onClick={closeAuthModal}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-md my-8 text-left align-middle transition-all transform relative">
          <AuthForm
            mode={authMode}
            onModeChange={setAuthMode}
            onClose={closeAuthModal}
          />
        </div>
      </div>
    </div>
  )
}
