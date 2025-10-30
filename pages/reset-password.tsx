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
  const tr = (key: string, fallback?: string) => {
    const value = t(key as any)
    return value === key ? (fallback ?? key) : (value as string)
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
    if (password !== confirm) {
      setMessage(tr('auth.confirm_password', 'Confirm Password'))
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
    try {
      setStatus('updating')
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setStatus('error')
        setMessage(error.message)
      } else {
        setStatus('success')
        setMessage(tr('auth.password_updated', 'Password updated successfully'))
      }
    } catch (e: any) {
      setStatus('error')
      setMessage(e?.message || 'Error')
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
            {status==='updating' ? 'Updating...' : tr('auth.reset_password', 'Reset Password')}
          </Button>
        </form>
        )}
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
