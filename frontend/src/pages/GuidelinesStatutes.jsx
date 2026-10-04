import React, { useState } from 'react';
import Layout from '../components/Layout.jsx';

const STATUTES = [
  {
    id: 'sec-8-4',
    code: 'MUNICIPAL CODE § 8.4(b)',
    chapter: 'Chapter 8: Security Deposit Escrow',
    title: 'Mandatory Security Deposit Restitution, Interest Computations, and Treble Damages Timelines',
    enacted: 'Enacted Oct 2021 • Amended Jun 2024',
    jurisdiction: 'Ward 4 Residential Leases • Standard Tenancy Benchmark',
    subsections: [
      {
        num: '1',
        title: '30-Day Mandatory Restitution Window',
        text: 'A lessor or landlord holding a residential security deposit must return the full deposit amount, alongside statutory accrued interest calculated at the prevailing municipal prime escrow rate, no later than thirty (30) consecutive calendar days following complete surrender of possession and surrender of premise keys by the tenant of record.'
      },
      {
        num: '2',
        title: 'Itemized Deduction Invoicing Requirements',
        text: 'Where lawful deductions for actual damages beyond ordinary wear and tear are made, the landlord must provide an itemized written accounting statement delivered via certified postal dispatch or authenticated digital electronic portal receipt. Each claimed expense item exceeding $125.00 must be substantiated by a bona fide independent contractor invoice.'
      },
      {
        num: '3',
        title: 'Civil Penalties for Bad Faith Withholding',
        text: 'Failure to tender return of deposit funds or provide the verified itemized deduction disclosure within the statutory 30-day term creates an un-rebuttable legal presumption of bad faith. The Housing Authority may award statutory damages up to treble (3x) the withheld principal amount plus reasonable attorney and arbitration costs.'
      }
    ]
  },
  {
    id: 'sec-9-1',
    code: 'MUNICIPAL CODE § 9.1(a)',
    chapter: 'Chapter 9: Maintenance & Habitability',
    title: 'Statutory Habitability Minimums and Emergency Heating Covenants',
    enacted: 'Enacted Jan 2020 • Amended Nov 2023',
    jurisdiction: 'Ward 4 Building Code • All Residential Properties',
    subsections: [
      {
        num: '1',
        title: 'Mandatory Heating Period',
        text: 'Between October 1 and May 31, every habitable room must maintain a minimum interior ambient temperature of not less than 68°F (20°C) between 6:00 AM and 11:00 PM, and 64°F (17.8°C) at all other times.'
      },
      {
        num: '2',
        title: 'Emergency Response SLA (24 Hours)',
        text: 'Loss of essential services—including potable water supply, sanitary drainage, primary heating equipment, or active electrical short hazards—must receive certified emergency remediation dispatch within twenty-four (24) hours of notice.'
      }
    ]
  },
  {
    id: 'sec-14-2',
    code: 'MUNICIPAL CODE § 14.2',
    chapter: 'Chapter 14: Dispute Conciliation Protocols',
    title: 'Civic Mediation Procedures, Privilege, and Binding Term Enforcement',
    enacted: 'Enacted Mar 2022',
    jurisdiction: 'Civic Dispute Authority & Small Claims Alternative',
    subsections: [
      {
        num: '1',
        title: 'Equal Standing in Alternative Resolution',
        text: 'All formal negotiations and mediation sessions convened under the TLDRP portal protocol are legally privileged and confidential. Neither party may introduce exploratory mediation offers as evidentiary admissions in subsequent municipal court proceedings.'
      },
      {
        num: '2',
        title: 'Mutual Agreement Enforceability',
        text: 'A formal settlement term sheet electronically verified and executed by both tenant and landlord carries identical force to a consent decree of the Municipal Rent Authority pursuant to Ward 4 Civ. Proc. § 108.'
      }
    ]
  }
];

export default function GuidelinesStatutes() {
  const [search, setSearch] = useState('');
  const [selectedStatute, setSelectedStatute] = useState(STATUTES[0]);
  const [selectedChapter, setSelectedChapter] = useState('all');

  const filteredStatutes = STATUTES.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = !q || s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.subsections.some(sub => sub.text.toLowerCase().includes(q));
    const matchesChapter = selectedChapter === 'all' || s.chapter.includes(selectedChapter);
    return matchesSearch && matchesChapter;
  });

  return (
    <Layout>
      <div className="page-container" style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* Top Breadcrumb & Status Ribbon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-label-sm-size)', color: 'var(--color-on-surface-variant)' }}>
            <span>Statutory Resources</span>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
            <span>Municipal Tenancy Code</span>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Guidelines & Legal Statutes</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface-container)', padding: '6px 14px', borderRadius: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-secondary)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-on-surface)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Codex Rev. 2024.11-W4 • Legally Binding
            </span>
          </div>
        </div>

        {/* Page Header */}
        <div className="card" style={{ padding: 'var(--space-xl)', background: 'var(--color-surface-container-lowest)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-lg)' }}>
          <div style={{ maxWidth: 780 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-secondary)', fontSize: 'var(--text-label-sm-size)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>gavel</span>
              <span>Metropolitan Housing Ordinance • Ward 4 Legislative Directorate</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-headline-xl-size)', color: 'var(--color-primary)', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
              Statutory Guidelines & Tenancy Ordinance Codex
            </h1>
            <p style={{ fontSize: 'var(--text-body-md-size)', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.6 }}>
              Official procedural rules, mediation timeframes, and municipal rental statutes governing Ward 4 jurisdiction. Certified reference protocols for mediation officers, property owners, and registered tenants.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => window.print()}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span>
              Print Section
            </button>
            <button className="btn btn-primary" onClick={() => alert('Downloading official certified Codex PDF...')}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
              Full Ordinance Codex (PDF)
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="card" style={{ padding: 'var(--space-md)', background: 'var(--color-surface-container-lowest)' }}>
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-variant)', fontSize: 20 }}>manage_search</span>
            <input
              type="text"
              placeholder="Search statutes, keywords (e.g. 'Security deposit', 'Habitability', '30-day notice'), or citation (§)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', height: 42, paddingLeft: 40, paddingRight: 16, background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)', borderRadius: 6, fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter Chapters:</span>
            {[
              { id: 'all', label: 'All Chapters' },
              { id: 'Chapter 8', label: 'Chapter 8: Deposits' },
              { id: 'Chapter 9', label: 'Chapter 9: Habitability' },
              { id: 'Chapter 14', label: 'Chapter 14: ADR Mediation' }
            ].map(ch => (
              <button
                key={ch.id}
                onClick={() => setSelectedChapter(ch.id)}
                className={`btn btn-sm ${selectedChapter === ch.id ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: 12 }}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* Master Detail Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: 'var(--space-xl)', alignItems: 'start' }}>
          {/* Chapter Ledger List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ fontSize: 'var(--text-label-md-size)', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Ordinance Chapters
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredStatutes.map(s => {
                  const isSelected = selectedStatute.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStatute(s)}
                      style={{
                        textAlign: 'left',
                        padding: 10,
                        borderRadius: 6,
                        border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                        background: isSelected ? 'var(--color-primary-container)' : 'var(--color-surface-container-low)',
                        color: isSelected ? '#ffffff' : 'var(--color-on-surface)',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ fontSize: 11, color: isSelected ? 'var(--color-secondary-container)' : 'var(--color-secondary)', fontWeight: 600 }}>{s.code}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{s.title}</div>
                      <div style={{ fontSize: 11, color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--color-on-surface-variant)', marginTop: 4 }}>{s.chapter}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Jurisprudence Notice */}
            <div className="card" style={{ padding: 'var(--space-md)', background: 'var(--color-secondary-fixed)', color: 'var(--color-on-secondary-fixed)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)' }}>verified_user</span>
                <span>Binding Ward 4 Jurisprudence</span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.5, margin: '8px 0 0 0', opacity: 0.9 }}>
                Mediated settlements through TLDRP carry identical legal standing to small claims municipal judgements pursuant to Ward 4 Civ. Proc. § 108.
              </p>
            </div>
          </div>

          {/* Active Reading Ledger */}
          <article className="card" style={{ padding: 'var(--space-xl)', background: 'var(--color-surface-container-lowest)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-surface-container-high)', paddingBottom: 'var(--space-md)' }}>
              <div>
                <span className="badge badge--review" style={{ fontWeight: 700 }}>{selectedStatute.code}</span>
                <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginLeft: 10 }}>{selectedStatute.enacted}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-secondary)', fontWeight: 600 }}>Certified Lawful Record</span>
            </div>

            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--color-primary)', margin: '0 0 6px 0' }}>
                {selectedStatute.title}
              </h2>
              <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                {selectedStatute.jurisdiction}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {selectedStatute.subsections.map(sub => (
                <div key={sub.num} style={{ padding: 'var(--space-md)', background: 'var(--color-surface-container-low)', borderRadius: 8, borderLeft: '3px solid var(--color-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {sub.num}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary)' }}>{sub.title}</h3>
                  </div>
                  <p style={{ margin: 0, fontSize: 'var(--text-body-sm-size)', color: 'var(--color-on-surface)', lineHeight: 1.6 }}>
                    {sub.text}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </Layout>
  );
}
