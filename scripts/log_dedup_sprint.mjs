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
      num: 44,
      title: 'Executive Push to Finance: Consolidation of Duplicate Banking & Statutory Remittance Downloads',
      description: 'Unified the two stacked duplicate cards in renderPushToFinance into a single Statutory Banking & Remittance Schedules hub. Removed duplicate Bank CSV download buttons and replaced them with exactly two clearly differentiated targets: Bank Disbursement CSV and PAYE & PenCom CSV.',
      priority: 'high',
      assignee: agentMap['Simi Balogun'] || null
    },
    {
      num: 45,
      title: 'Supervisor Live Floor: Realignment of Audit Exports to Shift Attendance Timesheet CSV',
      description: 'Removed misplaced Batch Payroll Ledger CSV export from the supervisor live floor (renderManagerOverview) where payroll does not belong. Replaced with Shift Attendance Audit CSV exporting verified floor presence, regular and overtime hours, and station assignments.',
      priority: 'high',
      assignee: agentMap['Kelechi Nnamdi'] || null
    },
    {
      num: 46,
      title: 'Frontline Worker: Polish of "When I am out" Clocked-Out State and Elimination of Duplicate GPS Punch',
      description: 'Removed redundant GPS Verify chip below the main thumbprint CLOCK IN button in renderWorkerToday. Made top header status dot dynamic (green when on shift, neutral grey when off duty). Added verified completed shift state celebrating total logged hours when clocked out.',
      priority: 'high',
      assignee: agentMap['Babatunde Adeleke'] || null
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
    `UPDATE companies SET issue_counter = GREATEST(issue_counter, 46) WHERE id = $1`,
    [COMPANY_ID]
  );

  await client.end();
  console.log('Paperclip sprint sync complete!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
