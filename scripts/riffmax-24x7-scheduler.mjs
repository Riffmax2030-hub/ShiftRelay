import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({ host: '127.0.0.1', port: 54329, database: 'paperclip', user: 'paperclip', password: 'paperclip' });

const COMPANY_ID = '61140a76-566e-4477-af9a-6db288aaa51d';

console.log('[Riffmax 24/7 Scheduler] Autonomous Standing Loop started (Mon-Sun 24/7).');

async function triggerScheduledAudit(routineId, title, assigneeId) {
  console.log(`[Riffmax 24/7] Triggering scheduled execution: ${title}...`);
  try {
    const res = await fetch(`http://127.0.0.1:3100/api/agents/${assigneeId}/heartbeat/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wakeReason: 'cron_routine',
        routineId
      })
    });
    const data = await res.json();
    console.log(`[Riffmax 24/7] Agent invoked (Run ID: ${data.id})`);
  } catch (err) {
    console.error(`[Riffmax 24/7] Error triggering routine ${title}:`, err.message);
  }
}

// Check every 60 seconds
let lastCheckedMinute = -1;

setInterval(async () => {
  const now = new Date();
  // WAT is UTC+1
  const watHour = (now.getUTCHours() + 1) % 24;
  const watMinute = now.getUTCMinutes();

  if (watMinute === lastCheckedMinute) return;
  lastCheckedMinute = watMinute;

  // 1. Morning 08:00 WAT
  if (watHour === 8 && watMinute === 0) {
    const r = await sql`SELECT id, assignee_agent_id FROM routines WHERE company_id = ${COMPANY_ID} AND title LIKE '%08:00%'`;
    if (r.length) await triggerScheduledAudit(r[0].id, 'Morning Health Audit', r[0].assignee_agent_id);
  }

  // 2. Midday 13:00 WAT
  if (watHour === 13 && watMinute === 0) {
    const r = await sql`SELECT id, assignee_agent_id FROM routines WHERE company_id = ${COMPANY_ID} AND title LIKE '%13:00%'`;
    if (r.length) await triggerScheduledAudit(r[0].id, 'Midday Anomaly Sweep', r[0].assignee_agent_id);
  }

  // 3. Evening 18:00 WAT
  if (watHour === 18 && watMinute === 0) {
    const r = await sql`SELECT id, assignee_agent_id FROM routines WHERE company_id = ${COMPANY_ID} AND title LIKE '%18:00%'`;
    if (r.length) await triggerScheduledAudit(r[0].id, 'Evening Shift Reconciliation', r[0].assignee_agent_id);
  }

  // 4. Midnight 00:00 WAT
  if (watHour === 0 && watMinute === 0) {
    const r = await sql`SELECT id, assignee_agent_id FROM routines WHERE company_id = ${COMPANY_ID} AND title LIKE '%00:00%'`;
    if (r.length) await triggerScheduledAudit(r[0].id, 'Midnight Security Verification', r[0].assignee_agent_id);
  }
}, 60000);
