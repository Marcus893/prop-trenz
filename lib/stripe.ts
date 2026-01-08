import Stripe from "stripe";

// Initialize Stripe client (server-side only)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Only warn on server-side in production (not in browser where env vars aren't available)
if (!stripeSecretKey && process.env.NODE_ENV === "production" && typeof window === "undefined") {
  console.error("[Stripe] Missing STRIPE_SECRET_KEY in production!");
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      typescript: true,
    })
  : null;

// Subscription pricing configuration
// Price IDs differ between test and live mode - use env vars for live mode
export const SUBSCRIPTION_PRICES = {
  // MXN prices (primary - Mexico focused platform)
  MXN: {
    monthly: {
      amount: 25900, // 259.00 MXN
      priceId: process.env.STRIPE_PRICE_MXN_MONTHLY || "price_1SlzfeLVTnHYBNNDnd8GJ04L",
    },
    yearly: {
      amount: 199900, // 1,999.00 MXN (equivalent to ~7.7 months, 2 months free)
      priceId: process.env.STRIPE_PRICE_MXN_YEARLY || "price_1SlzfeLVTnHYBNNDXCMi7D8B",
    },
    lifetime: {
      amount: 499900, // 4,999.00 MXN
      priceId: process.env.STRIPE_PRICE_MXN_LIFETIME || "price_1SlzfeLVTnHYBNNDfTCfuLpd",
    },
  },
  // USD prices (for US expats)
  USD: {
    monthly: {
      amount: 1299, // $12.99 USD
      priceId: process.env.STRIPE_PRICE_USD_MONTHLY || "price_1SlzfeLVTnHYBNND3WFXXfKT",
    },
    yearly: {
      amount: 9900, // $99 USD (~2 months free)
      priceId: process.env.STRIPE_PRICE_USD_YEARLY || "price_1SlzffLVTnHYBNND4IrKU1oY",
    },
    lifetime: {
      amount: 24900, // $249 USD
      priceId: process.env.STRIPE_PRICE_USD_LIFETIME || "price_1SlzffLVTnHYBNNDa6B7jlXE",
    },
  },
} as const;

export type Currency = keyof typeof SUBSCRIPTION_PRICES;
export type PlanType = "monthly" | "yearly" | "lifetime";

// Get price for a plan in a specific currency
export function getPriceConfig(plan: PlanType, currency: Currency = "MXN") {
  return SUBSCRIPTION_PRICES[currency][plan];
}

// Format price for display
export function formatPrice(amount: number, currency: Currency): string {
  const formatter = new Intl.NumberFormat(
    currency === "MXN" ? "es-MX" : "en-US",
    {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "MXN" ? 0 : 2,
      maximumFractionDigits: 2,
    }
  );
  return formatter.format(amount / 100);
}

// Get discount percentage for yearly plan
export function getYearlyDiscount(): number {
  // Monthly × 12 = 3,108 MXN, Yearly = 1,999 MXN
  // Discount = (3108 - 1999) / 3108 ≈ 35.7%
  return 35;
}

// Webhook signature verification
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event | null {
  if (!stripe) {
    console.error("[Stripe] Stripe not initialized");
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("[Stripe] Webhook signature verification failed:", error);
    return null;
  }
}

// Create Stripe customer for a user
export async function createStripeCustomer(
  email: string,
  userId: string,
  name?: string
): Promise<Stripe.Customer | null> {
  if (!stripe) {
    console.error("[Stripe] Stripe not initialized");
    return null;
  }

  try {
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: {
        supabase_user_id: userId,
      },
    });
    return customer;
  } catch (error) {
    console.error("[Stripe] Failed to create customer:", error);
    throw error;
  }
}

// Get or create Stripe customer
export async function getOrCreateStripeCustomer(
  email: string,
  userId: string,
  existingCustomerId?: string | null,
  name?: string
): Promise<Stripe.Customer> {
  if (!stripe) {
    throw new Error("Stripe not initialized");
  }

  // If we have an existing customer ID, verify it exists
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) {
        return customer as Stripe.Customer;
      }
    } catch (error) {
      // Customer doesn't exist, create new one
      console.warn(
        "[Stripe] Existing customer not found, creating new:",
        existingCustomerId
      );
    }
  }

  // Create new customer
  const customer = await createStripeCustomer(email, userId, name);
  if (!customer) {
    throw new Error("Failed to create Stripe customer");
  }
  return customer;
}

// Create checkout session for subscription
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  plan: PlanType;
  successUrl: string;
  cancelUrl: string;
  userId: string;
  currency: Currency;
}): Promise<Stripe.Checkout.Session> {
  if (!stripe) {
    throw new Error("Stripe not initialized");
  }

  const { customerId, priceId, plan, successUrl, cancelUrl, userId, currency } =
    params;

  // Lifetime is a one-time payment, others are subscriptions
  const mode = plan === "lifetime" ? "payment" : "subscription";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: userId,
      plan,
      currency,
    },
    // Allow promotion codes
    allow_promotion_codes: true,
    // For subscriptions, set billing cycle anchor to now
    ...(mode === "subscription" && {
      subscription_data: {
        metadata: {
          user_id: userId,
          plan,
        },
      },
    }),
    // For one-time payments (lifetime)
    ...(mode === "payment" && {
      payment_intent_data: {
        metadata: {
          user_id: userId,
          plan: "lifetime",
        },
      },
    }),
  });

  return session;
}

// Create billing portal session for subscription management
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  if (!stripe) {
    throw new Error("Stripe not initialized");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

// Cancel subscription immediately (no access after cancellation per requirements)
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error("Stripe not initialized");
  }

  // Cancel immediately - no grace period as per requirements
  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  return subscription;
}
