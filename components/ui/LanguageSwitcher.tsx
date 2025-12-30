'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Globe, Check } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { useTracking } from '@/lib/useTracking'

interface LanguageSwitcherProps {
  className?: string
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { track } = useTracking()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇲🇽' },
    { code: 'zh', name: '中文', flag: '🇨🇳' }
  ]

  // Hide the language switcher on individual guide pages (we use localized slugs and explicit hreflang instead)
  if (router.pathname === '/guides/[slug]') {
    return null
  }

  const currentLanguage = languages.find(lang => lang.code === router.locale) || languages[0]

  // Calculate dropdown position when opening - always opens downward
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      // Use requestAnimationFrame to ensure button position is calculated correctly
      requestAnimationFrame(() => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect()
          setDropdownPosition({
            top: rect.bottom + 8, // Always open downward, 8px below button
            right: window.innerWidth - rect.right
          })
        }
      })
    }
  }, [isOpen])

  const handleLanguageChange = (languageCode: string) => {
    if (router.locale !== languageCode) {
      track('language_changed', { from: router.locale || 'en', to: languageCode })
      const { pathname, asPath, query } = router

      // For guide pages, we no longer offer language switching here — fall back to base behavior
      if (pathname === '/guides/[slug]') {
        const currentSlug = query.slug as string
        const baseSlug = currentSlug ? currentSlug.replace(/-en$|-es$|-zh$/, '') : ''
        router.push(`/guides/${baseSlug}`, `/guides/${baseSlug}`, { locale: languageCode, scroll: false })
        setIsOpen(false)
        return
      }

      // For other pages, use the standard Next.js i18n routing
      router.push({ pathname, query }, asPath, { locale: languageCode, scroll: false })
    }
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        ref={buttonRef}
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLanguage.name}</span>
        <span className="sm:hidden">{currentLanguage.flag}</span>
      </Button>

      {isOpen && mounted && createPortal(
        <>
          {/* Overlay to close dropdown */}
          <div
            className="fixed inset-0 z-[99998]"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown menu - using fixed positioning to ensure it's above overlay */}
          <div 
            className="fixed w-48 bg-white rounded-md shadow-lg border border-gray-200 z-[99999]"
            style={{ 
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              {languages.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLanguageChange(language.code)
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-100 active:bg-gray-200 cursor-pointer transition-colors ${
                    router.locale === language.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{language.flag}</span>
                    <span>{language.name}</span>
                  </div>
                  {router.locale === language.code && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

export default LanguageSwitcher
