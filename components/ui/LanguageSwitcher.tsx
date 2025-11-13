'use client'

import React, { useState } from 'react'
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

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇲🇽' },
    { code: 'zh', name: '中文', flag: '🇨🇳' }
  ]

  const currentLanguage = languages.find(lang => lang.code === router.locale) || languages[0]

  const handleLanguageChange = (languageCode: string) => {
    if (router.locale !== languageCode) {
      track('language_changed', { from: router.locale || 'en', to: languageCode })
      const { pathname, asPath, query } = router
      
      // For guide pages, we need to extract the base slug and remove any locale suffix
      if (pathname === '/guides/[slug]' && query.slug) {
        const currentSlug = query.slug as string
        // Remove locale suffix from slug if present (e.g., "how-to-find-a-rental-in-mexico-es" -> "how-to-find-a-rental-in-mexico")
        const baseSlug = currentSlug.replace(/-en$|-es$|-zh$/, '')
        
        // Navigate to the guide with the base slug and new locale
        router.push(`/guides/${baseSlug}`, `/guides/${baseSlug}`, { locale: languageCode, scroll: false })
      } else {
        // For other pages, use the standard Next.js i18n routing
        router.push({ pathname, query }, asPath, { locale: languageCode, scroll: false })
      }
    }
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLanguage.name}</span>
        <span className="sm:hidden">{currentLanguage.flag}</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-100 ${
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
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default LanguageSwitcher
