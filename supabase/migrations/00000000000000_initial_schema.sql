-- ClearContract Initial Schema
-- Creates four tables: contracts, findings, contract_dates, company_profiles
-- With row-level security, CASCADE foreign keys, and indexes

-- =============================================================================
-- TABLES
-- =============================================================================

-- contracts: Core contract records
create table contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  client text not null default '',
  type text not null check (type in ('Prime Contract', 'Subcontract', 'Purchase Order', 'Change Order')),
  upload_date text not null,
  status text not null check (status in ('Analyzing', 'Reviewed', 'Draft')),
  risk_score integer not null default 0,
  score_breakdown jsonb,
  bid_signal jsonb,
  pass_results jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- findings: Individual analysis findings linked to a contract
create table findings (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  severity text not null check (severity in ('Critical', 'High', 'Medium', 'Low', 'Info')),
  category text not null check (category in (
    'Legal Issues', 'Scope of Work', 'Contract Compliance', 'Labor Compliance',
    'Insurance Requirements', 'Important Dates', 'Financial Terms',
    'Technical Standards', 'Risk Assessment', 'Compound Risk'
  )),
  title text not null,
  description text not null,
  recommendation text not null,
  clause_reference text not null,
  negotiation_position text not null,
  action_priority text not null check (action_priority in ('pre-bid', 'pre-sign', 'monitor')),
  resolved boolean not null default false,
  note text not null default '',
  clause_text text,
  explanation text,
  cross_references jsonb,
  legal_meta jsonb,
  scope_meta jsonb,
  source_pass text,
  downgraded_from text,
  is_synthesis boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- contract_dates: Key dates and milestones linked to a contract
create table contract_dates (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  label text not null,
  date text not null,
  type text not null check (type in ('Start', 'Milestone', 'Deadline', 'Expiry')),
  created_at timestamptz not null default now()
);

-- company_profiles: One profile per user for company-specific analysis context
create table company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) unique,
  gl_per_occurrence text not null default '$1,000,000',
  gl_aggregate text not null default '$2,000,000',
  umbrella_limit text not null default '$1,000,000',
  auto_limit text not null default '$1,000,000',
  wc_statutory_state text not null default 'CA',
  wc_employer_liability text not null default '$1,000,000',
  bonding_single_project text not null default '$500,000',
  bonding_aggregate text not null default '$1,000,000',
  contractor_license_type text not null default 'C-17',
  contractor_license_number text not null default '',
  contractor_license_expiry text not null default '',
  dir_registration text not null default '',
  dir_expiry text not null default '',
  sbe_cert_id text not null default '',
  sbe_cert_issuer text not null default '',
  lausd_vendor_number text not null default '',
  employee_count text not null default '',
  service_area text not null default '',
  typical_project_size_min text not null default '',
  typical_project_size_max text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

create index idx_contracts_user_id on contracts(user_id);
create index idx_findings_contract_id on findings(contract_id);
create index idx_findings_user_id on findings(user_id);
create index idx_contract_dates_contract_id on contract_dates(contract_id);
create index idx_contract_dates_user_id on contract_dates(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table contracts enable row level security;
alter table findings enable row level security;
alter table contract_dates enable row level security;
alter table company_profiles enable row level security;

-- -----------------------------------------------------------------------------
-- contracts policies
-- -----------------------------------------------------------------------------

create policy "Users can view own contracts"
  on contracts for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own contracts"
  on contracts for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own contracts"
  on contracts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own contracts"
  on contracts for delete to authenticated
  using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- findings policies
-- -----------------------------------------------------------------------------

create policy "Users can view own findings"
  on findings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own findings"
  on findings for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own findings"
  on findings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own findings"
  on findings for delete to authenticated
  using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- contract_dates policies
-- -----------------------------------------------------------------------------

create policy "Users can view own contract_dates"
  on contract_dates for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own contract_dates"
  on contract_dates for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own contract_dates"
  on contract_dates for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own contract_dates"
  on contract_dates for delete to authenticated
  using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- company_profiles policies
-- -----------------------------------------------------------------------------

create policy "Users can view own company_profiles"
  on company_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own company_profiles"
  on company_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own company_profiles"
  on company_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own company_profiles"
  on company_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);
