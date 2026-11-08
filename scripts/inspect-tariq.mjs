import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({ host: '127.0.0.1', port: 54329, database: 'paperclip', user: 'paperclip', password: 'paperclip' });

async function main() {
  const res = await sql`SELECT id, name, adapter_type, adapter_config, status, lifecycle_state FROM agents WHERE id = '38564e87-c13f-450d-946b-65786af880c4'`;
  console.log(JSON.stringify(res[0], null, 2));
  await sql.end();
}

main();
