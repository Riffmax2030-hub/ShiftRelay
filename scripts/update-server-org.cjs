const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.mjs');
let code = fs.readFileSync(serverFile, 'utf8');

const oldServerOrgBlock = `  // ── Enterprise Tenants: Dangote + Flour Mills (separate company accounts) ──
  if (!Array.isArray(store.organisations) || store.organisations.length === 0) {
    store.organisations = [
      {
        id: '00000000-0000-4000-8000-000000000100',
        organisation_code: '246701',
        aliases: ['DAN-NG-4011', 'SR-NG-101', '246701', 'DANGOTE'],
        legal_name: 'Apex Logistics & Industrial Operations (Nigeria)',
        trading_name: 'Apex Logistics',
        industry: 'Logistics & FMCG',
        country: 'Nigeria',
        currency: 'NGN',
        hub_lat: 6.4474,
        hub_lng: 3.3590,
        hub_name: 'Apapa Industrial Terminal',
        hub_perimeter: 500
      },
      {
        // ── Pilot Tenant: Flour Mills of Nigeria Plc (Apapa Mill) ──────────
        id: '00000000-0000-4000-8000-000000000200',
        organisation_code: 'FLO-NG-6093',
        aliases: ['FLO-NG-6093', 'FLOURMILLS', 'FMN'],
        legal_name: 'Flour Mills of Nigeria Plc',
        trading_name: 'Flour Mills',
        industry: 'Food Manufacturing',
        country: 'Nigeria',
        currency: 'NGN',
        hub_lat: 6.4510,
        hub_lng: 3.3810,
        hub_name: 'Apapa Mill Gate A',
        hub_perimeter: 400,
        subscription_tier: 'enterprise',
        onboarding_fee_paid: true,
        monthly_fee_ngn: 400000,
        pepm_ngn: 4500
      }
    ];
  }`;

const newServerOrgBlock = `  // ── Enterprise Primary Tenant: Riffmax Technology Limited ──
  if (!Array.isArray(store.organisations) || store.organisations.length === 0) {
    store.organisations = [
      {
        id: '00000000-0000-4000-8000-000000000100',
        organisation_code: 'RIF-2026',
        aliases: ['RIF-2026', 'RIFFMAX', 'RIFFMAX-01', 'RIF-01'],
        legal_name: 'Riffmax Technology Limited',
        trading_name: 'Riffmax Technology',
        work_email: 'sherif@riffmax.tech',
        industry: 'Enterprise SaaS & Workforce DeepTech',
        country: 'Nigeria',
        currency: 'NGN',
        time_zone: 'Africa/Lagos',
        hub_name: 'Riffmax Software Engineering Hub',
        address: 'Victoria Island / Lekki Tech Corridor, Lagos, Nigeria',
        hub_lat: 6.4312,
        hub_lng: 3.4244,
        hub_perimeter: 120,
        subscription_tier: 'enterprise_founding_partner',
        verification_status: 'verified',
        onboarding_fee_paid: true,
        monthly_fee_ngn: 500000,
        pepm_ngn: 5000
      }
    ];
  }`;

if (code.includes(oldServerOrgBlock)) {
  code = code.replace(oldServerOrgBlock, newServerOrgBlock);
  console.log('✓ Updated store.organisations default in server.mjs');
}

// Also remove forced injection of Flour Mills on lines 128-144 if present
const oldForcedFlour = `  // ── Ensure Flour Mills org always present in multi-tenant stores ────────────
  if (!store.organisations.find(o => o.organisation_code === 'FLO-NG-6093')) {
    store.organisations.push({
      id: '00000000-0000-4000-8000-000000000200',
      organisation_code: 'FLO-NG-6093',
      aliases: ['FLO-NG-6093', 'FLOURMILLS', 'FMN'],
      legal_name: 'Flour Mills of Nigeria Plc',
      trading_name: 'Flour Mills',
      industry: 'Food Manufacturing',
      country: 'Nigeria',
      currency: 'NGN',
      hub_lat: 6.4510,
      hub_lng: 3.3810,
      hub_name: 'Apapa Mill Gate A',
      hub_perimeter: 400,
      subscription_tier: 'enterprise',
      onboarding_fee_paid: true,
      monthly_fee_ngn: 400000,
      pepm_ngn: 4500
    });
  }`;

const newForcedRiffmax = `  // ── Ensure Riffmax Technology always present as primary tenant ────────────
  if (!store.organisations.find(o => o.organisation_code === 'RIF-2026')) {
    store.organisations.unshift({
      id: '00000000-0000-4000-8000-000000000100',
      organisation_code: 'RIF-2026',
      aliases: ['RIF-2026', 'RIFFMAX', 'RIFFMAX-01', 'RIF-01'],
      legal_name: 'Riffmax Technology Limited',
      trading_name: 'Riffmax Technology',
      work_email: 'sherif@riffmax.tech',
      industry: 'Enterprise SaaS & Workforce DeepTech',
      country: 'Nigeria',
      currency: 'NGN',
      time_zone: 'Africa/Lagos',
      hub_name: 'Riffmax Software Engineering Hub',
      address: 'Victoria Island / Lekki Tech Corridor, Lagos, Nigeria',
      hub_lat: 6.4312,
      hub_lng: 3.4244,
      hub_perimeter: 120,
      subscription_tier: 'enterprise_founding_partner',
      verification_status: 'verified',
      onboarding_fee_paid: true,
      monthly_fee_ngn: 500000,
      pepm_ngn: 5000
    });
  }`;

if (code.includes(oldForcedFlour)) {
  code = code.replace(oldForcedFlour, newForcedRiffmax);
  console.log('✓ Replaced forced Flour Mills with Riffmax Technology in server.mjs');
}

// Update analytics default company info in server.mjs around line 1913
code = code.replace(/companyId: user\.company_id \|\| 'FLO-NG-6093'/g, "companyId: user.company_id || 'RIF-2026'");
code = code.replace(/companyName: user\.company_name \|\| 'Flour Mills of Nigeria Plc'/g, "companyName: user.company_name || 'Riffmax Technology Limited'");
code = code.replace(/hubName: user\.hub_name \|\| 'Apapa Industrial Hub'/g, "hubName: user.hub_name || 'Riffmax Software Engineering Hub (Lagos)'");

fs.writeFileSync(serverFile, code, 'utf8');
console.log('✓ Updated server.mjs successfully!');
