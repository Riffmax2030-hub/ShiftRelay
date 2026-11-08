import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({ host: '127.0.0.1', port: 54329, database: 'paperclip', user: 'paperclip', password: 'paperclip' });

async function main() {
  console.log('Fixing adapter_config for all agents in all companies...');
  const res = await sql`
    UPDATE agents
    SET
      status = 'idle',
      lifecycle_state = 'ready',
      lifecycle_holds = '[]'::jsonb,
      pause_reason = NULL,
      paused_at = NULL,
      adapter_type = 'gemini_local',
      adapter_config = jsonb_build_object(
        'command', 'gemini.exe',
        'model', 'auto',
        'engine', 'cli',
        'approvalMode', 'yolo'
      ),
      updated_at = NOW()
    RETURNING id, name, adapter_config;
  `;
  console.log(`Updated ${res.length} agents to valid jsonb adapter_config.`);
  console.log('Sample updated adapter_config:', JSON.stringify(res[0].adapter_config));

  // Also cancel or fail any stuck queued/running heartbeat runs
  await sql`
    UPDATE heartbeat_runs
    SET status = 'failed', error = 'reset_by_admin', finished_at = NOW()
    WHERE status IN ('queued', 'running');
  `;
  console.log('Cleaned up lingering runs.');

  await sql.end();
}

main();
