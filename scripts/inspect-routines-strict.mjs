import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({ host: '127.0.0.1', port: 54329, database: 'paperclip', user: 'paperclip', password: 'paperclip' });

async function main() {
  const rCols = await sql`
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'routines' AND table_schema = 'public'
    ORDER BY ordinal_position;
  `;
  console.log('PUBLIC.ROUTINES COLS:', rCols.map(c => `${c.column_name} (${c.is_nullable})`).join(', '));
  await sql.end();
}

main();
