-- Subscription Schema for PropTrenz
-- Manages subscription tiers for the "My Transactions" feature

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM for subscription tiers
CREATE TYPE subscription_tier AS ENUM (
  'free',        -- 1 transaction limit
  'monthly',     -- Unlimited transactions, billed monthly
  'yearly',      -- Unlimited transactions, billed yearly (2 months discount)
  'lifetime'     -- Unlimited transactions, one-time payment
);

-- ENUM for subscription status
CREATE TYPE subscription_status AS ENUM (
  'active',      -- Subscription is active and paid
  'past_due',    -- Payment failed (will be locked immediately per requirements)
  'cancelled',   -- User cancelled (immediate lock, no access)
  'inactive'     -- Never had a subscription / expired
);

-- User subscriptions table
-- Stores subscription info for each user
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Subscription details
  tier subscription_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'inactive',
  
  -- Stripe integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,          -- NULL for lifetime (one-time payment)
  stripe_price_id TEXT,                  -- The Stripe Price ID for their plan
  
  -- Currency preference (for display purposes, Stripe handles actual currency)
  preferred_currency TEXT DEFAULT 'MXN', -- MXN, USD, CAD
  
  -- Period tracking
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,        -- NULL for lifetime
  
  -- For lifetime purchases
  lifetime_purchased_at TIMESTAMPTZ,
  
  -- Cancellation tracking
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one subscription record per user
  UNIQUE(user_id)
);

-- Subscription events log (for audit trail and debugging)
CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL,              -- 'created', 'upgraded', 'downgraded', 'cancelled', 'payment_failed', 'renewed', 'lifetime_purchased'
  from_tier subscription_tier,
  to_tier subscription_tier,
  
  -- Stripe event reference
  stripe_event_id TEXT,
  stripe_invoice_id TEXT,
  
  -- Amount (in smallest currency unit, e.g., centavos for MXN)
  amount_paid INTEGER,
  currency TEXT,
  
  -- Additional metadata
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_subscriptions_stripe_subscription ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_tier ON user_subscriptions(tier);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX idx_subscription_events_stripe_event ON subscription_events(stripe_event_id);

-- Row Level Security (RLS)
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can modify subscriptions (via webhooks)
-- This ensures users can't modify their own subscription status
CREATE POLICY "Service role can manage subscriptions" ON user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Users can view their own subscription events
CREATE POLICY "Users can view own subscription events" ON subscription_events
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert subscription events
CREATE POLICY "Service role can insert subscription events" ON subscription_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Function to check if user can create more transactions
CREATE OR REPLACE FUNCTION can_create_transaction(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier subscription_tier;
  v_status subscription_status;
  v_transaction_count INTEGER;
BEGIN
  -- Get user's subscription info
  SELECT tier, status INTO v_tier, v_status
  FROM user_subscriptions
  WHERE user_id = p_user_id;
  
  -- If no subscription record, treat as free tier
  IF v_tier IS NULL THEN
    v_tier := 'free';
    v_status := 'inactive';
  END IF;
  
  -- Paid tiers with active status can create unlimited
  IF v_tier IN ('monthly', 'yearly', 'lifetime') AND v_status = 'active' THEN
    RETURN TRUE;
  END IF;
  
  -- Free tier or inactive: check transaction count
  SELECT COUNT(*) INTO v_transaction_count
  FROM user_transactions
  WHERE user_id = p_user_id;
  
  -- Free tier gets 1 transaction
  RETURN v_transaction_count < 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's subscription details
CREATE OR REPLACE FUNCTION get_subscription_details(p_user_id UUID)
RETURNS TABLE (
  tier subscription_tier,
  status subscription_status,
  current_period_end TIMESTAMPTZ,
  is_lifetime BOOLEAN,
  can_create_transaction BOOLEAN,
  transaction_count INTEGER,
  transaction_limit INTEGER
) AS $$
DECLARE
  v_tier subscription_tier;
  v_status subscription_status;
  v_period_end TIMESTAMPTZ;
  v_lifetime_purchased_at TIMESTAMPTZ;
  v_tx_count INTEGER;
BEGIN
  -- Get subscription info
  SELECT 
    us.tier, 
    us.status, 
    us.current_period_end,
    us.lifetime_purchased_at
  INTO v_tier, v_status, v_period_end, v_lifetime_purchased_at
  FROM user_subscriptions us
  WHERE us.user_id = p_user_id;
  
  -- Default to free if no record
  IF v_tier IS NULL THEN
    v_tier := 'free';
    v_status := 'inactive';
  END IF;
  
  -- Count transactions
  SELECT COUNT(*) INTO v_tx_count
  FROM user_transactions
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT 
    v_tier,
    v_status,
    v_period_end,
    (v_tier = 'lifetime' AND v_status = 'active') AS is_lifetime,
    can_create_transaction(p_user_id),
    v_tx_count,
    CASE 
      WHEN v_tier IN ('monthly', 'yearly', 'lifetime') AND v_status = 'active' THEN -1  -- -1 means unlimited
      ELSE 1  -- Free tier limit
    END AS transaction_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Initialize subscription record when user signs up (optional - can also be done on first transaction attempt)
-- This function can be called from a Supabase Edge Function or trigger
CREATE OR REPLACE FUNCTION public.initialize_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize subscription record with error handling
  BEGIN
    INSERT INTO public.user_subscriptions (user_id, tier, status)
    VALUES (NEW.id, 'free', 'inactive')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log warning but don't block user creation
    RAISE WARNING 'Could not initialize subscription for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Note: Use a unique trigger name to avoid conflicts with other auth triggers
-- (e.g., handle_new_user which may sync to public.users)
CREATE TRIGGER on_auth_user_created_init_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_subscription();
