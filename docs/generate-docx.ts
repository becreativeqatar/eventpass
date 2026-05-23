import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  PageBreak,
  ShadingType,
  TableLayoutType,
  VerticalAlign,
  Header,
  Footer,
  ImageRun,
  convertInchesToTwip,
  Tab,
  TabStopType,
  TabStopPosition,
} from 'docx';
import * as fs from 'fs';

// ── COLORS (BCE Brand) ──
const BRAND = '101820';       // core-black
const ACCENT = 'e0251c';      // red-spark
const ACCENT_LIGHT = 'fdf2f2'; // light red tint
const TEXT_MUTED = '999999';   // text-muted
const WHITE = 'ffffff';
const SUCCESS = '00c758';     // green-500
const LIGHT_GRAY = 'f5f5f5';  // text-light
const BORDER_COLOR = 'd7d1ca'; // desert-dune

// ── HELPERS ──
function heading2(num: string, text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 6 } },
    children: [
      new TextRun({ text: `${num}  `, font: 'Segoe UI', size: 28, color: ACCENT, bold: true }),
      new TextRun({ text, font: 'Segoe UI', size: 28, color: BRAND, bold: true }),
    ],
  });
}

function heading3(num: string, text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 120 },
    children: [
      new TextRun({ text: `${num}  `, font: 'Segoe UI', size: 22, color: ACCENT, bold: true }),
      new TextRun({ text, font: 'Segoe UI', size: 22, color: BRAND, bold: true }),
    ],
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, font: 'Segoe UI', size: 20, color: '1e293b' })],
  });
}

function bulletItem(bold: string, rest: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    bullet: { level: 0 },
    children: [
      new TextRun({ text: bold, font: 'Segoe UI', size: 20, bold: true, color: BRAND }),
      new TextRun({ text: ` \u2014 ${rest}`, font: 'Segoe UI', size: 20, color: '1e293b' }),
    ],
  });
}

function simpleBullet(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    bullet: { level: 0 },
    children: [new TextRun({ text, font: 'Segoe UI', size: 20, color: '1e293b' })],
  });
}

function numberedStep(num: string, text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: convertInchesToTwip(0.3) },
    children: [
      new TextRun({ text: `${num}.  `, font: 'Segoe UI', size: 20, bold: true, color: ACCENT }),
      new TextRun({ text, font: 'Segoe UI', size: 20, color: '1e293b' }),
    ],
  });
}

function emptyLine(): Paragraph {
  return new Paragraph({ spacing: { after: 60 }, children: [] });
}

function calloutBox(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 8 },
    },
    shading: { type: ShadingType.SOLID, color: ACCENT_LIGHT },
    children: [new TextRun({ text, font: 'Segoe UI', size: 20, color: BRAND, bold: true })],
  });
}

// Table helper
function createTable(
  headers: string[],
  rows: string[][],
  colWidths?: number[]
): Table {
  const headerCells = headers.map(
    (h, i) =>
      new TableCell({
        shading: { type: ShadingType.SOLID, color: BRAND },
        verticalAlign: VerticalAlign.CENTER,
        width: colWidths ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
        children: [
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [new TextRun({ text: h, font: 'Segoe UI', size: 18, bold: true, color: WHITE })],
          }),
        ],
      })
  );

  const dataRows = rows.map(
    (row, rowIdx) =>
      new TableRow({
        children: row.map(
          (cell, colIdx) =>
            new TableCell({
              shading: rowIdx % 2 === 1 ? { type: ShadingType.SOLID, color: LIGHT_GRAY } : undefined,
              verticalAlign: VerticalAlign.CENTER,
              width: colWidths ? { size: colWidths[colIdx], type: WidthType.PERCENTAGE } : undefined,
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [new TextRun({ text: cell, font: 'Segoe UI', size: 18, color: '1e293b' })],
                }),
              ],
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: headerCells }), ...dataRows],
  });
}

// Permission table with check/dash
function createPermTable(
  headers: string[],
  rows: { perm: string; values: boolean[] }[],
  colWidths: number[]
): Table {
  const headerCells = headers.map(
    (h, i) =>
      new TableCell({
        shading: { type: ShadingType.SOLID, color: BRAND },
        verticalAlign: VerticalAlign.CENTER,
        width: { size: colWidths[i], type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            alignment: i > 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: 60, after: 60 },
            children: [new TextRun({ text: h, font: 'Segoe UI', size: 18, bold: true, color: WHITE })],
          }),
        ],
      })
  );

  const dataRows = rows.map(
    (row, rowIdx) =>
      new TableRow({
        children: [
          new TableCell({
            shading: rowIdx % 2 === 1 ? { type: ShadingType.SOLID, color: LIGHT_GRAY } : undefined,
            verticalAlign: VerticalAlign.CENTER,
            width: { size: colWidths[0], type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: row.perm, font: 'Segoe UI', size: 18, color: '1e293b' })],
              }),
            ],
          }),
          ...row.values.map(
            (v, colIdx) =>
              new TableCell({
                shading: rowIdx % 2 === 1 ? { type: ShadingType.SOLID, color: LIGHT_GRAY } : undefined,
                verticalAlign: VerticalAlign.CENTER,
                width: { size: colWidths[colIdx + 1], type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 },
                    children: [
                      new TextRun({
                        text: v ? '\u2713' : '\u2014',
                        font: 'Segoe UI',
                        size: 22,
                        bold: v,
                        color: v ? SUCCESS : 'cbd5e1',
                      }),
                    ],
                  }),
                ],
              })
          ),
        ],
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: headerCells }), ...dataRows],
  });
}

// ══════════════════════════════════════════════
// BUILD DOCUMENT
// ══════════════════════════════════════════════

const doc = new Document({
  creator: 'Be Creative Events',
  title: 'EventPass - Technical Overview',
  description: 'Event Accreditation & Access Control Platform',
  styles: {
    default: {
      document: {
        run: { font: 'Segoe UI', size: 20, color: '1e293b' },
        paragraph: { spacing: { line: 276 } },
      },
      listParagraph: {
        run: { font: 'Segoe UI', size: 20 },
      },
    },
  },
  numbering: {
    config: [
      {
        reference: 'bullet-list',
        levels: [
          {
            level: 0,
            format: 'bullet',
            text: '\u2022',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.4), hanging: convertInchesToTwip(0.2) } } },
          },
        ],
      },
    ],
  },
  sections: [
    // ── COVER PAGE ──
    {
      properties: {
        page: {
          margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.2), right: convertInchesToTwip(1.2) },
        },
      },
      children: [
        emptyLine(),
        emptyLine(),
        emptyLine(),
        emptyLine(),
        emptyLine(),
        emptyLine(),
        emptyLine(),
        emptyLine(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: 'EventPass', font: 'Segoe UI', size: 72, bold: true, color: BRAND })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: 'Event Accreditation & Access Control Platform', font: 'Segoe UI', size: 26, color: TEXT_MUTED })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 16 } },
          children: [new TextRun({ text: 'TECHNICAL OVERVIEW', font: 'Segoe UI', size: 20, bold: true, color: ACCENT, characterSpacing: 120 })],
        }),
        emptyLine(),
        emptyLine(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: 'Be Creative Events', font: 'Segoe UI', size: 24, bold: true, color: BRAND })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: 'Document Version 1.0', font: 'Segoe UI', size: 18, color: TEXT_MUTED })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: 'May 2025', font: 'Segoe UI', size: 18, color: TEXT_MUTED })],
        }),
        emptyLine(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'CONFIDENTIAL', font: 'Segoe UI', size: 16, color: '94a3b8', characterSpacing: 80 })],
        }),
      ],
    },

    // ── MAIN CONTENT ──
    {
      properties: {
        page: {
          margin: { top: convertInchesToTwip(0.8), bottom: convertInchesToTwip(0.8), left: convertInchesToTwip(1), right: convertInchesToTwip(1) },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: 'EventPass \u2014 Technical Overview', font: 'Segoe UI', size: 16, color: TEXT_MUTED, italics: true })],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR, space: 4 } },
              children: [new TextRun({ text: 'Be Creative Events  \u2022  Confidential', font: 'Segoe UI', size: 14, color: TEXT_MUTED })],
            }),
          ],
        }),
      },
      children: [
        // ── 1. EXECUTIVE SUMMARY ──
        heading2('1.', 'Executive Summary'),
        bodyText(
          'EventPass is a purpose-built, web-based event accreditation and access control platform developed by Be Creative Events. It provides end-to-end management of event credentials \u2014 from data entry to approval through badge generation and real-time QR-based verification at entry points.'
        ),
        bodyText(
          'Designed for the operational demands of large-scale events in Qatar, EventPass handles multi-phase access control (Bump-In, Live, Bump-Out), supports both Qatar ID (QID) and passport/Hayya identification, and provides a complete audit trail for compliance and security reporting.'
        ),
        calloutBox('The platform is currently deployed in production and has been used to manage accreditation for live events.'),

        // ── 2. CORE CAPABILITIES ──
        heading2('2.', 'Core Capabilities'),
        heading3('2.1', 'Accreditation Management'),
        createTable(
          ['Capability', 'Description'],
          [
            ['Record Creation', 'Create individual accreditation records with personal details, identification documents, company/role, and access group assignment.'],
            ['Bulk Import', 'Import hundreds of records at once via Excel/CSV upload with automatic validation and error reporting per row.'],
            ['Auto-Numbering', 'Sequential accreditation numbers (ACC-0001, ACC-0002, ...) generated automatically for tracking and reference.'],
            ['Photo Management', 'Upload or capture photos for each accredited individual, stored securely in cloud storage for badge and verification use.'],
            ['Flexible Identification', 'Supports Qatar ID (QID, 11-digit format) and Passport with Hayya visa tracking, including document expiry monitoring.'],
            ['Access Groups', 'Categorise accredited individuals into groups (VIP, Media, Staff, General, or custom groups defined per event).'],
          ],
          [25, 75]
        ),

        heading3('2.2', 'Approval Workflow'),
        bodyText('EventPass implements a structured approval workflow to ensure only verified individuals receive event access:'),
        emptyLine(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          shading: { type: ShadingType.SOLID, color: LIGHT_GRAY },
          children: [
            new TextRun({ text: 'DRAFT', font: 'Segoe UI', size: 18, bold: true, color: '475569' }),
            new TextRun({ text: '  \u2192  ', font: 'Segoe UI', size: 18, color: TEXT_MUTED }),
            new TextRun({ text: 'PENDING', font: 'Segoe UI', size: 18, bold: true, color: '92400e' }),
            new TextRun({ text: '  \u2192  ', font: 'Segoe UI', size: 18, color: TEXT_MUTED }),
            new TextRun({ text: 'APPROVED', font: 'Segoe UI', size: 18, bold: true, color: '166534' }),
            new TextRun({ text: '  \u2192  ', font: 'Segoe UI', size: 18, color: TEXT_MUTED }),
            new TextRun({ text: 'REVOKED', font: 'Segoe UI', size: 18, bold: true, color: '9d174d' }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          shading: { type: ShadingType.SOLID, color: LIGHT_GRAY },
          children: [
            new TextRun({ text: 'PENDING \u2192 REJECTED \u2192 RETURN TO DRAFT    |    REVOKED / REJECTED \u2192 REINSTATED', font: 'Segoe UI', size: 16, color: TEXT_MUTED }),
          ],
        }),
        emptyLine(),
        bulletItem('Draft', 'Records can be saved in progress and edited before submission.'),
        bulletItem('Pending', 'Submitted for review; administrators and managers receive email notifications.'),
        bulletItem('Approved', 'Verified and cleared for event access; QR code becomes active.'),
        bulletItem('Rejected', 'Denied with a mandatory reason; can be returned to draft for correction.'),
        bulletItem('Revoked', 'Emergency cancellation; QR code is immediately invalidated.'),
        bulletItem('Reinstated', 'A revoked or rejected accreditation restored by authorised personnel.'),
        emptyLine(),
        bodyText('Every status transition is recorded in a tamper-evident audit trail with the acting user, timestamp, and notes.'),

        // 2.3
        heading3('2.3', 'Multi-Phase Access Control'),
        bodyText('Events are divided into up to three operational phases, each with independently configurable date/time windows:'),
        createTable(
          ['Phase', 'Typical Use'],
          [
            ['Bump-In', 'Venue setup and preparation period. Grants access to crew, contractors, and technical staff before the event opens.'],
            ['Live', 'The main event period. Controls access for attendees, VIPs, media, and staff during the live event.'],
            ['Bump-Out', 'Post-event teardown. Manages access for dismantling crews and equipment removal.'],
          ],
          [18, 82]
        ),
        simpleBullet('Each accredited individual can be assigned access to one or more phases.'),
        simpleBullet('Per-individual date overrides allow fine-grained control (e.g., a contractor with Bump-In access only on specific setup days).'),
        simpleBullet('The system enforces phase boundaries during QR scanning \u2014 an individual with only Live access will be denied during Bump-In.'),

        // 2.4
        new Paragraph({ children: [new PageBreak()] }),
        heading3('2.4', 'QR Code Verification & Scanning'),
        createTable(
          ['Feature', 'Detail'],
          [
            ['QR Generation', 'Unique QR codes generated per approved accreditation, linking to a secure verification token.'],
            ['Batch Generation', 'Generate and export QR codes for an entire event or specific records as a downloadable ZIP.'],
            ['Real-Time Scanning', 'Mobile-optimised scanner interface using the device camera; results displayed instantly with visual pass/fail indicators.'],
            ['Multi-Factor Verification', 'Each scan performs a 5-step check: accreditation status, ID document expiry, phase access rights, phase date/time validity, and overall accreditation validity.'],
            ['Scan Logging', 'Every scan attempt is logged with timestamp, scanner identity, device info, IP address, and scan result.'],
          ],
          [22, 78]
        ),
        emptyLine(),
        bodyText('Scan Result Types:'),
        createTable(
          ['Result', 'Meaning'],
          [
            ['ALLOWED', 'All checks passed \u2014 grant entry.'],
            ['DENIED', 'Accreditation not in approved status.'],
            ['EXPIRED', 'Accreditation or ID document has expired.'],
            ['REVOKED', 'Accreditation has been manually revoked.'],
            ['WRONG PHASE', 'Individual does not have access for the current phase or outside the valid date window.'],
            ['ID EXPIRED', 'QID, passport, or Hayya visa has expired.'],
          ],
          [20, 80]
        ),

        // 2.5
        heading3('2.5', 'Event (Project) Management'),
        bulletItem('Multi-Event Support', 'Manage multiple events with one active at a time; each event maintains its own accreditation records, access groups, and phase configuration. Completed events remain accessible for reporting.'),
        bulletItem('Event Lifecycle', 'Events progress through Draft, Active, Completed, and Archived states.'),
        bulletItem('Event Switching', 'Operators can switch between events via a sidebar selector; the interface automatically adjusts to show relevant records and enforce read-only mode for completed events.'),
        bulletItem('Read-Only Protection', 'Completed and archived events are protected from accidental modification while remaining fully accessible for reporting and audit.'),

        // 2.6
        heading3('2.6', 'Reporting & Analytics'),
        bulletItem('Dashboard', 'Real-time statistics for the active event: total accreditations, status breakdown, recent scan activity.'),
        bulletItem('Scan History', 'Searchable, filterable log of all scan events across all entry points.'),
        bulletItem('Reports', 'Generate summary, by-project, by-company, and scan-activity reports.'),
        bulletItem('Excel Export', 'Export accreditation records and scan history to Excel for offline analysis or submission to event stakeholders.'),

        // ── 3. ROLE-BASED ACCESS CONTROL ──
        new Paragraph({ children: [new PageBreak()] }),
        heading2('3.', 'Role-Based Access Control'),
        bodyText('EventPass implements four distinct user roles with granular permissions:'),
        createPermTable(
          ['Permission', 'Admin', 'Manager', 'Staff', 'Validator'],
          [
            { perm: 'Create/edit accreditations', values: [true, true, true, false] },
            { perm: 'Submit for approval', values: [true, true, true, false] },
            { perm: 'Approve/reject accreditations', values: [true, true, false, false] },
            { perm: 'Revoke/reinstate accreditations', values: [true, true, false, false] },
            { perm: 'Create/manage events', values: [true, true, false, false] },
            { perm: 'Bulk import/export', values: [true, true, false, false] },
            { perm: 'Scan QR codes', values: [true, true, false, true] },
            { perm: 'Manage users', values: [true, false, false, false] },
            { perm: 'Archive events', values: [true, false, false, false] },
            { perm: 'System settings', values: [true, false, false, false] },
          ],
          [40, 15, 15, 15, 15]
        ),
        emptyLine(),
        bulletItem('Admin', 'Full system access including user management and system configuration.'),
        bulletItem('Manager', 'Operational control over events and accreditations; cannot manage other users.'),
        bulletItem('Staff', 'Data entry role for creating and editing accreditation records.'),
        bulletItem('Validator', 'Scan-only access for gate/checkpoint personnel; purpose-built mobile scanning interface.'),

        // ── 4. SECURITY & COMPLIANCE ──
        new Paragraph({ children: [new PageBreak()] }),
        heading2('4.', 'Security & Compliance'),

        heading3('4.1', 'Authentication & Authorisation'),
        bulletItem('JWT-Based Authentication', 'Secure session management using industry-standard JSON Web Tokens.'),
        bulletItem('Password Security', 'All passwords hashed using bcrypt with a cost factor of 12; no plaintext storage.'),
        bulletItem('Invite-Only Registration', 'Users are created by administrators and receive a secure, time-limited email invitation to set their password.'),
        bulletItem('Password Reset', 'Secure token-based password reset flow with automatic token expiration and single-use enforcement.'),
        bulletItem('Route Protection', 'Server-side middleware enforces authentication on all protected routes; unauthenticated requests are redirected.'),

        heading3('4.2', 'Data Security'),
        bulletItem('Server-Side Rendering', 'All sensitive operations execute server-side; client-side code never handles credentials or raw database access.'),
        bulletItem('Input Validation', 'Every API endpoint validates input using schema-based validation (Zod) with strict type checking. No unvalidated data reaches the database.'),
        bulletItem('Role Enforcement', 'Permission checks are enforced at the API layer, not just the UI; even direct API calls are subject to role verification.'),
        bulletItem('Unique Verification Tokens', 'Each accreditation receives a cryptographically unique token for QR verification; tokens cannot be guessed or enumerated.'),

        heading3('4.3', 'Audit Trail'),
        bulletItem('Immutable Records', 'All status transitions and scan attempts are permanently logged and cannot be modified or deleted.'),
        bulletItem('Full Attribution', 'Every entry records the acting user, timestamp, and reason for compliance and post-event reporting.'),

        heading3('4.4', 'ID Document Compliance'),
        bulletItem('Qatar ID (QID) Validation', 'Enforces the 11-digit QID format with expiry date tracking.'),
        bulletItem('Passport + Hayya Tracking', 'For non-QID holders, tracks passport details alongside Hayya visa number and expiry, ensuring compliance with Qatar entry requirements.'),
        bulletItem('Expiry Enforcement', 'The system prevents QR verification if identification documents have expired, with advance warnings for approaching expiry dates.'),
        bulletItem('Expiry Coverage Check', 'At the point of accreditation creation, the system validates that ID documents remain valid through the end of all assigned event phases.'),

        // ── 5. TECHNICAL ARCHITECTURE ──
        new Paragraph({ children: [new PageBreak()] }),
        heading2('5.', 'Technical Architecture & Deployment'),

        heading3('5.1', 'Technology Stack'),
        createTable(
          ['Layer', 'Technology'],
          [
            ['Application', 'Next.js 16 (React 19), TypeScript 5 strict mode'],
            ['Database', 'PostgreSQL with Prisma 5 ORM'],
            ['Authentication', 'NextAuth.js (JWT strategy)'],
            ['File Storage', 'Supabase Storage (cloud-hosted)'],
            ['Email', 'Resend (transactional notifications)'],
            ['Hosting', 'Vercel (serverless, auto-scaling, HTTPS enforced)'],
          ],
          [22, 78]
        ),

        heading3('5.2', 'Architecture'),
        bodyText('The platform follows a server-first architecture with React Server Components by default, API Route Handlers for all data mutations, and stateless JWT-based sessions for horizontal scalability.'),

        heading3('5.3', 'Deployment'),
        bodyText('The platform is deployed on Vercel with automated CI/CD pipelines, managed PostgreSQL with automated backups, and structured logging with request ID correlation for monitoring. The serverless architecture scales automatically with no manual server management.'),

        // ── CLOSING ──
        emptyLine(),
        emptyLine(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR, space: 12 } },
          children: [
            new TextRun({
              text: 'This document describes the EventPass platform as currently deployed in production.',
              font: 'Segoe UI',
              size: 17,
              color: TEXT_MUTED,
              italics: true,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'Feature availability and specifications are subject to ongoing development and enhancement.',
              font: 'Segoe UI',
              size: 17,
              color: TEXT_MUTED,
              italics: true,
            }),
          ],
        }),
      ],
    },
  ],
});

// ── GENERATE ──
async function generate() {
  const buffer = await Packer.toBuffer(doc);
  const outPath = './docs/EventPass-Technical-Overview.docx';
  fs.writeFileSync(outPath, buffer);
  console.log(`Word document generated: ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

generate().catch(console.error);
