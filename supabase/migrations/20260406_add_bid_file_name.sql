-- Add bid_file_name to track which bid PDF was analyzed with this contract
-- NULL means no bid was attached (contract-only analysis)
ALTER TABLE contracts ADD COLUMN bid_file_name TEXT DEFAULT NULL;
