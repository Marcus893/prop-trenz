import React from 'react'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { MapPin } from 'lucide-react'
import { GetServerSideProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

export default function MapPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Interactive Map
          </h1>
          <p className="text-gray-600 mb-4">
            Interactive map visualization coming soon in Phase 2.
          </p>
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <MapPin className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Map visualization will be implemented in Phase 2</p>
          </div>
        </Card>
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

