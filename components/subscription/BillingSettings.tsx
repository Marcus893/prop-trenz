'use client'

import { useState } from 'react'
import { useTranslation } from 'next-i18next'
import { CreditCard, Calendar, AlertCircle, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/lib/subscription'

export function BillingSettings() {
  const { t } = useTranslation('common')
  const { subscription, loading, openBillingPortal, openUpgradeModal, refresh } = useSubscription()
  const [portalLoading, setPortalLoading] = useState(false)

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      await openBillingPortal()
    } catch (error) {
      console.error('Failed to open billing portal:', error)
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
      </div>
    )
  }

  const isPaid = subscription?.tier && subscription.tier !== 'free'
  const isActive = subscription?.status === 'active'
  const isCanceled = subscription?.status === 'cancelled'
  const isExpired = subscription?.status === 'expired' || subscription?.isExpired
  const isPastDue = subscription?.status === 'past_due'
  
  // Check if subscription expires within the paid period (for cancelled subs)
  const isWithinPaidPeriod = isCanceled && subscription?.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > new Date() && !isExpired

  const statusConfig = {
    active: {
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
      label: t('subscription.status_active', 'Active'),
    },
    canceling: {
      icon: AlertCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      label: t('subscription.status_canceling', 'Canceling'),
    },
    canceled: {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      label: t('subscription.status_canceled', 'Canceled'),
    },
    expired: {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      label: t('subscription.status_expired', 'Expired'),
    },
    past_due: {
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      label: t('subscription.status_past_due', 'Past Due'),
    },
    trialing: {
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      label: t('subscription.status_trial', 'Trial'),
    },
    inactive: {
      icon: XCircle,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      label: t('subscription.status_inactive', 'Inactive'),
    },
  }

  // Use 'canceling' status if cancelled but still within paid period, 'expired' if fully expired
  const displayStatus = isExpired ? 'expired' : (isWithinPaidPeriod ? 'canceling' : (subscription?.status as keyof typeof statusConfig))
  const status = statusConfig[displayStatus] || statusConfig.inactive
  const StatusIcon = status.icon

  const tierNames = {
    free: t('subscription.tier_free', 'Free'),
    monthly: t('subscription.tier_monthly', 'Monthly'),
    yearly: t('subscription.tier_yearly', 'Yearly'),
    lifetime: t('subscription.tier_lifetime', 'Lifetime'),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('subscription.billing_settings', 'Billing & Subscription')}
        </h3>
        <button
          onClick={() => refresh()}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {t('subscription.refresh', 'Refresh')}
        </button>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${status.bg}`}>
                <CreditCard className={`h-6 w-6 ${status.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">
                    {tierNames[subscription?.tier as keyof typeof tierNames] || tierNames.free}
                  </h4>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {isPaid
                    ? t('subscription.unlimited_transactions', 'Unlimited transactions')
                    : t('subscription.free_tier_desc', '1 free transaction')}
                </p>
              </div>
            </div>
          </div>

          {/* Usage stats */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {t('subscription.transactions_used', 'Transactions')}
              </span>
              <span className="font-medium text-gray-900">
                {subscription?.transactionCount || 0}
                {!isPaid && (
                  <span className="text-gray-400"> / 1</span>
                )}
              </span>
            </div>
            {!isPaid && (
              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      (subscription?.transactionCount || 0) >= 1
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${Math.min((subscription?.transactionCount || 0) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Renewal info - only for active (not canceling) subscriptions */}
          {subscription?.currentPeriodEnd && isActive && !isCanceled && subscription.tier !== 'lifetime' && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>
                {t('subscription.renews_on', 'Renews on {{date}}', {
                  date: new Date(subscription.currentPeriodEnd).toLocaleDateString(),
                })}
              </span>
            </div>
          )}

          {/* Canceling notice - when cancelled but still within paid period */}
          {isWithinPaidPeriod && subscription?.currentPeriodEnd && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  {t('subscription.subscription_canceling', 'Subscription Canceling')}
                </p>
                <p className="text-sm text-orange-600">
                  {t('subscription.expires_on', 'Your access expires on {{date}}. Renew to keep using premium features.', {
                    date: new Date(subscription.currentPeriodEnd).toLocaleDateString(),
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Fully cancelled/expired notice - subscription period has ended */}
          {(isExpired || (isCanceled && subscription?.currentPeriodEnd && !isWithinPaidPeriod)) && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  {t('subscription.subscription_expired', 'Subscription Expired')}
                </p>
                <p className="text-sm text-red-600">
                  {t('subscription.access_ended', 'Your subscription has ended. Renew to regain access to premium features.')}
                </p>
              </div>
            </div>
          )}

          {isPastDue && (
            <div className="mt-4 p-3 bg-amber-50 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {t('subscription.payment_failed', 'Payment Failed')}
                </p>
                <p className="text-sm text-amber-600">
                  {t('subscription.update_payment', 'Please update your payment method to continue using premium features.')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-3">
          {isPaid ? (
            <>
              <Button
                onClick={handleManageBilling}
                disabled={portalLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {portalLoading ? (
                  t('subscription.loading', 'Loading...')
                ) : (
                  <>
                    {t('subscription.manage_subscription', 'Manage Subscription')}
                    <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </Button>
              
              {/* Show change plan option for monthly/yearly subscribers */}
              {(subscription?.tier === 'monthly' || subscription?.tier === 'yearly') && (
                <Button
                  onClick={openUpgradeModal}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {t('subscription.change_plan', 'Change Plan')}
                </Button>
              )}
            </>
          ) : (
            <Button
              onClick={openUpgradeModal}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t('subscription.upgrade_now', 'Upgrade Now')}
            </Button>
          )}
        </div>
      </div>

      {/* Free tier info */}
      {!isPaid && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
          <h4 className="font-semibold text-gray-900 mb-2">
            {t('subscription.unlock_premium', 'Unlock Premium Features')}
          </h4>
          <ul className="space-y-2 text-sm text-gray-600 mb-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t('subscription.feature_neighborhood_data', 'Full neighborhood-level data')}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t('subscription.feature_price_trends', 'Historical price trends & charts')}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t('subscription.feature_rent_breakdown', 'Detailed rent breakdowns by type')}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t('subscription.feature_unlimited', 'Unlimited transactions')}
            </li>
          </ul>
          <Button
            onClick={openUpgradeModal}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            {t('subscription.view_plans', 'View Plans')}
          </Button>
        </div>
      )}
    </div>
  )
}
