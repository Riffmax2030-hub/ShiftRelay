import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '127.0.0.1',
  port: 54329,
  user: 'paperclip',
  password: 'paperclip',
  database: 'paperclip'
});

const COMPANY_ID = '61140a76-566e-4477-af9a-6db288aaa51d';
const PROJECT_ID = '04957c3a-5018-4697-a765-d592a5c55c98';

async function run() {
  await client.connect();

  const agentsRes = await client.query(
    `SELECT id, name, role FROM agents WHERE company_id = $1`,
    [COMPANY_ID]
  );
  const agentMap = {};
  for (const a of agentsRes.rows) {
    agentMap[a.name] = a.id;
  }

  const issues = [
    {
      num: 50,
      title: 'Rewards Center UX Overhaul: 7-Day Streak Meter, Frontline Merit Badges & Instant Nigerian Bank Settlement',
      description: 'Gamified frontline shift compliance with a 7-day on-time punctuality streak meter (+50 PTS bonus), minted merit badge gallery (Punctuality Master, Safety First Champion, Zero Context Loss, 10-Year Track), and upgraded instant cash redemption prefilling verified Nigerian bank accounts (Zenith Bank NIP Direct).',
      priority: 'high',
      assignee: agentMap['Babatunde Adeleke'] || null
    },
    {
      num: 51,
      title: 'Salary Pay Pages Harmonization, Official Nigerian Payslip Modal & Backend Database Persistence',
      description: 'Structured Worker Earnings into a 3-tab model switcher (Monthly Salary & Accrual, Hourly Shifts & Overtime, Frontline Star Rewards) with an official Nigerian Payslip modal (PEN-NG-770182, TIN 23019847-0001, verified seal stamp). Connected and persisted frontline shift tasks to disk via /api/shift-tasks/toggle and /api/shift-tasks/add.',
      priority: 'high',
      assignee: agentMap['Simi Balogun'] || null
    }
  ];

  for (const iss of issues) {
    const identifier = `RIFA-${iss.num}`;
    const existing = await client.query(
      `SELECT id FROM issues WHERE company_id = $1 AND identifier = $2`,
      [COMPANY_ID, identifier]
    );

    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO issues (
          company_id, project_id, issue_number, identifier, title, description,
          status, priority, assignee_agent_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'done', $7, $8, NOW(), NOW())`,
        [COMPANY_ID, PROJECT_ID, iss.num, identifier, iss.title, iss.description, iss.priority, iss.assignee]
      );
      console.log(`Created & Completed ${identifier}: ${iss.title}`);
    } else {
      await client.query(
        `UPDATE issues SET
          title = $1, description = $2, status = 'done', updated_at = NOW()
         WHERE id = $3`,
        [iss.title, iss.description, existing.rows[0].id]
      );
      console.log(`Updated & Marked Done ${identifier}: ${iss.title}`);
    }
  }

  await client.query(
    `UPDATE companies SET issue_counter = GREATEST(issue_counter, 51) WHERE id = $1`,
    [COMPANY_ID]
  );

  await client.end();
  console.log('Paperclip sprint sync for RIFA-50 & RIFA-51 complete!');
}

run().catch(console.error);
