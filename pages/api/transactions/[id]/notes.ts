// API route: /api/transactions/[id]/notes
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

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

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res, supabase, id);
      case 'POST':
        return handlePost(req, res, supabase, id);
      case 'DELETE':
        return handleDelete(req, res, supabase);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Notes API error:', error);
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
    .from('transaction_notes')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

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
  const { content, note_type = 'general', stage } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const { data, error } = await supabase
    .from('transaction_notes')
    .insert({
      transaction_id: transactionId,
      content,
      note_type,
      stage,
    })
    .select()
    .single();

  if (error) throw error;

  return res.status(201).json(data);
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any
) {
  const { note_id } = req.body;

  if (!note_id) {
    return res.status(400).json({ error: 'Note ID is required' });
  }

  const { error } = await supabase
    .from('transaction_notes')
    .delete()
    .eq('id', note_id);

  if (error) throw error;

  return res.status(204).end();
}
