import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({ host: '127.0.0.1', port: 54329, database: 'paperclip', user: 'paperclip', password: 'paperclip' });

async function main() {
  const res = await sql`
    UPDATE issues
    SET status = 'in_review', updated_at = NOW()
    WHERE identifier IN ('RIFA-3', 'RIFA-4', 'RIFA-5')
    RETURNING id, identifier, title, status;
  `;
  console.log('ISSUES MOVED TO IN_REVIEW:', JSON.stringify(res, null, 2));
  await sql.end();
}

main();
