// API route: /api/transactions/[id]/checklist
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { canAccessTransaction } from '@/lib/transactions/access-control';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Verify ownership
  const { data: transaction } = await supabase
    .from('user_transactions')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  // Check subscription access
  const accessCheck = await canAccessTransaction(supabase, user.id, id);
  if (!accessCheck.canAccess) {
    return res.status(403).json({ 
      error: 'Transaction locked',
      code: 'SUBSCRIPTION_REQUIRED',
      message: accessCheck.reason,
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res, supabase, id);
      case 'POST':
        return handlePost(req, res, supabase, id);
      case 'PATCH':
        return handlePatch(req, res, supabase);
      case 'DELETE':
        return handleDelete(req, res, supabase);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Checklist API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  transactionId: string
) {
  const { stage } = req.query;

  let query = supabase
    .from('transaction_checklist')
    .select('*, template:stage_checklist_templates(*)')
    .eq('transaction_id', transactionId)
    .order('item_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (stage && typeof stage === 'string') {
    query = query.eq('stage', stage);
  }

  const { data, error } = await query;
  if (error) throw error;

  return res.status(200).json(data || []);
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  transactionId: string
) {
  const { stage, custom_title, custom_description } = req.body;

  if (!stage || !custom_title) {
    return res.status(400).json({ error: 'Stage and title are required' });
  }

  const { data, error } = await supabase
    .from('transaction_checklist')
    .insert({
      transaction_id: transactionId,
      stage,
      custom_title,
      custom_description,
      is_completed: false,
    })
    .select()
    .single();

  if (error) throw error;

  return res.status(201).json(data);
}

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any
) {
  const { action } = req.body;

  // Reorder action: expects { action: 'reorder', order: ['id1','id2', ...] }
  if (action === 'reorder') {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Order must be an array of item IDs' });
    }

    // Update each item_order according to its index
    const updates = order.map((id: string, index: number) =>
      supabase
        .from('transaction_checklist')
        .update({ item_order: index + 1 })
        .eq('id', id)
    );

    const results = await Promise.all(updates);
    for (const r of results) {
      if (r.error) throw r.error;
    }

    return res.status(200).json({ success: true });
  }

  // Default: update properties (toggle completion, notes, etc.)
  const { item_id, is_completed, notes } = req.body;

  if (!item_id) {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  const updates: any = {};
  
  if (typeof is_completed === 'boolean') {
    updates.is_completed = is_completed;
    updates.completed_at = is_completed ? new Date().toISOString() : null;
  }
  
  if (notes !== undefined) {
    updates.notes = notes;
  }

  const { data, error } = await supabase
    .from('transaction_checklist')
    .update(updates)
    .eq('id', item_id)
    .select('*, template:stage_checklist_templates(*)')
    .single();

  if (error) throw error;

  return res.status(200).json(data);
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any
) {
  const { item_id } = req.body;

  if (!item_id) {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  // Only allow deleting custom items (no template_id)
  const { data: item } = await supabase
    .from('transaction_checklist')
    .select('template_id')
    .eq('id', item_id)
    .single();

  if (item?.template_id) {
    return res.status(400).json({ error: 'Cannot delete template-based checklist items' });
  }

  const { error } = await supabase
    .from('transaction_checklist')
    .delete()
    .eq('id', item_id);

  if (error) throw error;

  return res.status(204).end();
}
