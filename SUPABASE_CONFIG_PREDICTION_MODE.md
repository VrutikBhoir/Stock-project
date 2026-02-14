/**
 * SUPABASE CONFIGURATION FOR PREDICTION-ONLY MODE
 * 
 * This document describes the Supabase RLS policies and database
 * changes required for the PREDICTION-ONLY conversion.
 * 
 * NOTE: These are NOT implemented in this script - they must be
 * applied manually via Supabase dashboard or SQL console.
 */

-- ⚠️ DISABLE TRADING: portfolios TABLE
-- 
-- RECOMMENDATION: Keep portfolios table for user reference,
-- but it should NO LONGER be written to by the backend.
-- 
-- Current RLS policies should be:
-- 1. SELECT: Users can only see their own portfolio
-- 2. INSERT: DISABLED (except for admins via SQL)
-- 3. UPDATE: DISABLED (no cash balance updates)
-- 4. DELETE: DISABLED
-- 
-- SQL Example (run in Supabase SQL editor):
/*
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own portfolio" ON portfolios;
DROP POLICY IF EXISTS "Users can update own portfolio" ON portfolios;
DROP POLICY IF EXISTS "Users can insert own portfolio" ON portfolios;

-- Create new policies
CREATE POLICY "Users can view own portfolio"
  ON portfolios
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- NO INSERT POLICY - portfolios must be created via admin/migration
-- NO UPDATE POLICY - no real cash balance updates
-- NO DELETE POLICY - no deletion
*/

-- ⚠️ DISABLE TRADING: positions TABLE  
--
-- RECOMMENDATION: This table should be completely read-only for users.
-- All positions should be deleted or migrated to comments/history only.
-- Backend APIs that write to this table are now disabled.
--
-- SQL Example (run in Supabase SQL editor):
/*
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own positions" ON positions;
DROP POLICY IF EXISTS "Users can update own positions" ON positions;
DROP POLICY IF EXISTS "Users can insert own positions" ON positions;
DROP POLICY IF EXISTS "Users can delete own positions" ON positions;

-- Create new READ-ONLY policy
CREATE POLICY "Users can view own positions (read-only)"
  ON positions
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- NO UPDATE/INSERT/DELETE POLICIES - positions are read-only
*/

-- ✅ KEEP: profiles TABLE (Minimal)
--
-- Users should have:
-- - id (Supabase user ID)
-- - email (from auth)
-- - username (optional)
-- - display_name (optional)
-- - created_at
-- - updated_at
--
-- DO NOT store:
-- - cash_balance (use BASE_VIRTUAL_CASH constant)
-- - portfolio_value (compute derived)
-- - trading history (use simulated state)

-- ✨ OPTIONAL: Add new table for PREDICTION HISTORY (Read + Append only)
--
-- Store predictions for user reference/learning:
/*
CREATE TABLE prediction_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES auth.users(id),
  symbol VARCHAR(10) NOT NULL,
  predicted_price DECIMAL(10, 2),
  confidence DECIMAL(5, 2),
  risk_score DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE prediction_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own predictions"
  ON prediction_history
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own predictions"
  ON prediction_history
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- NO UPDATE/DELETE on predictions
*/

-- 🔒 Summary of RLS Changes:
--   ✅ profiles: SELECT + minimal data
--   ❌ portfolios: SELECT only, no UPDATE
--   ❌ positions: SELECT only, no UPDATE/INSERT/DELETE
--   ⭐ prediction_history: SELECT + INSERT (optional)
--   ❌ trades table: DELETE or leave empty
--   ❌ transactions table: DELETE or leave empty

-- 🚀 Frontend Impact:
-- Frontend now uses localStorage for simulated portfolio state.
-- All portfolio/position calculations are DERIVED, not from DB.
-- Dashboard remains visually complete but logically predictive.
