/**
 * TLDRP Pre-deployment End-to-End Precheck
 * Uses native http module — no fetch, no external deps
 */

'use strict';
require('dotenv').config();

const http = require('http');
const { Client } = require('pg');

const BASE_HOST = 'localhost';
const BASE_PORT = 5001;

const ts = Date.now();
const TENANT   = { name: 'Precheck Tenant',   email: `precheck.tenant.${ts}@tldrp.test`,   password: 'Test@1234', role: 'tenant' };
const LANDLORD = { name: 'Precheck Landlord', email: `precheck.landlord.${ts}@tldrp.test`, password: 'Test@1234', role: 'landlord' };

const ok  = (msg) => console.log(`  ✅  ${msg}`);
const err = (msg, detail) => { console.error(`  ❌  ${msg}`, detail ? JSON.stringify(detail) : ''); process.exitCode = 1; };

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const options = {
      hostname: BASE_HOST,
      port: BASE_PORT,
      path: `/api${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const get   = (path, token)       => request('GET',   path, null, token);
const post  = (path, body, token) => request('POST',  path, body, token);
const patch = (path, body, token) => request('PATCH', path, body, token);

async function run() {
  let tenantToken, landlordToken, tenantCaseId, landlordCaseId;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TLDRP Pre-deployment Precheck');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Health
  console.log('[ 1 ] API health');
  const health = await get('/health');
  health.data?.status === 'ok' ? ok('API server is live') : err('Health failed', health.data);

  // 2. Register tenant
  console.log('\n[ 2 ] Register tenant');
  const regT = await post('/auth/register', TENANT);
  if (regT.status === 201 && regT.data.token) {
    ok(`Registered — id: ${regT.data.user.id}`);
    tenantToken = regT.data.token;
  } else {
    err('Tenant registration failed', regT.data); return cleanup(tenantCaseId, landlordCaseId);
  }

  // 3. Register landlord
  console.log('\n[ 3 ] Register landlord');
  const regL = await post('/auth/register', LANDLORD);
  if (regL.status === 201 && regL.data.token) {
    ok(`Registered — id: ${regL.data.user.id}`);
    landlordToken = regL.data.token;
  } else {
    err('Landlord registration failed', regL.data); return cleanup(tenantCaseId, landlordCaseId);
  }

  // 4. Login verification
  console.log('\n[ 4 ] Login (JWT issuance)');
  const loginT = await post('/auth/login', { email: TENANT.email, password: TENANT.password });
  loginT.status === 200 && loginT.data.token
    ? ok('Tenant login — JWT returned ✓')
    : err('Tenant login failed', loginT.data);

  const loginL = await post('/auth/login', { email: LANDLORD.email, password: LANDLORD.password });
  loginL.status === 200 && loginL.data.token
    ? ok('Landlord login — JWT returned ✓')
    : err('Landlord login failed', loginL.data);

  // 5. Tenant files dispute against landlord
  console.log('\n[ 5 ] TENANT files dispute against landlord');
  const d1 = await post('/disputes', {
    title: 'Precheck: Security deposit not returned',
    category: 'security_deposit',
    description: 'Landlord has not returned ₹50,000 security deposit after 60 days of vacating the premises.',
    propertyAddress: '14B, MG Road, Pune 411001',
    claimAmount: 50000,
    desiredOutcome: 'Full refund of security deposit',
    respondent_email: LANDLORD.email
  }, tenantToken);

  if (d1.status === 201 && d1.data.dispute?.case_number) {
    tenantCaseId = d1.data.dispute.id;
    ok(`Case filed: ${d1.data.dispute.case_number} | Status: ${d1.data.dispute.case_status}`);
  } else {
    err('Tenant dispute failed', d1.data);
  }

  // 6. Landlord files dispute against tenant
  console.log('\n[ 6 ] LANDLORD files dispute against tenant');
  const d2 = await post('/disputes', {
    title: 'Precheck: Unpaid rent for 3 months',
    category: 'rent_payment',
    description: 'Tenant has not paid rent for Oct, Nov, Dec 2025 totalling ₹75,000.',
    propertyAddress: '14B, MG Road, Pune 411001',
    claimAmount: 75000,
    desiredOutcome: 'Payment of all outstanding rent plus late fees',
    respondent_email: TENANT.email
  }, landlordToken);

  if (d2.status === 201 && d2.data.dispute?.case_number) {
    landlordCaseId = d2.data.dispute.id;
    ok(`Case filed: ${d2.data.dispute.case_number} | Status: ${d2.data.dispute.case_status}`);
  } else {
    err('Landlord dispute failed', d2.data);
  }

  // 7. Verify DB persistence
  console.log('\n[ 7 ] Verify cases exist in Supabase (GET /disputes/:id)');
  if (tenantCaseId) {
    const c1 = await get(`/disputes/${tenantCaseId}`, tenantToken);
    c1.status === 200 && c1.data.dispute
      ? ok(`Tenant case ${c1.data.dispute.case_number} — DB read confirmed ✓`)
      : err('Tenant case not found in DB', c1.data);
  }
  if (landlordCaseId) {
    const c2 = await get(`/disputes/${landlordCaseId}`, landlordToken);
    c2.status === 200 && c2.data.dispute
      ? ok(`Landlord case ${c2.data.dispute.case_number} — DB read confirmed ✓`)
      : err('Landlord case not found in DB', c2.data);
  }

  // 8. Auth guard
  console.log('\n[ 8 ] JWT auth guard — no token → 401');
  const noAuth = await get('/disputes');
  noAuth.status === 401
    ? ok('Unauthenticated request correctly rejected (401) ✓')
    : err(`Expected 401, got ${noAuth.status}`, noAuth.data);

  // 9. Role guard — tenant cannot do mediator-only status update
  console.log('\n[ 9 ] Role guard — tenant cannot update case status (mediator/admin only)');
  if (tenantCaseId) {
    const roleGuard = await patch(`/disputes/${tenantCaseId}/status`, { status: 'open_mediation' }, tenantToken);
    roleGuard.status === 403
      ? ok('Role guard active — tenant blocked with 403 ✓')
      : err(`Expected 403, got ${roleGuard.status}`, roleGuard.data);
  }

  await cleanup(tenantCaseId, landlordCaseId);
}

async function cleanup(tenantCaseId, landlordCaseId) {
  console.log('\n[ 10 ] Cleanup — removing precheck data from DB');
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await db.connect();
    const ids = [tenantCaseId, landlordCaseId].filter(Boolean);
    if (ids.length) await db.query('DELETE FROM disputes WHERE id = ANY($1::uuid[])', [ids]);
    await db.query('DELETE FROM users WHERE email = ANY($1::text[])', [[TENANT.email, LANDLORD.email]]);
    ok('Test data cleaned from database');
  } catch (e) {
    err('Cleanup failed', { message: e.message });
  } finally {
    await db.end();
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (process.exitCode === 1) {
    console.log('  RESULT: ❌  Some checks FAILED — fix before deploying');
  } else {
    console.log('  RESULT: ✅  All checks passed — ready to ship! 🚀');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
