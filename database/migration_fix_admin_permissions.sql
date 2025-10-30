-- Migration: Fix admin permissions for data uploads
-- Run this in your Supabase SQL editor

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can manage data uploads" ON data_upload_logs;

-- Create new policy with correct admin emails
CREATE POLICY "Admins can manage data uploads" ON data_upload_logs 
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM users WHERE email IN (
            '43uy75@gmail.com',
            'marcusding1@gmail.com'
        )
    ));

-- Also ensure the user exists in the users table
-- This will create the user record if it doesn't exist
INSERT INTO users (email, name) 
VALUES ('marcusding1@gmail.com', 'Admin User')
ON CONFLICT (email) DO NOTHING;




