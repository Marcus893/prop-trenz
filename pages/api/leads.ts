import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

interface LeadRequestBody {
  name: string
  email: string
  phone?: string
  city?: string
  municipality?: string
  neighborhood?: string
  budgetRange?: string
  timeline?: string
  propertyType?: string
  source: string
  contextData?: Record<string, any>
  country?: string | null
  countryCode?: string | null
}

const RESEND_API_KEY = process.env.RESEND_API_KEY
const LEAD_RECIPIENT = process.env.LEAD_RECIPIENT_EMAIL || 'proptrenz@gmail.com'
const LEAD_FROM = process.env.LEAD_FROM_EMAIL || 'PropTrenz Leads <leads@proptrenz.com>'

// Agent email mapping - you can expand this later
const AGENT_EMAILS: Record<string, string> = {
  'Ciudad de México': process.env.AGENT_EMAIL_CDMX || LEAD_RECIPIENT,
  'Monterrey': process.env.AGENT_EMAIL_MONTERREY || LEAD_RECIPIENT,
  'Jalisco': process.env.AGENT_EMAIL_JALISCO || LEAD_RECIPIENT,
}

function getAgentEmail(city?: string, municipality?: string): string {
  if (!city && !municipality) return LEAD_RECIPIENT
  
  // Try to match city first
  if (city && AGENT_EMAILS[city]) {
    return AGENT_EMAILS[city]
  }
  
  // Default to main recipient
  return LEAD_RECIPIENT
}

/**
 * Get user's country from IP address using ipapi.co
 * This is a reliable free service that doesn't require an API key
 */
async function getCountryFromIP(req: NextApiRequest): Promise<{ country: string | null; countryCode: string | null }> {
  // Get IP from request headers (check Netlify headers first, then standard headers)
  let ip: string | undefined
  
  // Netlify provides the real client IP in these headers
  ip = req.headers['x-nf-client-connection-ip'] as string | undefined
  if (!ip) {
    ip = req.headers['x-forwarded-for'] as string | undefined
    if (ip && typeof ip === 'string') {
      // x-forwarded-for can contain multiple IPs, take the first one
      ip = ip.split(',')[0].trim()
    }
  }
  if (!ip) {
    ip = req.headers['x-real-ip'] as string | undefined
  }
  if (!ip) {
    ip = req.socket?.remoteAddress
  }

  // For localhost/development, use a test IP (US IP for testing)
  // In production, this will never be localhost
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
    if (process.env.NODE_ENV === 'development') {
      // Use a test IP for local development (8.8.8.8 is Google's DNS, US-based)
      ip = '8.8.8.8'
      console.log('[api/leads] Development mode: Using test IP for geolocation:', ip)
    } else {
      // Production localhost - shouldn't happen, but handle gracefully
      console.warn('[api/leads] Localhost IP in production, cannot determine country. IP:', ip)
      return { country: null, countryCode: null }
    }
  }

  console.log('[api/leads] Detected IP:', ip)

  // Use ipapi.co - reliable free service, no API key needed
  try {
    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: {
        'User-Agent': 'PropTrenz/1.0',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      
      // Check for error response
      if (data.error) {
        console.warn('[api/leads] IP API error:', data.reason)
        return { country: null, countryCode: null }
      }

      // ipapi.co returns 'country_name' and 'country_code'
      if (data.country_name && data.country_code) {
        console.log('[api/leads] Country detected:', data.country_name, data.country_code)
        return { 
          country: data.country_name, 
          countryCode: data.country_code.toUpperCase() 
        }
      } else {
        console.warn('[api/leads] IP API response missing country data:', JSON.stringify(data))
      }
    } else {
      console.warn('[api/leads] IP API request failed:', response.status, response.statusText)
    }
  } catch (error: any) {
    // Handle timeout or network errors
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.warn('[api/leads] IP geolocation request timed out')
    } else {
      console.error('[api/leads] Failed to get country from IP:', error.message)
    }
    // Don't throw - country is optional, continue without it
  }

  return { country: null, countryCode: null }
}

async function sendLeadEmail(lead: LeadRequestBody, leadId: string) {
  if (!RESEND_API_KEY) {
    console.warn('[api/leads] Resend API key not configured, skipping email')
    return
  }

  const agentEmail = getAgentEmail(lead.city, lead.municipality)
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1f2937;">
      <h2 style="margin: 0 0 16px; color: #1d4ed8;">New Lead from PropTrenz</h2>
      
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0 0 8px;"><strong>Lead ID:</strong> ${leadId}</p>
        <p style="margin: 0 0 8px;"><strong>Source:</strong> ${lead.source}</p>
        <p style="margin: 0 0 8px;"><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      </div>

      <h3 style="margin: 16px 0 8px; color: #374151;">Contact Information</h3>
      <p style="margin: 0 0 8px;"><strong>Name:</strong> ${lead.name}</p>
      <p style="margin: 0 0 8px;"><strong>Email:</strong> <a href="mailto:${lead.email}">${lead.email}</a></p>
      ${lead.phone ? `<p style="margin: 0 0 8px;"><strong>Phone:</strong> <a href="tel:${lead.phone}">${lead.phone}</a></p>` : ''}
      ${lead.country ? `<p style="margin: 0 0 8px;"><strong>Country:</strong> ${lead.country} ${lead.countryCode ? `(${lead.countryCode})` : ''}</p>` : ''}

      <h3 style="margin: 16px 0 8px; color: #374151;">Property Details</h3>
      ${lead.city ? `<p style="margin: 0 0 8px;"><strong>City:</strong> ${lead.city}</p>` : ''}
      ${lead.municipality ? `<p style="margin: 0 0 8px;"><strong>Municipality:</strong> ${lead.municipality}</p>` : ''}
      ${lead.neighborhood ? `<p style="margin: 0 0 8px;"><strong>Neighborhood:</strong> ${lead.neighborhood}</p>` : ''}
      ${lead.propertyType ? `<p style="margin: 0 0 8px;"><strong>Property Type:</strong> ${lead.propertyType}</p>` : ''}
      ${lead.budgetRange ? `<p style="margin: 0 0 8px;"><strong>Budget Range:</strong> ${lead.budgetRange}</p>` : ''}
      ${lead.timeline ? `<p style="margin: 0 0 8px;"><strong>Timeline:</strong> ${lead.timeline}</p>` : ''}

      ${lead.contextData && Object.keys(lead.contextData).length > 0 ? `
        <h3 style="margin: 16px 0 8px; color: #374151;">Additional Context</h3>
        <div style="background: #f9fafb; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px;">
          ${JSON.stringify(lead.contextData, null, 2)}
        </div>
      ` : ''}

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #6b7280;">
          This lead was generated from PropTrenz. Please respond promptly to maintain lead quality.
        </p>
      </div>
    </div>
  `

  const body = {
    from: LEAD_FROM,
    to: [agentEmail],
    subject: `New PropTrenz Lead: ${lead.name}`,
    reply_to: `${lead.name} <${lead.email}>`,
    html,
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      console.error('[api/leads] Failed to send email:', error)
      throw new Error(error?.message || response.statusText || 'Failed to send email')
    }
  } catch (error) {
    console.error('[api/leads] Email error:', error)
    // Don't throw - we still want to save the lead even if email fails
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[api/leads] Missing Supabase credentials')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const {
    name,
    email,
    phone,
    city,
    municipality,
    neighborhood,
    budgetRange,
    timeline,
    propertyType,
    source,
    contextData,
  } = (req.body || {}) as LeadRequestBody

  // Validation - all fields are now required
  if (!name || !email || !phone || !city || !municipality || !budgetRange || !timeline || !source) {
    return res.status(400).json({ error: 'Missing required fields: name, email, phone, city, municipality, budget range, timeline, and source are all required' })
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  // Phone number validation for Mexico, US, and Canada
  const validatePhone = (phone: string): { valid: boolean; error?: string } => {
    if (!phone || !phone.trim()) {
      return { valid: false, error: 'Phone number is required' }
    }

    // Remove all non-digit characters except + at the start
    const cleaned = phone.replace(/[^\d+]/g, '')
    
    // Check if it starts with country code
    let digits = cleaned
    if (cleaned.startsWith('+52')) {
      // Mexico: +52 followed by 10 digits
      digits = cleaned.substring(3)
      if (digits.length !== 10 || !/^\d+$/.test(digits)) {
        return { valid: false, error: 'Mexican phone number must be 10 digits after +52' }
      }
    } else if (cleaned.startsWith('+1')) {
      // US/Canada: +1 followed by 10 digits
      digits = cleaned.substring(2)
      if (digits.length !== 10 || !/^\d+$/.test(digits)) {
        return { valid: false, error: 'US/Canada phone number must be 10 digits after +1' }
      }
    } else if (cleaned.startsWith('52')) {
      // Mexico without +: 52 followed by 10 digits
      digits = cleaned.substring(2)
      if (digits.length !== 10 || !/^\d+$/.test(digits)) {
        return { valid: false, error: 'Mexican phone number must be 10 digits after country code' }
      }
    } else if (cleaned.startsWith('1') && cleaned.length === 11) {
      // US/Canada without +: 1 followed by 10 digits
      digits = cleaned.substring(1)
      if (!/^\d+$/.test(digits)) {
        return { valid: false, error: 'Invalid phone number format' }
      }
    } else {
      // No country code - should be 10 digits
      digits = cleaned.replace(/\+/g, '')
      if (digits.length !== 10 || !/^\d+$/.test(digits)) {
        return { valid: false, error: 'Phone number must be 10 digits (or include country code: +52 for Mexico, +1 for US/Canada)' }
      }
    }

    return { valid: true }
  }

  const phoneValidation = validatePhone(phone)
  if (!phoneValidation.valid) {
    return res.status(400).json({ error: phoneValidation.error || 'Invalid phone number' })
  }

  try {
    // Get country from IP address
    const { country, countryCode } = await getCountryFromIP(req)

    // Determine assigned agent email
    const assignedAgentEmail = getAgentEmail(city, municipality)

    // Insert lead into database
    const { data: lead, error: dbError } = await supabase
      .from('leads')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        city: city.trim(),
        municipality: municipality.trim(),
        neighborhood: neighborhood?.trim() || null,
        budget_range: budgetRange,
        timeline: timeline,
        property_type: propertyType || null,
        source: source.trim(),
        context_data: contextData || null,
        country: country || null,
        country_code: countryCode || null,
        assigned_agent_email: assignedAgentEmail,
        status: 'new',
      })
      .select()
      .single()

    if (dbError) {
      console.error('[api/leads] Database error:', dbError)
      return res.status(500).json({ error: 'Failed to save lead' })
    }

    // Send email notification (don't block on this)
    await sendLeadEmail(
      {
        name,
        email,
        phone,
        city,
        municipality,
        neighborhood,
        budgetRange,
        timeline,
        propertyType,
        source,
        contextData,
        country,
        countryCode,
      },
      lead.id
    )

    res.status(200).json({ success: true, leadId: lead.id })
  } catch (error: any) {
    console.error('[api/leads] Error:', error)
    res.status(500).json({ error: error?.message || 'Failed to process lead' })
  }
}

