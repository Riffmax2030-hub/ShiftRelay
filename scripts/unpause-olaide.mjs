import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({
  host: '127.0.0.1',
  port: 54329,
  database: 'paperclip',
  user: 'paperclip',
  password: 'paperclip'
});

try {
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
    RETURNING id, name, status, lifecycle_state, lifecycle_holds, pause_reason, adapter_type, adapter_config;
  `;

  console.log('UPDATED AGENTS TO CLI ENGINE:', JSON.stringify(res, null, 2));
} catch (err) {
  console.error('UPDATE ERROR:', err.message);
} finally {
  await sql.end();
}
