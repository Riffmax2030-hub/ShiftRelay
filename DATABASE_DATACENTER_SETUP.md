# ShiftRelay Enterprise Data Center & Database Infrastructure Architecture
## Global Operational Engine for 2.7 Billion Frontline Workers

---

### 1. Executive Architecture Overview

ShiftRelay operates at the intersection of **mission-critical operational reliability** (e.g., intensive care hospital triage, aviation ground logistics, pharmaceutical cold-chains) and **high-throughput frontline social networking** (daily check-in streaks, photo/video media feeds, peer skill endorsements).

```
                      [Global Route53 / Cloudflare Edge DNS]
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
[Americas Edge: us-east-1]     [EMEA Edge: eu-central-1]    [APAC Edge: ap-southeast-1]
  Cloudflare CDN & WAF           Cloudflare CDN & WAF         Cloudflare CDN & WAF
           │                            │                            │
           ▼                            ▼                            ▼
[ECS Fargate Web Engine]       [ECS Fargate Web Engine]     [ECS Fargate Web Engine]
           │                            │                            │
           └────────────────────────────┼────────────────────────────┘
                                        │
                         [PgBouncer Connection Pooler]
                               (Max 10,000 Conns)
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           ▼                                                         ▼
[Primary Multi-AZ Aurora PG16]                             [Global Read Replicas]
   (Write Transactions & Handover Relays)                     (Feed Streams & Passports)
           │                                                         │
           ▼                                                         ▼
[Cloudflare R2 / AWS S3 Object Storage]                   [ElastiCache Redis Pub/Sub]
   (Binary Videos, Shift Photos, Avatars)                    (Live Shift Handovers & Chat)
```

---

### 2. Multi-Region Database Architecture

#### Recommended Managed Providers
| Cloud Provider | Service | Target Capacity | Purpose |
|---|---|---|---|
| **AWS** | Aurora Serverless v2 PostgreSQL 16 | Multi-AZ (Automatic failover < 30s) | Enterprise scale, HIPAA & SOC 2 compliance |
| **Supabase** | Dedicated Team / Enterprise Compute | Multi-Region Read Replicas | Instant Realtime CDC & Row-Level Security |
| **Neon** | Serverless PostgreSQL with Autoscaling | Instant branching & point-in-time recovery | Low idle cost + burst scalability |

#### Connection Pooling Specification (PgBouncer)
During shift changeover spikes (07:00, 15:00, 23:00 local time), thousands of workers clock in simultaneously. Direct database connections will exhaust RAM. PgBouncer in **Transaction Pooling Mode** enables 10,000 client connections to share 100 actual PostgreSQL backend workers:

```ini
[databases]
shiftrelay_prod = host=primary.postgres.internal port=5432 dbname=shiftrelay_prod

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 10000
default_pool_size = 80
min_pool_size = 20
reserve_pool_size = 10
reserve_pool_timeout = 5
max_db_connections = 120
```

---

### 3. Media & Video Data Center Architecture (Like Facebook/X)

Frontline workers upload high-definition video walkthroughs and shift changeover photos. Traditional file servers fail under heavy binary egress costs.

#### Storage Architecture
1. **Cloudflare R2 / AWS S3**:
   - Zero egress bandwidth fees on Cloudflare R2 ($0.015/GB storage).
   - Presigned direct upload URLs from browser straight to S3/R2 bucket to avoid bottlenecking application servers.
2. **Video Streaming Optimization**:
   - HTTP Range 206 Partial Content enabled on node servers (implemented in `server.mjs`).
   - Browser chunk streaming: MP4 fast-start (`moov` atom at the beginning of the file) for instant 0-second video playback before download finishes.
   - For scale > 50,000 daily videos: integrate AWS Elemental MediaConvert / FFmpeg worker cluster to generate HLS (`.m3u8`) multi-bitrate streams (360p, 720p, 1080p).

---

### 4. Tenant Isolation & Row-Level Security (RLS)

ShiftRelay provides an unbreachable multi-tenant architecture where organizations and workers only see their authorized domain:

```sql
-- Enable Row Level Security on all operational tables
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policy
CREATE POLICY tenant_isolation_work_items ON work_items
  FOR ALL
  USING (organisation_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY tenant_isolation_time_entries ON time_entries
  FOR ALL
  USING (organisation_id = current_setting('app.current_org_id')::uuid);
```

---

### 5. Production Environment Variables Reference (`.env.production`)

```env
# Runtime
NODE_ENV=production
PORT=4000

# High-Availability Database via PgBouncer
DATABASE_URL=postgres://shiftrelay_app:SuperSecretPassword123@pgbouncer.internal:6432/shiftrelay_prod?sslmode=require

# Real-Time WebSocket Pub/Sub Cluster
REDIS_URL=rediss://default:RedisSecretToken@redis-cluster.internal:6379

# Cloudflare R2 / AWS S3 Binary Media Storage
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=shiftrelay-media-production
S3_ACCESS_KEY_ID=r2_access_key_placeholder
S3_SECRET_ACCESS_KEY=r2_secret_key_placeholder
CDN_PUBLIC_DOMAIN=https://media.shiftrelay.io

# AI Shift Summarizer & Handover Parsing
OPENAI_API_KEY=sk-proj-your-production-openai-key
OPENAI_MODEL=gpt-4o-mini
```

---

### 6. Automated Backup & Disaster Recovery (DR)

- **Continuous WAL Archiving**: Point-in-time recovery (PITR) with 5-minute granularity for 35 days.
- **Daily Automated Snapshots**: Stored in secondary geographic region (e.g., EU backup replicated to US).
- **RTO (Recovery Time Objective)**: < 15 minutes.
- **RPO (Recovery Point Objective)**: < 1 minute of transactional data.
