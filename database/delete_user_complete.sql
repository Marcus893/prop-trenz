-- Complete user deletion function
-- This function deletes all user data from custom tables
-- auth.users deletion is handled by the edge function using Admin API
-- Works for both email/password and OAuth (Google) users

CREATE OR REPLACE FUNCTION delete_user_completely(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Delete all user watchlists
  DELETE FROM user_watchlists WHERE user_watchlists.user_id = delete_user_completely.user_id;
  
  -- 2. Delete user subscriptions
  DELETE FROM user_subscriptions WHERE user_subscriptions.user_id = delete_user_completely.user_id;
  
  -- 3. Delete subscription events (if any)
  DELETE FROM subscription_events WHERE subscription_events.user_id = delete_user_completely.user_id;
  
  -- 4. Delete user transactions and all related data
  -- First delete child tables that reference user_transactions
  DELETE FROM transaction_checklist 
  WHERE transaction_id IN (SELECT id FROM user_transactions WHERE user_transactions.user_id = delete_user_completely.user_id);
  
  DELETE FROM transaction_costs 
  WHERE transaction_id IN (SELECT id FROM user_transactions WHERE user_transactions.user_id = delete_user_completely.user_id);
  
  DELETE FROM transaction_documents 
  WHERE transaction_id IN (SELECT id FROM user_transactions WHERE user_transactions.user_id = delete_user_completely.user_id);
  
  DELETE FROM transaction_notes 
  WHERE transaction_id IN (SELECT id FROM user_transactions WHERE user_transactions.user_id = delete_user_completely.user_id);
  
  DELETE FROM transaction_stage_history 
  WHERE transaction_id IN (SELECT id FROM user_transactions WHERE user_transactions.user_id = delete_user_completely.user_id);
  
  -- Now delete the transactions themselves
  DELETE FROM user_transactions WHERE user_transactions.user_id = delete_user_completely.user_id;
  
  -- 5. Anonymize data upload logs (set uploaded_by to NULL to preserve audit history)
  UPDATE data_upload_logs 
  SET uploaded_by = NULL 
  WHERE uploaded_by = delete_user_completely.user_id;
  
  -- 6. Delete user from users table
  DELETE FROM users WHERE users.id = delete_user_completely.user_id;
  
  -- Note: Deletion from auth.users is done by the edge function using Admin API
  -- This ensures both email/password and OAuth identities are removed
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated, anon;

-- Create trigger to automatically delete from auth.users when users table row is deleted
-- This requires superuser privileges, so it should be run by database admin
CREATE OR REPLACE FUNCTION handle_delete_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete from auth.users using the auth schema
  -- Note: This requires the function to be created with proper permissions
  PERFORM auth.delete_user(OLD.id);
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Could not delete from auth.users: %', SQLERRM;
    RETURN OLD;
END;
$$;

-- Create trigger (if auth.delete_user function exists)
-- Note: Supabase may provide this, or you may need to use Admin API instead
DROP TRIGGER IF EXISTS on_users_delete_auth ON users;
-- CREATE TRIGGER on_users_delete_auth
--   AFTER DELETE ON users
--   FOR EACH ROW
--   EXECUTE FUNCTION handle_delete_user();

-- Alternative: Use Supabase Admin API to delete from auth.users
-- This is safer and recommended approach

