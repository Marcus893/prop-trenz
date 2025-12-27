// Transaction Manager Types

export type TransactionStage = 
  | 'search'
  | 'analysis'
  | 'offer'
  | 'due_diligence'
  | 'financing'
  | 'closing'
  | 'post_closing'
  | 'listing'
  | 'gather_required_documents';

export type TransactionStatus = 'active' | 'completed' | 'cancelled' | 'on_hold';

export type PropertyType = 'house' | 'apartment' | 'land' | 'commercial' | 'other';

export type TransactionType = 'purchase' | 'sale' | 'rent';

export interface Transaction {
  id: string;
  user_id: string;
  
  // Property info
  property_address?: string;
  property_type?: PropertyType;
  neighborhood?: string;
  city?: string;
  
  // Transaction details
  current_stage: TransactionStage;
  transaction_type: TransactionType;
  
  // Key financials
  listing_price?: number;
  offer_price?: number;
  accepted_price?: number;
  down_payment?: number;
  mortgage_amount?: number;
  interest_rate?: number;
  mortgage_term_years?: number;
  
  // Key dates
  offer_date?: string;
  acceptance_date?: string;
  inspection_date?: string;
  closing_date?: string;
  actual_closing_date?: string;
  
  // Key contacts
  seller_name?: string;
  seller_contact?: string;
  agent_name?: string;
  agent_contact?: string;
  notary_name?: string;
  notary_contact?: string;
  mortgage_broker?: string;
  mortgage_broker_contact?: string;
  
  // Status
  status: TransactionStatus;
  
  // Optional flags
  skip_financing?: boolean;

  created_at: string;
  updated_at: string;
}

export interface TransactionWithProgress extends Transaction {
  total_checklist_items: number;
  completed_checklist_items: number;
  progress_percentage: number;
}

export interface StageDefinition {
  id: string;
  stage: TransactionStage;
  stage_order: number;
  name_key: string;
  description_key: string;
  typical_duration_days: number;
}

export interface ChecklistTemplate {
  id: string;
  stage: TransactionStage;
  item_order: number;
  title_key: string;
  description_key?: string;
  is_required: boolean;
  category?: string;
  // 'purchase' | 'sale' | 'both' - optional, template-specific
  transaction_type?: string;
}

export interface ChecklistItem {
  id: string;
  transaction_id: string;
  template_id?: string;
  stage: TransactionStage;
  custom_title?: string;
  custom_description?: string;
  is_completed: boolean;
  completed_at?: string;
  notes?: string;
  created_at: string;
  // Manual order value for per-transaction reordering (optional)
  item_order?: number;
  // Joined from template
  template?: ChecklistTemplate;
}

export interface DocumentTemplate {
  id: string;
  stage: TransactionStage;
  document_type: string;
  name_key: string;
  description_key?: string;
  is_required: boolean;
}

export interface TransactionDocument {
  id: string;
  transaction_id: string;
  template_id?: string;
  stage: TransactionStage;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  custom_name?: string;
  custom_description?: string;
  uploaded_at: string;
  notes?: string;
  // Joined from template
  template?: DocumentTemplate;
}

export interface CostTemplate {
  id: string;
  stage: TransactionStage;
  cost_type: string;
  name_key: string;
  description_key?: string;
  typical_percentage?: number;
  typical_amount?: number;
  is_required: boolean;
  paid_to?: string;
  // 'purchase' | 'sale' | 'both' - optional, template-specific
  transaction_type?: string;
}

export interface TransactionCost {
  id: string;
  transaction_id: string;
  template_id?: string;
  stage: TransactionStage;
  estimated_amount?: number;
  actual_amount?: number;
  is_paid: boolean;
  paid_date?: string;
  payment_method?: string;
  receipt_url?: string;
  custom_name?: string;
  custom_description?: string;
  notes?: string;
  paid_to?: string; // e.g. 'notary', 'bank', 'agent', etc. - set for custom costs
  created_at: string;
  // Joined from template
  template?: CostTemplate;
}

export interface StageHistory {
  id: string;
  transaction_id: string;
  from_stage?: TransactionStage;
  to_stage: TransactionStage;
  transitioned_at: string;
  notes?: string;
}

export type NoteType = 'general' | 'call' | 'email' | 'meeting' | 'decision';

export interface TransactionNote {
  id: string;
  transaction_id: string;
  stage?: TransactionStage;
  note_type: NoteType;
  content: string;
  created_at: string;
}

// API Request/Response types
export interface CreateTransactionRequest {
  property_address?: string;
  property_type?: PropertyType;
  neighborhood?: string;
  city?: string;
  transaction_type?: TransactionType;
  listing_price?: number;
}

export interface UpdateTransactionRequest {
  property_address?: string;
  property_type?: PropertyType;
  neighborhood?: string;
  city?: string;
  current_stage?: TransactionStage;
  listing_price?: number;
  offer_price?: number;
  accepted_price?: number;
  down_payment?: number;
  mortgage_amount?: number;
  interest_rate?: number;
  mortgage_term_years?: number;
  skip_financing?: boolean;
  offer_date?: string;
  acceptance_date?: string;
  inspection_date?: string;
  closing_date?: string;
  actual_closing_date?: string;
  seller_name?: string;
  seller_contact?: string;
  agent_name?: string;
  agent_contact?: string;
  notary_name?: string;
  notary_contact?: string;
  mortgage_broker?: string;
  mortgage_broker_contact?: string;
  status?: TransactionStatus;
}

export interface StageData {
  stage: StageDefinition;
  checklist: ChecklistItem[];
  documents: TransactionDocument[];
  costs: TransactionCost[];
  documentTemplates: DocumentTemplate[];
  costTemplates: CostTemplate[];
}

export interface TransactionFullData extends Transaction {
  stages: StageDefinition[];
  checklist: ChecklistItem[];
  documents: TransactionDocument[];
  costs: TransactionCost[];
  notes: TransactionNote[];
  stage_history: StageHistory[];
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
}

// Stage order for navigation
export const STAGE_ORDER: TransactionStage[] = [
  'search',
  'analysis',
  'offer',
  'due_diligence',
  'financing',
  'closing',
  'post_closing'
];

export const getStageIndex = (stage: TransactionStage, stages: TransactionStage[] = STAGE_ORDER): number => {
  return stages.indexOf(stage);
};

export const getNextStage = (stage: TransactionStage, stages: TransactionStage[] = STAGE_ORDER): TransactionStage | null => {
  const index = getStageIndex(stage, stages);
  return index >= 0 && index < stages.length - 1 ? stages[index + 1] : null;
};

export const getPreviousStage = (stage: TransactionStage, stages: TransactionStage[] = STAGE_ORDER): TransactionStage | null => {
  const index = getStageIndex(stage, stages);
  return index > 0 ? stages[index - 1] : null;
};

export const isStageCompleted = (
  currentStage: TransactionStage, 
  checkStage: TransactionStage,
  stages: TransactionStage[] = STAGE_ORDER
): boolean => {
  return getStageIndex(checkStage, stages) < getStageIndex(currentStage, stages);
};

export const isCurrentStage = (
  currentStage: TransactionStage, 
  checkStage: TransactionStage
): boolean => {
  return currentStage === checkStage;
};
