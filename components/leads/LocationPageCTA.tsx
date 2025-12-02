'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LeadForm } from './LeadForm'

interface LocationPageCTAProps {
  city?: string
  municipality?: string
  neighborhood?: string
  locationName?: string
  averagePrice?: number
}

export function LocationPageCTA({
  city,
  municipality,
  neighborhood,
  locationName,
  averagePrice,
}: LocationPageCTAProps) {
  const [showLeadForm, setShowLeadForm] = useState(false)

  return (
    <>
      <div className="mt-8 mb-12 rounded-lg bg-blue-50 border border-blue-100 p-6">
        <div className="flex items-start gap-4">
          <MessageCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Necesitas ayuda para encontrar tu propiedad perfecta?
            </h3>
            <p className="text-gray-600 mb-4">
              Conéctate con un experto inmobiliario verificado que puede encontrarte excelentes oportunidades.
            </p>
            <Button
              onClick={() => setShowLeadForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Obtener Ayuda de un Experto
            </Button>
          </div>
        </div>
      </div>

      <LeadForm
        isOpen={showLeadForm}
        onClose={() => setShowLeadForm(false)}
        source="location_page"
        context={{
          city,
          municipality,
          neighborhood,
          locationName,
          averagePrice,
        }}
      />
    </>
  )
}



