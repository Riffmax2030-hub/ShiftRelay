import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';
import crypto from 'node:crypto';
import { FULL_ENTERPRISE_ROSTER } from './onboard-riffmax-full-enterprise.mjs';

const sql = postgres({
  host: '127.0.0.1',
  port: 54329,
  database: 'paperclip',
  user: 'paperclip',
  password: 'paperclip'
});

async function onboardCompany(companyId, companyName, issuePrefix) {
  console.log(`\n======================================================`);
  console.log(`ONBOARDING ROSTER FOR: ${companyName} (${issuePrefix}) [${companyId}]`);
  console.log(`======================================================`);

  const existingAgents = await sql`SELECT id, name, role, title FROM agents WHERE company_id = ${companyId}`;
  const agentMapByName = new Map();
  for (const a of existingAgents) {
    agentMapByName.set(a.name.toLowerCase().trim(), a.id);
  }
  console.log(`Found ${existingAgents.length} existing agents in company.`);

  const ADAPTER_CONFIG = {
    command: 'gemini.exe',
    model: 'auto',
    engine: 'cli',
    approvalMode: 'yolo'
  };

  const RUNTIME_CONFIG = {
    heartbeat: {
      enabled: true,
      intervalSec: 300,
      cooldownSec: 10,
      wakeOnDemand: true,
      maxConcurrentRuns: 1
    }
  };

  const PERMISSIONS = {
    canCreateAgents: false
  };

  // 1. Synchronize all 24 agents
  for (const member of FULL_ENTERPRISE_ROSTER) {
    const nameKey = member.name.toLowerCase().trim();
    let agentId = agentMapByName.get(nameKey);

    if (!agentId) {
      for (const [existingName, existingId] of agentMapByName.entries()) {
        if (existingName.includes(nameKey) || nameKey.includes(existingName)) {
          agentId = existingId;
          break;
        }
      }
    }

    const roleSlug = member.dept.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const capabilitiesText = [
      `* Department: ${member.dept}`,
      `* Staff ID: ${member.staffId}`,
      `* Stack: ${member.stack}`,
      `* Workload Focus: ${member.workload}`,
      `* Enterprise SLA Benchmark: ${member.benchmark}`
    ].join('\n');

    if (agentId) {
      await sql`
        UPDATE agents
        SET
          name = ${member.name},
          role = ${roleSlug},
          title = ${member.role},
          capabilities = ${capabilitiesText},
          status = 'idle',
          lifecycle_state = 'ready',
          lifecycle_holds = '[]'::jsonb,
          pause_reason = NULL,
          paused_at = NULL,
          adapter_type = 'gemini_local',
          adapter_config = ${JSON.stringify(ADAPTER_CONFIG)},
          runtime_config = ${JSON.stringify(RUNTIME_CONFIG)},
          permissions = ${member.role.includes('CEO') || member.role.includes('COO') ? JSON.stringify({ canCreateAgents: true }) : JSON.stringify(PERMISSIONS)},
          updated_at = NOW()
        WHERE id = ${agentId}
      `;
      agentMapByName.set(nameKey, agentId);
      console.log(`  Updated agent: ${member.name} (${agentId})`);
    } else {
      const newId = crypto.randomUUID();
      await sql`
        INSERT INTO agents (
          id,
          company_id,
          name,
          role,
          title,
          capabilities,
          status,
          reports_to,
          adapter_type,
          adapter_config,
          budget_monthly_cents,
          spent_monthly_cents,
          runtime_config,
          permissions,
          lifecycle_state,
          lifecycle_holds,
          lifecycle_version,
          created_by_user_id,
          created_at,
          updated_at
        ) VALUES (
          ${newId},
          ${companyId},
          ${member.name},
          ${roleSlug},
          ${member.role},
          ${capabilitiesText},
          'idle',
          NULL,
          'gemini_local',
          ${JSON.stringify(ADAPTER_CONFIG)},
          100000,
          0,
          ${JSON.stringify(RUNTIME_CONFIG)},
          ${member.role.includes('CEO') || member.role.includes('COO') ? JSON.stringify({ canCreateAgents: true }) : JSON.stringify(PERMISSIONS)},
          'ready',
          '[]'::jsonb,
          0,
          'local-board',
          NOW(),
          NOW()
        )
      `;
      agentMapByName.set(nameKey, newId);
      console.log(`  Created new agent: ${member.name} (${newId})`);
    }
  }

  // 2. Establish Enterprise Hierarchy
  const ceoId = agentMapByName.get('sherif akanmu');
  const cooId = agentMapByName.get('olaide emmanuela');

  const leadMap = {
    // Branding
    'kelechi nnamdi': cooId,
    'adanna adeleke': agentMapByName.get('kelechi nnamdi'),
    'simi balogun': agentMapByName.get('kelechi nnamdi'),

    // Growth & Marketing
    'tunde bakare': cooId,
    'amara okeke': agentMapByName.get('tunde bakare'),
    'zainab abubakar': agentMapByName.get('tunde bakare'),

    // Finance & Strategy
    'femi otedola-coker': ceoId,
    'chidinma kalu': agentMapByName.get('femi otedola-coker'),

    // Legal & Compliance
    'barrister yetunde williams': ceoId,
    'folake balogun': agentMapByName.get('barrister yetunde williams'),

    // HR & People Ops
    'blessing nwachukwu': cooId,
    'damilola fashola': agentMapByName.get('blessing nwachukwu'),

    // Core Engineering
    'tariq al-hassan': cooId,
    'babatunde adeleke': agentMapByName.get('tariq al-hassan'),
    'chidinma okonjo': agentMapByName.get('tariq al-hassan'),
    'ngozi eze': agentMapByName.get('tariq al-hassan'),
    'farouk bello': agentMapByName.get('tariq al-hassan'),
    'ibrahim yusuf': agentMapByName.get('tariq al-hassan'),

    // Facilities & Security
    'emeka obinna': cooId,
    'sergeant musa danjuma': agentMapByName.get('emeka obinna'),
    'suleiman bello': agentMapByName.get('sergeant musa danjuma'),
    'chioma anyanwu': agentMapByName.get('emeka obinna')
  };

  if (cooId && ceoId) {
    await sql`UPDATE agents SET reports_to = ${ceoId} WHERE id = ${cooId}`;
  }

  for (const [memberName, managerId] of Object.entries(leadMap)) {
    const memberId = agentMapByName.get(memberName);
    if (memberId && managerId) {
      await sql`UPDATE agents SET reports_to = ${managerId} WHERE id = ${memberId}`;
    }
  }

  // 3. Verify
  const countRes = await sql`SELECT count(*) FROM agents WHERE company_id = ${companyId}`;
  console.log(`Company ${issuePrefix} now has ${countRes[0].count} fully active agents.`);
}

async function main() {
  try {
    const companies = await sql`SELECT id, name, issue_prefix FROM companies ORDER BY issue_prefix`;
    for (const comp of companies) {
      await onboardCompany(comp.id, comp.name, comp.issue_prefix);
    }
    console.log('\nALL COMPANIES SYNCHRONIZED SUCCESSFULLY!');
  } catch (err) {
    console.error('Onboarding error:', err);
  } finally {
    await sql.end();
  }
}

main();
