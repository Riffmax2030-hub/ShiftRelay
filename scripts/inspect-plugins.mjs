import postgres from 'file:///C:/Users/DATA%20ENG.%20OLA/AppData/Local/npm-cache/_npx/43414d9b790239bb/node_modules/postgres/src/index.js';

const sql = postgres({ host: '127.0.0.1', port: 54329, database: 'paperclip', user: 'paperclip', password: 'paperclip' });

async function main() {
  const plugins = await sql`SELECT id, name, package_name, is_enabled FROM plugins`;
  console.log('PLUGINS:', JSON.stringify(plugins, null, 2));

  const connections = await sql`SELECT id, name, transport, status FROM tool_connections`;
  console.log('TOOL CONNECTIONS:', JSON.stringify(connections, null, 2));

  await sql.end();
}

main();
