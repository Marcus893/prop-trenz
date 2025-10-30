import { AppProps } from 'next/app'
import { appWithTranslation } from 'next-i18next'
import { AuthProvider } from '@/lib/auth'
import '@/styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  )
}

export default appWithTranslation(MyApp, {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'zh'],
  },
})
