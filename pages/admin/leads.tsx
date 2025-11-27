import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { Layout } from '@/components/Layout'
import { Card } from '@/components/ui/card'
import { Loader2, Mail, MapPin, Calendar, DollarSign, Filter, ChevronDown, Check, X, Download } from 'lucide-react'
import Head from 'next/head'
import { GetServerSideProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

const ADMIN_EMAILS = [
  '43uy75@gmail.com',
  'marcusding1@gmail.com'
]

interface Lead {
  id: string
  name: string
  email: string
  phone: string | null
  city: string | null
  municipality: string | null
  neighborhood: string | null
  budget_range: string | null
  timeline: string | null
  property_type: string | null
  source: string
  country: string | null
  country_code: string | null
  status: string
  assigned_agent_email: string | null
  created_at: string
}

export default function LeadsAdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { t } = useTranslation('common')
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [isCityFilterOpen, setIsCityFilterOpen] = useState(false)
  const cityFilterRef = useRef<HTMLDivElement>(null)
  const [csvExportLanguage, setCsvExportLanguage] = useState<'en' | 'es' | 'zh'>('en')

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/')
        return
      }
      
      // Check if user is authorized admin
      const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')
      if (!isAdmin) {
        router.push('/')
        return
      }

      loadLeads()
    }
  }, [user, authLoading, router])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityFilterRef.current && !cityFilterRef.current.contains(event.target as Node)) {
        setIsCityFilterOpen(false)
      }
    }

    if (isCityFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCityFilterOpen])

  const loadLeads = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/leads')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load leads')
      }

      setLeads(data.leads || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update lead status')
      }

      // Reload leads
      await loadLeads()
    } catch (err: any) {
      alert(err.message || 'Failed to update lead status')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // Get unique cities from leads
  const uniqueCities = useMemo(() => {
    const cities = leads
      .map(lead => lead.city)
      .filter((city): city is string => city !== null && city !== '')
      .filter((city, index, self) => self.indexOf(city) === index)
      .sort()
    return cities
  }, [leads])

  // Filter leads based on selected cities
  const filteredLeads = useMemo(() => {
    if (selectedCities.length === 0) {
      return leads
    }
    return leads.filter(lead => lead.city && selectedCities.includes(lead.city))
  }, [leads, selectedCities])

  const toggleCity = (city: string) => {
    setSelectedCities(prev => {
      if (prev.includes(city)) {
        return prev.filter(c => c !== city)
      } else {
        return [...prev, city]
      }
    })
  }

  const selectAllCities = () => {
    setSelectedCities(uniqueCities)
  }

  const clearCityFilter = () => {
    setSelectedCities([])
  }

  const getTranslations = async (lang: 'en' | 'es' | 'zh') => {
    try {
      const response = await fetch(`/locales/${lang}/common.json`)
      const translations = await response.json()
      return translations.leads || {}
    } catch (error) {
      console.error('Failed to load translations:', error)
      return {}
    }
  }

  const translateValue = (value: string | null, translations: any, lang: 'en' | 'es' | 'zh'): string => {
    if (!value) return ''
    
    // Map budget ranges - these are the actual values stored in the database
    const budgetKeyMap: Record<string, string> = {
      'under-2m': 'budget_under_2m',
      '2m-5m': 'budget_2m_5m',
      '5m-10m': 'budget_5m_10m',
      '10m-20m': 'budget_10m_20m',
      'over-20m': 'budget_over_20m',
    }
    
    // Map timelines - these are the actual values stored in the database
    const timelineKeyMap: Record<string, string> = {
      'immediately': 'timeline_immediately',
      '1-3-months': 'timeline_1_3_months',
      '3-6-months': 'timeline_3_6_months',
      '6-12-months': 'timeline_6_12_months',
      'exploring': 'timeline_exploring',
    }
    
    // Check if it's a budget range value
    const budgetKey = budgetKeyMap[value]
    if (budgetKey && translations[budgetKey]) {
      return translations[budgetKey]
    }
    
    // Check if it's a timeline value
    const timelineKey = timelineKeyMap[value]
    if (timelineKey && translations[timelineKey]) {
      return translations[timelineKey]
    }
    
    // Return original value if no translation found
    return value
  }

  const exportToCSV = async () => {
    // Load translations for selected language
    const translations = await getTranslations(csvExportLanguage)
    
    // CSV headers based on selected language
    const headerTranslations: Record<string, Record<'en' | 'es' | 'zh', string>> = {
      'Name': { en: 'Name', es: 'Nombre', zh: '姓名' },
      'Email': { en: 'Email', es: 'Correo electrónico', zh: '电子邮件' },
      'Phone': { en: 'Phone', es: 'Teléfono', zh: '电话' },
      'City': { en: 'City', es: 'Ciudad', zh: '城市' },
      'Municipality': { en: 'Municipality', es: 'Municipio', zh: '市/区' },
      'Neighborhood': { en: 'Neighborhood', es: 'Colonia', zh: '社区' },
      'Budget Range': { en: 'Budget Range', es: 'Rango de Presupuesto', zh: '预算范围' },
      'Timeline': { en: 'Timeline', es: 'Plazo de Decisión', zh: '决策时间' },
      'Property Type': { en: 'Property Type', es: 'Tipo de Propiedad', zh: '房产类型' },
      'Country': { en: 'Country', es: 'País', zh: '国家' },
      'Created At': { en: 'Created At', es: 'Fecha de Creación', zh: '创建时间' }
    }
    
    const headers = Object.keys(headerTranslations).map(key => 
      headerTranslations[key][csvExportLanguage]
    )

    // Convert leads to CSV rows with translated values
    const rows = filteredLeads.map(lead => [
      lead.name || '',
      lead.email || '',
      lead.phone || '',
      lead.city || '',
      lead.municipality || '',
      lead.neighborhood || '',
      translateValue(lead.budget_range, translations, csvExportLanguage),
      translateValue(lead.timeline, translations, csvExportLanguage),
      lead.property_type || '',
      lead.country || '',
      lead.created_at ? new Date(lead.created_at).toLocaleString(csvExportLanguage === 'zh' ? 'zh-CN' : csvExportLanguage === 'es' ? 'es-MX' : 'en-US') : ''
    ])

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // Escape commas and quotes in cell values
          const cellValue = String(cell || '')
          if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
            return `"${cellValue.replace(/"/g, '""')}"`
          }
          return cellValue
        }).join(',')
      )
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800'
      case 'qualified':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-purple-100 text-purple-800'
      case 'lost':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <Head>
        <title>Leads Admin - PropTrenz</title>
      </Head>
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads Management</h1>
              <p className="text-gray-600">View and manage leads from PropTrenz users</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">CSV Language:</span>
                <select
                  value={csvExportLanguage}
                  onChange={(e) => setCsvExportLanguage(e.target.value as 'en' | 'es' | 'zh')}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="zh">中文</option>
                </select>
              </div>
              <button
                onClick={exportToCSV}
                disabled={filteredLeads.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export CSV ({filteredLeads.length})</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
              {error}
            </div>
          )}

          {/* Filters */}
          <Card className="p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter by City:</span>
              </div>
              <div ref={cityFilterRef} className="relative">
                <button
                  onClick={() => setIsCityFilterOpen(!isCityFilterOpen)}
                  className="flex items-center justify-between gap-2 px-3 py-2 min-w-[250px] text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <span className="text-sm text-gray-700">
                    {selectedCities.length === 0
                      ? `All Cities (${leads.length})`
                      : selectedCities.length === 1
                      ? `${selectedCities[0]} (${leads.filter(l => l.city === selectedCities[0]).length})`
                      : `${selectedCities.length} cities selected`}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isCityFilterOpen ? 'transform rotate-180' : ''}`} />
                </button>
                {isCityFilterOpen && (
                  <div className="absolute z-50 mt-1 w-[300px] bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-gray-200">
                      <button
                        onClick={selectAllCities}
                        className="w-full text-left px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        Select All ({uniqueCities.length})
                      </button>
                    </div>
                    <div className="p-2">
                      {uniqueCities.map(city => {
                        const cityCount = leads.filter(l => l.city === city).length
                        const isSelected = selectedCities.includes(city)
                        return (
                          <label
                            key={city}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCity(city)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 flex-1">
                              {city} ({cityCount})
                            </span>
                            {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              {selectedCities.length > 0 && (
                <button
                  onClick={clearCityFilter}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Clear filter
                </button>
              )}
              {selectedCities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedCities.map(city => (
                    <span
                      key={city}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                    >
                      {city}
                      <button
                        onClick={() => toggleCity(city)}
                        className="hover:bg-blue-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-sm text-gray-600">Total Leads</div>
              <div className="text-2xl font-bold text-gray-900">{filteredLeads.length}</div>
              {selectedCities.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  of {leads.length} total
                </div>
              )}
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600">New</div>
              <div className="text-2xl font-bold text-blue-600">
                {filteredLeads.filter(l => l.status === 'new').length}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600">Contacted</div>
              <div className="text-2xl font-bold text-yellow-600">
                {filteredLeads.filter(l => l.status === 'contacted').length}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600">Qualified</div>
              <div className="text-2xl font-bold text-green-600">
                {filteredLeads.filter(l => l.status === 'qualified').length}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600">Closed</div>
              <div className="text-2xl font-bold text-purple-600">
                {filteredLeads.filter(l => l.status === 'closed').length}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600">Foreign Buyers</div>
              <div className="text-2xl font-bold text-indigo-600">
                {filteredLeads.filter(l => l.country_code && l.country_code !== 'MX').length}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {filteredLeads.length > 0 
                  ? `${Math.round((filteredLeads.filter(l => l.country_code && l.country_code !== 'MX').length / filteredLeads.length) * 100)}%`
                  : '0%'}
              </div>
            </Card>
          </div>

          {/* Leads Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name / Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location / Country
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        {selectedCities.length > 0 
                          ? `No leads found for ${selectedCities.join(', ')}`
                          : 'No leads yet'}
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <a href={`mailto:${lead.email}`} className="hover:text-blue-600">
                              {lead.email}
                            </a>
                          </div>
                          {lead.phone && (
                            <div className="text-sm text-gray-500">{lead.phone}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lead.city || 'N/A'}
                          </div>
                          {lead.municipality && (
                            <div className="text-sm text-gray-500">{lead.municipality}</div>
                          )}
                          {lead.neighborhood && (
                            <div className="text-sm text-gray-400">{lead.neighborhood}</div>
                          )}
                          {lead.country && (
                            <div className="text-sm text-blue-600 font-medium mt-1">
                              🌍 {lead.country} {lead.country_code ? `(${lead.country_code})` : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 space-y-1">
                            {lead.budget_range && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {lead.budget_range}
                              </div>
                            )}
                            {lead.timeline && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {lead.timeline}
                              </div>
                            )}
                            {lead.property_type && (
                              <div className="text-xs text-gray-500">{lead.property_type}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{lead.source}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                            className={`text-sm px-2 py-1 rounded ${getStatusColor(lead.status)} border-0`}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="closed">Closed</option>
                            <option value="lost">Lost</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(lead.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </Layout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ locale, defaultLocale }) => {
  const validLocale = locale || defaultLocale || 'en'
  
  return {
    props: {
      ...(await serverSideTranslations(validLocale, ['common'])),
    },
  }
}

