'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth'
import { useTranslation } from 'next-i18next'
import { Eye, EyeOff, Mail, Lock, User, X } from 'lucide-react'

interface AuthFormProps {
  mode: 'signin' | 'signup'
  onModeChange: (mode: 'signin' | 'signup') => void
  onClose?: () => void
  className?: string
}

export function AuthForm({ mode, onModeChange, onClose, className }: AuthFormProps) {
  const { t } = useTranslation('common')
  const { signIn, signUp, loading, resetPassword, signInWithGoogle } = useAuth()
  const [mounted, setMounted] = useState(false)
  
  // Ensure component is mounted before rendering translations
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Fallback function for translations
  const translate = (key: string) => {
    if (!mounted) {
      // Return consistent fallback during SSR
      return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
    const fullKey = `auth.${key}`
    const translation = t(fullKey as any)
    return translation === fullKey ? key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : translation
  }
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (mode === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      // Require at least one letter and one number
      const hasLetter = /[A-Za-z]/.test(formData.password)
      const hasNumber = /\d/.test(formData.password)
      if (!hasLetter || !hasNumber) {
        setError(translate('password_requirements') || 'Password must contain at least one letter and one number')
        return
      }
    }

    try {
      if (mode === 'signin') {
        const { error } = await signIn(formData.email, formData.password)
        if (error) {
          setError(error.message)
        } else {
          // Close modal on successful sign in
          if (onClose) onClose()
        }
      } else {
        const { error } = await signUp(formData.email, formData.password, formData.name)
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Check your email for verification link')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    }
  }

  const handleForgotPassword = async () => {
    setError('')
    setSuccess('')
    if (!formData.email) {
      setError(translate('enter_email_to_reset') || 'Please enter your email to receive a reset link')
      return
    }
    const { error } = await resetPassword(formData.email)
    if (error) {
      setError(error.message)
    } else {
      // Do not reveal whether the email exists to avoid user enumeration
      setSuccess(translate('password_reset_email_sent_generic'))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <Card className={`p-6 max-w-md mx-auto relative ${className}`}>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      )}
      
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {mode === 'signin' ? translate('welcome_back') : translate('get_started')}
        </h2>
        <p className="text-gray-600">
          {mode === 'signin' ? translate('sign_in') : translate('create_account')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Button type="button" variant="secondary" onClick={() => signInWithGoogle()} className="w-full flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.64,6.053,29.084,4,24,4C12.954,4,4,12.954,4,24 s8.954,20,20,20s20-8.954,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,13,24,13c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.64,6.053,29.084,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.176,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.623-3.317-11.277-7.943l-6.563,5.048C9.48,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.147-4.11,5.571c0.001-0.001,0.002-0.001,0.003-0.002 l6.19,5.238C36.95,40.188,44,35,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
          {translate('continue_with_google') || 'Continue with Google'}
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">{t('common.or','or')}</span></div>
        </div>
        {mode === 'signup' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translate('name')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={translate('name')}
                className="pl-10"
                required
              />
            </div>
          </div>
        )}

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translate('email')}
            </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={translate('email')}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translate('password')}
            </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder={translate('password')}
              className="pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {mode === 'signin' && (
            <div className="text-right mt-1">
              <button type="button" onClick={handleForgotPassword} className="text-sm text-blue-600 hover:text-blue-700">
                {translate('forgot_password')}
              </button>
            </div>
          )}
        </div>

        {mode === 'signup' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translate('confirm_password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder={translate('confirm_password')}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        )}


        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">
            {success}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : null}
          {mode === 'signin' ? translate('sign_in') : translate('sign_up')}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          {mode === 'signin' ? (
            <>
              {translate('dont_have_account')}{' '}
              <button
                onClick={() => onModeChange('signup')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {translate('sign_up')}
              </button>
            </>
          ) : (
            <>
              {translate('already_have_account')}{' '}
              <button
                onClick={() => onModeChange('signin')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {translate('sign_in')}
              </button>
            </>
          )}
        </p>
      </div>
    </Card>
  )
}

export default AuthForm
