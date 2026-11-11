import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';
import crypto from 'node:crypto';

const sql = postgres({ host: '127.0.0.1', port: 54329, database: 'paperclip', user: 'paperclip', password: 'paperclip' });

const COMPANY_ID = '61140a76-566e-4477-af9a-6db288aaa51d'; // RIFA

async function main() {
  console.log('--- Setting up 24/7 Monday-to-Sunday Automated Enterprise Routines ---');

  const agents = await sql`SELECT id, name FROM agents WHERE company_id = ${COMPANY_ID}`;
  const agentMap = new Map();
  for (const a of agents) {
    agentMap.set(a.name.toLowerCase().trim(), a.id);
  }

  const ngoziId = agentMap.get('ngozi eze');
  const faroukId = agentMap.get('farouk bello');
  const olaideId = agentMap.get('olaide emmanuela');
  const musaId = agentMap.get('sergeant musa danjuma');

  const routinesConfig = [
    {
      title: 'Daily 08:00 WAT Core Health & 48-Route Audit',
      description: 'Autonomous daily test runner: executes full 48-route assertions against ShiftRelay on port 4000, verifies database connection pool, and compiles morning telemetry for the Executive Director.',
      assignee_agent_id: ngoziId,
      cron_expression: '0 8 * * *', // Daily at 08:00 WAT
      label: 'Daily Morning Audit (Mon-Sun 08:00 WAT)'
    },
    {
      title: 'Midday 13:00 WAT Anomaly & Error Triage',
      description: 'Autonomous afternoon error sweep: monitors geofence punch telemetry, scans logs for GPS drift alerts or timeout spikes, and drafts hotfix RFCs if anomalies exceed threshold.',
      assignee_agent_id: faroukId,
      cron_expression: '0 13 * * *', // Daily at 13:00 WAT
      label: 'Midday Log & Anomaly Sweep (Mon-Sun 13:00 WAT)'
    },
    {
      title: 'Evening 18:00 WAT Shift Attendance & Handover Reconciliation',
      description: 'Autonomous end-of-shift reconciliation: verifies all 24 team members completed shift clock-outs without orphan punches, checks supervisor handovers, and compiles the Founder Evening Synthesis.',
      assignee_agent_id: olaideId,
      cron_expression: '0 18 * * *', // Daily at 18:00 WAT
      label: 'Evening Handover Reconciliation (Mon-Sun 18:00 WAT)'
    },
    {
      title: 'Midnight 00:00 WAT Facility Security & Perimeter Verification',
      description: 'Autonomous night security scan: audits Victoria Island gate QR scans, CCTV perimeter logs, and verifies that facility power and fiber redundancy are operating at 99.99% uptime.',
      assignee_agent_id: musaId,
      cron_expression: '0 0 * * *', // Daily at 00:00 WAT
      label: 'Midnight Facility & Perimeter Guard (Mon-Sun 00:00 WAT)'
    }
  ];

  for (const r of routinesConfig) {
    const existing = await sql`SELECT id FROM routines WHERE company_id = ${COMPANY_ID} AND title = ${r.title}`;
    let routineId;

    if (!existing.length) {
      routineId = crypto.randomUUID();
      await sql`
        INSERT INTO routines (
          id, company_id, title, description, assignee_agent_id, priority, status,
          concurrency_policy, catch_up_policy, created_by_user_id, responsible_user_id,
          variables, latest_revision_number, origin_kind, activity_gate_policy, activity_gate_scope,
          created_at, updated_at
        ) VALUES (
          ${routineId}, ${COMPANY_ID}, ${r.title}, ${r.description}, ${r.assignee_agent_id}, 'high', 'active',
          'queue', 'skip', 'local-board', 'local-board',
          '{}'::jsonb, 1, 'manual', 'allow_all', 'company',
          NOW(), NOW()
        )
      `;
      console.log(`Created routine: ${r.title} (${routineId})`);
    } else {
      routineId = existing[0].id;
      console.log(`Routine already exists: ${r.title}`);
    }

    // Insert or update trigger
    const existingTrigger = await sql`SELECT id FROM routine_triggers WHERE company_id = ${COMPANY_ID} AND routine_id = ${routineId}`;
    if (!existingTrigger.length) {
      const triggerId = crypto.randomUUID();
      await sql`
        INSERT INTO routine_triggers (
          id, company_id, routine_id, kind, label, enabled, cron_expression, timezone,
          created_by_user_id, created_at, updated_at
        ) VALUES (
          ${triggerId}, ${COMPANY_ID}, ${routineId}, 'cron', ${r.label}, true, ${r.cron_expression}, 'Africa/Lagos',
          'local-board', NOW(), NOW()
        )
      `;
      console.log(`  Added 24/7 trigger: ${r.label} (${r.cron_expression})`);
    } else {
      console.log(`  Trigger already active for routine: ${r.title}`);
    }
  }

  console.log('\n--- ALL 24/7 ENTERPRISE ROUTINES AND TRIGGERS ARE ACTIVE IN PAPERCLIP ---');
  await sql.end();
}

main();
