import pg from 'pg';
import { readFileSync } from 'node:fs';

const { Pool } = pg;

function loadEnvironment() {
  try {
    for (const entry of readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const match = entry.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {}
}

loadEnvironment();
const databaseUrl = process.env.DATABASE_URL;

function createPool(url) {
  if (!url) return null;
  const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
  const needsSsl =
    !isLocal &&
    (url.includes('render.com') ||
      url.includes('supabase') ||
      url.includes('neon.tech') ||
      url.includes('sslmode=') ||
      process.env.DATABASE_SSL === 'true');
  const p = new Pool({
    connectionString: url,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 5000
  });
  p.on('error', (err) => {
    console.error('[DB POOL ERROR]', err.code || err.message);
  });
  return p;
}

let pool = createPool(databaseUrl);

export function getPool() {
  return pool;
}

export function setPool(customPool) {
  pool = customPool;
}

const schema = `
  create table if not exists organisations (
    id uuid primary key,
    organisation_code varchar(32) not null unique,
    legal_name text not null,
    trading_name text,
    work_email text not null,
    phone text,
    industry text,
    country text,
    time_zone text not null default 'UTC',
    preferred_language varchar(16) not null default 'en',
    verification_status varchar(32) not null default 'pending',
    settings jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  alter table organisations add column if not exists settings jsonb not null default '{}'::jsonb;
  alter table organisations add column if not exists hub_name text;
  alter table organisations add column if not exists hub_lat double precision;
  alter table organisations add column if not exists hub_lng double precision;
  alter table organisations add column if not exists hub_perimeter integer;
  create table if not exists organisation_sites (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    name text not null,
    address text,
    time_zone text not null default 'UTC',
    created_at timestamptz not null default now()
  );
  create table if not exists portal_users (
    id uuid primary key,
    full_name text not null,
    email text not null unique,
    phone text,
    password_hash text,
    country_code varchar(2),
    time_zone text,
    employee_reference text,
    avatar_data_url text,
    email_verified boolean not null default false,
    phone_verified boolean not null default false,
    created_at timestamptz not null default now()
  );
  alter table portal_users add column if not exists password_hash text;
  alter table portal_users add column if not exists country_code varchar(2);
  alter table portal_users add column if not exists time_zone text;
  alter table portal_users add column if not exists employee_reference text;
  alter table portal_users add column if not exists avatar_data_url text;
  create table if not exists memberships (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    user_id uuid not null references portal_users(id) on delete cascade,
    site_id uuid references organisation_sites(id) on delete set null,
    role varchar(32) not null,
    title text not null,
    department text,
    supervisor_membership_id uuid,
    workflow_template_id uuid,
    shift_start time,
    shift_end time,
    shift_days jsonb not null default '[]'::jsonb,
    status varchar(32) not null default 'pending',
    created_at timestamptz not null default now(),
    unique(organisation_id, user_id)
  );
  alter table memberships add column if not exists workflow_template_id uuid;
  alter table memberships add column if not exists shift_start time;
  alter table memberships add column if not exists shift_end time;
  alter table memberships add column if not exists shift_days jsonb not null default '[]'::jsonb;
  alter table memberships add column if not exists staff_code varchar(32);
  create table if not exists time_entries (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    membership_id uuid not null references memberships(id) on delete cascade,
    clocked_in_at timestamptz not null,
    clocked_out_at timestamptz,
    note text,
    created_at timestamptz not null default now()
  );
  alter table time_entries add column if not exists verification_mode text;
  alter table time_entries add column if not exists geofence_status text;
  alter table time_entries add column if not exists distance_meters integer;
  alter table time_entries add column if not exists presence_verification_status text;
  alter table time_entries add column if not exists scanned_by_membership_id uuid;
  alter table time_entries add column if not exists scanned_by_name text;
  alter table time_entries add column if not exists clock_out_verification_mode text;
  alter table time_entries add column if not exists clock_out_geofence_status text;
  alter table time_entries add column if not exists verified_hours numeric;
  alter table time_entries add column if not exists card_proof_mode text;
  alter table time_entries add column if not exists scan_photo_data_url text;
  create table if not exists quote_reactions (
    quote_key varchar(64) not null,
    membership_id uuid not null references memberships(id) on delete cascade,
    reaction varchar(16) not null,
    created_at timestamptz not null default now(),
    primary key (quote_key, membership_id, reaction)
  );
  create table if not exists verification_tokens (
    id uuid primary key,
    user_id uuid not null references portal_users(id) on delete cascade,
    token_hash text not null,
    purpose varchar(32) not null,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
  );
  create table if not exists audit_events (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    actor_membership_id uuid references memberships(id) on delete set null,
    event_type varchar(64) not null,
    entity_type varchar(64),
    entity_id uuid,
    detail text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create table if not exists incidents (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    reported_by_membership_id uuid not null references memberships(id) on delete restrict,
    category varchar(48) not null,
    severity varchar(16) not null,
    description text not null,
    status varchar(24) not null default 'open',
    created_at timestamptz not null default now(),
    resolved_at timestamptz
  );
  create table if not exists scheduled_shifts (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    membership_id uuid not null references memberships(id) on delete cascade,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    status varchar(24) not null default 'scheduled',
    created_at timestamptz not null default now()
  );
  create table if not exists open_shifts (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    created_by_membership_id uuid not null references memberships(id) on delete cascade,
    title text not null,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    slots integer not null default 1,
    notes text,
    status varchar(24) not null default 'open',
    created_at timestamptz not null default now()
  );
  create table if not exists open_shift_applications (
    id uuid primary key,
    open_shift_id uuid not null references open_shifts(id) on delete cascade,
    membership_id uuid not null references memberships(id) on delete cascade,
    status varchar(24) not null default 'pending',
    created_at timestamptz not null default now(),
    unique(open_shift_id, membership_id)
  );
  create table if not exists announcements (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    author_membership_id uuid not null references memberships(id) on delete cascade,
    title text not null,
    body text not null,
    created_at timestamptz not null default now()
  );
  create table if not exists community_channels (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    name text not null,
    description text,
    created_at timestamptz not null default now(),
    unique(organisation_id, name)
  );
  create table if not exists community_messages (
    id uuid primary key,
    channel_id uuid not null references community_channels(id) on delete cascade,
    author_membership_id uuid not null references memberships(id) on delete cascade,
    body text not null,
    created_at timestamptz not null default now()
  );
  create table if not exists direct_messages (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    sender_membership_id uuid not null references memberships(id) on delete cascade,
    recipient_membership_id uuid not null references memberships(id) on delete cascade,
    body text not null,
    read_at timestamptz,
    created_at timestamptz not null default now()
  );
  create table if not exists leave_requests (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    membership_id uuid not null references memberships(id) on delete cascade,
    starts_on date not null,
    ends_on date not null,
    reason text,
    status varchar(24) not null default 'pending',
    reviewed_by_membership_id uuid references memberships(id) on delete set null,
    created_at timestamptz not null default now()
  );
  create table if not exists shift_swap_requests (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    shift_id uuid not null references scheduled_shifts(id) on delete cascade,
    requester_membership_id uuid not null references memberships(id) on delete cascade,
    target_membership_id uuid references memberships(id) on delete set null,
    status varchar(24) not null default 'pending',
    created_at timestamptz not null default now()
  );
  create table if not exists user_sessions (
    id uuid primary key,
    user_id uuid not null references portal_users(id) on delete cascade,
    membership_id uuid not null references memberships(id) on delete cascade,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
  );
  create table if not exists workflow_templates (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    name text not null,
    description text,
    created_at timestamptz not null default now()
  );
  create table if not exists workflow_steps (
    id uuid primary key,
    template_id uuid not null references workflow_templates(id) on delete cascade,
    sequence integer not null,
    assignee_role varchar(32) not null,
    action_name text not null,
    due_minutes integer,
    escalation_minutes integer,
    unique(template_id, sequence)
  );
  create table if not exists workflow_runs (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    template_id uuid references workflow_templates(id) on delete set null,
    created_by_membership_id uuid references memberships(id) on delete set null,
    status varchar(32) not null default 'in_progress',
    priority varchar(16) not null default 'normal',
    due_at timestamptz,
    created_at timestamptz not null default now(),
    completed_at timestamptz
  );
  create table if not exists work_items (
    id uuid primary key,
    workflow_run_id uuid not null references workflow_runs(id) on delete cascade,
    organisation_id uuid not null references organisations(id) on delete cascade,
    assigned_to_membership_id uuid references memberships(id) on delete set null,
    created_by_membership_id uuid references memberships(id) on delete set null,
    item_type varchar(32) not null,
    title text not null,
    status varchar(32) not null default 'awaiting_review',
    priority varchar(16) not null default 'normal',
    payload jsonb not null default '{}'::jsonb,
    due_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    acknowledged_at timestamptz
  );
  create table if not exists work_events (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    workflow_run_id uuid references workflow_runs(id) on delete cascade,
    work_item_id uuid references work_items(id) on delete cascade,
    actor_membership_id uuid references memberships(id) on delete set null,
    event_type varchar(48) not null,
    message text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create table if not exists notifications (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    recipient_membership_id uuid not null references memberships(id) on delete cascade,
    work_item_id uuid references work_items(id) on delete cascade,
    channel varchar(16) not null default 'in_app',
    message text not null,
    read_at timestamptz,
    created_at timestamptz not null default now()
  );
  create table if not exists account_deletion_requests (
    id uuid primary key,
    email text not null,
    reason text,
    status varchar(24) not null default 'requested',
    requested_at timestamptz not null default now()
  );
  create index if not exists idx_memberships_org on memberships(organisation_id);
  create index if not exists idx_work_items_org_status on work_items(organisation_id, status);
  create index if not exists idx_notifications_recipient on notifications(recipient_membership_id, read_at);
  create index if not exists idx_deletion_requests_email on account_deletion_requests(email, requested_at desc);
  create index if not exists idx_sessions_expiry on user_sessions(expires_at);
  create index if not exists idx_time_entries_member on time_entries(membership_id, clocked_in_at desc);
  create index if not exists idx_audit_events_org on audit_events(organisation_id, created_at desc);
  create index if not exists idx_incidents_org on incidents(organisation_id, status);
  create index if not exists idx_scheduled_shifts_member on scheduled_shifts(membership_id, starts_at);
  create index if not exists idx_open_shifts_org_status on open_shifts(organisation_id, status, starts_at);
  create index if not exists idx_announcements_org on announcements(organisation_id, created_at desc);
  create index if not exists idx_community_messages_channel on community_messages(channel_id, created_at desc);
  create index if not exists idx_direct_messages_recipient on direct_messages(recipient_membership_id, created_at desc);
  create table if not exists idempotency_keys (
    id uuid primary key default gen_random_uuid(),
    membership_id uuid not null references memberships(id) on delete cascade,
    organisation_id uuid not null references organisations(id) on delete cascade,
    operation varchar(128) not null,
    client_key varchar(256) not null,
    request_fingerprint text not null,
    status_code integer not null,
    response_body text not null,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '24 hours'),
    unique(membership_id, organisation_id, operation, client_key)
  );
  create index if not exists idx_idempotency_keys_lookup on idempotency_keys(membership_id, organisation_id, operation, client_key);
  create index if not exists idx_idempotency_keys_expiry on idempotency_keys(expires_at);
  create table if not exists app_kv_store (
    store_key varchar(64) primary key,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
  );
  create table if not exists admin_users (
    id uuid primary key,
    email text not null unique,
    full_name text not null,
    role varchar(32) not null,
    title text,
    department text,
    modules text,
    restriction text,
    password_hash text not null,
    mfa_enabled boolean not null default false,
    mfa_secret text,
    mfa_recovery_hashes jsonb not null default '[]'::jsonb,
    status varchar(24) not null default 'ACTIVE',
    failed_attempts integer not null default 0,
    locked_until timestamptz,
    last_login_at timestamptz,
    created_at timestamptz not null default now()
  );
  create table if not exists admin_sessions (
    token_hash text primary key,
    admin_user_id uuid not null references admin_users(id) on delete cascade,
    role varchar(32) not null,
    mfa_verified boolean not null default false,
    step_up_until timestamptz,
    ip_address text,
    user_agent text,
    expires_at timestamptz not null,
    idle_expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default now()
  );
  create index if not exists idx_admin_sessions_user on admin_sessions(admin_user_id, revoked_at, expires_at);
  create table if not exists admin_mfa_challenges (
    challenge_id text primary key,
    admin_user_id uuid not null references admin_users(id) on delete cascade,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
  );
  create table if not exists admin_audit_logs (
    id uuid primary key default gen_random_uuid(),
    actor_admin_id uuid references admin_users(id) on delete set null,
    actor_email text,
    actor_role varchar(32),
    event_type varchar(64) not null,
    target_type varchar(64),
    target_id text,
    ip_address text,
    user_agent text,
    outcome varchar(24) not null,
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create index if not exists idx_admin_audit_logs_created on admin_audit_logs(created_at desc);
  create table if not exists admin_approvals (
    id varchar(32) primary key,
    requested_by_admin_id uuid references admin_users(id) on delete set null,
    requested_by_name text not null,
    summary text not null,
    impact text,
    status varchar(48) not null default 'PENDING OWNER SIGN-OFF',
    decided_by_admin_id uuid references admin_users(id) on delete set null,
    decided_at timestamptz,
    created_at timestamptz not null default now()
  );
  create table if not exists rectification_receipts (
    id varchar(32) primary key,
    worker_name text not null,
    worker_email text not null,
    category text not null,
    details text not null,
    status varchar(48) not null default 'OPEN FOR SUPPORT AUDIT',
    updated_by_admin_id uuid references admin_users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  alter table time_entries add column if not exists face_match_status varchar(48);
  alter table time_entries add column if not exists face_match_confidence integer;
  alter table time_entries add column if not exists face_photo_hash varchar(64);
  alter table time_entries add column if not exists face_match_reason text;
`;

export function databaseConfigured() {
  return Boolean(pool);
}

export async function verifyDatabaseConnection() {
  if (!pool) return false;
  await pool.query('SELECT 1');
  return true;
}

export async function initializeDatabase() {
  if (!pool) return false;
  try {
    await verifyDatabaseConnection();
    await pool.query(schema);
    return true;
  } catch (err) {
    if (isDatabaseConnectionError(err)) {
      console.warn('[DATABASE] Could not connect to remote PostgreSQL database (' + (err.code || err.message) + '). Falling back to resilient local store.');
      return false;
    }
    throw err;
  }
}

export function isDatabaseConnectionError(error) {
  if (!error) return false;
  if (error.message === 'DATABASE_NOT_CONFIGURED') return true;

  const connCodes = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'ENOTFOUND',
    'EPIPE',
    'ENETUNREACH',
    '57P01',
    '57P02',
    '57P03'
  ]);
  if (connCodes.has(error.code)) return true;

  const pgCode = String(error.code || '');
  if (pgCode.startsWith('08')) return true;

  const msg = String(error.message || '').toLowerCase();
  if (
    msg.includes('connection terminated') ||
    msg.includes('connection refused') ||
    msg.includes('failed to connect') ||
    msg.includes('could not connect to server') ||
    msg.includes('timeout exceeded when connecting') ||
    msg.includes('client has already been released') ||
    msg.includes('remaining connection slots are reserved') ||
    msg.includes('database_not_configured')
  ) {
    return true;
  }

  return false;
}

export function isDatabaseConflictError(error) {
  if (!error) return false;
  const pgCode = String(error.code || '');
  return pgCode === '23505' || pgCode === '23503';
}

export function isDatabaseValidationError(error) {
  if (!error) return false;
  const pgCode = String(error.code || '');
  return pgCode === '23514' || pgCode.startsWith('22');
}

export function sanitizeDatabaseError(error) {
  if (isDatabaseConnectionError(error)) {
    return {
      status: 503,
      message: 'Service Unavailable: Database connection error. Please try again shortly.'
    };
  }
  if (isDatabaseConflictError(error)) {
    return {
      status: 409,
      message: 'A conflicting record already exists with these details.'
    };
  }
  if (isDatabaseValidationError(error)) {
    return {
      status: 400,
      message: 'The submitted data is invalid.'
    };
  }
  return {
    status: 500,
    message: 'An internal server error occurred. Please try again.'
  };
}

export const demoOrganisation = {
  id: '00000000-0000-4000-8000-000000000100',
  code: 'RIF-2026',
  siteId: '00000000-0000-4000-8000-000000000101'
};

export const demoMembers = [
  { id: '00000000-0000-4000-8000-000000000001', staffId: 'RIF-0001', name: 'Sherif Akanmu', email: 'sherif@riffmax.tech', role: 'owner', title: 'Managing Director & CEO', department: 'Executive Directorate', bank: 'GTBank', account: '0121000001', grossPay: 1200000 },
  { id: '00000000-0000-4000-8000-000000000002', staffId: 'RIF-0002', name: 'Olaide Emmanuela', email: 'olaide@riffmax.tech', role: 'supervisor', title: 'Chief Operating Officer & Shift Supervisor', department: 'Operations Leadership', bank: 'GTBank', account: '0121000002', grossPay: 750000 },
  { id: '00000000-0000-4000-8000-000000000003', staffId: 'RIF-0003', name: 'Babatunde Adeleke', email: 'babatunde@riffmax.tech', role: 'outgoing', title: 'Lead Frontend Systems Engineer', department: 'Engineering Core', bank: 'GTBank', account: '0121000003', grossPay: 650000 },
  { id: '00000000-0000-4000-8000-000000000004', staffId: 'RIF-0004', name: 'Chidinma Okonjo', email: 'chidinma@riffmax.tech', role: 'incoming', title: 'Lead Mobile Native Engineer', department: 'Engineering Core', bank: 'GTBank', account: '0121000004', grossPay: 600000 },
  { id: '00000000-0000-4000-8000-000000000005', staffId: 'RIF-0005', name: 'Tariq Al-Hassan', email: 'tariq@riffmax.tech', role: 'worker', title: 'Principal Distributed Backend Engineer', department: 'Engineering Core', bank: 'GTBank', account: '0121000005', grossPay: 650000 },
  { id: '00000000-0000-4000-8000-000000000006', staffId: 'RIF-0006', name: 'Ngozi Eze', email: 'ngozi@riffmax.tech', role: 'worker', title: 'Lead QA & Security Specialist', department: 'Engineering Core', bank: 'GTBank', account: '0121000006', grossPay: 550000 },
  { id: '00000000-0000-4000-8000-000000000007', staffId: 'RIF-0007', name: 'Farouk Bello', email: 'farouk@riffmax.tech', role: 'worker', title: 'DevOps & Site Reliability Engineer', department: 'Engineering Core', bank: 'GTBank', account: '0121000007', grossPay: 580000 },
  { id: '00000000-0000-4000-8000-000000000008', staffId: 'RIF-0008', name: 'Folake Balogun', email: 'folake@riffmax.tech', role: 'worker', title: 'Product Regulatory & Labor Law Specialist', department: 'Legal & Regulatory Compliance', bank: 'GTBank', account: '0121000008', grossPay: 540000 },
  { id: '00000000-0000-4000-8000-000000000009', staffId: 'RIF-0009', name: 'Kelechi Nnamdi', email: 'kelechi@riffmax.tech', role: 'worker', title: 'Lead UI/UX Systems Designer', department: 'Branding & Creative Design', bank: 'GTBank', account: '0121000009', grossPay: 520000 },
  { id: '00000000-0000-4000-8000-000000000010', staffId: 'RIF-0010', name: 'Zainab Abubakar', email: 'zainab@riffmax.tech', role: 'worker', title: 'Customer Success & Field Ops Lead', department: 'Advertising & Growth Marketing', bank: 'GTBank', account: '0121000010', grossPay: 480000 },
  { id: '00000000-0000-4000-8000-000000000011', staffId: 'RIF-0011', name: 'Damilola Fashola', email: 'damilola@riffmax.tech', role: 'worker', title: 'Data Platform & Payroll Telemetry Engineer', department: 'Human Resources & People Ops', bank: 'GTBank', account: '0121000011', grossPay: 520000 },
  { id: '00000000-0000-4000-8000-000000000012', staffId: 'RIF-0012', name: 'Ibrahim Yusuf', email: 'ibrahim@riffmax.tech', role: 'worker', title: 'Systems Integrations Specialist', department: 'Engineering Core', bank: 'GTBank', account: '0121000012', grossPay: 500000 },
  { id: '00000000-0000-4000-8000-000000000013', staffId: 'RIF-0013', name: 'Adanna Adeleke', email: 'adanna@riffmax.tech', role: 'worker', title: 'Brand Identity & Visual Director', department: 'Branding & Creative Design', bank: 'GTBank', account: '0121000013', grossPay: 540000 },
  { id: '00000000-0000-4000-8000-000000000014', staffId: 'RIF-0014', name: 'Simi Balogun', email: 'simi@riffmax.tech', role: 'worker', title: 'Motion Media & Interactive Onboarding Designer', department: 'Branding & Creative Design', bank: 'GTBank', account: '0121000014', grossPay: 490000 },
  { id: '00000000-0000-4000-8000-000000000015', staffId: 'RIF-0015', name: 'Tunde Bakare', email: 'tunde@riffmax.tech', role: 'worker', title: 'Head of Growth Marketing & Acquisition', department: 'Advertising & Growth Marketing', bank: 'GTBank', account: '0121000015', grossPay: 560000 },
  { id: '00000000-0000-4000-8000-000000000016', staffId: 'RIF-0016', name: 'Amara Okeke', email: 'amara@riffmax.tech', role: 'worker', title: 'Brand Storyteller & Content Marketing Lead', department: 'Advertising & Growth Marketing', bank: 'GTBank', account: '0121000016', grossPay: 480000 },
  { id: '00000000-0000-4000-8000-000000000017', staffId: 'RIF-0017', name: 'Femi Otedola-Coker', email: 'femi@riffmax.tech', role: 'worker', title: 'Head of Strategic Finance & Investor Relations', department: 'Business Strategy & Investor Relations', bank: 'GTBank', account: '0121000017', grossPay: 620000 },
  { id: '00000000-0000-4000-8000-000000000018', staffId: 'RIF-0018', name: 'Chidinma Kalu', email: 'kalu@riffmax.tech', role: 'worker', title: 'Enterprise Commercial & B2B Partnerships Lead', department: 'Business Strategy & Investor Relations', bank: 'GTBank', account: '0121000018', grossPay: 550000 },
  { id: '00000000-0000-4000-8000-000000000019', staffId: 'RIF-0019', name: 'Barrister Yetunde Williams', email: 'yetunde@riffmax.tech', role: 'worker', title: 'General Counsel & Data Protection Officer', department: 'Legal & Regulatory Compliance', bank: 'GTBank', account: '0121000019', grossPay: 650000 },
  { id: '00000000-0000-4000-8000-000000000020', staffId: 'RIF-0020', name: 'Blessing Nwachukwu', email: 'blessing@riffmax.tech', role: 'worker', title: 'Head of People & Talent Operations', department: 'Human Resources & People Ops', bank: 'GTBank', account: '0121000020', grossPay: 520000 },
  { id: '00000000-0000-4000-8000-000000000021', staffId: 'RIF-0021', name: 'Emeka Obinna', email: 'emeka@riffmax.tech', role: 'worker', title: 'Facilities & Workplace Infrastructure Manager', department: 'Facilities & Workplace Security', bank: 'GTBank', account: '0121000021', grossPay: 450000 },
  { id: '00000000-0000-4000-8000-000000000022', staffId: 'RIF-0022', name: 'Sergeant Musa Danjuma', email: 'musa@riffmax.tech', role: 'worker', title: 'Chief Physical Security Officer & Hub Access Guard', department: 'Facilities & Workplace Security', bank: 'GTBank', account: '0121000022', grossPay: 420000 },
  { id: '00000000-0000-4000-8000-000000000023', staffId: 'RIF-0023', name: 'Suleiman Bello', email: 'suleiman@riffmax.tech', role: 'worker', title: 'Shift Security Guard (Perimeter Patrol)', department: 'Facilities & Workplace Security', bank: 'GTBank', account: '0121000023', grossPay: 350000 },
  { id: '00000000-0000-4000-8000-000000000024', staffId: 'RIF-0024', name: 'Chioma Anyanwu', email: 'chioma@riffmax.tech', role: 'worker', title: 'Office Concierge & Frontline Hospitality Lead', department: 'Facilities & Workplace Security', bank: 'GTBank', account: '0121000024', grossPay: 380000 }
];

// Matches Riffmax2026! using ShiftRelay's scrypt format (salt:hex). Override via SHIFTRELAY_DEMO_MEMBER_PASS.
export const DEFAULT_DEMO_MEMBER_PASSWORD_HASH = '7b31e66ba6e49c68372e58d0a00829d3:a5e2489fa6f3841ee9c8099bf3425c808ebd1ae72ac18fd7d188eb9a2daf728198fa664db814cbd38b16b81a6ad7f2edf39bf0ecbfd8a4863931aeaf1c35d96a';

async function resolveDemoMemberPasswordHash() {
  const override = String(process.env.SHIFTRELAY_DEMO_MEMBER_PASS || '').trim();
  if (!override) return DEFAULT_DEMO_MEMBER_PASSWORD_HASH;
  const { randomBytes, scryptSync } = await import('node:crypto');
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(override, salt, 64).toString('hex')}`;
}

export async function seedDemoOrganisation() {
  if (!pool) return;
  const demoPasswordHash = await resolveDemoMemberPasswordHash();
  await query('insert into organisations (id, organisation_code, legal_name, trading_name, work_email, industry, country, time_zone, verification_status) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict (id) do nothing', [demoOrganisation.id, demoOrganisation.code, 'Riffmax Technology Limited', 'Riffmax Technology', 'sherif@riffmax.tech', 'Enterprise SaaS & Workforce DeepTech', 'Nigeria', 'Africa/Lagos', 'verified']);
  await query('insert into organisation_sites (id, organisation_id, name, address, time_zone) values ($1, $2, $3, $4, $5) on conflict (id) do nothing', [demoOrganisation.siteId, demoOrganisation.id, 'Riffmax Software Engineering Hub', 'Victoria Island / Lekki Tech Corridor, Lagos, Nigeria', 'Africa/Lagos']);
  for (const member of demoMembers) {
    const existing = await query(
      'select id, password_hash from portal_users where id = $1 or lower(email) = lower($2) limit 1',
      [member.id, member.email]
    );
    let userId = member.id;
    if (existing.rows[0]) {
      userId = existing.rows[0].id;
      if (!existing.rows[0].password_hash) {
        await query(
          'update portal_users set password_hash = $1, email_verified = true where id = $2',
          [demoPasswordHash, userId]
        );
      }
    } else {
      await query(
        'insert into portal_users (id, full_name, email, password_hash, email_verified) values ($1, $2, $3, $4, true) on conflict (id) do update set password_hash = coalesce(portal_users.password_hash, excluded.password_hash), email_verified = true',
        [member.id, member.name, member.email, demoPasswordHash]
      );
    }
    await query(
      `insert into memberships (id, organisation_id, user_id, site_id, role, title, department, staff_code, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (organisation_id, user_id) do update
       set status = case when memberships.status = 'revoked' then 'revoked' else 'active' end,
           staff_code = coalesce(memberships.staff_code, excluded.staff_code),
           title = coalesce(nullif(memberships.title, ''), excluded.title),
           department = coalesce(nullif(memberships.department, ''), excluded.department)`,
      [member.id, demoOrganisation.id, userId, demoOrganisation.siteId, member.role, member.title, member.department, member.staffId, 'active']
    );
  }
}

export async function query(text, values = []) {
  if (!pool) throw new Error('DATABASE_NOT_CONFIGURED');
  return pool.query(text, values);
}

export async function closeDatabase() {
  if (pool) await pool.end();
}
