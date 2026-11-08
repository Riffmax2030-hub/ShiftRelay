import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({
  host: '127.0.0.1',
  port: 54329,
  database: 'paperclip',
  user: 'paperclip',
  password: 'paperclip'
});

try {
  const rows = await sql`SELECT id, name, status, lifecycle_state, lifecycle_holds, pause_reason FROM agents`;
  console.log('AGENTS IN DB:', JSON.stringify(rows, null, 2));
} catch (err) {
  console.error('DB ERROR:', err.message);
} finally {
  await sql.end();
}
