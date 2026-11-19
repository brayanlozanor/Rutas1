-- Migration: Add color column to users table if missing
-- Ensures users table has color column for team badges and avatar color assignment.
ALTER TABLE users ADD COLUMN color TEXT;
