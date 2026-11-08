import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({ host: '127.0.0.1', port: 54329, database: 'paperclip', user: 'paperclip', password: 'paperclip' });

async function main() {
  const pCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'plugins'`;
  console.log('plugins cols:', pCols.map(c => c.column_name));

  const sample = await sql`SELECT * FROM plugins LIMIT 3`;
  console.log('plugins sample:', JSON.stringify(sample, null, 2));

  await sql.end();
}

main();
