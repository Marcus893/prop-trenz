# Account Deletion Process

This document explains how complete account deletion works in the application, ensuring all user data is removed regardless of sign-in method (email/password or Google OAuth).

## Overview

When a user deletes their account, **all** their data is removed from the database, including:
- Custom application data (`users` table)
- User watchlists (`user_watchlists` table)
- Auth records (`auth.users` table) - works for both email/password and OAuth identities
- Data upload logs are anonymized (preserves audit history)

## How It Works

### 1. User Initiates Deletion
- User clicks "Delete Account" in the profile page
- Confirms deletion

### 2. Edge Function Handles Deletion
The `/supabase/functions/delete-user` edge function is called, which:
1. Verifies the user is authenticated
2. Calls database function `delete_user_completely()` to delete:
   - All user watchlists
   - Anonymizes data upload logs (sets `uploaded_by` to NULL)
   - Deletes user from `users` table
3. Uses Supabase Admin API to delete from `auth.users`:
   - **This removes ALL identities** (email/password, Google OAuth, etc.)
   - Works regardless of how the user signed in

### 3. Client Sign Out
- User is signed out from the session
- Redirected appropriately

## Database Function: `delete_user_completely`

Located in: `database/delete_user_complete.sql`

This function:
- Deletes all `user_watchlists` for the user (CASCADE would handle this, but explicit for clarity)
- Anonymizes `data_upload_logs` by setting `uploaded_by = NULL` (preserves audit trail)
- Deletes the user record from `users` table

## Important Notes

### Works for All Auth Methods
- ✅ Email/Password accounts
- ✅ Google OAuth accounts
- ✅ Linked accounts (both email and Google)

### Data Retention
- `data_upload_logs`: Anonymized (not deleted) to preserve audit history
- All other user-specific data: Completely deleted

### Security
- Edge function requires valid authentication token
- Uses service role key for Admin API access
- User can only delete their own account

## Setup Instructions

1. **Run the database function**:
   ```sql
   -- Execute database/delete_user_complete.sql in Supabase SQL Editor
   ```

2. **Deploy the edge function**:
   ```bash
   # Make sure SUPABASE_SERVICE_ROLE_KEY is set in edge function secrets
   supabase functions deploy delete-user
   ```

3. **Verify**:
   - Test deletion with email/password account
   - Test deletion with Google OAuth account
   - Check that all data is removed from database

## Testing

To verify complete deletion works:
1. Create account (email/password or Google)
2. Add some watchlists
3. Delete account
4. Check in Supabase Dashboard:
   - User should be removed from `users` table
   - User should be removed from `auth.users` (all identities)
   - Watchlists should be deleted
   - Upload logs should have `uploaded_by = NULL`

