import { NextApiRequest, NextApiResponse } from 'next'
import { buffer } from 'micro'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { verifyWebhookSignature } from '@/lib/stripe'

// Disable body parsing - we need the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// Map Stripe price IDs to plan types
function getPlanFromPriceId(priceId: string): 'monthly' | 'yearly' | 'lifetime' | null {
  const priceMap: Record<string, 'monthly' | 'yearly' | 'lifetime'> = {
    [process.env.STRIPE_PRICE_MONTHLY_MXN || '']: 'monthly',
    [process.env.STRIPE_PRICE_YEARLY_MXN || '']: 'yearly',
    [process.env.STRIPE_PRICE_LIFETIME_MXN || '']: 'lifetime',
    [process.env.STRIPE_PRICE_MONTHLY_USD || '']: 'monthly',
    [process.env.STRIPE_PRICE_YEARLY_USD || '']: 'yearly',
    [process.env.STRIPE_PRICE_LIFETIME_USD || '']: 'lifetime',
  }
  return priceMap[priceId] || null
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  const buf = await buffer(req)
  const signature = req.headers['stripe-signature'] as string

  if (!signature) {
    console.error('[Stripe Webhook] No signature provided')
    return res.status(400).json({ error: 'No signature' })
  }

  const event = verifyWebhookSignature(buf, signature, webhookSecret)
  
  if (!event) {
    console.error('[Stripe Webhook] Invalid signature')
    return res.status(400).json({ error: 'Invalid signature' })
  }

  // Create Supabase client with service role for admin operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase, event.id)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase, event.id)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase, event.id)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, supabase, event.id)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice, supabase, event.id)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge, supabase, event.id)
        break

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }
}

// Handle successful checkout (both subscriptions and one-time payments for lifetime)
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: any,
  eventId: string
) {
  const userId = session.metadata?.user_id
  const plan = session.metadata?.plan as 'monthly' | 'yearly' | 'lifetime' | undefined
  const currency = session.metadata?.currency || 'MXN'

  if (!userId) {
    console.error('[Stripe Webhook] No user_id in checkout session metadata')
    return
  }

  if (!plan) {
    console.error('[Stripe Webhook] No plan in checkout session metadata')
    return
  }

  console.log(`[Stripe Webhook] Checkout completed for user ${userId}, plan: ${plan}`)

  // For lifetime purchases (one-time payment)
  if (session.mode === 'payment' && plan === 'lifetime') {
    const { error } = await supabase.from('user_subscriptions').upsert({
      user_id: userId,
      tier: 'lifetime',
      status: 'active',
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: null,
      preferred_currency: currency,
      lifetime_purchased_at: new Date().toISOString(),
      current_period_end: null, // Lifetime never expires
    }, { onConflict: 'user_id' })

    if (error) {
      console.error('[Stripe Webhook] Error updating lifetime subscription:', error)
    } else {
      console.log('[Stripe Webhook] Lifetime subscription activated for user:', userId)
    }

    // Log the event
    await supabase.from('subscription_events').insert({
      user_id: userId,
      event_type: 'lifetime_purchased',
      to_tier: 'lifetime',
      stripe_event_id: eventId,
      amount_paid: session.amount_total,
      currency,
      metadata: { session_id: session.id },
    })
  } else if (session.mode === 'subscription' && (plan === 'monthly' || plan === 'yearly')) {
    // For subscription purchases, fetch subscription details and update the database
    const subscriptionId = session.subscription as string
    const customerId = session.customer as string
    
    try {
      // Cancel any existing subscriptions for this customer (except the new one)
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
      })
      
      for (const existingSub of existingSubscriptions.data) {
        if (existingSub.id !== subscriptionId) {
          console.log(`[Stripe Webhook] Cancelling old subscription ${existingSub.id} for user ${userId}`)
          await stripe.subscriptions.cancel(existingSub.id)
        }
      }
      
      // Fetch subscription details from Stripe to get period dates
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      
      const { error } = await supabase.from('user_subscriptions').upsert({
        user_id: userId,
        tier: plan,
        status: 'active',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: subscription.items.data[0]?.price?.id,
        preferred_currency: currency,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      }, { onConflict: 'user_id' })

      if (error) {
        console.error('[Stripe Webhook] Error updating subscription:', error)
      } else {
        console.log(`[Stripe Webhook] Subscription ${plan} activated for user:`, userId)
      }
    } catch (error) {
      console.error('[Stripe Webhook] Error processing subscription:', error)
    }

    // Log the event
    await supabase.from('subscription_events').insert({
      user_id: userId,
      event_type: 'subscription_created',
      to_tier: plan,
      stripe_event_id: eventId,
      amount_paid: session.amount_total,
      currency,
      metadata: { session_id: session.id, subscription_id: subscriptionId },
    })
  }
}

// Handle subscription creation and updates
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: any,
  eventId: string
) {
  const userId = subscription.metadata?.user_id
  
  if (!userId) {
    console.error('[Stripe Webhook] No user_id in subscription metadata')
    return
  }

  // Get the price to determine the plan
  const priceId = subscription.items.data[0]?.price?.id
  const plan = priceId ? getPlanFromPriceId(priceId) : null

  if (!plan) {
    console.error('[Stripe Webhook] Could not determine plan from price:', priceId)
    return
  }

  // Map Stripe status to our status
  let status: 'active' | 'past_due' | 'cancelled' | 'inactive' = 'inactive'
  switch (subscription.status) {
    case 'active':
    case 'trialing': // We don't have trials but just in case
      status = 'active'
      break
    case 'past_due':
      status = 'past_due'
      break
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      status = 'cancelled'
      break
    default:
      status = 'inactive'
  }

  // Check if subscription is set to cancel at period end (user clicked cancel in portal)
  // In this case, we should mark as cancelled immediately per our requirements
  if (subscription.cancel_at_period_end) {
    status = 'cancelled'
    console.log(`[Stripe Webhook] Subscription ${subscription.id} is set to cancel at period end`)
  }

  console.log(`[Stripe Webhook] Subscription ${subscription.id} updated: ${plan} / ${status}`)

  // Get previous tier for event logging
  const { data: existingSub } = await supabase
    .from('user_subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .single()

  const fromTier = existingSub?.tier || 'free'
  const wasAlreadyCancelled = existingSub?.status === 'cancelled'

  // Extract cancellation reason from Stripe's cancellation_details
  // This is populated when user cancels via customer portal with feedback
  const cancellationFeedback = subscription.cancellation_details?.feedback || null
  const cancellationComment = subscription.cancellation_details?.comment || null
  const cancelReason = cancellationFeedback 
    ? (cancellationComment ? `${cancellationFeedback}: ${cancellationComment}` : cancellationFeedback)
    : cancellationComment || null

  // Build update object
  const updateData: Record<string, any> = {
    user_id: userId,
    tier: plan,
    status,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  }

  // If subscription is being cancelled, add cancellation details
  if (status === 'cancelled' && !wasAlreadyCancelled) {
    updateData.cancelled_at = new Date().toISOString()
    if (cancelReason) {
      updateData.cancel_reason = cancelReason
    }
  }

  // Update subscription record
  await supabase.from('user_subscriptions').upsert(updateData, { onConflict: 'user_id' })

  // Log the event
  let eventType = 'updated'
  if (status === 'cancelled' && !wasAlreadyCancelled) {
    eventType = 'cancelled'
  } else if (fromTier === 'free' || fromTier === null) {
    eventType = 'created'
  } else if (plan === fromTier) {
    eventType = 'renewed'
  } else if (plan > fromTier) {
    eventType = 'upgraded'
  } else {
    eventType = 'downgraded'
  }

  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: eventType,
    from_tier: fromTier,
    to_tier: status === 'cancelled' ? 'free' : plan,
    stripe_event_id: eventId,
    metadata: { 
      subscription_id: subscription.id, 
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_reason: cancelReason,
    },
  })
}

// Handle subscription cancellation (immediate lock per requirements)
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any,
  eventId: string
) {
  const userId = subscription.metadata?.user_id
  
  if (!userId) {
    console.error('[Stripe Webhook] No user_id in subscription metadata')
    return
  }

  console.log(`[Stripe Webhook] Subscription ${subscription.id} deleted for user ${userId}`)

  // Get previous tier for logging
  const { data: existingSub } = await supabase
    .from('user_subscriptions')
    .select('tier, cancelled_at, cancel_reason')
    .eq('user_id', userId)
    .single()

  // Extract cancellation reason from Stripe's cancellation_details
  const cancellationFeedback = subscription.cancellation_details?.feedback || null
  const cancellationComment = subscription.cancellation_details?.comment || null
  const cancelReason = cancellationFeedback 
    ? (cancellationComment ? `${cancellationFeedback}: ${cancellationComment}` : cancellationFeedback)
    : cancellationComment || null

  // Build update - only update cancel_reason if we have a new one and don't already have one
  const updateData: Record<string, any> = {
    status: 'cancelled',
    cancelled_at: existingSub?.cancelled_at || new Date().toISOString(),
  }
  
  // Update cancel_reason if we have one and existing is null
  if (cancelReason && !existingSub?.cancel_reason) {
    updateData.cancel_reason = cancelReason
  }

  // Immediately revoke access (no grace period per requirements)
  await supabase.from('user_subscriptions').update(updateData).eq('user_id', userId)

  // Log the event
  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: 'deleted',
    from_tier: existingSub?.tier,
    to_tier: 'free',
    stripe_event_id: eventId,
    metadata: { 
      subscription_id: subscription.id,
      cancel_reason: cancelReason,
    },
  })
}

// Handle payment failure (immediate lock per requirements - no grace period)
async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any,
  eventId: string
) {
  const subscriptionId = invoice.subscription as string
  
  if (!subscriptionId) {
    return // Not a subscription invoice
  }

  // Get user from subscription metadata (we need to fetch the subscription)
  const { stripe } = await import('@/lib/stripe')
  if (!stripe) {
    console.error('[Stripe Webhook] Stripe not initialized')
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata?.user_id

  if (!userId) {
    console.error('[Stripe Webhook] No user_id in subscription metadata')
    return
  }

  console.log(`[Stripe Webhook] Payment failed for user ${userId}`)

  // Immediately lock access (no grace period per requirements)
  await supabase.from('user_subscriptions').update({
    status: 'past_due',
  }).eq('user_id', userId)

  // Log the event
  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: 'payment_failed',
    stripe_event_id: eventId,
    stripe_invoice_id: invoice.id,
    amount_paid: 0,
    currency: invoice.currency?.toUpperCase(),
    metadata: { 
      subscription_id: subscriptionId,
      attempt_count: invoice.attempt_count,
    },
  })
}

// Handle successful payment (reactivate if was past_due)
async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: any,
  eventId: string
) {
  const subscriptionId = invoice.subscription as string
  
  if (!subscriptionId) {
    return // Not a subscription invoice
  }

  // Get user from subscription
  const { stripe } = await import('@/lib/stripe')
  if (!stripe) {
    console.error('[Stripe Webhook] Stripe not initialized')
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata?.user_id

  if (!userId) {
    return
  }

  console.log(`[Stripe Webhook] Payment succeeded for user ${userId}`)

  // Reactivate if subscription is active
  if (subscription.status === 'active') {
    await supabase.from('user_subscriptions').update({
      status: 'active',
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    }).eq('user_id', userId)
  }

  // Log the event
  await supabase.from('subscription_events').insert({
    user_id: userId,
    event_type: 'renewed',
    stripe_event_id: eventId,
    stripe_invoice_id: invoice.id,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency?.toUpperCase(),
    metadata: { subscription_id: subscriptionId },
  })
}

// Handle charge refunded
async function handleChargeRefunded(
  charge: Stripe.Charge,
  supabase: any,
  eventId: string
) {
  const customerId = charge.customer as string
  
  if (!customerId) {
    console.log('[Stripe Webhook] No customer ID in charge refund')
    return
  }

  // Find user by customer ID
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  const userId = subscription?.user_id

  console.log(`[Stripe Webhook] Charge refunded for customer ${customerId}, user: ${userId || 'unknown'}`)

  // Log the refund event
  if (userId) {
    await supabase.from('subscription_events').insert({
      user_id: userId,
      event_type: 'refunded',
      stripe_event_id: eventId,
      amount_paid: -charge.amount_refunded, // Negative to indicate refund
      currency: charge.currency?.toUpperCase(),
      metadata: { 
        charge_id: charge.id,
        refund_reason: charge.refunds?.data?.[0]?.reason || 'manual',
      },
    })
  }

  // If it's a full refund and the charge was for a subscription payment,
  // we might want to cancel the subscription - but this is typically handled
  // separately by the admin when they refund
}
