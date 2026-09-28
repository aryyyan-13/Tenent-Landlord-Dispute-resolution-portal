const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'tldrp.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('tenant','landlord','mediator','admin')),
  contact TEXT,
  address TEXT,
  kyc_document_path TEXT,
  kyc_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  case_number TEXT UNIQUE NOT NULL,
  filed_by_id TEXT NOT NULL REFERENCES users(id),
  opposing_party_id TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL CHECK(category IN ('Security Deposit','Rent Payment','Maintenance','Property Damage','Agreement Violation')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Filed' CHECK(status IN ('Filed','Under Review','Mediation','Resolved','Escalated','Closed')),
  mediator_id TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dispute_documents (
  id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  uploaded_by_id TEXT NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  label TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS case_timeline (
  id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  actor_id TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mediation_sessions (
  id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  mediator_id TEXT NOT NULL REFERENCES users(id),
  session_date TEXT,
  session_notes TEXT,
  proposed_resolution TEXT,
  tenant_decision TEXT CHECK(tenant_decision IN ('Pending','Accepted','Rejected')) DEFAULT 'Pending',
  landlord_decision TEXT CHECK(landlord_decision IN ('Pending','Accepted','Rejected')) DEFAULT 'Pending',
  final_decision TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

module.exports = db;
