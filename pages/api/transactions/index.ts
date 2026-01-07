// API route: /api/transactions
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Stripe lazily to handle missing env vars in some environments
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('[Transactions API] Missing STRIPE_SECRET_KEY');
    return null;
  }
  return new Stripe(key, { apiVersion: '2024-06-20' as any });
}

// Helper to check if subscription is truly active (not cancelled/expired)
async function getSubscriptionAccessStatus(supabase: any, userId: string): Promise<{
  hasFullAccess: boolean;
  isExpiringSoon: boolean;
  expiresAt: string | null;
}> {
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('tier, status, stripe_subscription_id, current_period_end')
    .eq('user_id', userId)
    .single();

  // No subscription = free tier (only first transaction accessible)
  if (!subscription) {
    return { hasFullAccess: false, isExpiringSoon: false, expiresAt: null };
  }

  const tier = subscription.tier || 'free';
  const status = subscription.status || 'inactive';

  // Lifetime users always have full access
  if (tier === 'lifetime' && status === 'active') {
    return { hasFullAccess: true, isExpiringSoon: false, expiresAt: null };
  }

  // Check Stripe for real-time subscription status
  if (subscription.stripe_subscription_id) {
    try {
      const stripe = getStripe();
      if (!stripe) {
        // Stripe not available, fall back to database status
        const hasFullAccess = (tier === 'monthly' || tier === 'yearly' || tier === 'lifetime') && status === 'active';
        return { hasFullAccess, isExpiringSoon: false, expiresAt: null };
      }
      
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id
      );

      const now = Date.now() / 1000;
      const periodEnd = stripeSubscription.current_period_end;
      const isActive = stripeSubscription.status === 'active';
      const isCancelling = stripeSubscription.cancel_at_period_end;
      const isPastPeriodEnd = now > periodEnd;

      // Subscription is expired if:
      // 1. Status is not active, OR
      // 2. It was cancelled and current period has ended
      if (!isActive || (isCancelling && isPastPeriodEnd)) {
        return { 
          hasFullAccess: false, 
          isExpiringSoon: false, 
          expiresAt: new Date(periodEnd * 1000).toISOString() 
        };
      }

      // Still within paid period (even if cancelling)
      const daysUntilExpiry = (periodEnd - now) / (60 * 60 * 24);
      return { 
        hasFullAccess: true, 
        isExpiringSoon: isCancelling && daysUntilExpiry <= 7,
        expiresAt: isCancelling ? new Date(periodEnd * 1000).toISOString() : null
      };
    } catch (error) {
      console.error('Error checking Stripe subscription:', error);
      // Fall back to database status
    }
  }

  // No Stripe subscription - use database status
  const hasFullAccess = (tier === 'monthly' || tier === 'yearly' || tier === 'lifetime') && status === 'active';
  return { hasFullAccess, isExpiringSoon: false, expiresAt: null };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get auth token from header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Create authenticated supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Verify the user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res, supabase, user.id);
      case 'POST':
        return handlePost(req, res, supabase, user.id);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Transaction API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  userId: string
) {
  // Support filtering by transaction type via ?type=purchase|sale|rent|other
  const type = typeof req.query.type === 'string' ? req.query.type : null;

  // Check subscription access status
  const accessStatus = await getSubscriptionAccessStatus(supabase, userId);

  // Build base query - order by created_at to determine first transaction
  let query = supabase
    .from('user_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true }) as any;

  if (type) {
    query = query.eq('transaction_type', type);
  }

  const { data: transactions, error } = await query;

  if (error) throw error;

  // Determine which transaction is the first (always accessible)
  const firstTransactionId = transactions && transactions.length > 0 ? transactions[0].id : null;

  // Get progress for each transaction and mark locked status
  const transactionsWithProgress = await Promise.all(
    (transactions || []).map(async (tx: any, index: number) => {
      // Respect user's skip_financing preference when calculating progress
      let checklistQuery = supabase
        .from('transaction_checklist')
        .select('is_completed')
        .eq('transaction_id', tx.id);

      if (tx.skip_financing) {
        // Exclude financing stage items
        checklistQuery = checklistQuery.neq('stage', 'financing');
      }

      const { data: checklist } = await checklistQuery;

      const total = checklist?.length || 0;
      const completed = checklist?.filter((item: any) => item.is_completed).length || 0;

      // First transaction (index 0) is always accessible
      // Other transactions require active subscription
      const isFirstTransaction = index === 0;
      const isLocked = !accessStatus.hasFullAccess && !isFirstTransaction;

      return {
        ...tx,
        total_checklist_items: total,
        completed_checklist_items: completed,
        progress_percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        is_locked: isLocked,
        is_first_transaction: isFirstTransaction,
      };
    })
  );

  // Sort by updated_at descending for display (but locked status is based on created_at order)
  transactionsWithProgress.sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return res.status(200).json({
    transactions: transactionsWithProgress,
    subscription: {
      hasFullAccess: accessStatus.hasFullAccess,
      isExpiringSoon: accessStatus.isExpiringSoon,
      expiresAt: accessStatus.expiresAt,
    }
  });
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  userId: string
) {
  // Check subscription status using real-time Stripe check
  const accessStatus = await getSubscriptionAccessStatus(supabase, userId);

  // Get subscription tier for the response
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .single();

  const tier = subscription?.tier || 'free';
  const status = subscription?.status || 'inactive';

  // Check if user can create more transactions
  let canCreate = false;
  
  if (accessStatus.hasFullAccess) {
    // User has full subscription access (active or within paid period)
    canCreate = true;
  } else {
    // Free tier or expired subscription: check transaction count
    const { count: transactionCount } = await supabase
      .from('user_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Free tier gets 1 transaction
    canCreate = (transactionCount || 0) < 1;
  }

  if (!canCreate) {
    return res.status(403).json({ 
      error: 'Transaction limit reached',
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'You have reached the free tier limit of 1 transaction. Please upgrade to create more transactions.',
      currentTier: tier,
      status: status,
    });
  }

  const {
    property_address,
    property_type,
    neighborhood,
    city,
    transaction_type = 'purchase',
    listing_price,
  } = req.body;

  // Create the transaction
  const { data: transaction, error: txError } = await supabase
    .from('user_transactions')
    .insert({
      user_id: userId,
      property_address,
      property_type,
      neighborhood,
      city,
      transaction_type,
      listing_price,
    })
    .select()
    .single();

  if (txError) throw txError;

  // Initialize checklist from templates specific to the transaction type
  const { data: checklistTemplates } = await supabase
    .from('stage_checklist_templates')
    .select('*')
    .eq('transaction_type', transaction_type);

  if (checklistTemplates && checklistTemplates.length > 0) {
    const checklistItems = checklistTemplates.map((template: any) => ({
      transaction_id: transaction.id,
      template_id: template.id,
      stage: template.stage,
      is_completed: false,
    }));

    await supabase.from('transaction_checklist').insert(checklistItems);
  }

  // Initialize costs from templates specific to the transaction type
  const { data: costTemplates } = await supabase
    .from('stage_cost_templates')
    .select('*')
    .eq('transaction_type', transaction_type);

  if (costTemplates && costTemplates.length > 0) {
    const costItems = costTemplates.map((template: any) => {
      let estimatedAmount = template.typical_amount;
      
      if (template.typical_percentage && listing_price) {
        estimatedAmount = Math.round(listing_price * template.typical_percentage);
      }

      return {
        transaction_id: transaction.id,
        template_id: template.id,
        stage: template.stage,
        estimated_amount: estimatedAmount,
        is_paid: false,
      };
    });

    await supabase.from('transaction_costs').insert(costItems);
  }

  // Determine initial stage for this transaction type and update transaction current_stage
  const { data: firstStage } = await supabase
    .from('transaction_stages')
    .select('stage')
    .eq('transaction_type', transaction_type)
    .order('stage_order')
    .limit(1)
    .single();

  const initialStage = firstStage?.stage || 'search';

  if (initialStage && initialStage !== transaction.current_stage) {
    await supabase
      .from('user_transactions')
      .update({ current_stage: initialStage })
      .eq('id', transaction.id);
  }

  // Record initial stage history
  await supabase.from('transaction_stage_history').insert({
    transaction_id: transaction.id,
    to_stage: initialStage,
  });

  return res.status(201).json(transaction);
}
