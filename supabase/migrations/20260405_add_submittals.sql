-- Add submittals jsonb column to contracts table
-- Default empty array for existing contracts (backward compatibility)
ALTER TABLE contracts ADD COLUMN submittals jsonb DEFAULT '[]'::jsonb;
