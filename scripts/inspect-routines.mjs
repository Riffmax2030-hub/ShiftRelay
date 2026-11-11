import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({ host: '127.0.0.1', port: 54329, database: 'paperclip', user: 'paperclip', password: 'paperclip' });

async function main() {
  const rCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'routines'`;
  console.log('routines cols:', rCols.map(c => c.column_name));

  const rtCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'routine_triggers'`;
  console.log('routine_triggers cols:', rtCols.map(c => c.column_name));

  await sql.end();
}

main();
