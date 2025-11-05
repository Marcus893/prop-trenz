import { useEffect } from 'react'
import { useRouter } from 'next/router'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useAuth } from './auth'

export function PostHogProviderWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    // Initialize PostHog only in production and on client side
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'production' &&
      process.env.NEXT_PUBLIC_POSTHOG_KEY
    ) {
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
      const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

      // Check if already initialized
      if (!posthog.__loaded) {
        posthog.init(posthogKey, {
          api_host: posthogHost,
          capture_pageview: false, // We'll handle pageviews manually
          capture_pageleave: true,
        })
      }
    }
  }, [])

  useEffect(() => {
    // Track page views (only in production)
    if (process.env.NODE_ENV !== 'production') return

    const handleRouteChange = (url: string) => {
      if (typeof window !== 'undefined' && posthog.__loaded) {
        posthog.capture('$pageview', {
          $current_url: window.location.href,
        })
      }
    }

    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  useEffect(() => {
    // Identify user when they sign in (only in production)
    if (process.env.NODE_ENV !== 'production') return

    if (user && posthog.__loaded) {
      posthog.identify(user.id, {
        email: user.email,
        name: user.user_metadata?.name || user.email,
      })
    } else if (!user && posthog.__loaded) {
      // Reset identity when user signs out
      posthog.reset()
    }
  }, [user])

  // Only render provider in production and if PostHog is configured
  if (process.env.NODE_ENV !== 'production' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}

