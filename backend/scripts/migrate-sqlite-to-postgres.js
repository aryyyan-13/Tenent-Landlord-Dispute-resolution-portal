const sqlite3 = require('better-sqlite3');
const { pool } = require('../config/db');
const path = require('path');

const sqliteDb = sqlite3(path.join(__dirname, '../data/tldrp.sqlite'));

async function migrate() {
  console.log('Starting data migration from SQLite to Postgres...');
  
  try {
    // 1. Users
    const users = sqliteDb.prepare('SELECT * FROM users').all();
    console.log(`Migrating ${users.length} users...`);
    for (const u of users) {
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, contact, address, kyc_document_path, kyc_verified, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.name, u.email, u.password_hash, u.role, u.contact, u.address, u.kyc_document_path, u.kyc_status === 'verified', u.created_at]
      );
    }

    // 2. Disputes
    const disputes = sqliteDb.prepare('SELECT * FROM disputes').all();
    console.log(`Migrating ${disputes.length} disputes...`);
    for (const d of disputes) {
      // map old status to new enum
      let case_status = 'open_negotiation';
      if (d.status === 'Mediation') case_status = 'open_mediation';
      if (d.status === 'Resolved') case_status = 'resolved_settlement_mediation';
      if (d.status === 'Escalated') case_status = 'mediation_failed';
      if (d.status === 'Closed') case_status = 'closed_referred_rent_authority';

      // map category or fallback
      const validCategories = ['security_deposit', 'rent_payment', 'maintenance', 'property_damage', 'agreement_violation', 'eviction_notice', 'other'];
      let cat = d.category;
      if (!validCategories.includes(cat)) {
        if (cat === 'lease') cat = 'agreement_violation';
        else if (cat === 'eviction') cat = 'eviction_notice';
        else cat = 'other';
      }

      await pool.query(
        `INSERT INTO disputes (id, case_number, filed_by_id, opposing_party_id, category, description, desired_outcome, property_address, case_status, mediator_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [d.id, d.case_number || `TLDRP-MIG-${d.id.substring(0,6)}`, d.filed_by_id, d.opposing_party_id, cat, d.description || 'Migration', d.amount ? `Claim: $${d.amount}` : null, d.property_address, case_status, d.mediator_id, d.created_at || new Date(), d.updated_at || new Date()]
      );
    }

    // Note: Since this is an MVP migration script, we can skip other tables (like reviews) 
    // or map them if needed. 
    console.log('Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
