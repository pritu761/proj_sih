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
| **Testing** | Vitest | 18 unit tests covering Overlap Detection, SLA Engine, and RBAC |

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
| `dismissOverlapAction` | `alertId, dismissedReason` | Bureaus Involved / Mgt / Admin | Dismisses false-positive collision with mandatory rationale |
| `markNotificationReadAction` | `notificationId` | Authenticated Officer | Marks targeted notification as read |

### Route Handlers (`src/app/api/*`)

| Route | Method | Security | Purpose |
|---|---|---|---|
| `/api/auth/[...nextauth]` | `GET`, `POST` | Public | Auth.js authentication lifecycle & session management |
| `/api/dashboard/metrics` | `GET` | Session | Real-time SWR / 30s polling metrics for dashboard charts |
| `/api/institutions/list` | `GET` | Session | Lightweight list of institutions for case registration selector |
| `/api/upload` | `POST` | Session | Validates type/size and stores files in Vercel Blob |
| `/api/reports/csv` | `GET` | Session | Generates streaming CSV export respecting URL query filters |
| `/api/reports/pdf` | `GET` | Session | Serverless executive PDF report generated using `pdf-lib` |
| `/api/cron/sla-check` | `GET` | `Bearer CRON_SECRET` | Scheduled check: flags approaching (80%) and breached SLAs |
| `/api/cron/overlap-scan` | `GET` | `Bearer CRON_SECRET` | Scheduled batch scan: runs `overlapDetector.batchScan` |
| `/api/cron/reminders` | `GET` | `Bearer CRON_SECRET` | Scheduled check: alerts bureaus on cases pending > 7 days |

---

## 5. Cross-Bureau Overlap Detection (Key Innovation)

The `OverlapDetector` service implements a multi-tiered collision prevention algorithm:

1. **Rule 1 (Exact Match):** Identifies active non-disposed cases sharing the exact same `aicte_permanent_id` assigned to two or more distinct Bureaus (e.g., Case `AICTE/PGRC/2026/00101` in PGRC and Case `AICTE/RB/2026/00042` in Regulation Bureau for Apex Institute).
2. **Rule 2 (Fuzzy Name & Location):** Strips educational stop words (`college`, `institute`, `technology`, `engineering`) and executes character trigram Jaccard similarity (identical to PostgreSQL `pg_trgm`). Matches with $\ge 65\%$ name similarity corroborated by identical PIN code or City trigger collision alerts.
3. **Rule 3 (Content & Category Similarity):** Compares grievance subject categories and tokenized description overlaps.
4. **Scoring & Alert Deduplication:** Overlaps are scored as **HIGH**, **MEDIUM**, or **LOW** confidence, generating deduplicated alerts bearing the exact required notice:
   > **"Potential Overlapping Cases – Coordination Required"**

---

## 6. Local Setup Instructions

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
Runs 18 Vitest unit tests verifying Overlap Detection, SLA Calculations, and RBAC rules.

### Step 6: Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Step-by-Step Vercel Deployment

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
   - `AUTH_SECRET`: Random 32+ character string (e.g. `openssl rand -base64 32`)
   - `NEXTAUTH_URL`: `https://your-vercel-domain.vercel.app`
   - `CRON_SECRET`: Secure bearer token for Vercel Cron jobs
6. **Deploy & Apply Migrations:**
   Run deploy, then in the Vercel CLI or via GitHub Action:
   ```bash
   npx prisma migrate deploy
   npx tsx prisma/seed.ts
   ```
7. **Cron Verification:**
   Vercel reads `vercel.json` and schedules the SLA check, batch overlap scan, and reminder jobs automatically.

---

## 8. End-to-End Demo Script Walkthrough

Follow this 8-step script to demonstrate all system capabilities:

```
[1. Login] ──> [2. Dashboard & KPIs] ──> [3. Overlap Alert] ──> [4. Side-by-Side Compare]
     │                                                                     │
     ▼                                                                     ▼
[8. Export PDF] <── [7. SLA Breach] <── [6. Transfer Case] <── [5. Coordinate & Link]
```

1. **Login:**
   Navigate to `/login`. Click the **Dr. Ramesh Unnikrishnan (Regulation Bureau)** quick persona button to authenticate with `REGULATION_OFFICER` permissions.
2. **Dashboard & Workload Analytics:**
   View real-time KPI cards. Notice **"Open Overlap Alerts"** flagged in red and the glowing alert banner. Examine the **Bureau Workload** and **Pending Ageing** charts. Click on the **PGRC** bar to filter cases.
3. **Overlap Alert Inspection:**
   Click the prominent banner **"Review & Coordinate Overlaps"** (or open `/alerts`). Notice the collision for **Apex Institute of Engineering & Technology** involving `AICTE/PGRC/2026/00101` and `AICTE/RB/2026/00042`.
4. **Side-by-Side Comparison:**
   Click **"Track"** on case `AICTE/RB/2026/00042` (`/cases/case_00042`). Notice the prominent warning banner: *"Potential Overlapping Cases – Coordination Required"*. Click **"Compare Side-by-Side"** to inspect Case A and Case B simultaneously with algorithm match rationale.
5. **Coordinate & Link Cases:**
   In the comparison modal, enter coordination directives: *"Regulation Bureau and PGRC held joint hearing; inquiry merged under RB lead."* Click **"Mark as Coordinated & Link Cases"**. The alert status updates immediately and the cases are cross-linked.
6. **Case Workflow Mutation (Transfer Bureau):**
   Click **"Transfer Bureau"**. Select **"Approval Bureau"**, enter a justification, and submit. Observe that the case status immediately switches to `TRANSFERRED` and the action is appended to the immutable vertical timeline.
7. **SLA Countdown & Warning:**
   Navigate to `/cases?sla_status=BREACHED`. Observe colour-coded countdown chips showing overdue days in crimson, approaching thresholds in amber, and normal timelines in emerald.
8. **Export Official Reports:**
   Navigate to `/reports`. Click **"Download Official PDF Report"** to generate the executive report via `pdf-lib`, or click **"Export CSV Dataset"** for the full data grid.

---

## 9. Future Enhancements

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
