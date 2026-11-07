const fs = require('fs');
let s = fs.readFileSync('server.mjs', 'utf8');

s = s.replace(
  'const org = (store.organisations || []).find(o => o.id === user.tenant_id || o.id === user.organisation_id);',
  'const member = (store.memberships || []).find(m => m.user_id === user.id); const org = (store.organisations || []).find(o => o.id === user.tenant_id || o.id === user.organisation_id || (member && o.id === member.organisation_id)) || store.organisations?.[0];'
);

s = s.replace(
  "companyName: org?.legal_name || 'Enterprise Client',",
  "companyName: org?.trading_name || org?.legal_name || 'Riffmax Technology Limited',"
);

s = s.replace(
  "companyId: org?.organisation_code || '246701',",
  "companyId: org?.organisation_code || 'RIF-2026',"
);

s = s.replace(
  "company_id: org?.organisation_code || '246701'",
  "company_id: org?.organisation_code || 'RIF-2026'"
);

fs.writeFileSync('server.mjs', s, 'utf8');
console.log('✓ Updated activation org resolution in server.mjs');
