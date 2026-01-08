'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'next-i18next'
import { User, Trash2, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/router'
import { BillingSettings } from '@/components/subscription/BillingSettings'

export function UserProfile() {
  const { t } = useTranslation('common')
  const { user, profile, deleteAccount, updateProfile } = useAuth()
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [languageValue, setLanguageValue] = useState('en')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [nameValid, setNameValid] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (profile) {
      setNameValue(profile.name || '')
      setLanguageValue(profile.language || 'en')
    } else if (user) {
      setNameValue(user.user_metadata?.name || '')
      setLanguageValue((user.user_metadata?.language as string) || 'en')
    } else {
      setNameValue('')
      setLanguageValue('en')
    }
  }, [profile, user])

  const handleSaveProfile = async () => {
    console.log('[UserProfile] Save button clicked')
    setSaving(true)
    try {
      const { error } = await updateProfile({ name: nameValue, language: languageValue })
      if (error) {
        console.error('[UserProfile] Save failed:', error)
        alert('Failed to save profile')
      } else {
        console.log('[UserProfile] Save successful')
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2500)
      }
    } catch (e) {
      console.error('[UserProfile] Save exception:', e)
      alert('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    // Allow letters (including accents), spaces, hyphens, apostrophes
    const filtered = input.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g, '')
    setNameValue(filtered)
    setNameValid(filtered === input)
  }

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'zh', label: '中文' },
  ]

  const getLanguageLabel = (value: string) => languageOptions.find(option => option.value === value)?.label || t('auth.language')

  const handleUpdatePassword = async () => {
     setPasswordMsg(null)
     
     // Validate before setting updating state
     if (newPassword.length < 6) {
       setPasswordMsg({ type: 'error', text: t('auth.password_length') as string })
       return
     }
     const hasLetter = /[A-Za-z]/.test(newPassword)
     const hasNumber = /\d/.test(newPassword)
     if (!hasLetter || !hasNumber) {
       setPasswordMsg({ type: 'error', text: (t('auth.password_requirements') as string) || 'Password must contain at least one letter and one number' })
       return
     }
     if (newPassword !== confirmPassword) {
       setPasswordMsg({ type: 'error', text: (t('auth.passwords_do_not_match') as string) || 'Passwords do not match' })
       return
     }
     
     setUpdatingPassword(true)
     
     let timeoutId: NodeJS.Timeout | null = null
     let infoTimeoutId: NodeJS.Timeout | null = null
     let timedOut = false
     
     try {
       infoTimeoutId = setTimeout(() => {
         setPasswordMsg({ type: 'info', text: (t('auth.update_in_progress') as string) || 'Still working on updating your password...' })
       }, 5000)

       timeoutId = setTimeout(() => {
         timedOut = true
         setUpdatingPassword(false)
         setPasswordMsg({ type: 'error', text: (t('auth.update_timeout') as string) || 'Update timed out. Please try again.' })
       }, 60000)

       const { data, error } = await supabase.auth.updateUser({ password: newPassword })
       
       if (infoTimeoutId) {
         clearTimeout(infoTimeoutId)
         infoTimeoutId = null
       }

       if (timeoutId) {
         clearTimeout(timeoutId)
         timeoutId = null
       }

       if (timedOut) {
         return
       }

       setUpdatingPassword(false)

       if (error) {
         setPasswordMsg({ type: 'error', text: error.message || (t('auth.update_error') as string || 'An error occurred while updating password') })
         return
       }

       if (!data) {
         setPasswordMsg({ type: 'error', text: (t('auth.update_error') as string || 'An error occurred while updating password') })
         return
       }

       setPasswordMsg({ type: 'success', text: (t('auth.password_updated') as string) || 'Password updated successfully' })
       setNewPassword('')
       setConfirmPassword('')
     } catch (err: any) {
       if (infoTimeoutId) {
         clearTimeout(infoTimeoutId)
         infoTimeoutId = null
       }

       if (timeoutId) {
         clearTimeout(timeoutId)
         timeoutId = null
       }

       if (timedOut) {
         return
       }

       setUpdatingPassword(false)
       setPasswordMsg({ type: 'error', text: err?.message || (t('auth.update_error') as string) || 'An error occurred while updating password' })
     }
   }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    console.log('[UserProfile] Starting account deletion...')
    try {
      // Add a timeout to prevent infinite hanging (65 seconds total - 60s for fetch + 5s buffer)
      const timeoutId = setTimeout(() => {
        console.log('[UserProfile] Local timeout triggered')
        setDeleting(false)
        setShowDeleteConfirm(false)
        alert('Deletion is taking longer than expected. Please check your connection and try again.')
      }, 65000)

      console.log('[UserProfile] Calling deleteAccount...')
      const { error } = await deleteAccount()
      console.log('[UserProfile] deleteAccount returned, error:', error)
      
      clearTimeout(timeoutId)
      
      if (error) {
        setDeleting(false)
        setShowDeleteConfirm(false)
        alert(`Failed to delete account: ${error.message}`)
      } else {
        setDeleting(false)
        setShowDeleteConfirm(false)
        alert(t('auth.account_deleted') || 'Account deleted successfully')
        
        // Use window.location instead of router to force a full page reload
        // This ensures all auth state is cleared and the app reinitializes
        window.location.href = '/'
      }
    } catch (err) {
      setDeleting(false)
      setShowDeleteConfirm(false)
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      alert(`Failed to delete account: ${errorMessage}`)
      console.error('Delete account error:', err)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-6">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {mounted ? t('auth.account_settings') : 'Account Settings'}
          </h2>
        </div>

        <div className="space-y-4">
          {saveSuccess && (
            <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm" aria-live="polite">
              {mounted ? t('common.saved_successfully') : 'Changes saved successfully'}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="p-3 bg-gray-50 rounded-md text-gray-900">
              {user.email}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {mounted ? t('auth.name') : 'Name'}
            </label>
            <input
              type="text"
              inputMode="text"
              value={nameValue}
              onChange={handleNameChange}
              className="w-full p-3 bg-gray-50 rounded-md text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {!nameValid && (
              <p className="mt-1 text-sm text-red-600">{mounted ? t('auth.name_letters_only', 'Name must contain letters only') : 'Name must contain letters only'}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {mounted ? t('auth.language') : 'Language'}
              </label>
              <Select value={languageValue} onValueChange={setLanguageValue}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={getLanguageLabel(languageValue)} />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 flex justify-end">
              <Button onClick={handleSaveProfile} disabled={saving || !nameValid} className="inline-flex items-center justify-center">
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                {mounted ? t('common.save') : 'Save'}
              </Button>
            </div>
          </div>

          {/* Update password */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('auth.reset_password')}</h3>
            <div className="space-y-3">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('auth.password') as string}
                className="w-full p-3 bg-gray-50 rounded-md text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.confirm_password') as string}
                className="w-full p-3 bg-gray-50 rounded-md text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {passwordMsg && (
                <div
                  className={`text-sm ${
                    passwordMsg.type === 'error'
                      ? 'text-red-600'
                      : passwordMsg.type === 'success'
                        ? 'text-green-600'
                        : 'text-gray-600'
                  }`}
                >
                  {passwordMsg.text}
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={handleUpdatePassword} disabled={updatingPassword}>
                  {updatingPassword 
                    ? (mounted ? t('auth.updating') : 'Updating...') 
                    : (mounted ? t('common.save') : 'Save')}
                </Button>
              </div>
            </div>
          </div>

          {/* Billing & Subscription */}
          <div className="pt-4 border-t border-gray-200">
            <BillingSettings />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Danger Zone
            </h3>
            
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full inline-flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {mounted ? t('auth.delete_account') : 'Delete Account'}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800 font-medium mb-2">
                    {mounted ? t('auth.delete_account_confirm') : 'Are you sure you want to delete your account? This action cannot be undone.'}
                  </p>
                  <p className="text-red-700 text-sm">
                    {mounted ? t('auth.delete_account_warning') : 'This will permanently delete your account and all associated data.'}
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                  >
                    {mounted ? t('common.cancel') : 'Cancel'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 inline-flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {deleting ? (mounted ? t('auth.deleting_account') : 'Deleting account...') : (mounted ? t('auth.confirm_delete') : 'Yes, Delete My Account')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default UserProfile


