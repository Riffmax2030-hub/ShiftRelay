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
      num: 23,
      title: 'Mobile Top-Bar De-Collision, Search Input Polish & Dedicated Supervisor Mode Bar',
      description: 'Remove the overlapping floating theme button on 430px viewports, place the [My Shift ⇄ Supervisor Mode] switcher into a clean responsive sub-header bar on mobile, and fix search icon padding in My Team.',
      priority: 'high',
      assignee: agentMap['Babatunde Adeleke'] || null
    },
    {
      num: 24,
      title: 'Supervisor Drag-and-Drop Shift Assignment Calendar & Time Selector Modal',
      description: 'Enable Shift Supervisors and Executives to drag any worker chip from the staff dock and drop them onto any date cell on the interactive calendar, immediately opening a Shift Time & Station modal (Morning/Afternoon/Night presets or custom start/end time) to save and sync across Worker schedules.',
      priority: 'urgent',
      assignee: agentMap['Babatunde Adeleke'] || null
    },
    {
      num: 25,
      title: 'Re-Architect Worker 3. Schedule (Purge Dev Mode Banner + Sync Drag-and-Drop Roster)',
      description: 'Remove the yellow Dev mode banner in Worker Schedule and render a 7-Day Visual Shift Strip + Assigned Shift Cards synced live with the Supervisor drag-and-drop calendar.',
      priority: 'high',
      assignee: agentMap['Kelechi Nnamdi'] || null
    },
    {
      num: 26,
      title: 'Re-Architect 2. Handover into Live Incoming Briefing & 3-Tap Outgoing Shift Baton',
      description: 'Replace the empty handover state with an interactive Incoming Shift Briefing (1-tap Acknowledge & Take Over) and a layman-friendly 3-pill Outgoing Handover builder.',
      priority: 'high',
      assignee: agentMap['Kelechi Nnamdi'] || null
    },
    {
      num: 27,
      title: 'Re-Architect 5. Profile into Official Digital Worker ID Badge, Gate QR Pass & Payroll Wallet',
      description: 'Replace the social-media CV resume in 5. Profile with an Industrial Digital Worker ID Badge, scannable Gate QR Pass, Verified Bank & Statutory Wallet (GTBank/PenCom/PAYE), and App Appearance controls.',
      priority: 'high',
      assignee: agentMap['Simi Balogun'] || null
    },
    {
      num: 28,
      title: 'Upgrade Supervisor 3. Approvals Queue + Hydrate Executive 2. Payroll & Fix 5. Governance Crash',
      description: 'Add 1-tap Shift Swap & Timecard Override approvals for Supervisors, hydrate Executive 2. Payroll with Riffmax ₦13.92M verified ledger, and fix the goals.filter crash in Executive 5. Governance.',
      priority: 'urgent',
      assignee: agentMap['Tariq Al-Hassan'] || null
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
        ) VALUES ($1, $2, $3, $4, $5, $6, 'in_progress', $7, $8, NOW(), NOW())`,
        [COMPANY_ID, PROJECT_ID, iss.num, identifier, iss.title, iss.description, iss.priority, iss.assignee]
      );
      console.log(`Created ${identifier}: ${iss.title}`);
    } else {
      await client.query(
        `UPDATE issues SET title = $1, description = $2, status = 'in_progress', updated_at = NOW() WHERE id = $3`,
        [iss.title, iss.description, existing.rows[0].id]
      );
      console.log(`Updated ${identifier}`);
    }
  }

  await client.query(
    `UPDATE companies SET issue_counter = GREATEST(issue_counter, 28) WHERE id = $1`,
    [COMPANY_ID]
  );

  await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
