'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, X, Loader2, Check, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from 'next-i18next'
import { useAuth } from '@/lib/auth'
import { useTracking } from '@/lib/useTracking'

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

interface ContactWidgetProps {
  className?: string
}

export function ContactWidget({ className }: ContactWidgetProps) {
  const { t } = useTranslation('common')
  const { user, profile } = useAuth()
  const { track } = useTracking()

  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const formRef = useRef<HTMLFormElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const defaultName = useMemo(() => profile?.name || (user?.user_metadata?.name as string) || '', [profile?.name, user?.user_metadata?.name])
  const defaultEmail = useMemo(() => user?.email || '', [user?.email])

  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setName(defaultName)
  }, [defaultName])

  useEffect(() => {
    setEmail(defaultEmail)
  }, [defaultEmail])

  const clearForm = useCallback((options?: { keepStatus?: boolean }) => {
    setSubject('')
    setMessage('')
    if (!options?.keepStatus) {
      setStatus('idle')
    }
    setErrorMessage(null)
  }, [])

  const closeWidget = useCallback(() => {
    setIsOpen(false)
    clearForm()
    if (buttonRef.current) {
      buttonRef.current.focus()
    }
  }, [clearForm])

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault()
        closeWidget()
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('keydown', handleEsc)
    }
  }, [closeWidget, isOpen])

  const validateForm = () => {
    if (!name.trim()) {
      setErrorMessage(t('contact.form_errors.name', 'Please provide your name.'))
      return false
    }
    if (!email.trim()) {
      setErrorMessage(t('contact.form_errors.email', 'Please provide a valid email address.'))
      return false
    }
    const emailRegex = /^[a-zA-Z0-9.!#$%&'’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    if (!emailRegex.test(email)) {
      setErrorMessage(t('contact.form_errors.email_invalid', 'Email address is invalid.'))
      return false
    }
    if (!message.trim()) {
      setErrorMessage(t('contact.form_errors.message', 'Please include a short message.'))
      return false
    }
    setErrorMessage(null)
    return true
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (status === 'submitting') {
      return
    }

    if (!validateForm()) {
      return
    }

    setStatus('submitting')
    setErrorMessage(null)
    track('contact_widget_submitted', { subject: subject ? 'custom' : 'empty' })

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const serverMessage = typeof data?.error === 'string' ? data.error : undefined
        throw new Error(serverMessage || 'Failed to send message')
      }

      setStatus('success')
      track('contact_widget_success')
      clearForm({ keepStatus: true })

      if (formRef.current) {
        formRef.current.reset()
      }

      // Keep name/email prefilled after reset
      setName(defaultName)
      setEmail(defaultEmail)
    } catch (error: any) {
      console.error('[ContactWidget] Failed to submit message', error)
      setStatus('error')
      setErrorMessage(error?.message || t('contact.generic_error', 'Something went wrong. Please try again later.'))
      track('contact_widget_failure', { message: error?.message })
    }
  }

  const toggleWidget = () => {
    setIsOpen((prev) => {
      const next = !prev
      if (next) {
        track('contact_widget_opened')
      } else {
        track('contact_widget_closed')
        clearForm()
      }
      return next
    })
  }

  const renderStatusMessage = () => {
    if (status === 'success') {
      return (
        <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          <Check className="h-4 w-4" />
          {t('contact.success_message', 'Thanks! Your message has been sent.')}
        </div>
      )
    }

    if (status === 'error' && errorMessage) {
      return (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {errorMessage}
        </div>
      )
    }

    if (errorMessage) {
      return (
        <div className="flex items-center gap-2 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
          <AlertTriangle className="h-4 w-4" />
          {errorMessage}
        </div>
      )
    }

    return null
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity"
          aria-hidden="true"
          onClick={closeWidget}
        />
      )}

      <div
        className={clsx(
          'fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-4 sm:bottom-6 sm:right-6',
          className
        )}
      >
        {isOpen && (
          <div className="relative mb-3 w-[min(360px,calc(100vw-2.5rem))] max-h-[calc(100vh-4rem)] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:mb-4 sm:w-[340px]">
            <div className="flex items-start justify-between rounded-t-2xl bg-blue-600 px-5 py-4 text-white">
              <div className="pr-2">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
                  {t('contact.header', 'Send a message')}
                </p>
                <h3 className="mt-1 text-lg font-bold leading-tight">{t('contact.title', 'How can we help?')}</h3>
                <p className="text-xs text-white/80">{t('contact.subtitle', 'We usually answer within a few hours.')}</p>
              </div>
              <button
                type="button"
                onClick={closeWidget}
                className="rounded-full bg-white/20 p-1 text-white transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
                aria-label={t('contact.actions.close', 'Close contact form')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              ref={formRef}
              className="flex max-h-[calc(100vh-11rem)] flex-col gap-4 overflow-y-auto px-5 pb-5 pt-4"
              onSubmit={handleSubmit}
            >
              {renderStatusMessage()}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  {t('contact.fields.name', 'Name')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder={t('contact.placeholders.name', 'Your name')}
                  autoComplete="name"
                  disabled={status === 'submitting'}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  {t('contact.fields.email', 'Email address')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder={t('contact.placeholders.email', 'you@example.com')}
                  autoComplete="email"
                  disabled={status === 'submitting'}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  {t('contact.fields.subject', 'Subject')}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder={t('contact.placeholders.subject', 'Quick question about PropTrenz')}
                  disabled={status === 'submitting'}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  {t('contact.fields.message', 'Message')}
                </label>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder={t('contact.placeholders.message', 'Share any details or links that can help us respond.')}
                  disabled={status === 'submitting'}
                  required
                />
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('contact.actions.sending', 'Sending...')}
                  </>
                ) : (
                  <>{t('contact.actions.submit', 'Send message')}</>
                )}
              </button>
            </form>
          </div>
        )}

        <button
          ref={buttonRef}
          type="button"
          onClick={toggleWidget}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls="contact-widget-panel"
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      </div>
    </>
  )
}

export default ContactWidget


