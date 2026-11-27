-- ShiftRelay Production PostgreSQL Schema
-- High-concurrency schema for 2.7B frontline shift workers

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organisations & Sites
CREATE TABLE IF NOT EXISTS organisations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_code VARCHAR(32) NOT NULL UNIQUE,
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  work_email TEXT NOT NULL,
  phone TEXT,
  industry TEXT,
  country TEXT,
  time_zone TEXT NOT NULL DEFAULT 'UTC',
  preferred_language VARCHAR(16) NOT NULL DEFAULT 'en',
  verification_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  plan_tier VARCHAR(32) NOT NULL DEFAULT 'professional',
  billing_status VARCHAR(32) NOT NULL DEFAULT 'active_subscription',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  pilot_paid BOOLEAN NOT NULL DEFAULT FALSE,
  pilot_credit_ngn INTEGER NOT NULL DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organisation_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  time_zone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Portal Users & Memberships
CREATE TABLE IF NOT EXISTS portal_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT,
  country_code VARCHAR(2),
  time_zone TEXT,
  employee_reference TEXT,
  avatar_data_url TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES organisation_sites(id) ON DELETE SET NULL,
  role VARCHAR(32) NOT NULL,
  title TEXT NOT NULL,
  department TEXT,
  supervisor_membership_id UUID,
  workflow_template_id UUID,
  shift_start TIME,
  shift_end TIME,
  shift_days JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organisation_id, user_id)
);

-- 3. Time Clock & Daily Attendance Streaks
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  clocked_in_at TIMESTAMPTZ NOT NULL,
  clocked_out_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Work Items & Handovers
CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  template_id UUID,
  created_by_membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
  priority VARCHAR(16) NOT NULL DEFAULT 'normal',
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS work_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  assigned_to_membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
  created_by_membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
  item_type VARCHAR(32) NOT NULL,
  title TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'awaiting_review',
  priority VARCHAR(16) NOT NULL DEFAULT 'normal',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ
);

-- 5. Open Shifts Marketplace
CREATE TABLE IF NOT EXISTS open_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  created_by_membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  slots INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS open_shift_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  open_shift_id UUID NOT NULL REFERENCES open_shifts(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(open_shift_id, membership_id)
);

-- 6. Social Feed Posts & Professional Network
CREATE TABLE IF NOT EXISTS feed_posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT,
  author_avatar TEXT,
  content TEXT NOT NULL,
  media_type VARCHAR(16) DEFAULT 'none',
  media_url TEXT,
  media_name TEXT,
  badge VARCHAR(64),
  confidentiality_certified BOOLEAN NOT NULL DEFAULT TRUE,
  likes JSONB NOT NULL DEFAULT '[]'::jsonb,
  reposts JSONB NOT NULL DEFAULT '[]'::jsonb,
  saved_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Direct Messages
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  sender_membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  recipient_membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  recipient_membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
  channel VARCHAR(16) NOT NULL DEFAULT 'in_app',
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. File Attachments & Upload Ownership
CREATE TABLE IF NOT EXISTS file_attachments ( id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  uploader_membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
  filename TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9b. Persistent Handover Chat Media (Photos, Documents & Voice Notes — survives redeploys)
CREATE TABLE IF NOT EXISTS handover_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES work_items(id) ON DELETE SET NULL,
  uploader_membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
  media_type VARCHAR(16) NOT NULL DEFAULT 'file',
  mime_type VARCHAR(120) NOT NULL DEFAULT 'application/octet-stream',
  file_name TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  data_base64 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_handover_media_org ON handover_media(organisation_id, created_at DESC);

-- 10. Dayforce-Style SaaS Billing, Continuous Pay Ledgers & Settlement Float
CREATE TABLE IF NOT EXISTS tenant_billing_invoices (
  id TEXT PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  invoice_type VARCHAR(32) NOT NULL,
  plan_tier VARCHAR(32) NOT NULL,
  cycle_month VARCHAR(16),
  core_headcount INTEGER NOT NULL DEFAULT 0,
  overage_headcount INTEGER NOT NULL DEFAULT 0,
  seasonal_headcount INTEGER NOT NULL DEFAULT 0,
  base_fee_ngn INTEGER NOT NULL DEFAULT 0,
  pepm_fee_ngn INTEGER NOT NULL DEFAULT 0,
  overage_fee_ngn INTEGER NOT NULL DEFAULT 0,
  surge_fee_ngn INTEGER NOT NULL DEFAULT 0,
  pilot_credit_applied_ngn INTEGER NOT NULL DEFAULT 0,
  amount_ngn INTEGER NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'UNPAID',
  checkout_url TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS worker_pay_ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  cycle_month VARCHAR(16) NOT NULL,
  gross_earned_todate NUMERIC(14,2) NOT NULL DEFAULT 0,
  statutory_withheld_todate JSONB NOT NULL DEFAULT '{}'::jsonb,
  ewa_disbursed_todate NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_available_disbursal NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organisation_id, membership_id, cycle_month)
);

CREATE TABLE IF NOT EXISTS settlement_float_accounts (
  organisation_id UUID PRIMARY KEY REFERENCES organisations(id) ON DELETE CASCADE,
  custody_partner TEXT NOT NULL DEFAULT 'Paystack Titan / Access Bank Custody',
  payroll_net_ngn NUMERIC(14,2) NOT NULL DEFAULT 0,
  paye_ngn NUMERIC(14,2) NOT NULL DEFAULT 0,
  pencom_ngn NUMERIC(14,2) NOT NULL DEFAULT 0,
  nhf_ngn NUMERIC(14,2) NOT NULL DEFAULT 0,
  nsitf_ngn NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settlement_float_ledger (
  id TEXT PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  entry_type VARCHAR(24) NOT NULL,
  bucket VARCHAR(24) NOT NULL,
  amount_ngn NUMERIC(14,2) NOT NULL,
  custody_partner TEXT,
  reference TEXT,
  actor_email TEXT,
  reconciliation_status VARCHAR(24) NOT NULL DEFAULT 'RECORDED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for sub-millisecond query performance
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(organisation_id);
CREATE INDEX IF NOT EXISTS idx_work_items_org_status ON work_items(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_membership_id, read_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON direct_messages(recipient_membership_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created ON feed_posts(created_at DESC);

