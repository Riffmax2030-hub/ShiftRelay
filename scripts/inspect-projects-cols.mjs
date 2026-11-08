import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({ host: '127.0.0.1', port: 54329, database: 'paperclip', user: 'paperclip', password: 'paperclip' });

async function main() {
  const pCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'projects'`;
  console.log('projects cols:', pCols.map(c => c.column_name));

  const gCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'goals'`;
  console.log('goals cols:', gCols.map(c => c.column_name));

  const existingProjects = await sql`SELECT id, name FROM projects WHERE company_id = '61140a76-566e-4477-af9a-6db288aaa51d'`;
  console.log('existing projects for RIFA:', existingProjects);

  await sql.end();
}

main();
