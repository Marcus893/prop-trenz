'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import { formatPrice, getYearlyDiscount, type PlanType, type Currency } from '@/lib/stripe'

interface SubscriptionStatus {
  tier: 'free' | 'monthly' | 'yearly' | 'lifetime'
  status: 'active' | 'past_due' | 'cancelled' | 'expired' | 'inactive'
  currentPeriodEnd: string | null
  cancelledAt: string | null
  isLifetime: boolean
  isExpired: boolean
  canCreateTransaction: boolean
  transactionCount: number
  transactionLimit: number // -1 = unlimited
  preferredCurrency: Currency
  hasStripeCustomer: boolean
}

interface SubscriptionContextType {
  subscription: SubscriptionStatus | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  checkout: (plan: PlanType, currency?: Currency) => Promise<void>
  openBillingPortal: () => Promise<void>
  isUpgradeModalOpen: boolean
  openUpgradeModal: () => void
  closeUpgradeModal: () => void
}

const defaultSubscription: SubscriptionStatus = {
  tier: 'free',
  status: 'inactive',
  currentPeriodEnd: null,
  cancelledAt: null,
  isLifetime: false,
  isExpired: false,
  canCreateTransaction: true,
  transactionCount: 0,
  transactionLimit: 1,
  preferredCurrency: 'MXN',
  hasStripeCustomer: false,
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!session?.access_token) {
      setSubscription(defaultSubscription)
      setLoading(false)
      return
    }

    try {
      setError(null)
      const response = await fetch('/api/stripe/subscription-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status')
      }

      const data = await response.json()
      setSubscription(data)
    } catch (err: any) {
      console.error('[Subscription] Error fetching status:', err)
      setError(err.message)
      setSubscription(defaultSubscription)
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  // Fetch subscription status when user logs in
  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus()
    } else {
      setSubscription(null)
      setLoading(false)
    }
  }, [user, fetchSubscriptionStatus])

  // Check for checkout success/cancel in URL
  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const checkoutStatus = params.get('checkout')
    const expectedPlan = params.get('plan')

    if (checkoutStatus === 'success') {
      // Refresh subscription status after successful checkout
      // Use a retry mechanism since the webhook might not have processed yet
      let attempts = 0
      const maxAttempts = 10
      const retryInterval = 1500 // 1.5 seconds

      const checkSubscription = async () => {
        const response = await fetch('/api/stripe/subscription-status', {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          setSubscription(data)
          
          // Check if subscription updated to expected plan
          if (expectedPlan && data.tier === expectedPlan && data.status === 'active') {
            console.log('[Subscription] Successfully updated to', expectedPlan)
            return // Success, stop retrying
          }
        }
        
        attempts++
        
        // If not updated and we haven't exceeded max attempts, retry
        if (expectedPlan && attempts < maxAttempts) {
          console.log(`[Subscription] Retry ${attempts}/${maxAttempts} - waiting for webhook...`)
          setTimeout(checkSubscription, retryInterval)
        }
      }

      // Start checking after a short delay to give webhook time
      setTimeout(checkSubscription, 1000)
      
      // Clean up URL immediately
      const url = new URL(window.location.href)
      url.searchParams.delete('checkout')
      url.searchParams.delete('plan')
      window.history.replaceState({}, '', url.toString())
    }
  }, [session?.access_token])

  const checkout = async (plan: PlanType, currency: Currency = 'MXN') => {
    if (!session?.access_token) {
      throw new Error('Please sign in to subscribe')
    }

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan, currency }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()
      
      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (err: any) {
      console.error('[Subscription] Checkout error:', err)
      throw err
    }
  }

  const openBillingPortal = async () => {
    if (!session?.access_token) {
      throw new Error('Please sign in to manage billing')
    }

    try {
      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to open billing portal')
      }

      const { url } = await response.json()
      
      // Redirect to Stripe Billing Portal
      window.location.href = url
    } catch (err: any) {
      console.error('[Subscription] Billing portal error:', err)
      throw err
    }
  }

  const openUpgradeModal = () => setIsUpgradeModalOpen(true)
  const closeUpgradeModal = () => setIsUpgradeModalOpen(false)

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        error,
        refresh: fetchSubscriptionStatus,
        checkout,
        openBillingPortal,
        isUpgradeModalOpen,
        openUpgradeModal,
        closeUpgradeModal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}

// Helper hooks for common patterns
export function useCanCreateTransaction(): boolean {
  const { subscription, loading } = useSubscription()
  if (loading || !subscription) return true // Optimistic during loading
  return subscription.canCreateTransaction
}

export function useIsPaidUser(): boolean {
  const { subscription, loading } = useSubscription()
  if (loading || !subscription) return false
  return (
    subscription.status === 'active' &&
    ['monthly', 'yearly', 'lifetime'].includes(subscription.tier)
  )
}

export function useSubscriptionTier(): 'free' | 'monthly' | 'yearly' | 'lifetime' {
  const { subscription, loading } = useSubscription()
  if (loading || !subscription) return 'free'
  return subscription.tier
}

// Re-export price utilities for convenience
export { formatPrice, getYearlyDiscount }
export type { PlanType, Currency }
