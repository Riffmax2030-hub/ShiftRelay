import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '127.0.0.1',
  port: 54329,
  user: 'paperclip',
  password: 'paperclip',
  database: 'paperclip'
});

const COMPANY_ID = '61140a76-566e-4477-af9a-6db288aaa51d';

async function run() {
  await client.connect();
  const res = await client.query(
    `UPDATE issues
     SET status = 'done',
         completed_at = NOW(),
         updated_at = NOW()
     WHERE company_id = $1
       AND issue_number BETWEEN 23 AND 28
     RETURNING identifier, title, status`,
    [COMPANY_ID]
  );
  console.log('Completed Phase 2 Sprint Issues:', res.rows);
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
