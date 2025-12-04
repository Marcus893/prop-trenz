'use client'

import { useState } from 'react'
import { useTranslation } from 'next-i18next'
import { MessageCircle } from 'lucide-react'
import { LeadForm } from '@/components/leads/LeadForm'
import { Button } from '@/components/ui/button'

interface LeadCTAProps {
  source: string
  context?: Record<string, any>
  titleKey?: string
  descriptionKey?: string
  titleDefault?: string
  descriptionDefault?: string
}

export function LeadCTA({ 
  source, 
  context = {},
  titleKey = 'leads.cta_title',
  descriptionKey = 'leads.cta_description',
  titleDefault = 'Need help with this deal?',
  descriptionDefault = 'Connect with a vetted real estate expert who can help you analyze this property and find similar opportunities.'
}: LeadCTAProps) {
  const { t } = useTranslation('common')
  const [showLeadForm, setShowLeadForm] = useState(false)

  return (
    <>
      <div className="mt-8 rounded-lg bg-blue-50 border border-blue-100 p-6">
        <div className="flex items-start gap-4">
          <MessageCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t(titleKey, titleDefault)}
            </h3>
            <p className="text-gray-600 mb-2">
              {t(descriptionKey, descriptionDefault)}
            </p>
            <p className="text-sm text-gray-600 italic mb-1">
              {t('leads.cta_social_proof', '47 investors got connected last month 🤝')}
            </p>
            <Button
              onClick={() => setShowLeadForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t('leads.cta_button', 'Get Expert Help >')}
            </Button>
          </div>
        </div>
      </div>

      <LeadForm
        isOpen={showLeadForm}
        onClose={() => setShowLeadForm(false)}
        source={source}
        context={context}
      />
    </>
  )
}






