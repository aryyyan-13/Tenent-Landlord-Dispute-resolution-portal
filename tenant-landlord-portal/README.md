# Tenant-Landlord Dispute Resolution Portal (TLDRP)

A full-stack web application that lets tenants and landlords file disputes,
go through a structured mediation workflow, track case status, and escalate
unresolved cases — replacing informal legal notices and ad-hoc communication
with a documented, transparent process.

Built to the project brief: role-based access (Tenant, Landlord, Mediator,
Admin), dispute filing with document upload, a mediation workflow with
accept/reject resolution tracking, a case timeline, structured messaging
between parties, and an admin dashboard with analytics.

## Tech stack

| Layer      | Technology                                             |
|------------|---------------------------------------------------------|
| Frontend   | React (Vite), React Router, Tailwind CSS, Axios          |
| Backend    | Node.js, Express.js                                       |
| Database   | SQLite via `better-sqlite3` (single-file, zero setup)      |
| Auth       | JWT + bcrypt password hashing                              |
| File storage | Local disk via Multer (`backend/uploads/`)               |

> The brief suggested MongoDB/PostgreSQL. SQLite was used instead so the
> project runs anywhere with zero external services or accounts to set up.
> Swapping in Postgres/Mongo later only requires changing `backend/config/db.js`
> and the model files in `backend/models/` — the routes and frontend are
> unaffected.

## Project structure

```
tenant-landlord-portal/
├── backend/
│   ├── config/db.js          # SQLite connection + schema
│   ├── models/                # User, Dispute, Mediation data access
│   ├── middleware/            # JWT auth, role guard, file upload
│   ├── routes/                # auth, disputes, mediation, admin
│   ├── utils/seed.js          # creates test accounts + sample cases
│   └── server.js
├── frontend/
│   └── src/
│       ├── pages/              # Login, Register, Dashboard, File Dispute,
│       │                       # Case Tracking, Case Detail, Admin Panel
│       ├── components/         # Layout, PrivateRoute, StatusBadge
│       └── context/AuthContext.jsx
└── README.md
```

## Prerequisites

- Node.js 18 or later
- npm

## Installation & running locally

### 1. Backend

```bash
cd backend
cp .env.example .env      # edit JWT_SECRET before deploying to production
npm install
npm run seed               # creates test accounts and two sample cases
npm run dev                 # starts the API on http://localhost:5000
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev                 # starts the app on http://localhost:5173
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` and
`/uploads` requests to the backend on port 5000, so no CORS configuration
is needed in development.

### Production build

```bash
cd frontend
npm run build                # outputs static files to frontend/dist
```

Serve `frontend/dist` from any static host (Vercel, Netlify, Render static
site, S3 + CloudFront, etc.) and point it at a deployed instance of the
backend. Set `CLIENT_ORIGIN` in the backend's `.env` to the deployed
frontend URL so CORS allows it.

## Test credentials

Created by `npm run seed` in the backend:

| Role      | Email                  | Password       |
|-----------|-------------------------|-----------------|
| Admin     | admin@tldrp.test        | Admin@123       |
| Mediator  | mediator@tldrp.test     | Mediator@123    |
| Tenant    | tenant@tldrp.test       | Tenant@123      |
| Landlord  | landlord@tldrp.test     | Landlord@123    |
| Tenant    | tenant2@tldrp.test      | Tenant@123      |
| Landlord  | landlord2@tldrp.test    | Landlord@123    |

The seed script also creates two realistic sample cases: a security-deposit
dispute already in mediation with a proposed resolution awaiting both
parties' decisions, and a maintenance dispute freshly filed.

## Core user flow

1. Tenant or landlord registers (optionally uploading a KYC document) and
   logs in.
2. They file a dispute against a registered counterparty: category,
   description, and supporting documents (rental agreement, receipts,
   photos).
3. An admin assigns a neutral mediator to the case from the Admin Panel.
4. The mediator reviews evidence, holds a session, and records notes and a
   proposed resolution.
5. Both parties independently accept or reject the proposal on the case
   page. Two acceptances resolve the case; any rejection escalates it.
6. The full case timeline, documents, and message thread remain attached
   to the case for reference or download.
7. Admins monitor all cases and portal-wide analytics (resolution rate,
   escalation rate, average resolution time) from the Admin Panel.

## Case lifecycle

`Filed → Under Review → Mediation → Resolved / Escalated → Closed`

Every transition is recorded on the case's timeline with a timestamp and
the acting user, so the full history is auditable.

## API overview

All endpoints are under `/api` and (except register/login) require
`Authorization: Bearer <token>`.

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/disputes`, `GET /api/disputes`, `GET /api/disputes/:id`
- `PATCH /api/disputes/:id/status` (mediator/admin)
- `POST /api/disputes/:id/documents`, `GET/POST /api/disputes/:id/messages`
- `POST /api/mediation/:disputeId/assign` (admin)
- `POST /api/mediation/:disputeId/sessions`, `PATCH /api/mediation/sessions/:id`
- `POST /api/mediation/sessions/:id/decision` (tenant/landlord)
- `GET /api/admin/users`, `PATCH /api/admin/users/:id/role`,
  `PATCH /api/admin/users/:id/kyc`, `GET /api/admin/disputes`,
  `GET /api/admin/analytics`

## Notes on scope

Out of scope for this phase, per the project brief: direct court-system
integration, automated legal judgment, international dispute handling, and
AI-based legal advice. These are listed as future enhancements alongside a
legal-guidance chatbot, e-signature integration, and video mediation.
