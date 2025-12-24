-- Seed data for Transaction Manager
-- Mexico-specific checklists, documents, and costs for each stage

-- Insert stage definitions
INSERT INTO transaction_stages (stage, stage_order, name_key, description_key, typical_duration_days) VALUES
  ('search', 1, 'stages.search.name', 'stages.search.description', 21),
  ('analysis', 2, 'stages.analysis.name', 'stages.analysis.description', 3),
  ('offer', 3, 'stages.offer.name', 'stages.offer.description', 5),
  ('due_diligence', 4, 'stages.due_diligence.name', 'stages.due_diligence.description', 5),
  ('financing', 5, 'stages.financing.name', 'stages.financing.description', 30),
  ('closing', 6, 'stages.closing.name', 'stages.closing.description', 10),
  ('post_closing', 7, 'stages.post_closing.name', 'stages.post_closing.description', 30);

-- ============================================================================
-- CHECKLIST TEMPLATES BY STAGE
-- ============================================================================

-- STAGE 1: Search
INSERT INTO stage_checklist_templates (stage, item_order, title_key, description_key, category) VALUES
  ('search', 1, 'checklist.search.define_requirements', 'checklist.search.define_requirements_desc', 'planning'),
  ('search', 2, 'checklist.search.set_budget', 'checklist.search.set_budget_desc', 'financial'),
  ('search', 3, 'checklist.search.get_preapproval', 'checklist.search.get_preapproval_desc', 'financial'),
  ('search', 4, 'checklist.search.research_neighborhoods', 'checklist.search.research_neighborhoods_desc', 'research'),
  ('search', 5, 'checklist.search.find_agent', 'checklist.search.find_agent_desc', 'contacts'),
  ('search', 6, 'checklist.search.create_shortlist', 'checklist.search.create_shortlist_desc', 'planning'),
  ('search', 7, 'checklist.search.schedule_viewings', 'checklist.search.schedule_viewings_desc', 'action'),
  ('search', 8, 'checklist.search.select_property', 'checklist.search.select_property_desc', 'decision');

-- STAGE 2: Analysis (preliminary research before making offer)
INSERT INTO stage_checklist_templates (stage, item_order, title_key, description_key, category, is_required) VALUES
  ('analysis', 1, 'checklist.analysis.compare_market_prices', 'checklist.analysis.compare_market_prices_desc', 'financial', true),
  ('analysis', 2, 'checklist.analysis.calculate_total_costs', 'checklist.analysis.calculate_total_costs_desc', 'financial', true),
  ('analysis', 3, 'checklist.analysis.visit_property', 'checklist.analysis.visit_property_desc', 'inspection', true),
  ('analysis', 4, 'checklist.analysis.research_neighborhood', 'checklist.analysis.research_neighborhood_desc', 'research', false),
  ('analysis', 5, 'checklist.analysis.check_property_history', 'checklist.analysis.check_property_history_desc', 'research', false),
  ('analysis', 6, 'checklist.analysis.review_hoa_rules', 'checklist.analysis.review_hoa_rules_desc', 'legal', false);

-- STAGE 3: Offer
INSERT INTO stage_checklist_templates (stage, item_order, title_key, description_key, category, is_required) VALUES
  ('offer', 1, 'checklist.offer.determine_offer_price', 'checklist.offer.determine_offer_price_desc', 'financial', true),
  ('offer', 2, 'checklist.offer.prepare_offer_letter', 'checklist.offer.prepare_offer_letter_desc', 'legal', true),
  ('offer', 3, 'checklist.offer.submit_offer', 'checklist.offer.submit_offer_desc', 'action', true),
  ('offer', 4, 'checklist.offer.negotiate_terms', 'checklist.offer.negotiate_terms_desc', 'negotiation', false),
  ('offer', 5, 'checklist.offer.sign_promesa', 'checklist.offer.sign_promesa_desc', 'legal', true),
  ('offer', 6, 'checklist.offer.pay_deposit', 'checklist.offer.pay_deposit_desc', 'financial', true);

-- STAGE 4: Due Diligence (formal verification after offer accepted)
INSERT INTO stage_checklist_templates (stage, item_order, title_key, description_key, category, is_required) VALUES
  ('due_diligence', 1, 'checklist.due_diligence.title_search', 'checklist.due_diligence.title_search_desc', 'legal', true),
  ('due_diligence', 2, 'checklist.due_diligence.verify_no_liens', 'checklist.due_diligence.verify_no_liens_desc', 'legal', true),
  ('due_diligence', 3, 'checklist.due_diligence.property_appraisal', 'checklist.due_diligence.property_appraisal_desc', 'financial', true),
  ('due_diligence', 4, 'checklist.due_diligence.structural_inspection', 'checklist.due_diligence.structural_inspection_desc', 'inspection', false),
  ('due_diligence', 5, 'checklist.due_diligence.verify_permits', 'checklist.due_diligence.verify_permits_desc', 'legal', true),
  ('due_diligence', 6, 'checklist.due_diligence.check_predial', 'checklist.due_diligence.check_predial_desc', 'legal', true),
  ('due_diligence', 7, 'checklist.due_diligence.check_utility_debts', 'checklist.due_diligence.check_utility_debts_desc', 'legal', true),
  ('due_diligence', 8, 'checklist.due_diligence.check_hoa_debts', 'checklist.due_diligence.check_hoa_debts_desc', 'financial', false);

-- STAGE 5: Financing
INSERT INTO stage_checklist_templates (stage, item_order, title_key, description_key, category, is_required) VALUES
  ('financing', 1, 'checklist.financing.compare_mortgages', 'checklist.financing.compare_mortgages_desc', 'financial', true),
  ('financing', 2, 'checklist.financing.gather_documents', 'checklist.financing.gather_documents_desc', 'documentation', true),
  ('financing', 3, 'checklist.financing.submit_application', 'checklist.financing.submit_application_desc', 'action', true),
  ('financing', 4, 'checklist.financing.bank_appraisal', 'checklist.financing.bank_appraisal_desc', 'financial', true),
  ('financing', 5, 'checklist.financing.receive_approval', 'checklist.financing.receive_approval_desc', 'action', true),
  ('financing', 6, 'checklist.financing.review_loan_terms', 'checklist.financing.review_loan_terms_desc', 'legal', true),
  ('financing', 7, 'checklist.financing.sign_mortgage_contract', 'checklist.financing.sign_mortgage_contract_desc', 'legal', true);

-- STAGE 6: Closing
INSERT INTO stage_checklist_templates (stage, item_order, title_key, description_key, category, is_required) VALUES
  ('closing', 1, 'checklist.closing.select_notary', 'checklist.closing.select_notary_desc', 'legal', true),
  ('closing', 2, 'checklist.closing.review_escritura', 'checklist.closing.review_escritura_desc', 'legal', true),
  ('closing', 3, 'checklist.closing.prepare_funds', 'checklist.closing.prepare_funds_desc', 'financial', true),
  ('closing', 4, 'checklist.closing.final_walkthrough', 'checklist.closing.final_walkthrough_desc', 'inspection', true),
  ('closing', 5, 'checklist.closing.sign_documents', 'checklist.closing.sign_documents_desc', 'legal', true),
  ('closing', 6, 'checklist.closing.pay_closing_costs', 'checklist.closing.pay_closing_costs_desc', 'financial', true),
  ('closing', 7, 'checklist.closing.receive_keys', 'checklist.closing.receive_keys_desc', 'action', true);

-- STAGE 7: Post-Closing
INSERT INTO stage_checklist_templates (stage, item_order, title_key, description_key, category, is_required) VALUES
  ('post_closing', 1, 'checklist.post_closing.register_property', 'checklist.post_closing.register_property_desc', 'legal', true),
  ('post_closing', 2, 'checklist.post_closing.transfer_utilities', 'checklist.post_closing.transfer_utilities_desc', 'action', true),
  ('post_closing', 3, 'checklist.post_closing.update_predial', 'checklist.post_closing.update_predial_desc', 'legal', true),
  ('post_closing', 4, 'checklist.post_closing.update_hoa', 'checklist.post_closing.update_hoa_desc', 'action', false),
  ('post_closing', 5, 'checklist.post_closing.get_insurance', 'checklist.post_closing.get_insurance_desc', 'financial', true),
  ('post_closing', 6, 'checklist.post_closing.change_locks', 'checklist.post_closing.change_locks_desc', 'action', false),
  ('post_closing', 7, 'checklist.post_closing.title_delivery', 'checklist.post_closing.title_delivery_desc', 'documentation', true);

-- ============================================================================
-- DOCUMENT TEMPLATES BY STAGE
-- ============================================================================

-- Search stage
INSERT INTO stage_document_templates (stage, document_type, name_key, description_key, is_required) VALUES
  ('search', 'preapproval_letter', 'docs.preapproval_letter', 'docs.preapproval_letter_desc', false);

-- Analysis stage
INSERT INTO stage_document_templates (stage, document_type, name_key, description_key, is_required) VALUES
  ('analysis', 'property_listing', 'docs.property_listing', 'docs.property_listing_desc', false),
  ('analysis', 'comparative_analysis', 'docs.comparative_analysis', 'docs.comparative_analysis_desc', false),
  ('analysis', 'inspection_notes', 'docs.inspection_notes', 'docs.inspection_notes_desc', false);

-- Offer stage
INSERT INTO stage_document_templates (stage, document_type, name_key, description_key, is_required) VALUES
  ('offer', 'offer_letter', 'docs.offer_letter', 'docs.offer_letter_desc', true),
  ('offer', 'promesa_compraventa', 'docs.promesa_compraventa', 'docs.promesa_compraventa_desc', true),
  ('offer', 'deposit_receipt', 'docs.deposit_receipt', 'docs.deposit_receipt_desc', true);

-- Due Diligence stage
INSERT INTO stage_document_templates (stage, document_type, name_key, description_key, is_required) VALUES
  ('due_diligence', 'title_certificate', 'docs.title_certificate', 'docs.title_certificate_desc', true),
  ('due_diligence', 'freedom_liens_cert', 'docs.freedom_liens_cert', 'docs.freedom_liens_cert_desc', true),
  ('due_diligence', 'appraisal_report', 'docs.appraisal_report', 'docs.appraisal_report_desc', true),
  ('due_diligence', 'predial_receipt', 'docs.predial_receipt', 'docs.predial_receipt_desc', true),
  ('due_diligence', 'water_no_debt_cert', 'docs.water_no_debt_cert', 'docs.water_no_debt_cert_desc', true),
  ('due_diligence', 'electricity_no_debt_cert', 'docs.electricity_no_debt_cert', 'docs.electricity_no_debt_cert_desc', true),
  ('due_diligence', 'gas_no_debt_cert', 'docs.gas_no_debt_cert', 'docs.gas_no_debt_cert_desc', true),
  ('due_diligence', 'hoa_no_debt_cert', 'docs.hoa_no_debt_cert', 'docs.hoa_no_debt_cert_desc', true),
  ('due_diligence', 'inspection_report', 'docs.inspection_report', 'docs.inspection_report_desc', false),
  ('due_diligence', 'zoning_certificate', 'docs.zoning_certificate', 'docs.zoning_certificate_desc', false);

-- Financing stage
INSERT INTO stage_document_templates (stage, document_type, name_key, description_key, is_required) VALUES
  ('financing', 'income_proof', 'docs.income_proof', 'docs.income_proof_desc', true),
  ('financing', 'bank_statements', 'docs.bank_statements', 'docs.bank_statements_desc', true),
  ('financing', 'id_documents', 'docs.id_documents', 'docs.id_documents_desc', true),
  ('financing', 'tax_returns', 'docs.tax_returns', 'docs.tax_returns_desc', false),
  ('financing', 'employment_letter', 'docs.employment_letter', 'docs.employment_letter_desc', true),
  ('financing', 'mortgage_approval', 'docs.mortgage_approval', 'docs.mortgage_approval_desc', true),
  ('financing', 'credit_report', 'docs.credit_report', 'docs.credit_report_desc', false);

-- Closing stage
INSERT INTO stage_document_templates (stage, document_type, name_key, description_key, is_required) VALUES
  ('closing', 'escritura_publica', 'docs.escritura_publica', 'docs.escritura_publica_desc', true),
  ('closing', 'payment_proof', 'docs.payment_proof', 'docs.payment_proof_desc', true),
  ('closing', 'closing_statement', 'docs.closing_statement', 'docs.closing_statement_desc', true),
  ('closing', 'closing_expenses_receipts', 'docs.closing_expenses_receipts', 'docs.closing_expenses_receipts_desc', true);

-- Post-closing stage
INSERT INTO stage_document_templates (stage, document_type, name_key, description_key, is_required) VALUES
  ('post_closing', 'property_registration', 'docs.property_registration', 'docs.property_registration_desc', true),
  ('post_closing', 'registered_escritura', 'docs.registered_escritura', 'docs.registered_escritura_desc', true),
  ('post_closing', 'insurance_policy', 'docs.insurance_policy', 'docs.insurance_policy_desc', true),
  ('post_closing', 'utility_contracts', 'docs.utility_contracts', 'docs.utility_contracts_desc', false),
  ('post_closing', 'acquisition_tax_receipt', 'docs.acquisition_tax_receipt', 'docs.acquisition_tax_receipt_desc', false),
  ('post_closing', 'notary_fees_receipt', 'docs.notary_fees_receipt', 'docs.notary_fees_receipt_desc', false),
  ('post_closing', 'public_registry_fees_receipt', 'docs.public_registry_fees_receipt', 'docs.public_registry_fees_receipt_desc', false);

-- ============================================================================
-- COST TEMPLATES BY STAGE (Mexico-specific)
-- ============================================================================

-- Search stage costs
INSERT INTO stage_cost_templates (stage, cost_type, name_key, typical_percentage, typical_amount, is_required, paid_to) VALUES
  ('search', 'buyer_agent_retainer', 'costs.buyer_agent_retainer', NULL, 0, false, 'agent');

-- Offer stage costs
INSERT INTO stage_cost_templates (stage, cost_type, name_key, typical_percentage, typical_amount, is_required, paid_to) VALUES
  ('offer', 'earnest_deposit', 'costs.earnest_deposit', 0.2, NULL, true, 'seller');

-- Due Diligence stage costs
INSERT INTO stage_cost_templates (stage, cost_type, name_key, typical_percentage, typical_amount, is_required, paid_to) VALUES
  ('due_diligence', 'appraisal_fee', 'costs.appraisal_fee', NULL, 5000, false, 'appraiser'),
  ('due_diligence', 'title_search_fee', 'costs.title_search_fee', NULL, 3000, true, 'notary'),
  ('due_diligence', 'inspection_fee', 'costs.inspection_fee', NULL, 8000, false, 'inspector');

-- Financing stage costs
INSERT INTO stage_cost_templates (stage, cost_type, name_key, typical_percentage, typical_amount, is_required, paid_to) VALUES
  ('financing', 'mortgage_origination', 'costs.mortgage_origination', 0.01, NULL, true, 'bank'),
  ('financing', 'mortgage_appraisal', 'costs.mortgage_appraisal', NULL, 6000, true, 'bank'),
  ('financing', 'credit_check_fee', 'costs.credit_check_fee', NULL, 500, false, 'bank'),
  ('financing', 'mortgage_insurance', 'costs.mortgage_insurance', 0.005, NULL, false, 'insurance');

-- Closing stage costs (main closing costs)
INSERT INTO stage_cost_templates (stage, cost_type, name_key, typical_percentage, typical_amount, is_required, paid_to) VALUES
  ('closing', 'notary_fees', 'costs.notary_fees', 0.01, NULL, true, 'notary'),
  ('closing', 'attorney_fees', 'costs.attorney_fees', NULL, 30000, false, 'attorney'),
  ('closing', 'acquisition_tax_isai', 'costs.acquisition_tax_isai', 0.03, NULL, true, 'government'),
  ('closing', 'registration_fee', 'costs.registration_fee', 0.005, NULL, true, 'government'),
  ('closing', 'bank_trust_fees', 'costs.bank_trust_fees', NULL, 50000, false, 'bank'),
  ('closing', 'final_payment', 'costs.final_payment', 0.8, NULL, true, 'seller');

-- Post-closing stage costs
INSERT INTO stage_cost_templates (stage, cost_type, name_key, typical_percentage, typical_amount, is_required, paid_to) VALUES
  ('post_closing', 'home_insurance_annual', 'costs.home_insurance_annual', 0.003, NULL, false, 'insurance'),
  ('post_closing', 'moving_costs', 'costs.moving_costs', NULL, 15000, false, 'moving_company'),
  ('post_closing', 'utility_contract_update', 'costs.utility_contract_update', NULL, 1000, false, 'utilities');
