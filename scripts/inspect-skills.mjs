import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({ host: '127.0.0.1', port: 54329, database: 'paperclip', user: 'paperclip', password: 'paperclip' });

async function main() {
  const skills = await sql`SELECT id, name, description, is_active FROM company_skills`;
  console.log('COMPANY SKILLS:', JSON.stringify(skills, null, 2));

  const tools = await sql`SELECT id, name, description FROM tool_catalog_entries LIMIT 10`;
  console.log('TOOL CATALOG:', JSON.stringify(tools, null, 2));

  await sql.end();
}

main();
