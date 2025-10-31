'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'next-i18next'
import { User, Trash2, AlertTriangle } from 'lucide-react'

export function UserProfile() {
  const { t } = useTranslation('common')
  const { user, deleteAccount, updateProfile } = useAuth()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [nameValid, setNameValid] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setMounted(true)
    setNameValue(user?.user_metadata?.name || '')
  }, [user])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const { error } = await updateProfile({ name: nameValue })
      if (error) {
        alert('Failed to save profile')
      } else {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2500)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    // Allow letters (including accents), spaces, hyphens, apostrophes
    const filtered = input.replace(/[^A-Za-zÀ-ÿ' -]/g, '')
    setNameValue(filtered)
    setNameValid(/^[A-Za-zÀ-ÿ' -]*$/.test(filtered))
  }

  const handleUpdatePassword = async () => {
    setPasswordMsg(null)
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
      setPasswordMsg({ type: 'error', text: t('auth.confirm_password') as string })
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordMsg({ type: 'error', text: error.message })
    } else {
      setPasswordMsg({ type: 'success', text: (t('auth.password_updated') as string) || 'Password updated successfully' })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const { error } = await deleteAccount()
      if (error) {
        alert(`Failed to delete account: ${error.message}`)
      } else {
        alert(t('auth.account_deleted'))
      }
    } catch (err) {
      alert('An unexpected error occurred')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-md mx-auto">
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
              pattern="^[A-Za-zÀ-ÿ'\s-]*$"
              value={nameValue}
              onChange={handleNameChange}
              className="w-full p-3 bg-gray-50 rounded-md text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {!nameValid && (
              <p className="mt-1 text-sm text-red-600">{mounted ? t('auth.name_letters_only', 'Name must contain letters only') : 'Name must contain letters only'}</p>
            )}
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
                <div className={`text-sm ${passwordMsg.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{passwordMsg.text}</div>
              )}
              <div className="flex justify-end">
                <Button onClick={handleUpdatePassword}>{t('common.save')}</Button>
              </div>
            </div>
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


