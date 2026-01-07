import { AppProps } from 'next/app'
import Head from 'next/head'
import { appWithTranslation } from 'next-i18next'
import { AuthProvider } from '@/lib/auth'
import { PostHogProviderWrapper } from '@/lib/posthog'
import { SubscriptionProvider } from '@/lib/subscription'
import { ContactWidget } from '@/components/support/ContactWidget'
import { UpgradeModalWithContext } from '@/components/subscription'
import '@/styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      </Head>
      <AuthProvider>
        <PostHogProviderWrapper>
          <SubscriptionProvider>
            <Component {...pageProps} />
            <ContactWidget />
            <UpgradeModalWithContext />
          </SubscriptionProvider>
        </PostHogProviderWrapper>
      </AuthProvider>
    </>
  )
}

export default appWithTranslation(MyApp, {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'zh'],
  },
})
