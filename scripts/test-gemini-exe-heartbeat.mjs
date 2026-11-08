import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({
  host: '127.0.0.1',
  port: 54329,
  database: 'paperclip',
  user: 'paperclip',
  password: 'paperclip'
});

async function main() {
  try {
    console.log('1. Updating Olaide agent in PostgreSQL...');
    const updated = await sql`
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
      WHERE id = '664c879e-a623-4a58-964d-dc58036dcf79'
      RETURNING id, name, status, lifecycle_state, lifecycle_holds, pause_reason, adapter_config;
    `;
    console.log('Updated agent row:', JSON.stringify(updated, null, 2));

    console.log('2. Triggering heartbeat invocation...');
    const invokeRes = await fetch('http://127.0.0.1:3100/api/agents/664c879e-a623-4a58-964d-dc58036dcf79/heartbeat/invoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const invokeData = await invokeRes.json();
    console.log('Heartbeat invoke response:', JSON.stringify(invokeData, null, 2));

    const runId = invokeData.runId || invokeData.id;
    if (!runId) {
      console.log('No runId returned');
      return;
    }

    console.log('3. Polling run status for runId:', runId);
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const runRes = await fetch(`http://127.0.0.1:3100/api/heartbeat-runs/${runId}`);
      if (runRes.ok) {
        const runData = await runRes.json();
        console.log(`[${i}s] Status: ${runData.status}, exitCode: ${runData.exitCode}, timedOut: ${runData.timedOut}`);
        if (runData.status === 'succeeded' || runData.status === 'failed') {
          console.log('Final run result:', JSON.stringify(runData, null, 2));
          break;
        }
      } else {
        console.log(`Failed to fetch run: ${runRes.status}`);
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

main();
