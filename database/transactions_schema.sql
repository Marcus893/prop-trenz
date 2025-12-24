-- Transaction Manager Schema
-- Manages the complete property buying process through 7 stages

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM for transaction stages
CREATE TYPE transaction_stage AS ENUM (
  'search',           -- Finding properties
  'analysis',         -- Due diligence research
  'offer',            -- Offer & negotiation
  'due_diligence',    -- Legal/inspection
  'financing',        -- Mortgage process
  'closing',          -- Notary & signing
  'post_closing'      -- Move-in & registration
);

-- Main property transaction table
CREATE TABLE user_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Property info (can start minimal, fill in as known)
  property_address TEXT,
  property_type TEXT, -- 'house', 'apartment', 'land', etc.
  neighborhood TEXT,
  city TEXT,
  
  -- Transaction details
  current_stage transaction_stage DEFAULT 'search',
  transaction_type TEXT DEFAULT 'purchase', -- 'purchase', 'sale', 'rent'
  
  -- Key financials (REAL numbers, filled in as they become known)
  listing_price DECIMAL(15,2),        -- Initial asking price
  offer_price DECIMAL(15,2),          -- Your offer
  accepted_price DECIMAL(15,2),       -- Final negotiated price
  down_payment DECIMAL(15,2),         -- Actual down payment
  mortgage_amount DECIMAL(15,2),      -- Actual loan amount
  interest_rate DECIMAL(5,4),         -- Actual rate secured
  mortgage_term_years INTEGER,
  
  -- Key dates
  offer_date DATE,
  acceptance_date DATE,
  inspection_date DATE,
  closing_date DATE,
  actual_closing_date DATE,
  
  -- Key contacts
  seller_name TEXT,
  seller_contact TEXT,
  agent_name TEXT,
  agent_contact TEXT,
  notary_name TEXT,
  notary_contact TEXT,
  mortgage_broker TEXT,
  mortgage_broker_contact TEXT,
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled', 'on_hold'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stage definitions (seeded data)
CREATE TABLE transaction_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage transaction_stage NOT NULL,
  stage_order INTEGER NOT NULL,
  name_key TEXT NOT NULL,           -- i18n key: 'stages.search.name'
  description_key TEXT NOT NULL,    -- i18n key: 'stages.search.description'
  typical_duration_days INTEGER,
  
  UNIQUE(stage)
);

-- Stage-specific checklist templates
CREATE TABLE stage_checklist_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage transaction_stage NOT NULL,
  item_order INTEGER NOT NULL,
  title_key TEXT NOT NULL,          -- i18n key
  description_key TEXT,
  is_required BOOLEAN DEFAULT false,
  category TEXT,                     -- 'legal', 'financial', 'inspection', etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's checklist progress per transaction
CREATE TABLE transaction_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES user_transactions(id) ON DELETE CASCADE,
  template_id UUID REFERENCES stage_checklist_templates(id),
  stage transaction_stage NOT NULL,
  
  -- Can override template or add custom items
  custom_title TEXT,                 -- If user adds custom item
  custom_description TEXT,
  
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,

  -- Order for manual reordering (higher-level UI control)
  item_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stage-specific document types (templates)
CREATE TABLE stage_document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage transaction_stage NOT NULL,
  document_type TEXT NOT NULL,       -- 'title_deed', 'id_proof', 'mortgage_approval', etc.
  name_key TEXT NOT NULL,            -- i18n key
  description_key TEXT,
  is_required BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actual documents uploaded per transaction
CREATE TABLE transaction_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES user_transactions(id) ON DELETE CASCADE,
  template_id UUID REFERENCES stage_document_templates(id),
  stage transaction_stage NOT NULL,
  
  -- Document details
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,            -- Supabase storage URL
  file_type TEXT,
  file_size INTEGER,
  
  -- Custom document (not from template)
  custom_name TEXT,
  custom_description TEXT,
  
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Stage-specific cost categories (templates)
CREATE TABLE stage_cost_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage transaction_stage NOT NULL,
  cost_type TEXT NOT NULL,           -- 'inspection_fee', 'notary_fee', 'transfer_tax', etc.
  name_key TEXT NOT NULL,            -- i18n key
  description_key TEXT,
  typical_percentage DECIMAL(5,4),   -- If calculated as % of price
  typical_amount DECIMAL(15,2),      -- If fixed amount
  is_required BOOLEAN DEFAULT false,
  paid_to TEXT,                      -- 'notary', 'bank', 'government', etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actual costs per transaction (REAL numbers)
CREATE TABLE transaction_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES user_transactions(id) ON DELETE CASCADE,
  template_id UUID REFERENCES stage_cost_templates(id),
  stage transaction_stage NOT NULL,
  
  -- Both estimated and actual
  estimated_amount DECIMAL(15,2),
  actual_amount DECIMAL(15,2),
  
  -- Payment tracking
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  payment_method TEXT,
  receipt_url TEXT,                  -- Upload receipt
  paid_to TEXT,                      -- Who the cost is paid to (notary, bank, agent, etc.)
  
  -- Custom cost (not from template)
  custom_name TEXT,
  custom_description TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stage transition history
CREATE TABLE transaction_stage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES user_transactions(id) ON DELETE CASCADE,
  from_stage transaction_stage,
  to_stage transaction_stage NOT NULL,
  transitioned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- General notes/timeline
CREATE TABLE transaction_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES user_transactions(id) ON DELETE CASCADE,
  stage transaction_stage,           -- Optional: which stage this note belongs to
  note_type TEXT DEFAULT 'general',  -- 'general', 'call', 'email', 'meeting', 'decision'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transactions_user ON user_transactions(user_id);
CREATE INDEX idx_transactions_stage ON user_transactions(current_stage);
CREATE INDEX idx_transactions_status ON user_transactions(status);
CREATE INDEX idx_checklist_transaction ON transaction_checklist(transaction_id);
CREATE INDEX idx_checklist_stage ON transaction_checklist(stage);
CREATE INDEX idx_documents_transaction ON transaction_documents(transaction_id);
CREATE INDEX idx_documents_stage ON transaction_documents(stage);
CREATE INDEX idx_costs_transaction ON transaction_costs(transaction_id);
CREATE INDEX idx_costs_stage ON transaction_costs(stage);
CREATE INDEX idx_notes_transaction ON transaction_notes(transaction_id);
CREATE INDEX idx_stage_history_transaction ON transaction_stage_history(transaction_id);

-- Row Level Security (RLS)
ALTER TABLE user_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_stage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can view own transactions" ON user_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON user_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON user_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON user_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Checklist policies (via transaction ownership)
CREATE POLICY "Users can view own checklist items" ON transaction_checklist
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own checklist items" ON transaction_checklist
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update own checklist items" ON transaction_checklist
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own checklist items" ON transaction_checklist
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

-- Documents policies
CREATE POLICY "Users can view own documents" ON transaction_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own documents" ON transaction_documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update own documents" ON transaction_documents
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own documents" ON transaction_documents
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

-- Costs policies
CREATE POLICY "Users can view own costs" ON transaction_costs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own costs" ON transaction_costs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update own costs" ON transaction_costs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own costs" ON transaction_costs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

-- Notes policies
CREATE POLICY "Users can view own notes" ON transaction_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own notes" ON transaction_notes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update own notes" ON transaction_notes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own notes" ON transaction_notes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

-- Stage history policies
CREATE POLICY "Users can view own stage history" ON transaction_stage_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own stage history" ON transaction_stage_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_transactions WHERE id = transaction_id AND user_id = auth.uid())
  );

-- Template tables are readable by all authenticated users
ALTER TABLE transaction_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_cost_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stages" ON transaction_stages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read checklist templates" ON stage_checklist_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read document templates" ON stage_document_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read cost templates" ON stage_cost_templates
  FOR SELECT TO authenticated USING (true);

-- Updated_at trigger for transactions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_transactions_updated_at
  BEFORE UPDATE ON user_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Backfill/migration: ensure paid_to exists on existing installations
ALTER TABLE transaction_costs ADD COLUMN IF NOT EXISTS paid_to TEXT;

-- Backfill/migration: add item_order to checklist so reorder persists
ALTER TABLE transaction_checklist ADD COLUMN IF NOT EXISTS item_order INTEGER DEFAULT 0;
-- Add an index to help reorder queries per-transaction
CREATE INDEX IF NOT EXISTS idx_checklist_transaction_order ON transaction_checklist(transaction_id, item_order);

-- Backfill/migration: allow users to opt out of Financing stage
ALTER TABLE user_transactions ADD COLUMN IF NOT EXISTS skip_financing BOOLEAN DEFAULT false;
