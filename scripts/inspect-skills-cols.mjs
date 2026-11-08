import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({ host: '127.0.0.1', port: 54329, database: 'paperclip', user: 'paperclip', password: 'paperclip' });

async function main() {
  const csCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'company_skills'`;
  console.log('company_skills cols:', csCols.map(c => c.column_name));

  const rows = await sql`SELECT * FROM company_skills LIMIT 5`;
  console.log('company_skills rows:', JSON.stringify(rows, null, 2));

  const tcCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'tool_connections'`;
  console.log('tool_connections cols:', tcCols.map(c => c.column_name));

  await sql.end();
}

main();
