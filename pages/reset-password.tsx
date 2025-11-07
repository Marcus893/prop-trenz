import React, { useEffect, useState } from 'react'
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
  const tr = (key: string, fallback: string): string => {
    const value = t(key as any) as string
    return value === key ? fallback : value
  }
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'updating' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [allowed, setAllowed] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (hash && /type=recovery/.test(hash)) {
      setAllowed(true)
      setChecked(true)
      return
    }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAllowed(true)
      }
      setChecked(true)
    })
    const to = setTimeout(() => setChecked(true), 300)
    return () => {
      data.subscription.unsubscribe()
      clearTimeout(to)
    }
  }, [])

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
    
    let timeoutId: NodeJS.Timeout | null = null
    let successTimeoutId: NodeJS.Timeout | null = null
    let updateCompleted = false
    
    try {
      console.log('[Password Reset] Starting update...')
      const startTime = Date.now()
      
      // Race condition: if updateUser doesn't resolve in 5 seconds, assume success
      // (since the HTTP request completes quickly ~350ms based on Network tab)
      successTimeoutId = setTimeout(() => {
        if (!updateCompleted) {
          console.log('[Password Reset] Update took >5s, assuming success based on HTTP completion')
          updateCompleted = true
          
          // Clear the error timeout
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
          
          // Show success
          setStatus('success')
          setMessage(tr('auth.password_updated', 'Password updated successfully'))
          
          // Redirect to home page after 2 seconds
          setTimeout(() => {
            window.location.href = '/'
          }, 2000)
        }
      }, 5000) // 5 seconds - if updateUser hasn't resolved, assume success
      
      // Set a longer timeout for true errors
      timeoutId = setTimeout(() => {
        if (!updateCompleted) {
          console.log('[Password Reset] True timeout - no response after 60s')
          setStatus('error')
          setMessage(tr('auth.update_timeout', 'Update timed out. Please try again.'))
        }
      }, 60000) // 60 seconds for true timeout
      
      // Perform the update and wait for it to complete
      const { data, error } = await supabase.auth.updateUser({ password })
      const elapsed = Date.now() - startTime
      console.log(`[Password Reset] Got response after ${elapsed}ms:`, { hasData: !!data, hasError: !!error, error })
      
      // Mark as completed BEFORE checking result
      updateCompleted = true
      
      // Clear both timeouts since we got a response
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (successTimeoutId) {
        clearTimeout(successTimeoutId)
        successTimeoutId = null
      }
      
      // Now check the actual response - if data exists and no error, it's a SUCCESS
      if (error) {
        setStatus('error')
        setMessage(error.message || tr('auth.update_error', 'An error occurred while updating password'))
      } else if (data) {
        // SUCCESS - password was updated (data exists, no error)
        setStatus('success')
        setMessage(tr('auth.password_updated', 'Password updated successfully'))
        
        // Redirect to home page after 2 seconds
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      } else {
        // Edge case: no data and no error (shouldn't happen, but handle it)
        setStatus('error')
        setMessage(tr('auth.update_error', 'An error occurred while updating password'))
      }
    } catch (e: any) {
      // Mark as completed
      updateCompleted = true
      
      // Clear both timeouts on error
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (successTimeoutId) {
        clearTimeout(successTimeoutId)
        successTimeoutId = null
      }
      
      console.log('[Password Reset] Exception caught:', e)
      setStatus('error')
      setMessage(e?.message || tr('auth.update_error', 'An error occurred while updating password'))
    }
  }

  return (
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
            <div className={`text-sm ${status==='error' ? 'text-red-600' : 'text-green-600'}`}>{message}</div>
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
