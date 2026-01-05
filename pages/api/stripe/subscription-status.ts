import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // Get auth token from header
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' })
  }

  const token = authHeader.replace('Bearer ', '')
  
  // Create authenticated supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // Verify the user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  try {
    // Get subscription details from database
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Count user's transactions
    const { count: transactionCount } = await supabase
      .from('user_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Default values for users without subscription record
    let tier = subscription?.tier || 'free'
    let status = subscription?.status || 'inactive'
    let currentPeriodEnd = subscription?.current_period_end || null
    let cancelledAt = subscription?.cancelled_at || null
    const isLifetime = tier === 'lifetime' && status === 'active'
    
    // IMPORTANT: Check Stripe directly for real-time subscription status
    // This catches cases where the webhook didn't fire or was delayed
    if (stripe && subscription?.stripe_subscription_id && !isLifetime) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
        
        // Check if subscription is set to cancel at period end
        if (stripeSubscription.cancel_at_period_end) {
          status = 'cancelled'
          cancelledAt = stripeSubscription.canceled_at 
            ? new Date(stripeSubscription.canceled_at * 1000).toISOString()
            : new Date().toISOString()
          currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString()
          
          // Sync database with Stripe's actual status
          if (subscription.status !== 'cancelled') {
            await supabase.from('user_subscriptions').update({
              status: 'cancelled',
              cancelled_at: cancelledAt,
              current_period_end: currentPeriodEnd,
            }).eq('user_id', user.id)
          }
        } else if (stripeSubscription.status === 'canceled') {
          // Subscription has been fully cancelled (immediate cancellation or period ended)
          status = 'expired'
          // Sync database
          if (subscription.status !== 'expired') {
            await supabase.from('user_subscriptions').update({
              status: 'expired',
            }).eq('user_id', user.id)
          }
        } else if (stripeSubscription.status === 'active') {
          status = 'active'
          currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString()
        }
      } catch (stripeError) {
        // Stripe subscription might not exist anymore, use database values
        console.warn('[Subscription Status API] Could not fetch Stripe subscription:', stripeError)
      }
    }
    
    // Check if user can create more transactions
    // Allow creating transactions even if cancelled, until period ends
    let canCreateTransaction = false
    if (tier === 'monthly' || tier === 'yearly' || tier === 'lifetime') {
      // For cancelled subscriptions, check if we're still within the paid period
      if (status === 'cancelled' && currentPeriodEnd) {
        const periodEnd = new Date(currentPeriodEnd)
        canCreateTransaction = new Date() < periodEnd
      } else {
        canCreateTransaction = status === 'active'
      }
    } else {
      // Free tier: can create if less than 1 transaction
      canCreateTransaction = (transactionCount || 0) < 1
    }

    // Calculate transaction limit
    const transactionLimit = (tier !== 'free' && (status === 'active' || (status === 'cancelled' && currentPeriodEnd && new Date() < new Date(currentPeriodEnd)))) ? -1 : 1
    
    // Check if subscription is truly expired (can repurchase same tier)
    const isExpired = status === 'expired' || (status === 'cancelled' && currentPeriodEnd && new Date() >= new Date(currentPeriodEnd))

    return res.status(200).json({
      tier,
      status,
      currentPeriodEnd,
      cancelledAt,
      isLifetime,
      isExpired,
      canCreateTransaction,
      transactionCount: transactionCount || 0,
      transactionLimit,
      preferredCurrency: subscription?.preferred_currency || 'MXN',
      hasStripeCustomer: !!subscription?.stripe_customer_id,
    })
  } catch (error: any) {
    console.error('[Subscription Status API] Error:', error)
    return res.status(500).json({ error: error.message || 'Failed to get subscription status' })
  }
}
