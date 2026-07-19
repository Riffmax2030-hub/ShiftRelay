import pg from 'pg';
import { readFileSync } from 'node:fs';

const { Pool } = pg;

function loadEnvironment() {
  try {
    for (const entry of readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const match = entry.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {}
}

loadEnvironment();
const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : undefined }) : null;

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
  create table if not exists time_entries (
    id uuid primary key,
    organisation_id uuid not null references organisations(id) on delete cascade,
    membership_id uuid not null references memberships(id) on delete cascade,
    clocked_in_at timestamptz not null,
    clocked_out_at timestamptz,
    note text,
    created_at timestamptz not null default now()
  );
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
  create index if not exists idx_memberships_org on memberships(organisation_id);
  create index if not exists idx_work_items_org_status on work_items(organisation_id, status);
  create index if not exists idx_notifications_recipient on notifications(recipient_membership_id, read_at);
  create index if not exists idx_sessions_expiry on user_sessions(expires_at);
  create index if not exists idx_time_entries_member on time_entries(membership_id, clocked_in_at desc);
  create index if not exists idx_audit_events_org on audit_events(organisation_id, created_at desc);
  create index if not exists idx_incidents_org on incidents(organisation_id, status);
  create index if not exists idx_scheduled_shifts_member on scheduled_shifts(membership_id, starts_at);
`;

export function databaseConfigured() {
  return Boolean(pool);
}

export async function initializeDatabase() {
  if (!pool) return false;
  await pool.query(schema);
  return true;
}

export const demoOrganisation = {
  id: '00000000-0000-4000-8000-000000000100',
  code: 'SR-GLOBAL-01',
  siteId: '00000000-0000-4000-8000-000000000101'
};

export const demoMembers = [
  { id: '00000000-0000-4000-8000-000000000011', name: 'Amina Otieno', email: 'amina@shiftrelay.demo', role: 'outgoing', title: 'Operations worker', department: 'Operations' },
  { id: '00000000-0000-4000-8000-000000000012', name: 'David Kariuki', email: 'david@shiftrelay.demo', role: 'supervisor', title: 'Shift supervisor', department: 'Operations' },
  { id: '00000000-0000-4000-8000-000000000013', name: 'Faith Wanjiku', email: 'faith@shiftrelay.demo', role: 'incoming', title: 'Incoming worker', department: 'Operations' },
  { id: '00000000-0000-4000-8000-000000000014', name: 'Jordan Lee', email: 'jordan@shiftrelay.demo', role: 'owner', title: 'Organisation owner', department: 'Leadership' }
];

export async function seedDemoOrganisation() {
  if (!pool) return;
  await query('insert into organisations (id, organisation_code, legal_name, trading_name, work_email, industry, country, time_zone, verification_status) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict (id) do nothing', [demoOrganisation.id, demoOrganisation.code, 'ShiftRelay Global Demo Organisation', 'ShiftRelay Global', 'owner@shiftrelay.demo', 'Operations', 'Global', 'UTC', 'verified']);
  await query('insert into organisation_sites (id, organisation_id, name, address, time_zone) values ($1, $2, $3, $4, $5) on conflict (id) do nothing', [demoOrganisation.siteId, demoOrganisation.id, 'Global Operations Hub', 'Remote and multi-site', 'UTC']);
  for (const member of demoMembers) {
    await query('insert into portal_users (id, full_name, email, email_verified) values ($1, $2, $3, true) on conflict (id) do nothing', [member.id, member.name, member.email]);
    await query('insert into memberships (id, organisation_id, user_id, site_id, role, title, department, status) values ($1, $2, $1, $3, $4, $5, $6, $7) on conflict (id) do nothing', [member.id, demoOrganisation.id, demoOrganisation.siteId, member.role, member.title, member.department, 'active']);
  }
}

export async function query(text, values = []) {
  if (!pool) throw new Error('DATABASE_NOT_CONFIGURED');
  return pool.query(text, values);
}

export async function closeDatabase() {
  if (pool) await pool.end();
}
