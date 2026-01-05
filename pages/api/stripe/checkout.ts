import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import {
  createCheckoutSession,
  getOrCreateStripeCustomer,
  getPriceConfig,
  type PlanType,
  type Currency,
} from "@/lib/stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Get auth token from header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header" });
  }

  const token = authHeader.replace("Bearer ", "");

  // Create authenticated supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify the user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: "Invalid token" });
  }

  try {
    const { plan, currency = "MXN" } = req.body as {
      plan: PlanType;
      currency?: Currency;
    };

    if (!plan || !["monthly", "yearly", "lifetime"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan type" });
    }

    if (!["MXN", "USD"].includes(currency)) {
      return res.status(400).json({ error: "Invalid currency" });
    }

    // Get price configuration
    const priceConfig = getPriceConfig(plan, currency);
    if (!priceConfig.priceId) {
      return res
        .status(500)
        .json({ error: "Price not configured for this plan/currency" });
    }

    // Get or create Stripe customer
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    const customer = await getOrCreateStripeCustomer(
      user.email!,
      user.id,
      subscription?.stripe_customer_id,
      user.user_metadata?.name
    );

    // Update subscription record with customer ID if new
    if (!subscription?.stripe_customer_id) {
      await supabase.from("user_subscriptions").upsert(
        {
          user_id: user.id,
          tier: "free",
          status: "inactive",
          stripe_customer_id: customer.id,
          preferred_currency: currency,
        },
        { onConflict: "user_id" }
      );
    }

    // Get base URL for success/cancel redirects
    // Use request origin for local development, fallback to SITE_URL for production
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const baseUrl = host?.includes("localhost")
      ? `http://${host}`
      : process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

    // Create checkout session
    const session = await createCheckoutSession({
      customerId: customer.id,
      priceId: priceConfig.priceId,
      plan,
      successUrl: `${baseUrl}/transactions?checkout=success&plan=${plan}`,
      cancelUrl: `${baseUrl}/transactions?checkout=cancelled`,
      userId: user.id,
      currency,
    });

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error("[Checkout API] Error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to create checkout session" });
  }
}
