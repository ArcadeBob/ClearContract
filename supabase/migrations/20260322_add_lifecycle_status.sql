-- Add lifecycle_status column (business lifecycle, separate from analysis status)
ALTER TABLE contracts
  ADD COLUMN lifecycle_status text NOT NULL DEFAULT 'Draft'
  CHECK (lifecycle_status IN ('Draft', 'Under Review', 'Negotiating', 'Signed', 'Active', 'Expired'));

-- Index for filter queries on All Contracts page
CREATE INDEX idx_contracts_lifecycle_status ON contracts(lifecycle_status);
