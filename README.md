# AICTE Integrated Institution Complaint Monitoring and Status Dashboard

> **Single Source of Truth** for technical institution grievance monitoring, inter-bureau collision prevention, and statutory SLA compliance across AICTE (All India Council for Technical Education). Designed for zero-downtime, serverless deployment on **Vercel** with **Neon / PostgreSQL** and **Prisma ORM**.

---

## 1. System Context & Architecture

### The Problem
AICTE receives thousands of grievances from students, faculty, trusts, and general stakeholders regarding technical colleges across India. Multiple AICTE Bureaus and Cells—including the **Regulation Bureau (RB)**, **Public Grievance Redressal Cell (PGRC)**, **Approval Bureau (AB)**, and **Skill Development Cell (SDC)**—traditionally process complaints independently. 

Without a centralized, real-time platform:
- Inquiries frequently duplicate effort on the same institution.
- Bureaus issue overlapping or contradictory show-cause notices.
- Complaints breach statutory resolution timelines without senior management visibility.
- Regional Offices lack jurisdiction clarity.

### The Solution: AICTE Single Source of Truth
This prototype provides an authorized, role-guarded platform that unifies all grievance data. It includes an **Automated Cross-Bureau Overlap Detection Engine** that prevents duplicate actions, an **SLA Countdown & Warning Engine**, append-only verifiable audit logs, and instant serverless CSV/PDF reporting.

```
                           ┌────────────────────────────────────────────────────────┐
                           │                  Next.js 15 App Router                 │
                           │  React Server Components • Server Actions • Middleware │
                           └──────────────┬──────────────────────────┬──────────────┘
                                          │                          │
                 ┌────────────────────────┴─────────┐     ┌──────────┴─────────────────────────┐
                 │        Application Services       │     │          Security & Data           │
                 ├──────────────────────────────────┤     ├────────────────────────────────────┤
                 │ • OverlapDetector (Trigram+Geo)  │     │ • Auth.js v5 JWT Sessions          │
                 │ • SlaEngine (Countdown & Ageing) │     │ • RBAC Authorization Guards        │
                 │ • Vercel Blob File Storage       │     │ • Prisma ORM 7 + @prisma/adapter-pg│
                 │ • Serverless PDF Generator       │     │ • PostgreSQL + pg_trgm Extension   │
                 └────────────────┬─────────────────┘     └──────────┬─────────────────────────┘
                                  │                                  │
                                  ▼                                  ▼
                     ┌───────────────────────────┐      ┌───────────────────────────┐
                     │     Vercel Serverless     │      │   Neon / Vercel Postgres  │
                     │ Cron Jobs (SLA & Overlap) │      │   Pooled + Direct Schema  │
                     └───────────────────────────┘      └───────────────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 15 (App Router) + TypeScript | React Server Components, Route Handlers, and Server Actions |
| **Styling & UI** | Tailwind CSS + Lucide Icons + Glassmorphism | Professional government portal aesthetics, high-contrast badges |
| **Data Visualization** | Recharts | Bureau Workload (Bar), Status (Donut), Ageing (Bar), Trends (Line) |
| **Database & ORM** | PostgreSQL 16 + Prisma ORM 7 | Pooled `DATABASE_URL` runtime, direct `DIRECT_URL` migrations |
| **Postgres Extensions** | `pg_trgm` (trigram fuzzy matching) | Catching misspelled institutions across bureaus |
| **Authentication** | Auth.js (NextAuth v5) + `bcryptjs` | Credentials provider, JWT session tokens, Edge middleware |
| **File Storage** | `@vercel/blob` | Supporting grievance petitions, orders, and evidence (10MB limit) |
| **Scheduled Jobs** | Vercel Cron Jobs (`vercel.json`) | Automated SLA breach scan, reminder dispatch, batch overlap scan |
| **Live Polling** | SWR / React Client Polling (30s) | Serverless-compatible real-time dashboard updates without WebSockets |
| **Reporting** | `pdf-lib` + Streaming CSV | Native serverless PDF & CSV report generation (no Puppeteer bloat) |
| **Testing** | Vitest | 38 unit tests across 6 suites covering Overlap Detection, SLA Engine, RBAC, Risk Engine, Audit Chain, and Sentinel Features |

---

## 3. User Roles (RBAC) & Demo Credentials

Every role has tailored permissions enforced in middleware and at the server action layer:
- **Officers** can mutate only cases assigned to their own Bureau/Cell; other bureaus are strictly read-only.
- **Regional Officers** are defaulted to their regional jurisdiction (e.g. Northern Region).
- **Senior Management (Chairman / Member Secretary)** has full read-all visibility across all bureaus, analytics, and escalation alerts.
- **Admin** has system administration and audit log visibility.

| Role | Demo Email | Password | Bureau Jurisdiction | Designation / Persona |
|---|---|---|---|---|
| **Admin** | `admin@aicte.gov.in` | `AdminPassword@123` | `ALL` | Chief System Administrator & Director (IT) |
| **Competent Authority** | `chairman@aicte.gov.in` | `Chairman@123` | `ALL` | Hon'ble Chairman & Competent Authority, AICTE |
| **Regulation Bureau** | `rb.officer@aicte.gov.in` | `Officer@123` | `REGULATION_BUREAU` | Adviser & Bureau Head (Regulation Bureau) |
| **PGRC Officer** | `pgrc.officer@aicte.gov.in` | `Officer@123` | `PGRC` | Director & Nodal Officer (Public Grievance Redressal Cell) |
| **Approval Bureau** | `ab.officer@aicte.gov.in` | `Officer@123` | `APPROVAL_BUREAU` | Director (Approval Bureau) |
| **Regional Officer** | `ro.north@aicte.gov.in` | `Officer@123` | `ALL` (Northern Region) | Regional Officer (Northern Regional Office - Kanpur) |

> 💡 **Quick Login:** The `/login` page provides **1-Click Persona Buttons** to switch between roles instantly during demo evaluations.

---

## 4. API & Server Action Reference

### Server Actions (`src/actions/*`)

| Server Action | Input Schema (Zod) | RBAC Guard | Description |
|---|---|---|---|
| `updateCaseStatusAction` | `caseId, status, remarks, attachments?` | Assigned Bureau / Admin / Mgt | Changes status (Pending, Under Process, Disposed, etc.) and appends to immutable action history |
| `transferCaseAction` | `caseId, toBureau, remarks, attachments?` | Assigned Bureau / Admin / Mgt | Reassigns case to another Bureau with mandatory justification |
| `escalateCaseAction` | `caseId, remarks, attachments?` | Assigned Bureau / Admin / Mgt | Flags case to Competent Authority, elevates priority to `CRITICAL` |
| `addRemarkAction` | `caseId, remarks, attachments?` | Assigned Bureau / Admin / Mgt | Appends verification notes or evidence documents to vertical timeline |
| `linkCasesAction` | `caseAId, caseBId, linkType, note?` | Any Officer | Connects cases as `OVERLAP`, `DUPLICATE`, or `RELATED` |
| `createCaseAction` | `aicte_permanent_id, source, category, description, assigned_bureau, priority` | Any Officer | Registers complaint; **triggers real-time Overlap Detector** |
| `coordinateOverlapAction` | `alertId, coordinationNote` | Bureaus Involved / Mgt / Admin | Marks overlap alert coordinated and auto-links cases |
| `mergeOverlapAction` | `alertId, masterCaseId, mergeNote` | Bureaus Involved / Mgt / Admin | **Consolidates colliding files under an established master docket**, links duplicate cases, and suspends parallel proceedings |
| `dismissOverlapAction` | `alertId, dismissedReason` | Bureaus Involved / Mgt / Admin | Dismisses false-positive collision with mandatory rationale |
| `simulateIngestionAction` | `channel, category, priority, institutionId, description` | Authenticated Officer | Ingests real-time synthetic or custom grievance through the live classification and collision detection pipeline |
| `markNotificationReadAction` | `notificationId` | Authenticated Officer | Marks targeted notification as read |

### Route Handlers (`src/app/api/*`)

| Route | Method | Security | Purpose |
|---|---|---|---|
| `/api/auth/[...nextauth]` | `GET`, `POST` | Public | Auth.js authentication lifecycle & session management |
| `/api/dashboard/metrics` | `GET` | Session | Real-time SWR / 30s polling metrics for dashboard charts |
| `/api/institutions/list` | `GET` | Session | Lightweight list of institutions for case registration selector |
| `/api/search` | `GET` | Session | High-speed multi-entity fuzzy search for the Sentinel Command Palette |
| `/api/notices/show-cause/[caseId]` | `GET` | Session | Generates official, printable statutory show-cause notices compliant with AICTE APH Chapter VII |
| `/api/audit/verify` | `GET` | Admin / Authority | Verifies full cryptographic integrity of the SHA-256 anchored audit ledger |
| `/api/upload` | `POST` | Session | Validates type/size and stores files in Vercel Blob |
| `/api/reports/csv` | `GET` | Session | Generates streaming CSV export respecting URL query filters |
| `/api/reports/pdf` | `GET` | Session | Serverless executive PDF report generated using `pdf-lib` |
| `/api/cron/sla-check` | `GET` | `Bearer CRON_SECRET` | Scheduled check: flags approaching (80%) and breached SLAs |
| `/api/cron/overlap-scan` | `GET` | `Bearer CRON_SECRET` | Scheduled batch scan: runs `overlapDetector.batchScan` |
| `/api/cron/reminders` | `GET` | `Bearer CRON_SECRET` | Scheduled check: alerts bureaus on cases pending > 7 days |

---

## 5. Cross-Bureau Overlap Detection & Trilayer Explainability

The `OverlapDetector` service implements a multi-tiered collision prevention algorithm:

1. **Rule 1 (Exact Match):** Identifies active non-disposed cases sharing the exact same `aicte_permanent_id` assigned to two or more distinct Bureaus (e.g., Case `AICTE/PGRC/2026/00101` in PGRC and Case `AICTE/RB/2026/00042` in Regulation Bureau for Apex Institute).
2. **Rule 2 (Fuzzy Name & Location):** Strips educational stop words (`college`, `institute`, `technology`, `engineering`) and executes character trigram Jaccard similarity (identical to PostgreSQL `pg_trgm`). Matches with $\ge 65\%$ name similarity corroborated by identical PIN code or City trigger collision alerts.
3. **Rule 3 (Content & Category Similarity):** Compares grievance subject categories and tokenized description overlaps.
4. **Scoring & Alert Deduplication:** Overlaps are scored as **HIGH**, **MEDIUM**, or **LOW** confidence, generating deduplicated alerts bearing the exact required notice:
   > **"Potential Overlapping Cases – Coordination Required"**

---

## 6. Sentinel Intelligence & Enforcement Layer (Hackathon Differentiators)

Capabilities built specifically to demonstrate what a modern grievance command centre can do. Every component is deterministic, offline-capable, and needs no external paid AI keys, so the entire demo runs from a clean `npm run dev`.

### 6.1 Sentinel Command Palette (`Ctrl/Cmd + K`)
A keyboard-first command surface available on every page.
- Fuzzy search across cases, institutions, and static navigation.
- Quick actions: toggle theme, export CSV, jump to the collision review queue.
- Recent destinations persisted in `localStorage`; full arrow-key/Enter/Esc support and ARIA combobox semantics.
- Backed by `/api/search`, which is session-guarded and searches case ID, category, description, institution, city, and region.

### 6.2 Sentinel Risk Radar & Breach Horizons (Dashboard)
A portfolio breach forecast that replaces "trust me" scoring with an audit-ready model.
- **Exposure index** (0-100), overdue count, critical count, and 7/15/30-day breach horizons.
- **Priority watchlist** ranked by score, with the strongest driver printed on each row.
- **Visible weights:** SLA pressure 45, priority 15, stagnation 12, overlap 10, churn 8, statutory category 6.
- Bands: `CRITICAL ≥ 80`, `HIGH ≥ 60`, `MODERATE ≥ 40`, `LOW < 40`.
- Refreshes automatically with the 30-second dashboard poll.

### 6.3 Sentinel Brief (Case Workspace)
Per-file explanation of *why* the case is ranked where it is, and what to do next.
- Score gauge, band, elapsed vs. statutory clock, and the top three weighted drivers with point values.
- **Recommended next action** wired directly into the existing status, escalation, transfer, remark, and link workflows.
- Peer benchmark against similar closed files (sample size, median resolution days, delta).
- Read-only lock for officers outside the assigned bureau.

### 6.4 Collision Topology & Fast Queue Navigation (`/alerts`)
An interactive institution → bureau flow map of live cross-bureau collisions.
- Link thickness encodes the number of parallel cases; hover reveals institution, bureau, count, and confidence.
- Clicking any link or node filters the alert list, scrolls to the matching card, and highlights it.
- **Smooth Queue Navigation:** The "Review queue" button and top summary KPI cards smoothly scroll straight down past the topology graph directly into the review queue (`#alerts-queue`), pre-filtering to the desired status.

### 6.5 Trilayer Explainability Panel
Replaces opaque AI decisions with transparent, defensible matching across three audit layers:
1. **Layer 1: Deterministic Entity Match:** Matches verified AICTE Permanent ID, address coordinates, city/state, and institutional alias deduplication.
2. **Layer 2: Statutory Taxonomy Overlap:** Compares statutory grievance categories (e.g. Capitation Fee, Faculty Unpaid Wages, Ragging, Infrastructure Deficiency) across reporting bureaus.
3. **Layer 3: Semantic Narrative Convergence:** Analyzes tokenized narrative overlap, keyword clustering, and recurring complainant signatures across independent filings.

### 6.6 Master Docket Establishment & Consolidation (`mergeOverlapAction`)
When cross-bureau inquiries collide, officers can designate a single **Master Docket** (typically the oldest, primary file):
- Subordinate cases are automatically cross-linked as duplicates.
- Redundant parallel proceedings are suspended to protect administrative resources and prevent contradictory bureau notices.
- All subsequent directives and evidence become unified under the lead bureau.

### 6.7 AICTE Approval Process Handbook (APH) Enforcement Engine
Translates grievance patterns directly into statutory enforcement actions governed by **AICTE Approval Process Handbook (APH) Chapter VII**:
- **Statutory Violation Mapping:** Automatically identifies applicable clauses (e.g., Clause 7.1/7.2/7.3 for excess fees, withholding certificates, or unapproved programs).
- **Proportional Penal Recommendations:** Evaluates repeat offense history and suggests calibrated statutory penalties: reduction in approved intake, "No Admission" status, withdrawal of approval, or forfeiture of security deposit.
- **Official Statutory Show-Cause Notice Generator (`/api/notices/show-cause/[caseId]`):** Formulates formal, printable legal show-cause notices pre-populated with statutory citations, factual allegations, hearing dates, and Competent Authority sign-off blocks.

### 6.8 Live Grievance Ingestion Simulator
An interactive simulator allowing evaluators to inject synthetic or custom complaints in real time:
- Ingest across simulated channels (Student Portal, National Grievance Portal, Vigilance Cell, Anonymous Whistleblower).
- Watch the live pipeline classify categories, calculate SLA deadlines, run trigram fuzzy matching, and flag collision alerts on the fly.

### 6.9 Tamper-Evident SHA-256 Audit Chain (`/audit`)
SHA-256 hash chain over the append-only ledger.
- Canonical payload: `seq | prevHash | user | action | entity | entityId | ip | timestamp | before | after`.
- Genesis block `GENESIS`; each block displays its sequence, previous hash, and sealed hash.
- **Verify ledger integrity** re-computes every hash server-side (`/api/audit/verify`, Admin/Authority only) and compares against the anchored prefix, so an edited payload, actor, IP, timestamp, or a deleted block is detected and reported as `broken at #NNNN`.
- Chain head is copyable for evidence packs; the ledger opens per-entry JSON with block, previous hash, and sealed hash.

### 6.10 Motion & Accessibility Layer
Purposeful, GPU-friendly motion that explains state changes rather than decorating them:
- Ambient aurora drift and single scan beam in the command hero; route transition progress beam.
- Count-up metric animations with eased RAF loops; topology draw-in and audit verification sweeps.
- Full respect for `prefers-reduced-motion: reduce`, instantly presenting final states without animation loops.

> **Why it stands out:** Every capability is explainable and inspectable. A judge can click any risk score to inspect its arithmetic, trace a collision through all three explainability layers, generate a statutory show-cause notice, or verify 80+ audit blocks cryptographically — completely offline, with zero third-party API dependencies.

---

## 7. Local Setup Instructions

### Prerequisites
- Node.js `v20+` or `v22+`
- npm `v10+`
- (Optional) Docker for local PostgreSQL

### Step 1: Clone and Install
```bash
git clone <repository-url>
cd proj_sih
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### Step 3: Start Local PostgreSQL (via Docker)
If using Docker:
```bash
docker compose up -d
```
This spins up PostgreSQL 16 on `localhost:5432` with `pg_trgm` automatically enabled.

### Step 4: Run Migrations & Seed Data
```bash
npx prisma migrate deploy
npm run prisma:seed # or: npx tsx prisma/seed.ts
```
*Note: Even without a live PostgreSQL instance, the platform features a zero-dependency in-memory repository fallback loaded with all ~60 institutions, 300 cases, and 10 overlap scenarios so the UI can be run and tested immediately!*

### Step 5: Run Unit Tests
```bash
npm test
```
Runs 38 Vitest unit tests across 6 test suites verifying Overlap Detection, SLA Calculations, RBAC rules, the explainable Risk Engine, the tamper-evident Audit Chain, and Sentinel Intelligence Features.

### Step 6: Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 8. Step-by-Step Vercel Deployment

1. **Push to GitHub / GitLab:**
   Push this project repository to your Git provider.
2. **Create Project on Vercel:**
   Import the Git repository on the Vercel Dashboard.
3. **Attach Neon / Vercel Postgres:**
   - Under the **Storage** tab on Vercel, attach a **Neon** or **Vercel Postgres** database.
   - Vercel automatically exposes `DATABASE_URL` (pooled) and `DIRECT_URL` (direct).
4. **Attach Vercel Blob:**
   - Under **Storage**, create a new **Blob Store** and link it to this project.
   - Vercel automatically exposes `BLOB_READ_WRITE_TOKEN`.
5. **Set Environment Variables in Vercel Settings:**
   - `AUTH_SECRET`: Random 32+ character string (e.g. `openssl rand -base64 32`). Required in production; the app refuses to start without it.
   - **Do not set `NEXTAUTH_URL` (or `AUTH_URL`) to `http://localhost:3000`.** Auth.js uses it to build absolute redirects, which sends users to localhost after logout. Leave it unset so the request host is used (host trust is enabled), or set it to the exact public origin, e.g. `AUTH_URL=https://your-vercel-domain.vercel.app`.
   - `CRON_SECRET`: Secure bearer token for Vercel Cron jobs. Cron routes fail closed in production when this is missing.
6. **Deploy & Apply Migrations:**
   Run deploy, then in the Vercel CLI or via GitHub Action:
   ```bash
   npx prisma migrate deploy
   npx tsx prisma/seed.ts
   ```
7. **Cron Verification:**
   Vercel reads `vercel.json` and schedules the SLA check, batch overlap scan, and reminder jobs automatically.

---

## 9. End-to-End Demo Script Walkthrough

Follow this 12-step script to demonstrate all system capabilities during evaluation:

```
[1. Login] ──> [2. Ingestion Simulator] ──> [3. Dashboard & KPIs] ──> [4. Overlap & Trilayer]
     │                                                                           │
     ▼                                                                           ▼
[12. Audit Integrity] <── [11. APH Show-Cause] <── [10. Master Docket] <── [5. Side-by-Side]
```

1. **Login:**
   Navigate to `/login`. Click the **Dr. Ramesh Unnikrishnan (Regulation Bureau)** quick persona button to authenticate with `REGULATION_OFFICER` permissions.
2. **Live Ingestion Simulator:**
   Open the **Live Ingestion Simulator** on the dashboard. Ingest a synthetic multi-channel grievance (e.g. from the National Grievance Portal or an Anonymous Whistleblower) and watch the pipeline automatically classify the category, assign SLA statutory clocks, run trigram similarity, and trigger instant collision alerts.
3. **Dashboard & Workload Analytics:**
   View real-time KPI cards. Notice **"Open Overlap Alerts"** flagged in red and the glowing alert banner. Examine the **Bureau Workload** and **Pending Ageing** charts. Click on any bureau bar to filter cases.
4. **Overlap Alerts Hub & Review Queue:**
   Open `/alerts`. Click the banner's **"Review queue"** button or any of the summary KPI cards (e.g. *Open collisions*, *High confidence*) to smoothly jump down to the queue. Inspect the **Collision Topology** flow map showing cross-bureau friction.
5. **Trilayer Explainability:**
   On any open collision card, inspect the **Trilayer Explainability Panel**:
   - **Layer 1 (Entity):** Verified AICTE Permanent ID and geographic coordinates.
   - **Layer 2 (Taxonomy):** Overlapping statutory violation categories across reporting bureaus.
   - **Layer 3 (Narrative):** Semantic content convergence and recurring complainant phrases.
6. **Master Docket Establishment & Consolidation:**
   Click **"Confirm & establish master docket"**. Confirm the oldest active case as the primary file. Subordinate parallel cases are instantly consolidated as duplicates, preventing duplicated administrative effort and contradictory bureau notices.
7. **Side-by-Side Comparison:**
   Click **"Track"** on case `AICTE/RB/2026/00042` (`/cases/case_00042`). Notice the prominent warning banner: *"Potential Overlapping Cases – Coordination Required"*. Click **"Compare Side-by-Side"** to inspect colliding files simultaneously.
8. **Case Workflow Mutation (Transfer Bureau):**
   Click **"Transfer Bureau"**. Select **"Approval Bureau"**, enter a justification, and submit. Observe that the case status immediately switches to `TRANSFERRED` and the action is appended to the immutable vertical timeline.
9. **SLA Countdown & Warning:**
   Navigate to `/cases?sla_status=BREACHED`. Observe colour-coded countdown chips showing overdue days in crimson, approaching thresholds in amber, and normal timelines in emerald.
10. **APH Enforcement & Statutory Show-Cause Generator:**
    On the case details page, expand the **Enforcement Panel (APH Chapter VII)**. Review recommended statutory sanctions (intake reduction / no-admission status). Click **"Generate Statutory Show-Cause Notice"** to preview and download the official legal notice ready for service.
11. **Sentinel Command Palette:**
    Press **Ctrl/Cmd + K** anywhere. Type `apex` to open a case in one keystroke, or run *Switch to dark mode* / *Export case register* without leaving the keyboard.
12. **Tamper-Evident SHA-256 Audit Verification:**
    Navigate to `/audit`. Inspect the chronological ledger with chained block hashes. Click **"Verify ledger integrity"** — the server recomputes every SHA-256 block from genesis and confirms full chain validity with a copyable cryptographic head hash.
13. **Export Official Reports:**
    Navigate to `/reports`. Click **"Download Official PDF Report"** to generate the executive report via `pdf-lib`, or click **"Export CSV Dataset"** for the full data grid.

---

## 10. Future Enhancements

1. **Parichay / MeriPehchaan Government SSO:**
   Integration with National Single Sign-On (NSSO / Jan Parichay) for seamless, passwordless login by central and state government officials.
2. **Existing AICTE Portal Integration:**
   Direct bi-directional sync with the AICTE Web Portal (approval system), National Scholarship Portal (NSP), and SAMARTH e-Gov suite via secure REST / webhook interfaces.
3. **LLM-Based Multi-Lingual Semantic Matching:**
   Plugging an AICTE grievance LLM behind the existing `IOverlapDetector` interface to match grievances written in regional Indian languages (Hindi, Tamil, Marathi, Telugu, Bengali) via vector embeddings.
4. **Multi-Channel Citizen Notifications:**
   Automated SMS and WhatsApp dispatch via CDAC National Mobile Governance Gateway (MSDG) informing students and faculty whenever inquiry milestones are logged.
5. **NIC / MeghRaj Cloud Migration:**
   Seamless containerized deployment to National Informatics Centre (NIC) MeghRaj Cloud infrastructure using the included Docker and PostgreSQL configuration when government data center hosting is required.
