// Transaction Manager API utilities
import { supabase } from '../supabase';
import {
  Transaction,
  TransactionWithProgress,
  TransactionFullData,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  ChecklistItem,
  TransactionDocument,
  TransactionCost,
  TransactionNote,
  StageDefinition,
  ChecklistTemplate,
  DocumentTemplate,
  CostTemplate,
  TransactionStage,
  TransactionType,
  STAGE_ORDER,
} from './types';

// ============================================================================
// TRANSACTIONS CRUD
// ============================================================================

export async function getTransactions(): Promise<TransactionWithProgress[]> {
  const { data: transactions, error } = await supabase
    .from('user_transactions')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  if (!transactions) return [];

  // Get progress for each transaction
  const transactionsWithProgress = await Promise.all(
    transactions.map(async (tx) => {
      const { data: checklist } = await supabase
        .from('transaction_checklist')
        .select('is_completed, stage')
        .eq('transaction_id', tx.id);

      // Exclude financing checklist items for transactions that opted out
      const filteredChecklist = (checklist || []).filter((item: any) => !(tx.skip_financing && item.stage === 'financing'));

      const total = filteredChecklist.length;
      const completed = filteredChecklist.filter((item: any) => item.is_completed).length || 0;

      return {
        ...tx,
        total_checklist_items: total,
        completed_checklist_items: completed,
        progress_percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    })
  );

  return transactionsWithProgress;
}

export async function getTransaction(id: string): Promise<TransactionFullData | null> {
  // Get main transaction
  const { data: transaction, error } = await supabase
    .from('user_transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!transaction) return null;

  // Get all related data in parallel
  const [
    stagesResult,
    checklistResult,
    documentsResult,
    costsResult,
    notesResult,
    historyResult,
  ] = await Promise.all([
    // Fetch only stages relevant to the transaction's type (purchase, sale, etc.)
    supabase
      .from('transaction_stages')
      .select('*')
      .eq('transaction_type', transaction.transaction_type)
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
  // If user opted out of financing, exclude those checklist items from progress
  const filteredChecklist = transaction.skip_financing ? checklist.filter((i: any) => i.stage !== 'financing') : checklist;
  const total = filteredChecklist.length;
  const completed = filteredChecklist.filter((item) => item.is_completed).length;

  return {
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
  };
}

export async function createTransaction(
  data: CreateTransactionRequest
): Promise<Transaction> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  // Create the transaction
  const { data: transaction, error } = await supabase
    .from('user_transactions')
    .insert({
      user_id: user.user.id,
      ...data,
    })
    .select()
    .single();

  if (error) throw error;

  const txType: string = transaction.transaction_type || 'purchase';

  // Determine initial stage for this transaction type (first by stage_order)
  const { data: firstStage } = await supabase
    .from('transaction_stages')
    .select('stage')
    .eq('transaction_type', txType)
    .order('stage_order')
    .limit(1)
    .single();

  const initialStage = firstStage?.stage || 'search';

  // Update transaction to set its current_stage to the initial stage (if different)
  if (initialStage && initialStage !== transaction.current_stage) {
    const { error: updateErr } = await supabase
      .from('user_transactions')
      .update({ current_stage: initialStage })
      .eq('id', transaction.id);
    if (updateErr) throw updateErr;
    transaction.current_stage = initialStage;
  }

  // Initialize checklist items from templates for the transaction type
  await initializeTransactionChecklist(transaction.id, txType);
  
  // Initialize costs from templates for the transaction type
  await initializeTransactionCosts(transaction.id, txType, data.listing_price);

  // Record initial stage in history
  await supabase.from('transaction_stage_history').insert({
    transaction_id: transaction.id,
    to_stage: initialStage,
  });

  return transaction;
}

export async function updateTransaction(
  id: string,
  data: UpdateTransactionRequest
): Promise<Transaction> {
  // If stage is changing, record history
  if (data.current_stage) {
    const { data: current } = await supabase
      .from('user_transactions')
      .select('current_stage')
      .eq('id', id)
      .single();

    if (current && current.current_stage !== data.current_stage) {
      await supabase.from('transaction_stage_history').insert({
        transaction_id: id,
        from_stage: current.current_stage,
        to_stage: data.current_stage,
      });
    }
  }

  const { data: transaction, error } = await supabase
    .from('user_transactions')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// CHECKLIST
// ============================================================================

async function initializeTransactionChecklist(transactionId: string, transactionType?: string): Promise<void> {
  // Get checklist templates filtered by transaction type (allow 'both')
  let query = supabase.from('stage_checklist_templates').select('*');
  if (transactionType) {
    // Filter templates to the exact transaction type selected (no 'both' value exists)
    query = query.eq('transaction_type', transactionType);
  }
  const { data: templates, error } = await query.order('item_order');

  if (error) throw error;
  if (!templates || templates.length === 0) return;

  // Create checklist items for each template, preserving template order
  const items = templates.map((template) => ({
    transaction_id: transactionId,
    template_id: template.id,
    stage: template.stage,
    is_completed: false,
    item_order: template.item_order ?? 0,
  }));

  await supabase.from('transaction_checklist').insert(items);
}

export async function getChecklistByStage(
  transactionId: string,
  stage: TransactionStage
): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('transaction_checklist')
    .select('*, template:stage_checklist_templates(*)')
    .eq('transaction_id', transactionId)
    .eq('stage', stage)
    .order('item_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function toggleChecklistItem(
  id: string,
  isCompleted: boolean
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from('transaction_checklist')
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('*, template:stage_checklist_templates(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function addCustomChecklistItem(
  transactionId: string,
  stage: TransactionStage,
  title: string,
  description?: string
): Promise<ChecklistItem> {
  // Get current max order for this transaction+stage
  const { data: last, error: lastErr } = await supabase
    .from('transaction_checklist')
    .select('item_order')
    .eq('transaction_id', transactionId)
    .eq('stage', stage)
    .order('item_order', { ascending: false })
    .limit(1);

  if (lastErr) throw lastErr;

  const nextOrder = (last && last.length > 0 && typeof last[0].item_order === 'number') ? last[0].item_order + 1 : 1;

  const { data, error } = await supabase
    .from('transaction_checklist')
    .insert({
      transaction_id: transactionId,
      stage,
      custom_title: title,
      custom_description: description,
      is_completed: false,
      item_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('transaction_checklist')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderChecklistItems(transactionId: string, orderedIds: string[]): Promise<void> {
  // Update each item's item_order to its index in orderedIds
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('transaction_checklist')
      .update({ item_order: index + 1 })
      .eq('id', id)
      .eq('transaction_id', transactionId)
  );

  const results = await Promise.all(updates);
  for (const r of results) {
    if (r.error) throw r.error;
  }
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export async function getDocumentsByStage(
  transactionId: string,
  stage: TransactionStage
): Promise<TransactionDocument[]> {
  const { data, error } = await supabase
    .from('transaction_documents')
    .select('*, template:stage_document_templates(*)')
    .eq('transaction_id', transactionId)
    .eq('stage', stage)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getDocumentTemplates(
  stage: TransactionStage
): Promise<DocumentTemplate[]> {
  const { data, error } = await supabase
    .from('stage_document_templates')
    .select('*')
    .eq('stage', stage);

  if (error) throw error;
  return data || [];
}

export async function uploadDocument(
  transactionId: string,
  stage: TransactionStage,
  file: File,
  templateId?: string,
  customName?: string
): Promise<TransactionDocument> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  // Upload file to storage
  const fileName = `${Date.now()}_${file.name}`;
  const filePath = `transactions/${transactionId}/${stage}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  // Create document record
  const { data, error } = await supabase
    .from('transaction_documents')
    .insert({
      transaction_id: transactionId,
      template_id: templateId,
      stage,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_type: file.type,
      file_size: file.size,
      custom_name: customName,
    })
    .select('*, template:stage_document_templates(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDocument(id: string, fileUrl: string): Promise<void> {
  // Extract path from URL
  const urlParts = fileUrl.split('/documents/');
  if (urlParts.length > 1) {
    const filePath = urlParts[1];
    await supabase.storage.from('documents').remove([filePath]);
  }

  const { error } = await supabase
    .from('transaction_documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// COSTS
// ============================================================================

async function initializeTransactionCosts(
  transactionId: string,
  transactionTypeOrListingPrice?: string | number,
  listingPriceArg?: number
): Promise<void> {
  // Backwards-compat: function may be called as (transactionId, listingPrice)
  let transactionType: string | undefined
  let listingPrice: number | undefined

  if (typeof transactionTypeOrListingPrice === 'string') {
    transactionType = transactionTypeOrListingPrice
    listingPrice = listingPriceArg
  } else {
    listingPrice = transactionTypeOrListingPrice as number | undefined
  }

  // Get cost templates filtered by transaction type (allow 'both')
  let query = supabase.from('stage_cost_templates').select('*')
  if (transactionType) {
    // Filter cost templates to the exact transaction type (no 'both')
    query = query.eq('transaction_type', transactionType)
  }

  const { data: templates, error } = await query

  if (error) throw error;
  if (!templates || templates.length === 0) return;

  // Create cost items for each template
  const items = templates.map((template) => {
    let estimatedAmount = template.typical_amount;

    // Calculate percentage-based costs if we have a listing price
    if (template.typical_percentage && listingPrice) {
      estimatedAmount = Math.round(listingPrice * template.typical_percentage);
    }

    return {
      transaction_id: transactionId,
      template_id: template.id,
      stage: template.stage,
      estimated_amount: estimatedAmount,
      is_paid: false,
    };
  });

  await supabase.from('transaction_costs').insert(items);
}

export async function getCostsByStage(
  transactionId: string,
  stage: TransactionStage
): Promise<TransactionCost[]> {
  const { data, error } = await supabase
    .from('transaction_costs')
    .select('*, template:stage_cost_templates(*)')
    .eq('transaction_id', transactionId)
    .eq('stage', stage)
    .order('created_at');

  if (error) throw error;
  return data || [];
}

export async function getAllCosts(transactionId: string): Promise<TransactionCost[]> {
  const { data, error } = await supabase
    .from('transaction_costs')
    .select('*, template:stage_cost_templates(*)')
    .eq('transaction_id', transactionId)
    .order('stage');

  if (error) throw error;
  return data || [];
}

export async function updateCost(
  id: string,
  data: {
    estimated_amount?: number;
    actual_amount?: number;
    is_paid?: boolean;
    paid_date?: string;
    payment_method?: string;
    notes?: string;
  }
): Promise<TransactionCost> {
  const { data: cost, error } = await supabase
    .from('transaction_costs')
    .update(data)
    .eq('id', id)
    .select('*, template:stage_cost_templates(*)')
    .single();

  if (error) throw error;
  return cost;
}

export async function addCustomCost(
  transactionId: string,
  stage: TransactionStage,
  name: string,
  estimatedAmount?: number,
  description?: string
): Promise<TransactionCost> {
  const { data, error } = await supabase
    .from('transaction_costs')
    .insert({
      transaction_id: transactionId,
      stage,
      custom_name: name,
      custom_description: description,
      estimated_amount: estimatedAmount,
      is_paid: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function recalculateCosts(
  transactionId: string,
  newPrice: number
): Promise<void> {
  // Get all costs with templates that have percentages
  const { data: costs } = await supabase
    .from('transaction_costs')
    .select('*, template:stage_cost_templates(*)')
    .eq('transaction_id', transactionId)
    .not('template_id', 'is', null);

  if (!costs) return;

  // Update each percentage-based cost
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

// ============================================================================
// NOTES
// ============================================================================

export async function getNotes(transactionId: string): Promise<TransactionNote[]> {
  const { data, error } = await supabase
    .from('transaction_notes')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addNote(
  transactionId: string,
  content: string,
  noteType: string = 'general',
  stage?: TransactionStage
): Promise<TransactionNote> {
  const { data, error } = await supabase
    .from('transaction_notes')
    .insert({
      transaction_id: transactionId,
      content,
      note_type: noteType,
      stage,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('transaction_notes').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// TEMPLATES (for reference data)
// ============================================================================

export async function getStages(transactionType?: string): Promise<StageDefinition[]> {
  let query = supabase.from('transaction_stages').select('*')
  if (transactionType) {
    query = query.eq('transaction_type', transactionType)
  }
  const { data, error } = await query.order('stage_order');

  if (error) throw error;
  return data || [];
}

export async function getChecklistTemplates(
  stage?: TransactionStage,
  transactionType?: TransactionType
): Promise<ChecklistTemplate[]> {
  let query = supabase.from('stage_checklist_templates').select('*');
  
  if (stage) {
    query = query.eq('stage', stage);
  }

  if (transactionType) {
    query = query.eq('transaction_type', transactionType);
  }

  const { data, error } = await query.order('item_order');

  if (error) throw error;
  return data || [];
}

export async function getCostTemplates(
  stage?: TransactionStage,
  transactionType?: TransactionType
): Promise<CostTemplate[]> {
  let query = supabase.from('stage_cost_templates').select('*');
  
  if (stage) {
    query = query.eq('stage', stage);
  }

  if (transactionType) {
    query = query.in('transaction_type', [transactionType, 'both']);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

// ============================================================================
// COST SUMMARIES
// ============================================================================

export interface CostSummary {
  totalEstimated: number;
  totalActual: number;
  totalPaid: number;
  totalUnpaid: number;
  byStage: Record<TransactionStage, {
    estimated: number;
    actual: number;
    paid: number;
  }>;
}

export async function getCostSummary(transactionId: string): Promise<CostSummary> {
  const costs = await getAllCosts(transactionId);

  const summary: CostSummary = {
    totalEstimated: 0,
    totalActual: 0,
    totalPaid: 0,
    totalUnpaid: 0,
    byStage: {} as Record<TransactionStage, { estimated: number; actual: number; paid: number }>,
  };

  // Initialize byStage
  for (const stage of STAGE_ORDER) {
    summary.byStage[stage] = { estimated: 0, actual: 0, paid: 0 };
  }

  for (const cost of costs) {
    const estimated = cost.estimated_amount || 0;
    const actual = cost.actual_amount || 0;
    const finalAmount = actual || estimated;

    summary.totalEstimated += estimated;
    summary.totalActual += actual;

    summary.byStage[cost.stage].estimated += estimated;
    summary.byStage[cost.stage].actual += actual;

    if (cost.is_paid) {
      summary.totalPaid += finalAmount;
      summary.byStage[cost.stage].paid += finalAmount;
    } else {
      summary.totalUnpaid += finalAmount;
    }
  }

  return summary;
}
