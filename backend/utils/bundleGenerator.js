const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const BUNDLES_DIR = path.join(__dirname, '..', 'uploads', 'bundles');

/**
 * BundleGeneratorService
 *
 * Generates a Case Bundle PDF containing:
 *  - Dispute description & category
 *  - All dispute_documents (names + paths, but not the raw files)
 *  - Full case_status_history timeline
 *  - Mediation session notes (NOT mediator_private_notes)
 *  - Escalated reason in plain language
 *
 * Trigger points: escalateByRejection() and the manual /escalate endpoint.
 * Single code path — no duplication.
 */
const BundleGeneratorService = {
  /**
   * @param {string} disputeId
   * @param {{ reason: string }} opts
   * @returns {Promise<{ filePath: string, publicPath: string }>}
   */
  async generate(disputeId, { reason }) {
    // Pull all needed data
    const disputeRes = await db.query(
      `SELECT d.*,
              fu.name  AS filed_by_name,  fu.contact AS filed_by_contact,
              op.name  AS opposing_name,  op.contact AS opposing_contact,
              mu.name  AS mediator_name
       FROM disputes d
       LEFT JOIN users fu ON fu.id = d.filed_by_id
       LEFT JOIN users op ON op.id = d.opposing_party_id
       LEFT JOIN users mu ON mu.id = d.mediator_id
       WHERE d.id = $1`,
      [disputeId]
    );
    const dispute = disputeRes.rows[0];
    if (!dispute) throw new Error(`Dispute ${disputeId} not found for bundle generation.`);

    const docsRes = await db.query(
      `SELECT dd.*, u.name AS uploader_name
       FROM dispute_documents dd
       LEFT JOIN users u ON u.id = dd.uploaded_by_id
       WHERE dd.dispute_id = $1
       ORDER BY dd.created_at ASC`,
      [disputeId]
    );
    const documents = docsRes.rows;

    const timelineRes = await db.query(
      `SELECT csh.*, u.name AS actor_name
       FROM case_status_history csh
       LEFT JOIN users u ON u.id = csh.changed_by_id
       WHERE csh.dispute_id = $1
       ORDER BY csh.created_at ASC`,
      [disputeId]
    );
    const timeline = timelineRes.rows;

    // Exclude mediator_private_notes explicitly (not selected)
    const sessionsRes = await db.query(
      `SELECT ms.id, ms.scheduled_at, ms.session_notes, ms.proposed_resolution, ms.status, ms.session_type,
              u.name AS mediator_name
       FROM mediation_sessions ms
       LEFT JOIN users u ON u.id = ms.mediator_id
       WHERE ms.dispute_id = $1
       ORDER BY ms.created_at ASC`,
      [disputeId]
    );
    const sessions = sessionsRes.rows;

    fs.mkdirSync(BUNDLES_DIR, { recursive: true });

    const fileName = `${dispute.case_number}-bundle-${Date.now()}.pdf`;
    const filePath = path.join(BUNDLES_DIR, fileName);
    const publicPath = `/uploads/bundles/${fileName}`;

    const reasonText = {
      party_rejected_proposal: 'One or both parties rejected the proposed resolution.',
      manually_escalated_by_mediator: 'The assigned mediator escalated this case manually.',
      manually_escalated_by_admin: 'An administrator escalated this case manually.',
    }[reason] || reason;

    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ── Cover ──
    doc.fontSize(18).font('Helvetica-Bold').text('CASE BUNDLE', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('For Rent Authority / Civil Court Referral', { align: 'center' }).moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text('Tenant-Landlord Dispute Resolution Portal (TLDRP)', { align: 'center' }).fillColor('#000').moveDown(1.5);

    const r = (label, value) => doc.font('Helvetica-Bold').text(label, { continued: true }).font('Helvetica').text(`  ${value || '—'}`);
    r('Case Number:', dispute.case_number);
    r('Category:', dispute.category);
    r('Property:', dispute.property_address);
    r('Filed By:', dispute.filed_by_name);
    r('Opposing Party:', dispute.opposing_name);
    r('Assigned Mediator:', dispute.mediator_name || 'None');
    r('Escalation Reason:', reasonText);
    r('Bundle Generated:', new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }));
    doc.moveDown(1);

    // ── Dispute Description ──
    doc.font('Helvetica-Bold').fontSize(12).text('Dispute Description').moveDown(0.3);
    doc.font('Helvetica').fontSize(10).fillColor('#222').text(dispute.description || '—', { lineGap: 3 }).fillColor('#000').moveDown(1);

    // ── Documents ──
    doc.font('Helvetica-Bold').fontSize(12).text('Submitted Documents').moveDown(0.3);
    if (documents.length === 0) {
      doc.font('Helvetica').fontSize(10).text('No documents on file.').moveDown(1);
    } else {
      documents.forEach((d, i) => {
        doc.font('Helvetica').fontSize(10).text(
          `${i + 1}. ${d.file_name}  [type: ${d.doc_type}]  — uploaded by ${d.uploader_name || 'unknown'} on ${new Date(d.created_at).toLocaleDateString('en-IN')}`
        );
      });
      doc.moveDown(1);
    }

    // ── Timeline ──
    doc.font('Helvetica-Bold').fontSize(12).text('Case Status Timeline').moveDown(0.3);
    timeline.forEach((e) => {
      doc.font('Helvetica').fontSize(10).text(
        `• [${new Date(e.created_at).toLocaleDateString('en-IN')}] → ${e.to_status}` +
        (e.reason ? `: ${e.reason}` : '') +
        (e.actor_name ? `  (by ${e.actor_name})` : '')
      );
    });
    doc.moveDown(1);

    // ── Mediation Sessions ──
    doc.font('Helvetica-Bold').fontSize(12).text('Mediation Sessions').moveDown(0.3);
    if (sessions.length === 0) {
      doc.font('Helvetica').fontSize(10).text('No mediation sessions held.').moveDown(1);
    } else {
      sessions.forEach((s, i) => {
        doc.font('Helvetica-Bold').fontSize(10).text(`Session ${i + 1}  —  ${s.status}${s.scheduled_at ? '  (' + new Date(s.scheduled_at).toLocaleDateString('en-IN') + ')' : ''}`);
        if (s.session_notes) doc.font('Helvetica').fontSize(10).text(`Notes: ${s.session_notes}`, { indent: 16 });
        if (s.proposed_resolution) doc.font('Helvetica').fontSize(10).text(`Proposed resolution: ${s.proposed_resolution}`, { indent: 16 });
        doc.moveDown(0.5);
      });
    }

    // ── Footer ──
    doc.moveDown(1).moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).strokeColor('#ccc').stroke().moveDown(0.5);
    doc.font('Helvetica').fontSize(9).fillColor('#666')
      .text('This bundle was automatically generated by TLDRP. The information reflects the case record as of the date above.', { align: 'center' });

    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return { filePath, publicPath };
  }
};

module.exports = { BundleGeneratorService };
