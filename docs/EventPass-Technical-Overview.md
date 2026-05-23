# EventPass

## Event Accreditation & Access Control Platform

**Developed by Be Creative Events**

---

## 1. Executive Summary

EventPass is a purpose-built, web-based event accreditation and access control platform developed by Be Creative Events. It provides end-to-end management of event credentials -- from data entry to approval through badge generation and real-time QR-based verification at entry points.

Designed for the operational demands of large-scale events in Qatar, EventPass handles multi-phase access control (Bump-In, Live, Bump-Out), supports both Qatar ID (QID) and passport/Hayya identification, and provides a complete audit trail for compliance and security reporting.

The platform is currently deployed in production and has been used to manage accreditation for live events.

---

## 2. Core Capabilities

### 2.1 Accreditation Management

| Capability | Description |
|------------|-------------|
| **Record Creation** | Create individual accreditation records with personal details, identification documents, company/role, and access group assignment. |
| **Bulk Import** | Import hundreds of records at once via Excel/CSV upload with automatic validation and error reporting per row. |
| **Auto-Numbering** | Sequential accreditation numbers (ACC-0001, ACC-0002, ...) generated automatically for tracking and reference. |
| **Photo Management** | Upload or capture photos for each accredited individual, stored securely in cloud storage for badge and verification use. |
| **Flexible Identification** | Supports Qatar ID (QID, 11-digit format) and Passport with Hayya visa tracking, including document expiry monitoring. |
| **Access Groups** | Categorise accredited individuals into groups (VIP, Media, Staff, General, or custom groups defined per event) for differentiated access. |

### 2.2 Approval Workflow

EventPass implements a structured approval workflow to ensure only verified individuals receive event access:

```
DRAFT  -->  PENDING  -->  APPROVED  -->  [REVOKED]
                |                           |
                v                           v
            REJECTED                   REINSTATED
                |
                v
          RETURN TO DRAFT
```

- **Draft** -- Records can be saved in progress and edited before submission.
- **Pending** -- Submitted for review; administrators and managers receive email notifications of pending approvals.
- **Approved** -- Verified and cleared for event access; QR code becomes active for scanning.
- **Rejected** -- Denied with a mandatory reason; can be returned to draft for correction and resubmission.
- **Revoked** -- Emergency cancellation of an approved accreditation (e.g., security concern); QR code is immediately invalidated.
- **Reinstated** -- A revoked or rejected accreditation can be restored to approved status by authorised personnel.

Every status transition is recorded in a tamper-evident audit trail with the acting user, timestamp, and notes.

### 2.3 Multi-Phase Access Control

Events are divided into up to three operational phases, each with independently configurable date/time windows:

| Phase | Typical Use |
|-------|-------------|
| **Bump-In** | Venue setup and preparation period. Grants access to crew, contractors, and technical staff before the event opens. |
| **Live** | The main event period. Controls access for attendees, VIPs, media, and staff during the live event. |
| **Bump-Out** | Post-event teardown. Manages access for dismantling crews and equipment removal. |

- Each accredited individual can be assigned access to one or more phases.
- Per-individual date overrides allow fine-grained control (e.g., a contractor with Bump-In access only on specific setup days).
- The system enforces phase boundaries during QR scanning -- an individual with only Live access will be denied during Bump-In.

### 2.4 QR Code Verification & Scanning

| Feature | Detail |
|---------|--------|
| **QR Generation** | Unique QR codes generated per approved accreditation, linking to a secure verification token. |
| **Batch Generation** | Generate and export QR codes for an entire event or specific records as a downloadable ZIP. |
| **Real-Time Scanning** | Mobile-optimised scanner interface using the device camera; results displayed instantly with visual pass/fail indicators. |
| **Multi-Factor Verification** | Each scan performs a 5-step check: accreditation status, ID document expiry, phase access rights, phase date/time validity, and overall accreditation validity. |
| **Scan Logging** | Every scan attempt (successful or denied) is logged with timestamp, scanner identity, device info, IP address, and scan result. |

**Scan Result Types:**

| Result | Meaning |
|--------|---------|
| ALLOWED | All checks passed -- grant entry. |
| DENIED | Accreditation not in approved status. |
| EXPIRED | Accreditation or ID document has expired. |
| REVOKED | Accreditation has been manually revoked. |
| WRONG_PHASE | Individual does not have access for the current phase or is outside the valid date window. |
| ID_EXPIRED | QID, passport, or Hayya visa has expired. |

### 2.5 Event (Project) Management

- **Multi-Event Support** -- Manage multiple events with one active at a time; each event maintains its own accreditation records, access groups, and phase configuration. Completed events remain accessible for reporting.
- **Event Lifecycle** -- Events progress through Draft, Active, Completed, and Archived states.
- **Event Switching** -- Operators can switch between events via a sidebar selector; the interface automatically adjusts to show relevant records and enforce read-only mode for completed events.
- **Read-Only Protection** -- Completed and archived events are protected from accidental modification while remaining fully accessible for reporting and audit.

### 2.6 Reporting & Analytics

- **Dashboard** -- Real-time statistics for the active event: total accreditations, status breakdown, recent scan activity.
- **Scan History** -- Searchable, filterable log of all scan events across all entry points.
- **Reports** -- Generate summary, by-project, by-company, and scan-activity reports.
- **Excel Export** -- Export accreditation records and scan history to Excel for offline analysis or submission to event stakeholders.

---

## 3. Role-Based Access Control

EventPass implements four distinct user roles with granular permissions:

| Permission | Admin | Manager | Staff | Validator |
|------------|:-----:|:-------:|:-----:|:---------:|
| Create/edit accreditations | Yes | Yes | Yes | -- |
| Submit for approval | Yes | Yes | Yes | -- |
| Approve/reject accreditations | Yes | Yes | -- | -- |
| Revoke/reinstate accreditations | Yes | Yes | -- | -- |
| Create/manage events | Yes | Yes | -- | -- |
| Bulk import/export | Yes | Yes | -- | -- |
| Scan QR codes | Yes | Yes | -- | Yes |
| Manage users | Yes | -- | -- | -- |
| Archive events | Yes | -- | -- | -- |
| System settings | Yes | -- | -- | -- |

- **Admin** -- Full system access including user management and system configuration.
- **Manager** -- Operational control over events and accreditations; cannot manage other users.
- **Staff** -- Data entry role for creating and editing accreditation records.
- **Validator** -- Scan-only access for gate/checkpoint personnel; purpose-built mobile scanning interface.

---

## 4. Security & Compliance

### 4.1 Authentication & Authorisation

- **JWT-Based Authentication** -- Secure session management using industry-standard JSON Web Tokens.
- **Password Security** -- All passwords hashed using bcrypt with a cost factor of 12; no plaintext storage.
- **Invite-Only Registration** -- Users are created by administrators and receive a secure, time-limited email invitation to set their password.
- **Password Reset** -- Secure token-based password reset flow with automatic token expiration and single-use enforcement.
- **Route Protection** -- Server-side middleware enforces authentication on all protected routes; unauthenticated requests are redirected.

### 4.2 Data Security

- **Server-Side Rendering** -- All sensitive operations execute server-side; client-side code never handles credentials or raw database access.
- **Input Validation** -- Every API endpoint validates input using schema-based validation (Zod) with strict type checking. No unvalidated data reaches the database.
- **Role Enforcement** -- Permission checks are enforced at the API layer, not just the UI; even direct API calls are subject to role verification.
- **Unique Verification Tokens** -- Each accreditation receives a cryptographically unique token for QR verification; tokens cannot be guessed or enumerated.

### 4.3 Audit Trail

- **Immutable Records** -- All status transitions and scan attempts are permanently logged and cannot be modified or deleted.
- **Full Attribution** -- Every entry records the acting user, timestamp, and reason for compliance and post-event reporting.

### 4.4 ID Document Compliance

- **Qatar ID (QID) Validation** -- Enforces the 11-digit QID format with expiry date tracking.
- **Passport + Hayya Tracking** -- For non-QID holders, tracks passport details alongside Hayya visa number and expiry, ensuring compliance with Qatar entry requirements.
- **Expiry Enforcement** -- The system prevents QR verification if identification documents have expired, with advance warnings for approaching expiry dates.
- **Expiry Coverage Check** -- At the point of accreditation creation, the system validates that ID documents remain valid through the end of all assigned event phases.

---

## 5. Technical Architecture & Deployment

### 5.1 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Application** | Next.js 16 (React 19), TypeScript 5 strict mode |
| **Database** | PostgreSQL with Prisma 5 ORM |
| **Authentication** | NextAuth.js (JWT strategy) |
| **File Storage** | Supabase Storage (cloud-hosted) |
| **Email** | Resend (transactional notifications) |
| **Hosting** | Vercel (serverless, auto-scaling, HTTPS enforced) |

### 5.2 Architecture Overview

```
+---------------------------+
|     Client (Browser)      |
|  React 19 / Next.js SSR   |
|  Mobile QR Scanner (PWA)  |
+-------------|-------------+
              | HTTPS
+-------------|-------------+
|    Next.js App Router     |
|  Server Components (RSC)  |
|  API Routes (REST)        |
|  Middleware (Auth Guard)   |
+------|-----------|--------+
       |           |
+------v---+  +----v--------+
| PostgreSQL|  | Supabase    |
| (Prisma)  |  | Storage     |
| Records,  |  | (Photos)    |
| Users,    |  +-------------+
| Scans,    |
| Audit Log |  +-----------+
+-----------+  | Resend    |
               | (Email)   |
               +-----------+
```

### 5.3 Deployment

The platform is deployed on Vercel with automated CI/CD pipelines, managed PostgreSQL with automated backups, and structured logging with request ID correlation for monitoring. The serverless architecture scales automatically with no manual server management.

---

*This document describes the EventPass platform as currently deployed in production. Feature availability and specifications are subject to ongoing development and enhancement.*
