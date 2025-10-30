'use client'

import React, { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { processSHFCSV } from '@/lib/data-processor'
import { db, getAuthenticatedClient } from '@/lib/supabase'
import { useTranslation } from 'next-i18next'

interface UploadLog {
  id: string
  filename: string
  upload_date: string
  records_processed: number
  status: 'processing' | 'completed' | 'failed'
  error_message?: string
}

interface AdminPanelProps {
  className?: string
}

export function AdminPanel({ className }: AdminPanelProps) {
  const { t } = useTranslation('admin')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([])
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    loadUploadLogs()
  }, [])

  const loadUploadLogs = async () => {
    try {
      const result = await db.getUploadLogs()
      if (result.error) throw result.error
      setUploadLogs(result.data || [])
    } catch (error) {
      console.error('Error loading upload logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setSelectedFile(file)
    } else {
      alert('Please select a valid CSV file')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first')
      return
    }

    setUploading(true)
    
    try {
      // Get authenticated client
      const authenticatedClient = await getAuthenticatedClient()
      
      // Test database connection first
      const testResult = await db.getUploadLogs()
      
      const result = await processSHFCSV(selectedFile, authenticatedClient)
      
      if (result.success) {
        alert(`Successfully processed ${result.recordsProcessed} records`)
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        loadUploadLogs() // Refresh upload logs
        } else {
          alert(`Upload failed: ${result.error}`)
        }
      } catch (error) {
        alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setUploading(false)
      }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'processing':
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      case 'processing':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* File Upload Section */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {t('upload_csv')}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('select_file')}
            </label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="w-full"
            />
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <FileText className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-700">{selectedFile.name}</span>
              <span className="text-xs text-gray-500">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full"
        >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('processing')}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t('upload')}
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Upload History */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t('upload_history')}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">{t('loading')}</span>
          </div>
        ) : uploadLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>{t('no_uploads_yet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">{t('filename')}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">{t('upload_date')}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">{t('records_processed')}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {uploadLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{log.filename}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{formatDate(log.upload_date)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{log.records_processed}</td>
                    <td className="py-3 px-4">
                      <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                        {getStatusIcon(log.status)}
                        {log.status}
                      </div>
                      {log.error_message && (
                        <div className="text-xs text-red-600 mt-1">
                          {log.error_message}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default AdminPanel
