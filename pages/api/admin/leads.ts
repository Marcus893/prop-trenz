import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Note: Authorization is checked client-side in the admin page
  // In production, you should add server-side JWT verification here

  if (req.method === 'GET') {
    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[api/admin/leads] Database error:', error)
        return res.status(500).json({ error: 'Failed to load leads' })
      }

      return res.status(200).json({ leads: leads || [] })
    } catch (error: any) {
      console.error('[api/admin/leads] Error:', error)
      return res.status(500).json({ error: error?.message || 'Failed to load leads' })
    }
  }

  if (req.method === 'PATCH') {
    const { leadId, status } = req.body

    if (!leadId || !status) {
      return res.status(400).json({ error: 'Missing leadId or status' })
    }

    const validStatuses = ['new', 'contacted', 'qualified', 'closed', 'lost']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    try {
      const { data, error } = await supabase
        .from('leads')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', leadId)
        .select()
        .single()

      if (error) {
        console.error('[api/admin/leads] Update error:', error)
        return res.status(500).json({ error: 'Failed to update lead' })
      }

      return res.status(200).json({ lead: data })
    } catch (error: any) {
      console.error('[api/admin/leads] Error:', error)
      return res.status(500).json({ error: error?.message || 'Failed to update lead' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

