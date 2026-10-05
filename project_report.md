# Detailed Project Report: Tenant-Landlord Dispute Resolution Portal (TLDRP)

## 1. Introduction
The **Tenant-Landlord Dispute Resolution Portal (TLDRP)** is a full-stack web application designed to digitize, streamline, and mediate conflicts between tenants and landlords. Instead of relying on ad-hoc communication, WhatsApp messages, or expensive early-stage legal notices, this platform provides a structured, transparent, and trackable environment to resolve issues amicably.

## 2. Problem Statement
Disputes between tenants and landlords over issues like security deposits, maintenance, and lease terms are incredibly common. Traditionally, resolving these involves disorganized communication which often escalates into legal battles due to a lack of mediation and transparent documentation. There is a need for a centralized system that records grievances, standardizes the mediation process, and provides clear resolution paths.

## 3. Proposed Solution
TLDRP addresses these challenges by offering a dedicated portal where:
- Users can file formal disputes with supporting evidence.
- A neutral mediator can review the case and propose a resolution.
- Both parties can track the case timeline, communicate securely, and independently accept or reject proposed settlements.

## 4. Core Features
- **Role-Based Access Control:** Distinct dashboards and permissions for Tenants, Landlords, Mediators, and System Admins.
- **Structured Dispute Filing:** Users can categorize disputes and upload supporting documents (e.g., rental agreements, receipts, photos).
- **Mediation Workflow:** Admins assign neutral mediators to cases. Mediators review the facts, hold sessions, and offer proposed resolutions.
- **Dual-Approval Resolution:** A proposed resolution requires independent acceptance from both the tenant and the landlord to resolve the case. Rejections escalate the case for further action.
- **Case Timeline & Audit Trail:** Every status change, document upload, and decision is timestamped and logged on an immutable case timeline.
- **Admin Analytics:** Admins have a dashboard to monitor portal-wide metrics, such as resolution rates, escalation rates, and average resolution times.

## 5. Technology Stack
- **Frontend:** React.js (Vite), React Router for navigation, and Tailwind CSS for responsive, modern styling.
- **Backend:** Node.js and Express.js providing a robust REST API.
- **Database:** SQLite (via `better-sqlite3`) for zero-setup, portable data management.
- **Authentication:** JSON Web Tokens (JWT) combined with bcrypt for secure password hashing.
- **File Storage:** Local disk storage via Multer for handling KYC documents and dispute evidence.

## 6. System Architecture & User Roles
1. **Tenant / Landlord:** Initiates the process by filing a dispute against a registered counterparty. They can track the status, provide evidence, and vote on the mediator's proposal.
2. **Mediator:** A neutral third party assigned by the admin. They have access to case details, can propose resolutions, and leave notes for the parties involved.
3. **Admin:** Manages the overall platform, verifies KYC details, assigns mediators to incoming disputes, and monitors system analytics.

## 7. Conclusion & Future Enhancements
The TLDRP successfully demonstrates how technology can facilitate civic mediation and reduce the burden on the traditional legal system. 
**Future scope** for the project includes:
- Direct court-system integrations.
- An AI-based legal guidance chatbot to help users understand their rights.
- E-signature integration for legally binding settlement agreements.
- Built-in video conferencing for virtual mediation hearings.
