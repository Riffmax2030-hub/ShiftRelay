import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({
  host: '127.0.0.1',
  port: 54329,
  database: 'paperclip',
  user: 'paperclip',
  password: 'paperclip'
});

async function main() {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'agents'
    ORDER BY ordinal_position;
  `;
  console.log('AGENTS COLUMNS:', cols.map(c => `${c.column_name} (${c.data_type})`).join(', '));

  const sample = await sql`SELECT * FROM agents LIMIT 1`;
  console.log('SAMPLE AGENT KEYS:', Object.keys(sample[0]));
  console.log('SAMPLE AGENT:', JSON.stringify(sample[0], null, 2));

  await sql.end();
}

main();
