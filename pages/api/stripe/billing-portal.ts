import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { createBillingPortalSession } from '@/lib/stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
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
    // Get user's Stripe customer ID
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription?.stripe_customer_id) {
      return res.status(400).json({ error: 'No subscription found. Please subscribe first.' })
    }

    // Get base URL for return redirect
    // Use request origin for local development, fallback to SITE_URL for production
    const protocol = req.headers['x-forwarded-proto'] || 'http'
    const host = req.headers['x-forwarded-host'] || req.headers.host
    const baseUrl = host?.includes('localhost') 
      ? `http://${host}`
      : process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`

    // Create billing portal session
    const session = await createBillingPortalSession(
      subscription.stripe_customer_id,
      `${baseUrl}/profile`
    )

    return res.status(200).json({ url: session.url })
  } catch (error: any) {
    console.error('[Billing Portal API] Error:', error)
    return res.status(500).json({ error: error.message || 'Failed to create billing portal session' })
  }
}
