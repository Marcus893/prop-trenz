'use client'

import { useState, ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { AuthForm } from '@/components/auth/AuthForm'
import { useAuth } from '@/lib/auth'
import { useTranslation } from 'next-i18next'
import { 
  Home, 
  BarChart3, 
  Map, 
  Settings, 
  User, 
  Menu,
  X
} from 'lucide-react'

interface LayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  const { t } = useTranslation('common')
  const { user, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [showAuth, setShowAuth] = useState(false)

  // List of authorized admin emails
  const ADMIN_EMAILS = [
    '43uy75@gmail.com',
    'marcusding1@gmail.com'
  ]

  const navigation = [
    { name: t('common.home'), href: '/', icon: Home },
    { name: t('common.charts'), href: '/charts', icon: BarChart3 },
    { name: t('common.map'), href: '/map', icon: Map },
  ]

  // Add profile link for signed-in users
  if (user) {
    navigation.push({ name: t('common.profile'), href: '/profile', icon: User })
  }

  // Only show admin link for authorized users
  if (user && ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
    navigation.push({ name: t('common.admin'), href: '/admin', icon: Settings })
  }

  const handleSignOut = async () => {
    await signOut()
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white h-full">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-xl font-bold text-blue-600">PropTrenz</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    >
                      <Icon className="mr-4 h-6 w-6" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              {user ? (
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-base font-medium text-gray-700">{user.email}</p>
                    <button
                      onClick={handleSignOut}
                      className="text-sm font-medium text-gray-500 hover:text-gray-700"
                    >
                      {t('common.sign_out')}
                    </button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowAuth(true)} className="w-full">
                  {t('common.sign_in')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0 lg:flex-col">
        <div className="flex flex-col w-64">
          <div className="flex flex-col border-r border-gray-200 bg-white h-screen sticky top-0">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-blue-600">PropTrenz</h1>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              {user ? (
                <div className="flex items-center w-full">
                  <div className="flex-shrink-0">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-700">{user.email}</p>
                    <button
                      onClick={handleSignOut}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      {t('common.sign_out')}
                    </button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowAuth(true)} className="w-full">
                  {t('common.sign_in')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-50">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{title || ' '}</h1>
                  <p className="text-gray-600">{subtitle || ' '}</p>
                </div>
                <LanguageSwitcher />
              </div>

              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAuth(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <AuthForm 
                mode={authMode} 
                onModeChange={setAuthMode}
                onClose={() => setShowAuth(false)}
                className="border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Layout
