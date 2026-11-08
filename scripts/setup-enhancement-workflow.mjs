import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';
import crypto from 'node:crypto';

const sql = postgres({ host: '127.0.0.1', port: 54329, database: 'paperclip', user: 'paperclip', password: 'paperclip' });

const COMPANY_ID = '61140a76-566e-4477-af9a-6db288aaa51d'; // RIFA

async function main() {
  console.log('--- 1. Fetching Key Agents in RIFA ---');
  const agents = await sql`SELECT id, name, role, title FROM agents WHERE company_id = ${COMPANY_ID}`;
  const agentMap = new Map();
  for (const a of agents) {
    agentMap.set(a.name.toLowerCase().trim(), a.id);
  }

  const ceoId = agentMap.get('sherif akanmu');
  const cooId = agentMap.get('olaide emmanuela');
  const tariqId = agentMap.get('tariq al-hassan');
  const ngoziId = agentMap.get('ngozi eze');
  const faroukId = agentMap.get('farouk bello');
  const kelechiId = agentMap.get('kelechi nnamdi');
  const adannaId = agentMap.get('adanna adeleke');

  console.log(`Key Agents Found:
  CEO/Executive Director: ${ceoId}
  COO: ${cooId}
  Principal Backend: ${tariqId}
  QA & Security Lead: ${ngoziId}
  DevOps/SRE: ${faroukId}
  Lead UI/UX Designer: ${kelechiId}
  `);

  console.log('--- 2. Registering Enterprise Skills in company_skills ---');
  const skillsData = [
    {
      key: 'riffmax/shiftrelay-function-testing',
      slug: 'shiftrelay-function-testing',
      name: 'ShiftRelay Daily Function & Health Testing',
      description: 'Codified test protocol for verifying ShiftRelay port 4000 endpoints, PostgreSQL connection pools, and SHA-256 punch deduplication.',
      markdown: `# ShiftRelay Function Testing Skill\n\nAutomated route assertions, attendance verification, and pool health monitoring for the ShiftRelay engine.`
    },
    {
      key: 'riffmax/shiftrelay-bug-triage',
      slug: 'shiftrelay-bug-triage',
      name: 'ShiftRelay Bug Detection & RFC Hotfix Protocol',
      description: 'Systematic error log inspection, GPS drift edge-case reproduction, and structured RFC proposal formatting.',
      markdown: `# ShiftRelay Bug Triage Skill\n\nDiagnose errors, isolate root causes, and draft non-breaking hotfix RFCs for Executive Director approval.`
    },
    {
      key: 'riffmax/shiftrelay-ui-ux-design',
      slug: 'shiftrelay-ui-ux-design',
      name: 'ShiftRelay Bento UI/UX Ergonomics',
      description: 'Design system rules for high-contrast sunlight visibility (WCAG AAA 7.8:1), 60FPS CSS motion, and frontline touch ergonomics.',
      markdown: `# ShiftRelay UI/UX Design Skill\n\nEnsure mobile-first industrial ergonomics, zero frame drops, and rapid shift handover haptics.`
    },
    {
      key: 'riffmax/executive-hitl-approval',
      slug: 'executive-hitl-approval',
      name: 'Executive Director HITL Approval Governance',
      description: 'Enforces human-in-the-loop review. All implementation proposals must halt in status "in_review" until the Executive Director signs off.',
      markdown: `# Executive HITL Approval Governance\n\nStrict governance policy: No code or database changes may be deployed without prior Executive Director sign-off.`
    }
  ];

  for (const s of skillsData) {
    const existing = await sql`SELECT id FROM company_skills WHERE company_id = ${COMPANY_ID} AND slug = ${s.slug}`;
    if (!existing.length) {
      const newId = crypto.randomUUID();
      await sql`
        INSERT INTO company_skills (
          id, company_id, key, slug, name, description, markdown, source_type, trust_level, compatibility, sharing_scope, created_at, updated_at
        ) VALUES (
          ${newId}, ${COMPANY_ID}, ${s.key}, ${s.slug}, ${s.name}, ${s.description}, ${s.markdown}, 'internal', 'trusted', 'compatible', 'company', NOW(), NOW()
        )
      `;
      console.log(`Registered skill: ${s.name} (${newId})`);
    } else {
      console.log(`Skill already registered: ${s.name}`);
    }
  }

  console.log('--- 3. Creating Projects for Enhancement Workflows ---');
  const projectsData = [
    {
      name: 'Daily ShiftRelay Core Function & Automated Health Testing',
      description: 'Continuous health assertions across all ShiftRelay endpoints (port 4000), attendance geofencing, and PostgreSQL connection pool resilience.',
      lead_agent_id: ngoziId || tariqId,
      color: '#10b981'
    },
    {
      name: 'Continuous Bug Detection, Edge Cases & Hotfix RFC Proposals',
      description: 'Monitoring edge-case failures, unhandled rejection traces, and submitting detailed bug analysis memos for Executive Director review.',
      lead_agent_id: faroukId || tariqId,
      color: '#f59e0b'
    },
    {
      name: 'Mobile Bento UI/UX & Sunlight Ergonomics Enhancement',
      description: 'Optimizing industrial mobile interface contrast for outdoor factory/hub environments (WCAG AAA), 60FPS transitions, and rapid shift handovers.',
      lead_agent_id: kelechiId || cooId,
      color: '#6366f1'
    }
  ];

  const projectMap = new Map();
  for (const p of projectsData) {
    const existing = await sql`SELECT id FROM projects WHERE company_id = ${COMPANY_ID} AND name = ${p.name}`;
    let prjId;
    if (!existing.length) {
      prjId = crypto.randomUUID();
      await sql`
        INSERT INTO projects (
          id, company_id, name, description, status, lead_agent_id, color, visibility, created_at, updated_at
        ) VALUES (
          ${prjId}, ${COMPANY_ID}, ${p.name}, ${p.description}, 'active', ${p.lead_agent_id}, ${p.color}, 'open', NOW(), NOW()
        )
      `;
      console.log(`Created project: ${p.name} (${prjId})`);
    } else {
      prjId = existing[0].id;
      console.log(`Project already exists: ${p.name} (${prjId})`);
    }
    projectMap.set(p.name, prjId);
  }

  console.log('--- 4. Creating Structured Enhancement Issues (Awaiting Executive Review) ---');
  const issuesData = [
    {
      title: 'Daily Automated Function Audit: Verify 48-route assertions & ShiftRelay port 4000 telemetry',
      description: `As Lead QA & Security Specialist (Ngozi Eze), conduct a full operational health audit of the ShiftRelay engine:
1. Endpoint Probing: Verify /api/health, /api/workers, /api/shifts, /api/logs on port 4000.
2. PostgreSQL Pool Check: Confirm zero connection pool leaks or timeouts under concurrent loads.
3. Anti-Farming Attendance Guards: Test simulated geofence punch attempts at Victoria Island Hub coordinates.
4. Deliverable: Compile an Executive Audit Report with telemetry metrics and submit to Executive Director Sherif Akanmu for review.
GOVERNANCE: Do not apply code changes. Submit report in status "in_review" for Executive Director sign-off.`,
      assignee_agent_id: ngoziId || tariqId,
      project_id: projectMap.get('Daily ShiftRelay Core Function & Automated Health Testing'),
      priority: 'high'
    },
    {
      title: 'Bug Report & Hotfix RFC: Edge-case GPS drift handling during frontline shift clock-in',
      description: `As DevOps & Site Reliability Engineer (Farouk Bello), investigate potential GPS variance edge cases:
1. Problem Statement: Mobile hardware variance during heavy Lagos rainstorms can cause instantaneous GPS jitter (±35m).
2. Bug Analysis: Audit whether geofence check-in rejects valid workers during transit between turnstile and reception.
3. Hotfix RFC Proposal: Propose a Kalman-filter or multi-sample consensus algorithm for geofence validation.
4. Deliverable: Submit comprehensive Hotfix Proposal with risk analysis to Executive Director Sherif Akanmu.
GOVERNANCE: Strict Human-in-the-Loop policy. Await Executive Director approval before modifying mobile-bridge or server code.`,
      assignee_agent_id: faroukId || tariqId,
      project_id: projectMap.get('Continuous Bug Detection, Edge Cases & Hotfix RFC Proposals'),
      priority: 'high'
    },
    {
      title: 'UI/UX Enhancement Proposal: Bento Grid high-contrast sunlight visibility & 60FPS handover haptics',
      description: `As Lead UI/UX Systems Designer (Kelechi Nnamdi), design the next evolution of the ShiftRelay mobile interface:
1. Sunlight Readability: Evaluate current dashboard tokens against WCAG AAA sunlight visibility benchmarks (target 7.8:1 contrast).
2. Shift Handover Animation: Propose 60FPS CSS physics curves for instant tactile feedback when completing a physical baton pass.
3. Worker CSAT Focus: Ensure frontline workers can complete entire shift onboarding in under 90 seconds.
4. Deliverable: Submit complete Design Specification & Bento CSS Tokens to Executive Director Sherif Akanmu for review and sign-off.`,
      assignee_agent_id: kelechiId || cooId,
      project_id: projectMap.get('Mobile Bento UI/UX & Sunlight Ergonomics Enhancement'),
      priority: 'high'
    }
  ];

  for (const iss of issuesData) {
    const existing = await sql`SELECT id FROM issues WHERE company_id = ${COMPANY_ID} AND title = ${iss.title}`;
    if (!existing.length) {
      const issueId = crypto.randomUUID();
      const countRes = await sql`SELECT count(*) FROM issues WHERE company_id = ${COMPANY_ID}`;
      const issueNum = parseInt(countRes[0].count, 10) + 1;
      const identifier = `RIFA-${issueNum}`;

      await sql`
        INSERT INTO issues (
          id, company_id, title, description, status, priority, assignee_agent_id, project_id, issue_number, identifier, created_by_user_id, responsible_user_id, created_at, updated_at
        ) VALUES (
          ${issueId}, ${COMPANY_ID}, ${iss.title}, ${iss.description}, 'todo', ${iss.priority}, ${iss.assignee_agent_id}, ${iss.project_id}, ${issueNum}, ${identifier}, 'local-board', 'local-board', NOW(), NOW()
        )
      `;
      console.log(`Created issue: ${identifier} - ${iss.title.slice(0, 50)}... (${issueId})`);
    } else {
      console.log(`Issue already exists: ${iss.title.slice(0, 50)}...`);
    }
  }

  console.log('--- ALL PROJECTS, SKILLS, AND ENHANCEMENT ISSUES INITIALIZED ---');
  await sql.end();
}

main();
