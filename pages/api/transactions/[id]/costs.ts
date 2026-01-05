// API route: /api/transactions/[id]/costs
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
    .select('id, skip_financing')
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
        return handleGet(req, res, supabase, id, transaction.skip_financing);
      case 'POST':
        return handlePost(req, res, supabase, id);
      case 'PATCH':
        return handlePatch(req, res, supabase);
      case 'DELETE':
        return handleDelete(req, res, supabase, id);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Costs API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  transactionId: string,
  skipFinancing?: boolean
) {
  const { stage, summary } = req.query;

  // If summary requested, return aggregated data
  if (summary === 'true') {
    const { data: costs, error } = await supabase
      .from('transaction_costs')
      .select('*, template:stage_cost_templates(*)')
      .eq('transaction_id', transactionId);

    if (error) throw error;

    const stages = ['search', 'analysis', 'offer', 'due_diligence', 'financing', 'closing', 'post_closing'];
    const byStage: Record<string, { estimated: number; actual: number; paid: number }> = {};
    
    for (const s of stages) {
      byStage[s] = { estimated: 0, actual: 0, paid: 0 };
    }

    let totalEstimated = 0;
    let totalActual = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    for (const cost of costs || []) {
      // Respect transaction preference: exclude financing-stage costs when skipFinancing is enabled
      if (skipFinancing && cost.stage === 'financing') continue;

      const estimated = cost.estimated_amount || 0;
      const actual = cost.actual_amount || 0;
      const finalAmount = actual || estimated;

      totalEstimated += estimated;
      totalActual += actual;

      if (byStage[cost.stage]) {
        byStage[cost.stage].estimated += estimated;
        byStage[cost.stage].actual += actual;

        if (cost.is_paid) {
          totalPaid += finalAmount;
          byStage[cost.stage].paid += finalAmount;
        } else {
          totalUnpaid += finalAmount;
        }
      }
    }

    return res.status(200).json({
      totalEstimated,
      totalActual,
      totalPaid,
      totalUnpaid,
      byStage,
    });
  }

  // Regular list query
  let query = supabase
    .from('transaction_costs')
    .select('*, template:stage_cost_templates(*)')
    .eq('transaction_id', transactionId)
    .order('created_at');

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
  const { stage, custom_name, custom_description, estimated_amount, paid_to } = req.body;

  if (!stage || !custom_name) {
    return res.status(400).json({ error: 'Stage and name are required' });
  }

  const { data, error } = await supabase
    .from('transaction_costs')
    .insert({
      transaction_id: transactionId,
      stage,
      custom_name,
      custom_description,
      estimated_amount,
      paid_to,
      is_paid: false,
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
  const { 
    cost_id, 
    estimated_amount, 
    actual_amount, 
    is_paid, 
    paid_date,
    payment_method,
    notes 
  } = req.body;

  if (!cost_id) {
    return res.status(400).json({ error: 'Cost ID is required' });
  }

  const updates: any = {};
  
  if (estimated_amount !== undefined) updates.estimated_amount = estimated_amount;
  if (actual_amount !== undefined) updates.actual_amount = actual_amount;
  if (typeof is_paid === 'boolean') updates.is_paid = is_paid;
  if (paid_date !== undefined) updates.paid_date = paid_date;
  if (payment_method !== undefined) updates.payment_method = payment_method;
  if (notes !== undefined) updates.notes = notes;
  if (req.body.paid_to !== undefined) updates.paid_to = req.body.paid_to;

  const { data, error } = await supabase
    .from('transaction_costs')
    .update(updates)
    .eq('id', cost_id)
    .select('*, template:stage_cost_templates(*)')
    .single();

  if (error) throw error;

  return res.status(200).json(data);
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  transactionId: string
) {
  const { cost_id } = req.body;
  if (!cost_id) {
    return res.status(400).json({ error: 'Cost ID is required' });
  }

  // Ensure the cost belongs to this transaction
  const { data: existing, error: selectError } = await supabase
    .from('transaction_costs')
    .select('id')
    .eq('id', cost_id)
    .eq('transaction_id', transactionId)
    .single();

  if (selectError || !existing) {
    return res.status(404).json({ error: 'Cost not found for this transaction' });
  }

  const { error: deleteError } = await supabase
    .from('transaction_costs')
    .delete()
    .eq('id', cost_id);

  if (deleteError) throw deleteError;

  return res.status(200).json({ success: true, id: cost_id });
}
