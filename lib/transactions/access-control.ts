// Transaction access control utilities
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
});

/**
 * Check if user has full subscription access (active paid subscription)
 */
export async function hasFullSubscriptionAccess(
  supabase: any, 
  userId: string
): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('tier, status, stripe_subscription_id')
    .eq('user_id', userId)
    .single();

  if (!subscription) return false;

  const tier = subscription.tier || 'free';
  const status = subscription.status || 'inactive';

  // Lifetime users always have full access
  if (tier === 'lifetime' && status === 'active') return true;

  // Check Stripe for real-time subscription status
  if (subscription.stripe_subscription_id) {
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id
      );

      const now = Date.now() / 1000;
      const periodEnd = stripeSubscription.current_period_end;
      const isActive = stripeSubscription.status === 'active';
      const isCancelling = stripeSubscription.cancel_at_period_end;
      const isPastPeriodEnd = now > periodEnd;

      // Subscription is expired if not active OR (cancelling AND past period end)
      if (!isActive || (isCancelling && isPastPeriodEnd)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking Stripe subscription:', error);
    }
  }

  // Fall back to database status
  return (tier === 'monthly' || tier === 'yearly' || tier === 'lifetime') && status === 'active';
}

/**
 * Check if a transaction is the user's first (always accessible)
 */
export async function isFirstTransaction(
  supabase: any, 
  userId: string, 
  transactionId: string
): Promise<boolean> {
  const { data: firstTx } = await supabase
    .from('user_transactions')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  return firstTx?.id === transactionId;
}

/**
 * Check if user can access a specific transaction
 * Returns true if user has full access OR if it's their first transaction
 */
export async function canAccessTransaction(
  supabase: any,
  userId: string,
  transactionId: string
): Promise<{ canAccess: boolean; reason?: string }> {
  const hasAccess = await hasFullSubscriptionAccess(supabase, userId);
  
  if (hasAccess) {
    return { canAccess: true };
  }

  const isFirst = await isFirstTransaction(supabase, userId, transactionId);
  
  if (isFirst) {
    return { canAccess: true };
  }

  return { 
    canAccess: false, 
    reason: 'Your subscription has expired. Only your first transaction is accessible. Please renew to access all transactions.'
  };
}
