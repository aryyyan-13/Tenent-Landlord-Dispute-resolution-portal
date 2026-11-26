/**
 * Seed script — creates one account per role plus a couple of realistic
 * sample disputes so the app can be evaluated end-to-end immediately
 * after installation, without needing to manually create test data.
 *
 * Run with: npm run seed
 */
require('dotenv').config();
const db = require('../config/db');
const User = require('../models/User');
const Dispute = require('../models/Dispute');
const Mediation = require('../models/Mediation');

async function resetDatabase() {
  await db.query(`
    TRUNCATE TABLE
      notifications,
      rent_authority_bundles,
      case_status_history,
      dispute_documents,
      settlement_signatures,
      settlement_agreements,
      mediation_sessions,
      messages,
      negotiation_offers,
      disputes,
      mediator_profiles,
      reviews,
      rental_agreements,
      users
    RESTART IDENTITY CASCADE
  `);
}

async function seed() {
  await resetDatabase();

  const admin = await User.create({
    name: 'Priya Nair',
    email: 'admin@tldrp.test',
    password: 'Admin@123',
    role: 'admin',
    contact: '+91-9800000001',
    address: 'TLDRP Head Office, Mumbai, Maharashtra'
  });

  const mediator = await User.create({
    name: 'Rajesh Kulkarni',
    email: 'mediator@tldrp.test',
    password: 'Mediator@123',
    role: 'mediator',
    contact: '+91-9800000002',
    address: 'Pune, Maharashtra'
  });

  const tenant = await User.create({
    name: 'Ananya Sharma',
    email: 'tenant@tldrp.test',
    password: 'Tenant@123',
    role: 'tenant',
    contact: '+91-9800000003',
    address: 'Flat 4B, Green Meadows Apartments, Andheri East, Mumbai'
  });

  const landlord = await User.create({
    name: 'Vikram Deshpande',
    email: 'landlord@tldrp.test',
    password: 'Landlord@123',
    role: 'landlord',
    contact: '+91-9800000004',
    address: 'Green Meadows Apartments, Andheri East, Mumbai'
  });

  const tenant2 = await User.create({
    name: 'Fatima Sheikh',
    email: 'tenant2@tldrp.test',
    password: 'Tenant@123',
    role: 'tenant',
    contact: '+91-9800000005',
    address: 'Flat 12, Sunrise Residency, Kothrud, Pune'
  });

  const landlord2 = await User.create({
    name: 'Suresh Iyer',
    email: 'landlord2@tldrp.test',
    password: 'Landlord@123',
    role: 'landlord',
    contact: '+91-9800000006',
    address: 'Sunrise Residency, Kothrud, Pune'
  });

  await User.setKycVerified(admin.id, true);
  await User.setKycVerified(tenant.id, true);
  await User.setKycVerified(landlord.id, true);
  await User.setKycVerified(mediator.id, true);

  // Sample case 1: Security deposit dispute, in mediation
  const dispute1 = await Dispute.create({
    filedById: tenant.id,
    opposingPartyId: landlord.id,
    category: 'security_deposit',
    propertyAddress: 'Flat 4B, Green Meadows Apartments, Andheri East, Mumbai',
    desiredOutcome: 'Full refund of INR 60,000 security deposit within 7 working days.',
    description:
      'Vacated the flat on 31 May 2026 after giving the required 30 days notice. The landlord has not refunded the ' +
      'security deposit of INR 60,000 and has not responded to messages for three weeks. The rental agreement clause 7 ' +
      'requires refund within 15 days of vacating, subject to a documented inspection report, which was never shared.'
  });
  await Dispute.assignMediator(dispute1.id, mediator.id, admin.id);
  await Mediation.createSession({
    disputeId: dispute1.id,
    mediatorId: mediator.id,
    sessionDate: '2026-07-10',
    sessionNotes:
      'Both parties joined the online session. Landlord cited unpaid water bill of INR 4,500 as a deduction. ' +
      'Tenant provided payment receipts showing the bill was cleared. Landlord agreed to refund the balance.',
    proposedResolution: 'Landlord to refund INR 60,000 in full within 7 working days via bank transfer.'
  });
  await Dispute.updateStatus(dispute1.id, 'open_mediation', 'Mediation session held on 2026-07-10.', mediator.id);
  await Dispute.addMessage(dispute1.id, tenant.id, 'I have attached the water bill payment receipt for reference.');
  await Dispute.addMessage(dispute1.id, landlord.id, 'Received, will review with the mediator.');

  // Sample case 2: Maintenance dispute, newly filed
  const dispute2 = await Dispute.create({
    filedById: tenant2.id,
    opposingPartyId: landlord2.id,
    category: 'maintenance',
    propertyAddress: 'Flat 12, Sunrise Residency, Kothrud, Pune',
    desiredOutcome: 'Urgent plumbing repair and remediation of water damage.',
    description:
      'The kitchen ceiling has been leaking since the monsoon started on 15 June 2026 due to a plumbing issue in the ' +
      'flat above. Multiple requests to the landlord for repair have gone unanswered for over a month, causing damage ' +
      'to kitchen cabinets and posing an electrical safety risk near the switchboard.'
  });
  await Dispute.addMessage(dispute2.id, tenant2.id, 'Photos of the water damage have been uploaded as evidence.');

  console.log('\nDatabase seeded successfully.\n');
  console.log('Sample cases created:');
  console.log(`  - ${dispute1.case_number}: Security Deposit (In Mediation)`);
  console.log(`  - ${dispute2.case_number}: Maintenance (Filed)`);
  console.log('\nTest credentials:\n');
  console.table([
    { role: 'admin', email: admin.email, password: 'Admin@123' },
    { role: 'mediator', email: mediator.email, password: 'Mediator@123' },
    { role: 'tenant', email: tenant.email, password: 'Tenant@123' },
    { role: 'landlord', email: landlord.email, password: 'Landlord@123' },
    { role: 'tenant', email: tenant2.email, password: 'Tenant@123' },
    { role: 'landlord', email: landlord2.email, password: 'Landlord@123' }
  ]);
  await db.pool.end();
}

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await db.pool.end().catch(() => {});
  process.exit(1);
});
