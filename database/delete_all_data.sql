-- Script to delete ALL data including upload logs
-- WARNING: This will delete EVERYTHING except:
--   - Users (user accounts) 
--   - Property types (predefined types)
-- 
-- Use this if you want a completely fresh start
-- Run this BEFORE re-importing CSV with proper UTF-8 encoding

BEGIN;

-- Delete in order to respect foreign key constraints

-- 1. Delete price index data
DELETE FROM residential_price_indices;
SELECT 'Deleted all price index data' AS status;

-- 2. Delete user watchlists
DELETE FROM user_watchlists;
SELECT 'Deleted all user watchlists' AS status;

-- 3. Delete data upload logs
DELETE FROM data_upload_logs;
SELECT 'Deleted all upload logs' AS status;

-- 4. Delete locations (has self-referencing parent_id, so delete children first)
-- Delete in order: municipalities/metro_zones -> states -> national

-- First, delete child locations (municipalities and metro zones that have parent_id)
DELETE FROM locations WHERE parent_id IS NOT NULL;

-- Then delete states (may have parent_id pointing to national)
DELETE FROM locations WHERE type = 'state';

-- Finally delete national
DELETE FROM locations WHERE type = 'national';

-- Delete any remaining locations (safety catch)
DELETE FROM locations;
SELECT 'Deleted all locations' AS status;

COMMIT;

-- Verify all deletions
SELECT 
    (SELECT COUNT(*) FROM residential_price_indices) AS price_indices_count,
    (SELECT COUNT(*) FROM locations) AS locations_count,
    (SELECT COUNT(*) FROM user_watchlists) AS watchlists_count,
    (SELECT COUNT(*) FROM data_upload_logs) AS upload_logs_count,
    (SELECT COUNT(*) FROM residential_property_types) AS property_types_count,
    (SELECT COUNT(*) FROM users) AS users_count;

SELECT 'All data deleted successfully! Ready for new import.' AS result;

