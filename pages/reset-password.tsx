import React, { useEffect, useState, useRef, useCallback } from 'react'
import Head from 'next/head'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { GetServerSideProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function ResetPasswordPage() {
  const { t } = useTranslation('common')
  // Helper to get translation with fallback
  const tr = useCallback((key: string, fallback: string): string => {
    const value = t(key as any) as string
    return value === key ? fallback : value
  }, [t])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'updating' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [allowed, setAllowed] = useState(false)
  const [checked, setChecked] = useState(false)

  const infoTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const updateInProgressRef = useRef(false)
  const timedOutRef = useRef(false)

  const clearTimers = useCallback(() => {
    if (infoTimeoutRef.current) {
      clearTimeout(infoTimeoutRef.current)
      infoTimeoutRef.current = null
    }
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current)
      errorTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      clearTimers()
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
        redirectTimeoutRef.current = null
      }
      updateInProgressRef.current = false
      timedOutRef.current = false
    }
  }, [clearTimers])

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (hash && /type=recovery/.test(hash)) {
      setAllowed(true)
      setChecked(true)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAllowed(true)
      }

      if (event === 'USER_UPDATED' && updateInProgressRef.current) {
        timedOutRef.current = false
        updateInProgressRef.current = false
        clearTimers()
        setStatus('success')
        setMessage(tr('auth.password_updated', 'Password updated successfully'))
        redirectTimeoutRef.current = setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      }

      setChecked(true)
    })

    const to = setTimeout(() => setChecked(true), 300)

    return () => {
      subscription.unsubscribe()
      clearTimeout(to)
    }
  }, [clearTimers, tr])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setStatus('idle')
    
    if (password !== confirm) {
      setStatus('error')
      setMessage(tr('auth.passwords_do_not_match', 'Passwords do not match'))
      return
    }
    if (password.length < 6) {
      setStatus('error')
      setMessage(tr('auth.password_length', 'Password must be at least 6 characters'))
      return
    }
    const hasLetter = /[A-Za-z]/.test(password)
    const hasNumber = /\d/.test(password)
    if (!hasLetter || !hasNumber) {
      setStatus('error')
      setMessage(tr('auth.password_requirements', 'Password must contain at least one letter and one number'))
      return
    }
    
    setStatus('updating')
    setMessage('')

    updateInProgressRef.current = true
    timedOutRef.current = false

    clearTimers()
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current)
      redirectTimeoutRef.current = null
    }
    
    try {
      console.log('[Password Reset] Starting update...')
      const startTime = Date.now()

      infoTimeoutRef.current = setTimeout(() => {
        if (!updateInProgressRef.current || timedOutRef.current) {
          return
        }
        console.log('[Password Reset] Update taking longer than expected...')
        setMessage(tr('auth.update_in_progress', 'Still working on updating your password...'))
      }, 5000)

      errorTimeoutRef.current = setTimeout(() => {
        if (!updateInProgressRef.current) {
          return
        }
        console.log('[Password Reset] True timeout - no response after 60s')
        timedOutRef.current = true
        updateInProgressRef.current = false
        setStatus('error')
        setMessage(tr('auth.update_timeout', 'Update timed out. Please try again.'))
      }, 60000)

      const { data, error } = await supabase.auth.updateUser({ password })
      const elapsed = Date.now() - startTime
      console.log(`[Password Reset] Got response after ${elapsed}ms:`, { hasData: !!data, hasError: !!error, error })

      if (!updateInProgressRef.current) {
        return
      }

      clearTimers()
      updateInProgressRef.current = false

      if (timedOutRef.current) {
        return
      }

      if (error) {
        setStatus('error')
        setMessage(error.message || tr('auth.update_error', 'An error occurred while updating password'))
        return
      }

      if (!data) {
        setStatus('error')
        setMessage(tr('auth.update_error', 'An error occurred while updating password'))
        return
      }

      setStatus('success')
      setMessage(tr('auth.password_updated', 'Password updated successfully'))

      redirectTimeoutRef.current = setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    } catch (e: any) {
      console.log('[Password Reset] Exception caught:', e)

      if (!updateInProgressRef.current) {
        return
      }

      clearTimers()
      updateInProgressRef.current = false

      if (timedOutRef.current) {
        return
      }

      setStatus('error')
      setMessage(e?.message || tr('auth.update_error', 'An error occurred while updating password'))
    }
  }

  return (
    <>
      <Head>
        <title>{tr('auth.reset_password', 'Reset Password')} - PropTrenz</title>
      </Head>
      <Layout title={tr('auth.reset_password', 'Reset Password')} subtitle={''}>
      <div className="max-w-md mx-auto">
        {!checked ? null : !allowed ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-red-600">{tr('auth.invalid_or_expired_link', 'This reset link is invalid or expired.')}</p>
          </div>
        ) : (
        <form onSubmit={handleUpdate} className="space-y-4 bg-white p-6 rounded-lg shadow">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tr('auth.password', 'Password')}</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tr('auth.confirm_password', 'Confirm Password')}</label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {message && (
            <div
              className={`text-sm ${
                status === 'error'
                  ? 'text-red-600'
                  : status === 'success'
                    ? 'text-green-600'
                    : 'text-gray-600'
              }`}
            >
              {message}
            </div>
          )}
          <Button type="submit" disabled={status==='updating'} className="w-full">
            {status==='updating' 
              ? tr('auth.updating', 'Updating...')
              : tr('auth.reset_password', 'Reset Password')}
          </Button>
        </form>
        )}
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
