// API route: /api/transactions/[id]
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

  // Get auth token from header
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
  const { data: transaction, error: fetchError } = await supabase
    .from('user_transactions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  // Check subscription access for non-first transactions
  const accessCheck = await canAccessTransaction(supabase, user.id, id);

  // If no access, deny
  if (!accessCheck.canAccess) {
    return res.status(403).json({ 
      error: 'Transaction locked',
      code: 'SUBSCRIPTION_REQUIRED',
      message: accessCheck.reason || 'Your subscription has expired. Only your first transaction is accessible. Please renew to access all transactions.',
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res, supabase, id, transaction);
      case 'PATCH':
        return handlePatch(req, res, supabase, id, transaction);
      case 'DELETE':
        return handleDelete(req, res, supabase, id);
      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
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
  id: string,
  transaction: any
) {
  // Get all related data in parallel
  const txType = transaction.transaction_type || 'purchase';

  const [
    stagesResult,
    checklistResult,
    documentsResult,
    costsResult,
    notesResult,
    historyResult,
  ] = await Promise.all([
    // Fetch only stages relevant to the transaction type
    supabase
      .from('transaction_stages')
      .select('*')
      .eq('transaction_type', txType)
      .order('stage_order'),
    supabase
      .from('transaction_checklist')
      .select('*, template:stage_checklist_templates(*)')
      .eq('transaction_id', id)
      .order('created_at'),
    supabase
      .from('transaction_documents')
      .select('*, template:stage_document_templates(*)')
      .eq('transaction_id', id)
      .order('uploaded_at', { ascending: false }),
    supabase
      .from('transaction_costs')
      .select('*, template:stage_cost_templates(*)')
      .eq('transaction_id', id)
      .order('created_at'),
    supabase
      .from('transaction_notes')
      .select('*')
      .eq('transaction_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('transaction_stage_history')
      .select('*')
      .eq('transaction_id', id)
      .order('transitioned_at', { ascending: false }),
  ]);

  const checklist = checklistResult.data || [];

  // Compute progress while respecting skip_financing: if the transaction opts out of financing,
  // exclude checklist items tied to the 'financing' stage from the totals
  const effectiveChecklist = transaction.skip_financing
    ? checklist.filter((item: any) => item.stage !== 'financing')
    : checklist;

  const total = effectiveChecklist.length;
  const completed = effectiveChecklist.filter((item: any) => item.is_completed).length;

  return res.status(200).json({
    ...transaction,
    stages: stagesResult.data || [],
    checklist,
    documents: documentsResult.data || [],
    costs: costsResult.data || [],
    notes: notesResult.data || [],
    stage_history: historyResult.data || [],
    progress: {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
  });
}

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  id: string,
  currentTransaction: any
) {
  const updates = req.body;

  // If stage is changing, record history
  if (updates.current_stage && updates.current_stage !== currentTransaction.current_stage) {
    await supabase.from('transaction_stage_history').insert({
      transaction_id: id,
      from_stage: currentTransaction.current_stage,
      to_stage: updates.current_stage,
      notes: updates.stage_change_notes,
    });
    delete updates.stage_change_notes;
  }

  // If listing_price changed, recalculate costs
  if (updates.listing_price && updates.listing_price !== currentTransaction.listing_price) {
    await recalculateCosts(supabase, id, updates.listing_price);
  }

  // If accepted_price is set, also recalculate costs based on that
  if (updates.accepted_price && updates.accepted_price !== currentTransaction.accepted_price) {
    await recalculateCosts(supabase, id, updates.accepted_price);
  }

  const { data: updated, error } = await supabase
    .from('user_transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return res.status(200).json(updated);
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  id: string
) {
  const { error } = await supabase
    .from('user_transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;

  return res.status(204).end();
}

async function recalculateCosts(supabase: any, transactionId: string, newPrice: number) {
  const { data: costs } = await supabase
    .from('transaction_costs')
    .select('*, template:stage_cost_templates(*)')
    .eq('transaction_id', transactionId)
    .not('template_id', 'is', null);

  if (!costs) return;

  for (const cost of costs) {
    if (cost.template?.typical_percentage) {
      const newEstimate = Math.round(newPrice * cost.template.typical_percentage);
      await supabase
        .from('transaction_costs')
        .update({ estimated_amount: newEstimate })
        .eq('id', cost.id);
    }
  }
}
