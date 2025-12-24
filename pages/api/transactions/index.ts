// API route: /api/transactions
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
  // Get all transactions for the user with progress
  const { data: transactions, error } = await supabase
    .from('user_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  // Get progress for each transaction
  const transactionsWithProgress = await Promise.all(
    (transactions || []).map(async (tx: any) => {
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

      return {
        ...tx,
        total_checklist_items: total,
        completed_checklist_items: completed,
        progress_percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    })
  );

  return res.status(200).json(transactionsWithProgress);
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  userId: string
) {
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

  // Initialize checklist from templates
  const { data: checklistTemplates } = await supabase
    .from('stage_checklist_templates')
    .select('*');

  if (checklistTemplates && checklistTemplates.length > 0) {
    const checklistItems = checklistTemplates.map((template: any) => ({
      transaction_id: transaction.id,
      template_id: template.id,
      stage: template.stage,
      is_completed: false,
    }));

    await supabase.from('transaction_checklist').insert(checklistItems);
  }

  // Initialize costs from templates
  const { data: costTemplates } = await supabase
    .from('stage_cost_templates')
    .select('*');

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

  // Record initial stage history
  await supabase.from('transaction_stage_history').insert({
    transaction_id: transaction.id,
    to_stage: 'search',
  });

  return res.status(201).json(transaction);
}
