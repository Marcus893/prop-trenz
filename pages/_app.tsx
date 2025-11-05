import { AppProps } from 'next/app'
import { appWithTranslation } from 'next-i18next'
import { AuthProvider } from '@/lib/auth'
import { PostHogProviderWrapper } from '@/lib/posthog'
import '@/styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <PostHogProviderWrapper>
        <Component {...pageProps} />
      </PostHogProviderWrapper>
    </AuthProvider>
  )
}

export default appWithTranslation(MyApp, {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'zh'],
  },
})
