import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({
  host: '127.0.0.1',
  port: 54329,
  database: 'paperclip',
  user: 'paperclip',
  password: 'paperclip'
});

async function main() {
  const companies = await sql`SELECT id, name, issue_prefix FROM companies`;
  console.log('ALL COMPANIES:', JSON.stringify(companies, null, 2));
  await sql.end();
}

main();
