import { generateSeedData, SeedCase, SeedComment, SeedDocument, SeedInstitution, SeedOverlapAlert } from "@/lib/mock-data-generator";
import { ALL_KNOWN_USERS, DEMO_PASSWORD_HASHES, SLA_CONFIGS } from "@/lib/demo-data";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { calculateCaseSla, computeAgeingBuckets } from "./sla-engine";
import { buildRiskRadar, buildCaseInsight } from "./risk-engine";
import { overlapDetector, deriveTrilayerFromCases } from "./overlap-detector";
import { logAuditEvent, inMemoryAuditLogs } from "./audit";
import { analyzeComplainants, ComplainantProfile, ComplainantCaseInput, RECURRENCE_META } from "./complainant-engine";
import {
  hydrateFromSnapshot,
  markStoreDirty,
  registerSnapshotSource,
  StoreState,
  StoreUser,
} from "./persistence";
import { SessionUser, assertCanActOnCase, canCoordinateOverlap, canViewCase, canActOnCase } from "@/lib/rbac";

export interface CaseFilterOptions {
  q?: string;
  institution_name?: string;
  aicte_permanent_id?: string;
  case_id?: string;
  bureau?: string;
  region?: string;
  category?: string;
  status?: string;
  priority?: string;
  sla_status?: "NORMAL" | "APPROACHING" | "BREACHED";
  officer?: string;
  unassigned?: boolean;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
  sortBy?: "date_received" | "last_action_date" | "priority" | "status";
  sortOrder?: "asc" | "desc";
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const PASSWORD_HASH_FALLBACK = DEMO_PASSWORD_HASHES["Officer@123"];

// Global In-Memory Cache to support instant preview and seamless unit/UI flows
const globalRepo = globalThis as unknown as {
  auditLedgerSeeded?: boolean;
  snapshotWired?: boolean;
  inMemoryData?: StoreState;
};

function seedAuditLedger(cases: SeedCase[]) {
  // Seed historical case actions exactly once per process. Login/logout audit
  // events may arrive before the first page render, so an empty-array check
  // would wrongly skip the historical ledger.
  if (globalRepo.auditLedgerSeeded) return;
  globalRepo.auditLedgerSeeded = true;
  const seededLogs = cases
    .flatMap((c) =>
      c.actions.map((a) => ({
        user: a.actor_user,
        action: a.action_type,
        entity: "CASE",
        entity_id: c.case_id,
        before: null,
        after: {
          status: c.status,
          bureau: c.assigned_bureau,
          priority: c.priority,
          remarks: a.remarks,
          attachments: a.attachments,
        },
        ip: "10.24.8.1",
        timestamp: a.timestamp,
      }))
    )
    .sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 80);

  inMemoryAuditLogs.push(...seededLogs);
}

function seedUsers(): StoreUser[] {
  return ALL_KNOWN_USERS.map((u, idx) => ({
    id: u.id,
    name: u.name,
    email: u.email.toLowerCase(),
    password_hash:
      DEMO_PASSWORD_HASHES[u.password] ?? PASSWORD_HASH_FALLBACK,
    role: u.role,
    bureau: u.bureau,
    region: u.region ?? null,
    designation: u.designation,
    active: true,
    created_at: new Date(Date.parse("2026-01-05T09:00:00Z") + idx * 86400000),
  }));
}

function getInMemoryStore() {
  const store: StoreState = (globalRepo.inMemoryData ??= buildSeedStore());
  if (!globalRepo.snapshotWired) {
    globalRepo.snapshotWired = true;
    // One-shot hydration + write-behind persistence (no-op without a DB).
    void hydrateFromSnapshot(store, inMemoryAuditLogs);
    registerSnapshotSource(() =>
      globalRepo.inMemoryData
        ? { store: globalRepo.inMemoryData, auditLogs: inMemoryAuditLogs }
        : null
    );
  }
  return store;
}

function buildSeedStore(): StoreState {
  const seed = generateSeedData();
  const store: StoreState = {
    institutions: [...seed.institutions],
    cases: [...seed.cases],
    overlapAlerts: [...seed.overlapAlerts],
    caseLinks: [],
    notifications: [
      {
        id: "notif_001",
        type: "OVERLAP",
        case_id: "case_00101",
        target_bureau: "PGRC",
        title: "Potential Overlapping Cases – Coordination Required",
        message: "Collision detected with Case AICTE/RB/2026/00042 regarding Apex Institute of Engineering & Technology.",
        read: false,
        created_at: new Date("2026-10-05T10:00:00Z"),
      },
      {
        id: "notif_002",
        type: "OVERLAP",
        case_id: "case_00042",
        target_bureau: "REGULATION_BUREAU",
        title: "Potential Overlapping Cases – Coordination Required",
        message: "Collision detected with Case AICTE/PGRC/2026/00101 regarding Apex Institute of Engineering & Technology.",
        read: false,
        created_at: new Date("2026-10-05T10:00:00Z"),
      },
      {
        id: "notif_003",
        type: "SLA_BREACHED",
        case_id: "case_00101",
        target_bureau: "PGRC",
        title: "SLA Breached: Case AICTE/PGRC/2026/00101",
        message: "Case has exceeded the 30-day resolution timeline. Immediate action or escalation required.",
        read: false,
        created_at: new Date("2026-10-21T09:00:00Z"),
      },
    ],
    comments: [...seed.comments],
    documents: [...seed.documents],
    users: seedUsers(),
  };

  // Seed an initial tamper-evident audit ledger from the generated case actions
  seedAuditLedger(seed.cases);
  return store;
}

export class ComplaintRepository {
  /**
   * KPI and Charts Aggregation for Home Dashboard
   */
  public async getDashboardMetrics(user?: SessionUser) {
    const store = getInMemoryStore();
    const isRegional = user?.role === "REGIONAL_OFFICER" && Boolean(user.region);

    // Apply region filter if Regional Officer
    const regionInstIds = isRegional
      ? new Set(
          store.institutions
            .filter((i) => i.region === user!.region)
            .map((i) => i.id)
        )
      : null;

    let allCases = store.cases;
    if (regionInstIds) {
      allCases = allCases.filter((c) => regionInstIds.has(c.institution_id));
    }

    const totalReceived = allCases.length;
    let pending = 0;
    let underProcess = 0;
    let disposed = 0;
    let transferred = 0;
    let escalated = 0;
    let pendingBeyondTimeline = 0;

    const bureauMap: Record<string, { pending: number; under_process: number; disposed: number; total: number }> = {
      REGULATION_BUREAU: { pending: 0, under_process: 0, disposed: 0, total: 0 },
      PGRC: { pending: 0, under_process: 0, disposed: 0, total: 0 },
      APPROVAL_BUREAU: { pending: 0, under_process: 0, disposed: 0, total: 0 },
      SKILL_CELL: { pending: 0, under_process: 0, disposed: 0, total: 0 },
    };

    const regionMap: Record<string, number> = {
      Northern: 0,
      Western: 0,
      Southern: 0,
      Eastern: 0,
      Central: 0,
      "North-Western": 0,
      "South-Western": 0,
    };

    const instLookup = new Map(store.institutions.map((i) => [i.id, i]));

    for (const c of allCases) {
      if (c.status === "PENDING") pending++;
      else if (c.status === "UNDER_PROCESS") underProcess++;
      else if (c.status === "DISPOSED") disposed++;
      else if (c.status === "TRANSFERRED") transferred++;
      else if (c.status === "ESCALATED") escalated++;

      const sla = calculateCaseSla(c.category, c.date_received, c.status);
      if (sla.isBreached && c.status !== "DISPOSED") {
        pendingBeyondTimeline++;
      }

      if (bureauMap[c.assigned_bureau]) {
        bureauMap[c.assigned_bureau].total++;
        if (c.status === "PENDING") bureauMap[c.assigned_bureau].pending++;
        else if (c.status === "UNDER_PROCESS") bureauMap[c.assigned_bureau].under_process++;
        else if (c.status === "DISPOSED") bureauMap[c.assigned_bureau].disposed++;
      }

      const inst = instLookup.get(c.institution_id);
      if (inst && regionMap[inst.region] !== undefined) {
        regionMap[inst.region]++;
      }
    }

    const scopedOverlapAlerts = regionInstIds
      ? store.overlapAlerts.filter((o) => regionInstIds.has(o.institution_id))
      : store.overlapAlerts;
    const openOverlapAlerts = scopedOverlapAlerts.filter((o) => o.status === "OPEN").length;
    const ageingBuckets = computeAgeingBuckets(allCases);

    const bureauWorkload = Object.entries(bureauMap).map(([bureau, counts]) => ({
      bureau: bureau.replace("_", " "),
      bureauKey: bureau,
      pending: counts.pending,
      underProcess: counts.under_process,
      disposed: counts.disposed,
      total: counts.total,
    }));

    const statusDistribution = [
      { name: "Pending", value: pending, color: "#F59E0B" },
      { name: "Under Process", value: underProcess, color: "#3B82F6" },
      { name: "Disposed", value: disposed, color: "#10B981" },
      { name: "Transferred", value: transferred, color: "#8B5CF6" },
      { name: "Escalated", value: escalated, color: "#EF4444" },
    ];

    const regionCases = Object.entries(regionMap).map(([region, count]) => ({
      region,
      cases: count,
    }));

    // Monthly trends (last 6 months)
    const monthlyTrends = [
      { month: "May 2026", received: 42, disposed: 38 },
      { month: "Jun 2026", received: 51, disposed: 45 },
      { month: "Jul 2026", received: 63, disposed: 52 },
      { month: "Aug 2026", received: 70, disposed: 58 },
      { month: "Sep 2026", received: 58, disposed: 62 },
      { month: "Oct 2026", received: 65, disposed: 49 },
    ];

    // Cases that need officer attention right now
    const urgentCases = allCases
      .filter((c) => c.status !== "DISPOSED")
      .map((c) => {
        const sla = calculateCaseSla(c.category, c.date_received, c.status);
        const inst = instLookup.get(c.institution_id);
        return {
          id: c.id,
          case_id: c.case_id,
          category: c.category,
          status: c.status,
          priority: c.priority,
          assigned_bureau: c.assigned_bureau,
          institution_name: inst?.name ?? "Unknown institution",
          institution_city: inst?.city ?? "",
          region: inst?.region ?? "",
          last_action: c.last_action,
          last_action_date: c.last_action_date,
          remainingDays: sla.remainingDays,
          percentElapsed: sla.percentElapsed,
          isBreached: sla.isBreached,
          isApproaching: sla.isApproaching,
          statusText: sla.statusText,
        };
      })
      .filter((c) => c.isBreached || c.isApproaching || c.priority === "CRITICAL")
      .sort((a, b) => {
        if (a.isBreached !== b.isBreached) return a.isBreached ? -1 : 1;
        return a.remainingDays - b.remainingDays;
      })
      .slice(0, 6);

    // Open overlap alerts enriched for the command center
    const openOverlapList = scopedOverlapAlerts
      .filter((o) => o.status === "OPEN")
      .map((o) => {
        const inst = instLookup.get(o.institution_id);
        return {
          id: o.id,
          institution_id: o.institution_id,
          institution_name: inst?.name ?? "Unknown institution",
          city: inst?.city ?? "",
          state: inst?.state ?? "",
          case_ids: o.case_ids,
          bureaus_involved: o.bureaus_involved,
          confidence: o.confidence,
          detected_at: o.detected_at,
          match_reasons: o.match_reasons,
        };
      })
      .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())
      .slice(0, 4);

    const disposedCases = allCases.filter((c) => c.status === "DISPOSED");
    const avgResolutionDays =
      disposedCases.length > 0
        ? Math.round(
            disposedCases.reduce((sum, c) => {
              const days =
                (new Date(c.last_action_date).getTime() - new Date(c.date_received).getTime()) /
                (1000 * 60 * 60 * 24);
              return sum + Math.max(0, days);
            }, 0) / disposedCases.length
          )
        : 0;

    // Explainable risk radar (portfolio-level breach forecast)
    const riskRadar = buildRiskRadar(allCases, store.institutions, scopedOverlapAlerts);

    return {
      kpi: {
        totalReceived,
        pending,
        underProcess,
        disposed,
        transferred,
        escalated,
        pendingBeyondTimeline,
        openOverlapAlerts,
      },
      disposalRate: totalReceived > 0 ? Math.round((disposed / totalReceived) * 100) : 0,
      avgResolutionDays,
      bureauWorkload,
      statusDistribution,
      regionCases,
      ageingBuckets,
      monthlyTrends,
      urgentCases,
      openOverlapList,
      riskRadar,
    };
  }

  /**
   * Search and filter institutions
   */
  public async getInstitutions(options: {
    q?: string;
    region?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const store = getInMemoryStore();
    let list = store.institutions;

    if (options.region) {
      list = list.filter((i) => i.region === options.region);
    }

    if (options.type) {
      list = list.filter((i) => i.institution_type === options.type);
    }

    if (options.q) {
      const q = options.q.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.aicte_permanent_id.toLowerCase().includes(q) ||
          i.city.toLowerCase().includes(q) ||
          i.state.toLowerCase().includes(q) ||
          i.pincode.includes(q)
      );
    }

    const page = options.page || 1;
    const limit = options.limit || 12;
    const total = list.length;
    const paginated = list.slice((page - 1) * limit, page * limit);

    // Attach case count and active overlap count
    const result = paginated.map((inst) => {
      const instCases = store.cases.filter((c) => c.institution_id === inst.id);
      const openOverlaps = store.overlapAlerts.filter(
        (o) => o.institution_id === inst.id && o.status === "OPEN"
      ).length;

      const activeBureaus = Array.from(
        new Set(
          instCases.filter((c) => c.status !== "DISPOSED").map((c) => c.assigned_bureau)
        )
      );

      return {
        ...inst,
        totalCases: instCases.length,
        activeCases: instCases.filter((c) => c.status !== "DISPOSED").length,
        disposedCases: instCases.filter((c) => c.status === "DISPOSED").length,
        openOverlaps,
        activeBureaus,
      };
    });

    return {
      institutions: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Institution Profile with consolidated history across all Bureaus and Overlap Banner
   */
  public async getInstitutionById(id: string, user?: SessionUser) {
    const store = getInMemoryStore();
    const inst = store.institutions.find(
      (i) => i.id === id || i.aicte_permanent_id === id
    );

    if (!inst) return null;

    // Regional officers may only open institutions inside their region.
    if (user?.role === "REGIONAL_OFFICER" && user.region && inst.region !== user.region) {
      return null;
    }

    const cases = store.cases
      .filter((c) => c.institution_id === inst.id)
      .map((c) => ({
        ...c,
        sla: calculateCaseSla(c.category, c.date_received, c.status),
      }))
      .sort((a, b) => new Date(b.date_received).getTime() - new Date(a.date_received).getTime());

    const activeCases = cases.filter((c) => c.status !== "DISPOSED");
    const activeBureaus = Array.from(new Set(activeCases.map((c) => c.assigned_bureau)));

    const overlapAlerts = store.overlapAlerts.filter(
      (o) => o.institution_id === inst.id
    );
    const openOverlapAlerts = overlapAlerts.filter((o) => o.status === "OPEN");
    const hasOpenOverlap = openOverlapAlerts.length > 0;

    // Cross-bureau consolidated action timeline
    const allActions: any[] = [];
    cases.forEach((c) => {
      c.actions.forEach((act) => {
        allActions.push({
          ...act,
          case_id: c.case_id,
          case_internal_id: c.id,
          category: c.category,
        });
      });
    });
    allActions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      institution: inst,
      cases,
      activeBureaus,
      overlapAlerts,
      openOverlapAlerts,
      hasOpenOverlap,
      timeline: allActions,
    };
  }

  /**
   * Query cases with advanced multi-parameter filtering
   */
  public async getCases(filters: CaseFilterOptions = {}, user?: SessionUser) {
    const store = getInMemoryStore();
    const instLookup = new Map(store.institutions.map((i) => [i.id, i]));

    let list = store.cases.map((c) => {
      const inst = instLookup.get(c.institution_id);
      const sla = calculateCaseSla(c.category, c.date_received, c.status);
      return {
        ...c,
        institution: inst,
        sla,
      };
    });

    // Enforce Regional Officer boundaries
    if (user?.role === "REGIONAL_OFFICER" && user.region) {
      list = list.filter((c) => c.institution?.region === user.region);
    }

    // Filter: Global search
    if (filters.q) {
      const q = filters.q.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.case_id.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.institution?.name.toLowerCase().includes(q) ||
          c.institution?.aicte_permanent_id.toLowerCase().includes(q) ||
          c.institution?.city.toLowerCase().includes(q)
      );
    }

    if (filters.bureau) {
      list = list.filter((c) => c.assigned_bureau === filters.bureau);
    }

    if (filters.region) {
      list = list.filter((c) => c.institution?.region === filters.region);
    }

    if (filters.category) {
      list = list.filter((c) => c.category === filters.category);
    }

    if (filters.status) {
      list = list.filter((c) => c.status === filters.status);
    }

    if (filters.priority) {
      list = list.filter((c) => c.priority === filters.priority);
    }

    if (filters.officer) {
      const target = filters.officer.toLowerCase();
      list = list.filter(
        (c) => (c.assigned_officer ?? "").toLowerCase() === target
      );
    }

    if (filters.unassigned) {
      list = list.filter((c) => !c.assigned_officer);
    }

    if (filters.sla_status) {
      if (filters.sla_status === "BREACHED") {
        list = list.filter((c) => c.sla.isBreached && c.status !== "DISPOSED");
      } else if (filters.sla_status === "APPROACHING") {
        list = list.filter((c) => c.sla.isApproaching && c.status !== "DISPOSED");
      } else if (filters.sla_status === "NORMAL") {
        list = list.filter((c) => !c.sla.isBreached && !c.sla.isApproaching);
      }
    }

    if (filters.date_from) {
      const fromTime = new Date(filters.date_from).getTime();
      list = list.filter((c) => new Date(c.date_received).getTime() >= fromTime);
    }

    if (filters.date_to) {
      const toTime = new Date(filters.date_to).getTime() + 86400000;
      list = list.filter((c) => new Date(c.date_received).getTime() <= toTime);
    }

    // Sorting
    const sortField = filters.sortBy || "date_received";
    const sortAsc = filters.sortOrder === "asc";
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (valA instanceof Date) valA = valA.getTime();
      if (valB instanceof Date) valB = valB.getTime();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    const page = filters.page || 1;
    const limit = filters.limit || 15;
    const total = list.length;
    const paginated = list.slice((page - 1) * limit, page * limit);

    return {
      cases: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Case Tracking Detail with SLA Countdown, Timeline, Overlap alerts, and Links
   */
  public async getCaseById(id: string, user?: SessionUser) {
    const store = getInMemoryStore();
    const c = store.cases.find((item) => item.id === id || item.case_id === id);
    if (!c) return null;

    const inst = store.institutions.find((i) => i.id === c.institution_id);

    // Enforce regional visibility for case detail pages. Returning null makes
    // the page render a 404 rather than leaking another region's record.
    if (!canViewCase(user, { ...c, institution: inst })) {
      return null;
    }

    const sla = calculateCaseSla(c.category, c.date_received, c.status);

    // Linked cases
    const linkedLinks = store.caseLinks.filter(
      (l) => l.case_a_id === c.case_id || l.case_b_id === c.case_id
    );

    const linkedCaseIds = new Set(
      linkedLinks.flatMap((l) => [l.case_a_id, l.case_b_id]).filter((cid) => cid !== c.case_id)
    );

    const linkedCases = store.cases
      .filter((item) => linkedCaseIds.has(item.case_id))
      .map((item) => {
        const itemInst = store.institutions.find((i) => i.id === item.institution_id);
        const linkDetail = linkedLinks.find(
          (l) => (l.case_a_id === item.case_id && l.case_b_id === c.case_id) || (l.case_b_id === item.case_id && l.case_a_id === c.case_id)
        );
        return {
          ...item,
          institution: itemInst,
          linkType: linkDetail?.link_type,
          linkNote: linkDetail?.note,
        };
      });

    // Check for open overlap alert involving this case
    const overlapAlert = store.overlapAlerts.find(
      (o) => o.case_ids.includes(c.case_id) && o.status === "OPEN"
    );

    let collidingCase: any = null;
    if (overlapAlert) {
      const otherCaseId = overlapAlert.case_ids.find((cid) => cid !== c.case_id);
      if (otherCaseId) {
        const other = store.cases.find((item) => item.case_id === otherCaseId);
        if (other) {
          collidingCase = {
            ...other,
            institution: store.institutions.find((i) => i.id === other.institution_id),
            sla: calculateCaseSla(other.category, other.date_received, other.status),
          };
        }
      }
    }

    return {
      caseItem: {
        ...c,
        institution: inst,
        sla,
      },
      linkedCases,
      overlapAlert,
      collidingCase,
    };
  }

  /**
   * Explainable per-case risk score, next-best action and peer benchmark.
   */
  public async getCaseInsight(caseId: string) {
    const store = getInMemoryStore();
    const c = store.cases.find((item) => item.id === caseId || item.case_id === caseId);
    if (!c) return null;

    const inst = store.institutions.find((i) => i.id === c.institution_id);
    const overlaps = store.overlapAlerts.filter(
      (o) => o.institution_id === c.institution_id
    );

    return buildCaseInsight(c, inst, overlaps, store.cases, store.institutions);
  }

  /**
   * Unified quick search across cases and institutions (command palette).
   */
  public async search(term: string, user?: SessionUser) {
    const store = getInMemoryStore();
    const q = term.trim().toLowerCase();
    if (q.length < 2) return { cases: [], institutions: [] };

    const regionFilter =
      user?.role === "REGIONAL_OFFICER" && user.region ? user.region : null;
    const instMap = new Map(store.institutions.map((i) => [i.id, i]));

    const cases = store.cases
      .filter((c) => {
        const inst = instMap.get(c.institution_id);
        if (regionFilter && inst?.region !== regionFilter) return false;
        return [
          c.case_id,
          c.category,
          c.description,
          c.status.replace(/_/g, " "),
          c.assigned_bureau.replace(/_/g, " "),
          inst?.name,
          inst?.city,
          inst?.region,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
      .slice(0, 6)
      .map((c) => {
        const inst = instMap.get(c.institution_id);
        const sla = calculateCaseSla(c.category, c.date_received, c.status);
        return {
          id: c.id,
          case_id: c.case_id,
          category: c.category,
          status: c.status,
          priority: c.priority,
          bureau: c.assigned_bureau,
          institution_name: inst?.name ?? "Unknown institution",
          city: inst?.city ?? "",
          remainingDays: sla.remainingDays,
          isBreached: sla.isBreached,
        };
      });

    const institutions = store.institutions
      .filter((i) => {
        if (regionFilter && i.region !== regionFilter) return false;
        return [i.name, i.aicte_permanent_id, i.city, i.state, i.region, i.institution_type]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      })
      .slice(0, 5)
      .map((i) => ({
        id: i.id,
        name: i.name,
        city: i.city,
        state: i.state,
        region: i.region,
        aicte_permanent_id: i.aicte_permanent_id,
        institution_type: i.institution_type,
      }));

    return { cases, institutions };
  }

  /**
   * Action: Update Status with Append-Only ActionHistory and Audit Logging
   */
  public async updateCaseStatus(
    caseId: string,
    newStatus: "PENDING" | "UNDER_PROCESS" | "DISPOSED" | "TRANSFERRED" | "ESCALATED",
    remarks: string,
    actor: SessionUser,
    attachments: string[] = []
  ) {
    const store = getInMemoryStore();
    const c = store.cases.find((item) => item.id === caseId || item.case_id === caseId);
    if (!c) throw new Error(`Case ${caseId} not found.`);

    assertCanActOnCase(actor, c);

    const previousStatus = c.status;
    c.status = newStatus;
    c.last_action = `Status changed to ${newStatus}`;
    c.last_action_date = new Date();

    const action = {
      actor_user: actor.email,
      actor_bureau: actor.bureau,
      action_type: newStatus === "DISPOSED" ? "DISPOSED" : "STATUS_CHANGED",
      remarks,
      timestamp: new Date(),
      attachments,
    };

    c.actions.unshift(action);

    markStoreDirty();

    await logAuditEvent({
      user: actor.email,
      action: "UPDATE_CASE_STATUS",
      entity: "Case",
      entity_id: c.case_id,
      before: { status: previousStatus },
      after: { status: newStatus, remarks },
    });

    return c;
  }

  /**
   * Action: Transfer Case to Another Bureau
   */
  public async transferCase(
    caseId: string,
    toBureau: "REGULATION_BUREAU" | "PGRC" | "APPROVAL_BUREAU" | "SKILL_CELL",
    remarks: string,
    actor: SessionUser,
    attachments: string[] = []
  ) {
    const store = getInMemoryStore();
    const c = store.cases.find((item) => item.id === caseId || item.case_id === caseId);
    if (!c) throw new Error(`Case ${caseId} not found.`);

    assertCanActOnCase(actor, c);

    const fromBureau = c.assigned_bureau;
    c.assigned_bureau = toBureau;
    c.status = "TRANSFERRED";
    c.last_action = `Transferred from ${fromBureau} to ${toBureau}`;
    c.last_action_date = new Date();

    const action = {
      actor_user: actor.email,
      actor_bureau: actor.bureau,
      action_type: "TRANSFERRED",
      remarks,
      timestamp: new Date(),
      attachments,
      from_bureau: fromBureau,
      to_bureau: toBureau,
    };

    c.actions.unshift(action);

    // Notify receiving bureau
    store.notifications.unshift({
      id: `notif_${Date.now()}`,
      type: "PENDING_REMINDER",
      case_id: c.case_id,
      target_bureau: toBureau,
      title: `Case Transferred to ${toBureau}`,
      message: `Case ${c.case_id} was transferred by ${actor.name} (${fromBureau}). Justification: ${remarks.slice(0, 100)}...`,
      read: false,
      created_at: new Date(),
    });

    markStoreDirty();

    await logAuditEvent({
      user: actor.email,
      action: "TRANSFER_CASE",
      entity: "Case",
      entity_id: c.case_id,
      before: { assigned_bureau: fromBureau },
      after: { assigned_bureau: toBureau, remarks },
    });

    return c;
  }

  /**
   * Action: Escalate Case to Competent Authority
   */
  public async escalateCase(
    caseId: string,
    remarks: string,
    actor: SessionUser,
    attachments: string[] = []
  ) {
    const store = getInMemoryStore();
    const c = store.cases.find((item) => item.id === caseId || item.case_id === caseId);
    if (!c) throw new Error(`Case ${caseId} not found.`);

    assertCanActOnCase(actor, c);

    const prevPriority = c.priority;
    const previousStatus = c.status;
    c.status = "ESCALATED";
    c.priority = "CRITICAL";
    c.last_action = `Escalated to Competent Authority by ${actor.bureau}`;
    c.last_action_date = new Date();

    const action = {
      actor_user: actor.email,
      actor_bureau: actor.bureau,
      action_type: "ESCALATED",
      remarks,
      timestamp: new Date(),
      attachments,
    };

    c.actions.unshift(action);

    // Notify Competent Authority
    store.notifications.unshift({
      id: `notif_${Date.now()}`,
      type: "ESCALATION",
      case_id: c.case_id,
      target_bureau: "ALL",
      title: `URGENT: Escalation Alert for ${c.case_id}`,
      message: `${c.case_id} escalated by ${actor.name} (${actor.bureau}). Priority set to CRITICAL. Reason: ${remarks}`,
      read: false,
      created_at: new Date(),
    });

    markStoreDirty();

    await logAuditEvent({
      user: actor.email,
      action: "ESCALATE_CASE",
      entity: "Case",
      entity_id: c.case_id,
      before: { priority: prevPriority, status: previousStatus },
      after: { priority: "CRITICAL", status: "ESCALATED", remarks },
    });

    return c;
  }

  /**
   * Action: Add Remarks and Supporting Attachments (Append-only)
   */
  public async addRemark(
    caseId: string,
    remarks: string,
    attachments: string[],
    actor: SessionUser
  ) {
    const store = getInMemoryStore();
    const c = store.cases.find((item) => item.id === caseId || item.case_id === caseId);
    if (!c) throw new Error(`Case ${caseId} not found.`);

    assertCanActOnCase(actor, c);

    c.last_action = `Remark recorded by ${actor.bureau}`;
    c.last_action_date = new Date();

    const action = {
      actor_user: actor.email,
      actor_bureau: actor.bureau,
      action_type: "REMARK",
      remarks,
      timestamp: new Date(),
      attachments,
    };

    c.actions.unshift(action);

    markStoreDirty();

    await logAuditEvent({
      user: actor.email,
      action: "ADD_REMARK",
      entity: "Case",
      entity_id: c.case_id,
      after: { remarks, attachmentsCount: attachments.length },
    });

    return c;
  }

  /**
   * Internal helper that writes (or updates) a canonical case-to-case link.
   * Authorization is checked by callers so overlap coordination can link cases
   * across the bureaus that are party to an alert.
   */
  private upsertCaseLink(
    caseAId: string,
    caseBId: string,
    linkType: "OVERLAP" | "DUPLICATE" | "RELATED",
    note: string,
    actorEmail: string
  ) {
    const store = getInMemoryStore();
    const [c1, c2] = [caseAId, caseBId].sort();
    const existing = store.caseLinks.find(
      (l) => l.case_a_id === c1 && l.case_b_id === c2
    );

    if (existing) {
      existing.link_type = linkType;
      existing.note = note;
    } else {
      store.caseLinks.push({
        id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        case_a_id: c1,
        case_b_id: c2,
        link_type: linkType,
        created_by: actorEmail,
        created_at: new Date(),
        note,
      });
    }

    markStoreDirty();

    return { caseAId: c1, caseBId: c2 };
  }

  /**
   * Action: Link two cases (OVERLAP / DUPLICATE / RELATED)
   */
  public async linkCases(
    caseAId: string,
    caseBId: string,
    linkType: "OVERLAP" | "DUPLICATE" | "RELATED",
    note: string = "",
    actor: SessionUser
  ) {
    const store = getInMemoryStore();
    const caseA = store.cases.find(
      (c) => c.id === caseAId || c.case_id === caseAId
    );
    const caseB = store.cases.find(
      (c) => c.id === caseBId || c.case_id === caseBId
    );

    if (!caseA || !caseB) {
      throw new Error("Both cases must exist before they can be linked.");
    }
    if (caseA.id === caseB.id) {
      throw new Error("A case cannot be linked to itself.");
    }

    // Linking mutates a shared record, so the actor must be authorised on both
    // sides of the relationship.
    assertCanActOnCase(actor, caseA);
    assertCanActOnCase(actor, caseB);

    const { caseAId: c1, caseBId: c2 } = this.upsertCaseLink(
      caseA.case_id,
      caseB.case_id,
      linkType,
      note,
      actor.email
    );

    await logAuditEvent({
      user: actor.email,
      action: "LINK_CASES",
      entity: "CaseLink",
      entity_id: `${c1} <-> ${c2}`,
      after: { linkType, note },
    });

    return true;
  }

  /**
   * Action: Register New Complaint and trigger Overlap Detector
   */
  public async createCase(
    data: {
      aicte_permanent_id: string;
      source: "student" | "faculty" | "stakeholder" | "public" | "other";
      category: string;
      description: string;
      assigned_bureau: "REGULATION_BUREAU" | "PGRC" | "APPROVAL_BUREAU" | "SKILL_CELL";
      priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      complainant_name?: string;
      complainant_contact?: string;
      language?: string;
      attachments?: string[];
    },
    actor: SessionUser
  ) {
    const store = getInMemoryStore();
    const inst = store.institutions.find(
      (i) => i.aicte_permanent_id.trim() === data.aicte_permanent_id.trim()
    );

    if (!inst) {
      throw new Error(`Institution with AICTE Permanent ID ${data.aicte_permanent_id} was not found.`);
    }

    const bureauCode =
      data.assigned_bureau === "REGULATION_BUREAU"
        ? "RB"
        : data.assigned_bureau === "APPROVAL_BUREAU"
        ? "AB"
        : data.assigned_bureau === "SKILL_CELL"
        ? "SDC"
        : "PGRC";

    // Registering a case is a write action: regional officers are read-only and
    // bureau officers may only create cases for their own bureau.
    assertCanActOnCase(actor, { assigned_bureau: data.assigned_bureau });

    // Derive the next registry number from the highest existing sequence so
    // repeated or seeded cases can never collide.
    const maxSequence = store.cases.reduce((max, c) => {
      const match = /(\d+)$/.exec(c.case_id);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const caseIdCode = `AICTE/${bureauCode}/2026/${String(maxSequence + 1).padStart(5, "0")}`;

    const slaConfig =
      SLA_CONFIGS.find(
        (c) => c.category.toLowerCase() === data.category.toLowerCase()
      ) ?? SLA_CONFIGS[SLA_CONFIGS.length - 1];

    const newCase: SeedCase = {
      id: `case_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      case_id: caseIdCode,
      institution_id: inst.id,
      date_received: new Date(),
      source: data.source,
      category: data.category,
      description: data.description,
      status: "PENDING",
      assigned_bureau: data.assigned_bureau,
      assigned_officer: actor.email,
      last_action: "Complaint registered on portal",
      last_action_date: new Date(),
      next_action_required: "Initial scrutiny by Bureau desk officer",
      expected_disposal_date: new Date(
        Date.now() + slaConfig.timeline_days * 86400000
      ),
      priority: data.priority || "MEDIUM",
      complainant_name: data.complainant_name?.trim() || undefined,
      complainant_contact: data.complainant_contact?.trim() || undefined,
      language: data.language || undefined,
      actions: [
        {
          actor_user: actor.email,
          actor_bureau: actor.bureau,
          action_type: "RECEIVED",
          remarks: "Grievance received and cataloged under standard AICTE registry.",
          timestamp: new Date(),
          attachments: data.attachments || [],
        },
      ],
    };

    store.cases.unshift(newCase);

    markStoreDirty();

    // RUN REAL-TIME OVERLAP DETECTOR!
    const activeCasesForOverlap = store.cases.map((c) => {
      const cInst = store.institutions.find((i) => i.id === c.institution_id);
      return {
        id: c.id,
        case_id: c.case_id,
        institution_id: c.institution_id,
        institution_aicte_id: cInst?.aicte_permanent_id,
        institution_name: cInst?.name,
        institution_normalized_name: cInst?.normalized_name,
        institution_city: cInst?.city,
        institution_state: cInst?.state,
        institution_pincode: cInst?.pincode,
        category: c.category,
        description: c.description,
        assigned_bureau: c.assigned_bureau,
        status: c.status,
        date_received: c.date_received,
      };
    });

    const targetFormatted = activeCasesForOverlap[0];
    const detectedAlerts = await overlapDetector.checkCase(
      targetFormatted,
      activeCasesForOverlap.slice(1)
    );

    for (const d of detectedAlerts) {
      const alertId = `ovl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      store.overlapAlerts.unshift({
        id: alertId,
        institution_id: inst.id,
        case_ids: d.case_ids,
        bureaus_involved: d.bureaus_involved,
        confidence: d.confidence,
        match_reasons: d.match_reasons as any,
        trilayer: d.trilayer,
        detected_at: new Date(),
        status: "OPEN",
        coordination_note: null,
        dismissed_reason: null,
      });

      // Broadcast high priority alert notifications
      d.bureaus_involved.forEach((b) => {
        store.notifications.unshift({
          id: `notif_${Date.now()}_${b}`,
          type: "OVERLAP",
          case_id: caseIdCode,
          target_bureau: b,
          title: "Potential Overlapping Cases – Coordination Required",
          message: `Cross-bureau collision detected for ${inst.name} involving ${d.case_ids.join(" & ")}.`,
          read: false,
          created_at: new Date(),
        });
      });
    }

    await logAuditEvent({
      user: actor.email,
      action: "CREATE_CASE",
      entity: "Case",
      entity_id: caseIdCode,
      after: { category: data.category, assigned_bureau: data.assigned_bureau },
    });

    return newCase;
  }

  /**
   * Overlap Actions: Acknowledge, Coordinate, Dismiss
   */
  public async coordinateOverlapAlert(
    alertId: string,
    coordinationNote: string,
    actor: SessionUser
  ) {
    const store = getInMemoryStore();
    const alert = store.overlapAlerts.find((o) => o.id === alertId);
    if (!alert) throw new Error("Overlap alert not found.");

    if (!canCoordinateOverlap(actor, alert)) {
      throw new Error(
        `Unauthorized: User ${actor.email} (${actor.bureau}) cannot coordinate an overlap involving ${alert.bureaus_involved.join(", ")}.`
      );
    }

    alert.status = "COORDINATED";
    alert.coordination_note = coordinationNote;

    // Automatically link the cases as OVERLAP. Coordination permission covers
    // the alert, so the link is written directly instead of re-checking
    // per-case bureau ownership on both sides of a cross-bureau collision.
    if (alert.case_ids.length >= 2) {
      this.upsertCaseLink(
        alert.case_ids[0],
        alert.case_ids[1],
        "OVERLAP",
        coordinationNote,
        actor.email
      );
    }

    markStoreDirty();

    await logAuditEvent({
      user: actor.email,
      action: "COORDINATE_OVERLAP",
      entity: "OverlapAlert",
      entity_id: alert.id,
      after: { coordinationNote },
    });

    return alert;
  }

  /**
   * Action: merge every colliding case into one master docket.
   *
   * The earliest/lead case becomes the master. All other files are linked as
   * DUPLICATE, annotated in their action history, and the alert is closed as
   * coordinated with the master reference retained for audit.
   */
  public async mergeOverlapAlert(
    alertId: string,
    masterCaseRef: string,
    mergeNote: string,
    actor: SessionUser
  ) {
    const store = getInMemoryStore();
    const alert = store.overlapAlerts.find((o) => o.id === alertId);
    if (!alert) throw new Error("Overlap alert not found.");

    if (!canCoordinateOverlap(actor, alert)) {
      throw new Error(
        `Unauthorized: User ${actor.email} (${actor.bureau}) cannot merge an overlap involving ${alert.bureaus_involved.join(", ")}.`
      );
    }

    if (alert.master_case_id) {
      throw new Error(
        `This collision is already merged into master docket ${alert.master_case_id}.`
      );
    }

    const collisionCases = alert.case_ids
      .map((cid) => store.cases.find((c) => c.case_id === cid || c.id === cid))
      .filter((c): c is SeedCase => Boolean(c));

    if (collisionCases.length < 2) {
      throw new Error("At least two resolved cases are required to merge a docket.");
    }

    const master = collisionCases.find(
      (c) => c.case_id === masterCaseRef || c.id === masterCaseRef
    );
    if (!master) {
      throw new Error("Selected master case is not part of this collision.");
    }

    const mergedCases = collisionCases.filter((c) => c.id !== master.id);
    if (mergedCases.length === 0) {
      throw new Error("Select a master docket with at least one other colliding case.");
    }

    const now = new Date();
    alert.status = "COORDINATED";
    alert.coordination_note = mergeNote;
    alert.master_case_id = master.case_id;
    alert.merged_case_ids = mergedCases.map((c) => c.case_id);
    alert.merged_at = now;
    alert.merged_by = actor.email;

    master.last_action = `Master docket established for ${mergedCases.length} merged file(s)`;
    master.last_action_date = now;
    master.actions.unshift({
      actor_user: actor.email,
      actor_bureau: actor.bureau,
      action_type: "LINKED",
      remarks: `Master docket ${master.case_id} established. Merged: ${mergedCases
        .map((c) => c.case_id)
        .join(", ")}. ${mergeNote}`,
      timestamp: now,
      attachments: [],
    });

    for (const mergedCase of mergedCases) {
      this.upsertCaseLink(
        master.case_id,
        mergedCase.case_id,
        "DUPLICATE",
        mergeNote,
        actor.email
      );
      mergedCase.last_action = `Merged into master docket ${master.case_id}`;
      mergedCase.last_action_date = now;
      mergedCase.actions.unshift({
        actor_user: actor.email,
        actor_bureau: actor.bureau,
        action_type: "LINKED",
        remarks: `Merged into master docket ${master.case_id}. Single inquiry will proceed under the master file. ${mergeNote}`,
        timestamp: now,
        attachments: [],
      });
    }

    store.notifications.unshift({
      id: `notif_${Date.now()}_merge`,
      type: "OVERLAP",
      case_id: master.case_id,
      target_bureau: "ALL",
      title: `Master docket established: ${master.case_id}`,
      message: `${mergedCases.length} parallel file(s) merged by ${actor.name}. ${mergeNote}`,
      read: false,
      created_at: now,
    });

    markStoreDirty();

    await logAuditEvent({
      user: actor.email,
      action: "MERGE_OVERLAP",
      entity: "OverlapAlert",
      entity_id: alert.id,
      before: { status: "OPEN", case_ids: alert.case_ids },
      after: {
        status: "COORDINATED",
        master_case_id: master.case_id,
        merged_case_ids: alert.merged_case_ids,
        mergeNote,
      },
    });

    return {
      masterCaseId: master.case_id,
      masterInternalId: master.id,
      mergedCaseIds: alert.merged_case_ids,
      alert,
    };
  }

  public async dismissOverlapAlert(
    alertId: string,
    dismissedReason: string,
    actor: SessionUser
  ) {
    const store = getInMemoryStore();
    const alert = store.overlapAlerts.find((o) => o.id === alertId);
    if (!alert) throw new Error("Overlap alert not found.");

    if (!canCoordinateOverlap(actor, alert)) {
      throw new Error(
        `Unauthorized: User ${actor.email} (${actor.bureau}) cannot dismiss an overlap involving ${alert.bureaus_involved.join(", ")}.`
      );
    }

    alert.status = "DISMISSED";
    alert.dismissed_reason = dismissedReason;

    markStoreDirty();

    await logAuditEvent({
      user: actor.email,
      action: "DISMISS_OVERLAP",
      entity: "OverlapAlert",
      entity_id: alert.id,
      after: { dismissedReason },
    });

    return alert;
  }

  /**
   * Overlap alerts enriched with institution details for the alerts workspace.
   */
  public async getOverlapAlerts(user?: SessionUser) {
    const store = getInMemoryStore();
    const instMap = new Map(store.institutions.map((i) => [i.id, i]));
    const caseMap = new Map(store.cases.map((c) => [c.case_id, c]));

    const explainableCase = (c: SeedCase) => {
      const cInst = instMap.get(c.institution_id);
      return {
        id: c.id,
        case_id: c.case_id,
        institution_id: c.institution_id,
        institution_aicte_id: cInst?.aicte_permanent_id,
        institution_name: cInst?.name,
        institution_normalized_name: cInst?.normalized_name,
        institution_city: cInst?.city,
        institution_state: cInst?.state,
        institution_pincode: cInst?.pincode,
        category: c.category,
        description: c.description,
        assigned_bureau: c.assigned_bureau,
        status: c.status,
        date_received: c.date_received,
      };
    };

    let alerts = store.overlapAlerts;
    if (user?.role === "REGIONAL_OFFICER" && user.region) {
      alerts = alerts.filter(
        (a) => instMap.get(a.institution_id)?.region === user.region
      );
    }

    return alerts
      .map((a) => {
        const linked = a.case_ids
          .map((cid) => caseMap.get(cid))
          .filter((c): c is SeedCase => Boolean(c));

        const storedReasons = (a.match_reasons ?? []) as {
          rule?: string;
          score?: number;
        }[];
        const storedFuzzyReason = storedReasons.find(
          (r) => r.rule === "FUZZY_NAME_AND_LOCATION"
        );
        const storedExact = storedReasons.some(
          (r) => r.rule === "EXACT_PERMANENT_ID"
        );
        const storedFuzzyScore =
          typeof storedFuzzyReason?.score === "number"
            ? storedFuzzyReason.score > 1
              ? storedFuzzyReason.score / 100
              : storedFuzzyReason.score
            : undefined;

        const trilayer =
          a.trilayer ??
          (linked.length >= 2
            ? deriveTrilayerFromCases(
                explainableCase(linked[0]),
                explainableCase(linked[1]),
                storedFuzzyReason && !storedExact
                  ? {
                      exactIdOverride: false,
                      nameSimilarityOverride: storedFuzzyScore,
                    }
                  : undefined
              )
            : undefined);

        return {
          ...a,
          trilayer,
          institution: instMap.get(a.institution_id),
          // Internal ids are required for route links; `case_ids` are display
          // codes that contain slashes and cannot be used as a [id] segment.
          cases: linked.map((c) => ({
            id: c.id,
            case_id: c.case_id,
            assigned_bureau: c.assigned_bureau,
            category: c.category,
            priority: c.priority,
            date_received: c.date_received,
          })),
        };
      })
      .sort(
        (a, b) =>
          new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
      );
  }

  /**
   * Notifications
   */
  public async getNotifications(user?: SessionUser) {
    const store = getInMemoryStore();
    let notifs = store.notifications;

    if (user && user.bureau !== "ALL" && user.role !== "ADMIN" && user.role !== "COMPETENT_AUTHORITY") {
      notifs = notifs.filter(
        (n) => n.target_bureau === user.bureau || n.target_bureau === "ALL"
      );
    }

    return notifs;
  }

  public async markNotificationRead(id: string, user?: SessionUser) {
    const visible = await this.getNotifications(user);
    const notification = visible.find((item) => item.id === id);

    if (!notification) {
      throw new Error("Notification not found or not visible to the current user.");
    }

    notification.read = true;
    markStoreDirty();
    return true;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Officer work assignment & personal queue
  // ───────────────────────────────────────────────────────────────────────────

  /** Active registered officers available as assignment targets. */
  public async getAssignableOfficers(user?: SessionUser) {
    const store = getInMemoryStore();
    if (user?.role === "REGIONAL_OFFICER") {
      return []; // read-only observers cannot re-assign
    }
    return store.users
      .filter((u) => u.active)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        bureau: u.bureau,
        region: u.region ?? null,
        designation: u.designation ?? "",
      }));
  }

  /**
   * Assigns a case to a named officer. Bureau officers may only delegate within
   * their own bureau; the target must be an active user whose jurisdiction
   * covers the case (bureau match, or regional officer posted to the
   * institution's region).
   */
  public async assignOfficer(
    caseId: string,
    officerEmail: string,
    note: string,
    actor: SessionUser
  ) {
    const store = getInMemoryStore();
    const c = store.cases.find((item) => item.id === caseId || item.case_id === caseId);
    if (!c) throw new Error(`Case ${caseId} not found.`);

    assertCanActOnCase(actor, c);

    const target = store.users.find(
      (u) => u.email.toLowerCase() === officerEmail.toLowerCase() && u.active
    );
    if (!target) {
      throw new Error("Assigned officer could not be found among active registered officers.");
    }

    if (target.role === "REGIONAL_OFFICER") {
      const inst = store.institutions.find((i) => i.id === c.institution_id);
      if (target.region && inst?.region !== target.region) {
        throw new Error(
          `${target.name} is posted to the ${target.region} region and cannot hold this file (institution is in ${inst?.region ?? "an unknown region"}).`
        );
      }
    } else if (target.bureau !== "ALL" && target.bureau !== c.assigned_bureau) {
      throw new Error(
        `${target.name} belongs to ${target.bureau}, which does not own this case (${c.assigned_bureau}).`
      );
    }

    const previousOfficer = c.assigned_officer;
    c.assigned_officer = target.email;
    c.last_action = `Assigned to ${target.name} (${target.designation || target.role})`;
    c.last_action_date = new Date();

    c.actions.unshift({
      actor_user: actor.email,
      actor_bureau: actor.bureau,
      action_type: "ASSIGNED",
      remarks: note
        ? `${previousOfficer ? `Reassigned from ${previousOfficer} to ${target.email}. ` : `Assigned to ${target.email}. `}Instruction: ${note}`
        : previousOfficer
        ? `Reassigned from ${previousOfficer} to ${target.email}.`
        : `Assigned to ${target.email}.`,
      timestamp: new Date(),
      attachments: [],
    });

    store.notifications.unshift({
      id: uid("notif"),
      type: "ASSIGNMENT",
      case_id: c.case_id,
      target_user: target.email,
      title: `New file in your queue: ${c.case_id}`,
      message: `${actor.name} assigned ${c.case_id} (${c.category}) to ${target.name}. ${note ? "Instruction: " + note : ""}`.trim(),
      read: false,
      created_at: new Date(),
    });

    markStoreDirty();

    await logAuditEvent({
      user: actor.email,
      action: "ASSIGN_OFFICER",
      entity: "Case",
      entity_id: c.case_id,
      before: { assigned_officer: previousOfficer },
      after: { assigned_officer: target.email, note },
    });

    return c;
  }

  /**
   * The officer's personal workbench: files directly assigned to the officer,
   * plus open unassigned files in the officer's bureau for pick-up.
   */
  public async getMyQueue(user: SessionUser) {
    const store = getInMemoryStore();
    const instLookup = new Map(store.institutions.map((i) => [i.id, i]));
    const email = user.email.toLowerCase();

    const enrich = (c: SeedCase) => {
      const inst = instLookup.get(c.institution_id);
      const sla = calculateCaseSla(c.category, c.date_received, c.status);
      return {
        id: c.id,
        case_id: c.case_id,
        category: c.category,
        status: c.status,
        priority: c.priority,
        assigned_bureau: c.assigned_bureau,
        assigned_officer: c.assigned_officer || null,
        assigned_to_me: (c.assigned_officer ?? "").toLowerCase() === email,
        complainant_name: c.complainant_name ?? null,
        institution_name: inst?.name ?? "Unknown institution",
        institution_city: inst?.city ?? "",
        region: inst?.region ?? "",
        date_received: c.date_received,
        last_action: c.last_action,
        last_action_date: c.last_action_date,
        expected_disposal_date: c.expected_disposal_date,
        hearing_date: c.hearing_date ?? null,
        sla,
      };
    };

    const mine = store.cases
      .filter((c) => (c.assigned_officer ?? "").toLowerCase() === email && c.status !== "DISPOSED")
      .map(enrich);

    const unassigned =
      user.bureau !== "ALL"
        ? store.cases
            .filter(
              (c) =>
                !c.assigned_officer &&
                c.assigned_bureau === user.bureau &&
                c.status !== "DISPOSED" &&
                c.status !== "TRANSFERRED"
            )
            .map(enrich)
        : store.cases
            .filter(
              (c) =>
                !c.assigned_officer &&
                c.status !== "DISPOSED" &&
                c.status !== "TRANSFERRED"
            )
            .map(enrich);

    const recency = (c: ReturnType<typeof enrich>) =>
      new Date(c.last_action_date).getTime();

    const grade: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const byUrgency = (a: ReturnType<typeof enrich>, b: ReturnType<typeof enrich>) => {
      if (a.sla.isBreached !== b.sla.isBreached) return a.sla.isBreached ? -1 : 1;
      const ga = grade[a.priority] ?? 9;
      const gb = grade[b.priority] ?? 9;
      if (ga !== gb) return ga - gb;
      return recency(a) - recency(b);
    };

    if (user.role === "REGIONAL_OFFICER" && user.region) {
      const scoped = (c: ReturnType<typeof enrich>) => c.region === user.region;
      return {
        mine: mine.filter(scoped).sort(byUrgency),
        unassigned: unassigned.filter(scoped).sort(byUrgency),
      };
    }

    return {
      mine: mine.sort(byUrgency),
      unassigned: unassigned.sort(byUrgency),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Regional Officer field actions
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Regional officers record on-site/facts verification remarks without
   * mutating bureau case state (they stay read-only for status/transfer).
   */
  public async addFieldVerification(
    caseId: string,
    findings: string,
    actor: SessionUser,
    attachments: string[] = []
  ) {
    const store = getInMemoryStore();
    const c = store.cases.find((item) => item.id === caseId || item.case_id === caseId);
    if (!c) throw new Error(`Case ${caseId} not found.`);

    if (actor.role !== "REGIONAL_OFFICER") {
      throw new Error(
        "This is the Regional Officer field channel. Bureau officers should use Add Remark on the case workspace."
      );
    }

    const inst = store.institutions.find((i) => i.id === c.institution_id);
    if (actor.region && inst?.region !== actor.region) {
      throw new Error(
        `File outside your regional jurisdiction (${inst?.region ?? "unknown"} vs ${actor.region}).`
      );
    }

    c.last_action = `Field verification recorded by ${actor.region} Regional Office`;
    c.last_action_date = new Date();

    c.actions.unshift({
      actor_user: actor.email,
      actor_bureau: `REGIONAL_OFFICE_${(actor.region ?? "").toUpperCase().replace(/[^A-Z]/g, "_")}`.replace(/_+$/, ""),
      action_type: "FIELD_VERIFICATION",
      remarks: findings,
      timestamp: new Date(),
      attachments,
    });

    // Regional intelligence goes straight to the owning bureau.
    store.notifications.unshift({
      id: uid("notif"),
      type: "FIELD_VERIFICATION",
      case_id: c.case_id,
      target_bureau: c.assigned_bureau,
      title: `Field verification filed on ${c.case_id}`,
      message: `${actor.name} (${actor.region} Regional Office) recorded field findings: ${findings.slice(0, 140)}...`,
      read: false,
      created_at: new Date(),
    });

    markStoreDirty();

    await logAuditEvent({
      user: actor.email,
      action: "FIELD_VERIFICATION",
      entity: "Case",
      entity_id: c.case_id,
      after: { findings, region: actor.region ?? null },
    });

    return c;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Inter-bureau comment threads
  // ───────────────────────────────────────────────────────────────────────────

  public async addCaseComment(
    caseId: string,
    body: string,
    scope: "COORDINATION" | "INTERNAL",
    actor: SessionUser
  ) {
    const store = getInMemoryStore();
    const c = store.cases.find((item) => item.id === caseId || item.case_id === caseId);
    if (!c) throw new Error(`Case ${caseId} not found.`);

    // Regional officers may join coordination threads; they cannot post
    // bureau-internal desk notes.
    if (
      scope === "INTERNAL" &&
      !canActOnCase(actor, c)
    ) {
      throw new Error(
        "Internal notes are restricted to the owning bureau (and senior management)."
      );
    }
    if (actor.role === "REGIONAL_OFFICER" && actor.region) {
      const inst = store.institutions.find((i) => i.id === c.institution_id);
      if (inst && inst.region !== actor.region) {
        throw new Error("Comment outside your regional jurisdiction.");
      }
    }

    const comment = {
      id: uid("cm"),
      case_id: c.case_id,
      author_email: actor.email,
      author_name: actor.name,
      author_bureau: actor.bureau,
      body,
      scope,
      created_at: new Date(),
    };
    store.comments.push(comment);

    // Ping the other involved bureaus when coordination crosses boundaries.
    if (scope === "COORDINATION" && actor.bureau !== c.assigned_bureau) {
      store.notifications.unshift({
        id: uid("notif"),
        type: "OVERLAP",
        case_id: c.case_id,
        target_bureau: c.assigned_bureau,
        title: `New coordination note on ${c.case_id}`,
        message: `${actor.name} (${actor.bureau}) posted a coordination note. Open the case workspace to reply.`,
        read: false,
        created_at: new Date(),
      });
    }

    markStoreDirty();

    await logAuditEvent({
      user: actor.email,
      action: "ADD_CASE_COMMENT",
      entity: "CaseComment",
      entity_id: `${c.case_id}:${comment.id}`,
      after: { scope, body },
    });

    return comment;
  }

  /** Comments visible to the current user for a case (COORDINATION + own bureau INTERNAL). */
  public getVisibleCaseComments(caseRegistryId: string, user?: SessionUser) {
    const store = getInMemoryStore();
    const all = store.comments.filter((cm) => cm.case_id === caseRegistryId);
    if (!user) return all.filter((cm) => cm.scope === "COORDINATION");

    const canSeeAllInternal =
      user.role === "ADMIN" ||
      user.role === "COMPETENT_AUTHORITY" ||
      user.bureau === "ALL";

    return all
      .filter((cm) => {
        if (cm.scope === "COORDINATION") return true;
        return canSeeAllInternal || cm.author_bureau === user.bureau;
      })
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Hearing calendar
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Schedules (or reschedules) the statutory committee hearing on a case.
   * Officers of the owning bureau / senior management only.
   */
  public async scheduleHearing(
    caseId: string,
    hearingDate: Date,
    actor: SessionUser
  ) {
    const store = getInMemoryStore();
    const c = store.cases.find((item) => item.id === caseId || item.case_id === caseId);
    if (!c) throw new Error(`Case ${caseId} not found.`);

    assertCanActOnCase(actor, c);

    const previousHearing = c.hearing_date;
    c.hearing_date = hearingDate;
    c.last_action = `Hearing scheduled for ${hearingDate.toDateString().slice(4)}`;
    c.last_action_date = new Date();

    c.actions.unshift({
      actor_user: actor.email,
      actor_bureau: actor.bureau,
      action_type: "HEARING_SCHEDULED",
      remarks: `Statutory hearing scheduled on ${hearingDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}.`,
      timestamp: new Date(),
      attachments: [],
    });

    if (previousHearing) {
      store.notifications.unshift({
        id: uid("notif"),
        type: "HEARING",
        case_id: c.case_id,
        target_bureau: c.assigned_bureau,
        title: `Hearing rescheduled: ${c.case_id}`,
        message: `${actor.name} moved the hearing from ${previousHearing.toDateString().slice(4)} to ${hearingDate.toDateString().slice(4)}.`,
        read: false,
        created_at: new Date(),
      });
    }

    markStoreDirty();

    await logAuditEvent({
      user: actor.email,
      action: "SCHEDULE_HEARING",
      entity: "Case",
      entity_id: c.case_id,
      before: { hearing_date: previousHearing ?? null },
      after: { hearing_date: hearingDate },
    });

    return c;
  }

  /** Hearing board data for the calendar (region-scoped for Regional Officers). */
  public async getUpcomingHearings(user?: SessionUser, daysAhead = 45) {
    const store = getInMemoryStore();
    const instLookup = new Map(store.institutions.map((i) => [i.id, i]));
    const now = Date.now();
    const horizon = now + daysAhead * 86400000;

    let hearings = store.cases
      .filter((c) => c.hearing_date && c.status !== "DISPOSED")
      .map((c) => {
        const inst = instLookup.get(c.institution_id);
        const hearingTime = new Date(c.hearing_date!).getTime();
        return {
          id: c.id,
          case_id: c.case_id,
          internal_id: c.id,
          category: c.category,
          status: c.status,
          priority: c.priority,
          assigned_bureau: c.assigned_bureau,
          institution_name: inst?.name ?? "Unknown institution",
          city: inst?.city ?? "",
          state: inst?.state ?? "",
          region: inst?.region ?? "",
          sla_status: calculateCaseSla(c.category, c.date_received, c.status),
          hearing_date: new Date(c.hearing_date!),
          daysUntil: Math.floor((hearingTime - now) / 86400000),
          isPast: hearingTime < now,
          isThisWeek: hearingTime >= now && hearingTime <= now + 7 * 86400000,
        };
      })
      .filter((h) => h.hearing_date.getTime() <= horizon);

    if (user?.role === "REGIONAL_OFFICER" && user.region) {
      hearings = hearings.filter((h) => h.region === user.region);
    }

    hearings.sort(
      (a, b) => a.hearing_date.getTime() - b.hearing_date.getTime()
    );

    return hearings;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Recurring complainant intelligence
  // ───────────────────────────────────────────────────────────────────────────

  private complainantInputs(user?: SessionUser): ComplainantCaseInput[] {
    const store = getInMemoryStore();
    const instMap = new Map(store.institutions.map((i) => [i.id, i]));
    let cases = store.cases;
    if (user?.role === "REGIONAL_OFFICER" && user.region) {
      cases = cases.filter(
        (c) => instMap.get(c.institution_id)?.region === user.region
      );
    }
    return cases.map((c) => ({
      case_id: c.case_id,
      complainant_name: c.complainant_name,
      complainant_contact: c.complainant_contact,
      status: c.status,
      category: c.category,
      assigned_bureau: c.assigned_bureau,
      date_received: c.date_received,
      institution_name: instMap.get(c.institution_id)?.name ?? null,
    }));
  }

  /** Complainant watchlist across the user's visible portfolio. */
  public getComplainantInsights(user?: SessionUser): ComplainantProfile[] {
    return analyzeComplainants(this.complainantInputs(user)).profiles;
  }

  /** Recurrence profile for a specific case's complainant (used on case pages). */
  public getComplainantProfileForCase(caseId: string) {
    const store = getInMemoryStore();
    const c = store.cases.find((item) => item.id === caseId || item.case_id === caseId);
    if (!c || !c.complainant_name) return null;
    const summary = analyzeComplainants(this.complainantInputs(undefined));
    const profile = summary.byKey.get(
      c.complainant_name
        .toLowerCase()
        .replace(/\(.*?\)/g, " ")
        .replace(/[^a-z0-9\u0900-\u097f]+/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .join(" ")
    );
    if (!profile) return null;
    return {
      profile,
      meta: RECURRENCE_META[profile.level],
      isCurrentCase: profile.caseIds.includes(c.case_id),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Institution document vault
  // ───────────────────────────────────────────────────────────────────────────

  public async getInstitutionDocuments(institutionId: string) {
    const store = getInMemoryStore();
    const inst = store.institutions.find(
      (i) => i.id === institutionId || i.aicte_permanent_id === institutionId
    );
    if (!inst) return [];
    return store.documents
      .filter((d) => d.institution_id === inst.id)
      .sort(
        (a, b) =>
          new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      );
  }

  public async addInstitutionDocument(
    data: {
      institution_id: string;
      title: string;
      doc_type: string;
      blob_url: string;
      file_name: string;
      file_size: number;
      notes?: string;
      case_id?: string;
    },
    actor: SessionUser
  ) {
    const store = getInMemoryStore();
    const inst = store.institutions.find((i) => i.id === data.institution_id);
    if (!inst) throw new Error("Institution not found.");

    if (
      data.case_id &&
      !store.cases.some((c) => c.case_id === data.case_id)
    ) {
      throw new Error(`Linked case registry number ${data.case_id} was not found.`);
    }

    const document: SeedDocument = {
      id: uid("doc"),
      institution_id: inst.id,
      title: data.title,
      doc_type: data.doc_type as SeedDocument["doc_type"],
      blob_url: data.blob_url,
      file_name: data.file_name,
      file_size: data.file_size,
      uploaded_by: actor.email,
      notes: data.notes || undefined,
      case_id: data.case_id || undefined,
      uploaded_at: new Date(),
    };
    store.documents.unshift(document);
    markStoreDirty();

    await logAuditEvent({
      user: actor.email,
      action: "ADD_INSTITUTION_DOCUMENT",
      entity: "InstitutionDocument",
      entity_id: document.id,
      after: {
        title: data.title,
        doc_type: data.doc_type,
        institution: inst.aicte_permanent_id,
        linked_case: data.case_id ?? null,
      },
    });

    return document;
  }

  public async removeInstitutionDocument(documentId: string, actor: SessionUser) {
    const store = getInMemoryStore();
    const idx = store.documents.findIndex((d) => d.id === documentId);
    if (idx === -1) throw new Error("Document not found.");

    const doc = store.documents[idx];
    const isOwner = doc.uploaded_by.toLowerCase() === actor.email.toLowerCase();
    if (!isOwner && actor.role !== "ADMIN") {
      throw new Error("Only the uploading officer or an administrator can remove a vault record.");
    }

    store.documents.splice(idx, 1);
    markStoreDirty();

    await logAuditEvent({
      user: actor.email,
      action: "REMOVE_INSTITUTION_DOCUMENT",
      entity: "InstitutionDocument",
      entity_id: documentId,
      before: { title: doc.title, doc_type: doc.doc_type },
    });

    return true;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Team & user management (Admin console)
  // ───────────────────────────────────────────────────────────────────────────

  private requireAdmin(user: SessionUser) {
    if (user.role !== "ADMIN") {
      throw new Error("Only the system administrator can manage team accounts.");
    }
  }

  public async getUsers(user: SessionUser) {
    this.requireAdmin(user);
    const store = getInMemoryStore();
    const openByOfficer = new Map<string, number>();
    for (const c of store.cases) {
      if (c.status !== "DISPOSED" && c.assigned_officer) {
        const key = c.assigned_officer.toLowerCase();
        openByOfficer.set(key, (openByOfficer.get(key) ?? 0) + 1);
      }
    }
    return store.users
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        bureau: u.bureau,
        region: u.region ?? null,
        designation: u.designation ?? "",
        active: u.active,
        createdAt: u.created_at,
        openCases: openByOfficer.get(u.email.toLowerCase()) ?? 0,
      }));
  }

  public async createUser(
    data: {
      name: string;
      email: string;
      password: string;
      role: string;
      bureau: string;
      region?: string | null;
      designation?: string | null;
    },
    actor: SessionUser
  ) {
    this.requireAdmin(actor);
    const store = getInMemoryStore();

    const email = data.email.toLowerCase().trim();
    if (store.users.some((u) => u.email.toLowerCase() === email)) {
      throw new Error("An account with this email already exists.");
    }

    const bcryptHash = bcrypt.hashSync(data.password, 10);

    const newUser: StoreUser = {
      id: uid("usr"),
      name: data.name.trim(),
      email,
      password_hash: bcryptHash,
      role: data.role,
      bureau: data.bureau,
      region: data.region ?? null,
      designation: data.designation ?? "",
      active: true,
      created_at: new Date(),
    };
    store.users.push(newUser);
    markStoreDirty();

    // Best-effort persistence into the real User table when a DB is attached.
    void prisma.user
      .upsert({
        where: { email },
        update: {
          name: newUser.name,
          password_hash: bcryptHash,
          role: newUser.role,
          bureau: newUser.bureau,
          region: newUser.region,
          designation: newUser.designation,
          active: true,
        },
        create: {
          name: newUser.name,
          email,
          password_hash: bcryptHash,
          role: newUser.role,
          bureau: newUser.bureau,
          region: newUser.region,
          designation: newUser.designation,
          active: true,
        },
      })
      .catch(() =>
        console.debug("User persistence skipped (database unreachable).")
      );

    await logAuditEvent({
      user: actor.email,
      action: "CREATE_USER",
      entity: "User",
      entity_id: email,
      after: { role: newUser.role, bureau: newUser.bureau, region: newUser.region },
    });

    return { ...newUser, password_hash: undefined };
  }

  public async updateUser(
    userId: string,
    patch: {
      role?: string;
      bureau?: string;
      region?: string | null;
      designation?: string | null;
      active?: boolean;
    },
    actor: SessionUser
  ) {
    this.requireAdmin(actor);
    const store = getInMemoryStore();
    const target = store.users.find((u) => u.id === userId);
    if (!target) throw new Error("User not found.");

    const adminDowngrade =
      target.role === "ADMIN" &&
      target.active &&
      ((patch.role !== undefined && patch.role !== "ADMIN") || patch.active === false);
    const otherActiveAdmins = store.users.filter(
      (u) => u.id !== userId && u.role === "ADMIN" && u.active
    ).length;
    if (adminDowngrade && otherActiveAdmins === 0) {
      throw new Error("At least one active administrator account must remain.");
    }

    const before = {
      role: target.role,
      bureau: target.bureau,
      region: target.region,
      active: target.active,
    };

    if (patch.role !== undefined) target.role = patch.role;
    if (patch.bureau !== undefined) target.bureau = patch.bureau;
    if ("region" in patch) target.region = patch.region ?? null;
    if ("designation" in patch) target.designation = patch.designation ?? "";
    if (patch.active !== undefined) target.active = patch.active;

    markStoreDirty();

    void prisma.user
      .update({
        where: { email: target.email },
        data: {
          role: target.role,
          bureau: target.bureau,
          region: target.region,
          designation: target.designation,
          active: target.active,
        },
      })
      .catch(() =>
        console.debug("User update skipped (database unreachable).")
      );

    await logAuditEvent({
      user: actor.email,
      action: "UPDATE_USER",
      entity: "User",
      entity_id: target.email,
      before,
      after: { role: target.role, bureau: target.bureau, region: target.region, active: target.active },
    });

    return { ...target, password_hash: undefined };
  }

  public async resetUserPassword(
    userId: string,
    newPassword: string,
    actor: SessionUser
  ) {
    this.requireAdmin(actor);
    const store = getInMemoryStore();
    const target = store.users.find((u) => u.id === userId);
    if (!target) throw new Error("User not found.");

    const bcryptHash = bcrypt.hashSync(newPassword, 10);
    target.password_hash = bcryptHash;
    markStoreDirty();

    void prisma.user
      .update({
        where: { email: target.email },
        data: { password_hash: bcryptHash },
      })
      .catch(() =>
        console.debug("Password persistence skipped (database unreachable).")
      );

    await logAuditEvent({
      user: actor.email,
      action: "RESET_USER_PASSWORD",
      entity: "User",
      entity_id: target.email,
    });

    return true;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public complaint status tracking (no-auth)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Citizen-facing status profile. Deliberately restricted: no internal desk
   * notes, no attachments, no officer identities, no comment threads.
   */
  public getPublicCaseStatus(registryNo: string) {
    const store = getInMemoryStore();
    const key = registryNo.trim().toUpperCase();
    const c = store.cases.find(
      (item) => item.case_id.toUpperCase() === key
    );
    if (!c) return null;

    const inst = store.institutions.find((i) => i.id === c.institution_id);
    const sla = calculateCaseSla(c.category, c.date_received, c.status);
    // Public timeline: only event classes whose remarks are citizen-safe.
    const timeline = c.actions
      .filter((a) =>
        ["RECEIVED", "STATUS_CHANGED", "HEARING_SCHEDULED", "DISPOSED", "ESCALATED"].includes(
          a.action_type
        )
      )
      .map((a) => ({
        action_type: a.action_type,
        remarks: a.remarks,
        timestamp: a.timestamp,
      }))
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    return {
      registry_no: c.case_id,
      category: c.category,
      status: c.status,
      assigned_bureau: c.assigned_bureau,
      institution_name: inst?.name ?? "Institution on record",
      institution_city: inst?.city ?? "",
      institution_state: inst?.state ?? "",
      date_received: c.date_received,
      expected_disposal_date: c.expected_disposal_date,
      hearing_date: c.hearing_date ?? null,
      sla_status: sla.statusText,
      last_action: c.last_action,
      timeline,
    };
  }

  /**
   * Citizens who asked to be notified when a tracked grievance changes state.
   * Counted from the durable store keyed on the case's internal id.
   */
  public async getPublicWatcherCount(registryNo: string) {
    const store = getInMemoryStore();
    const key = registryNo.trim().toUpperCase();
    const c = store.cases.find((item) => item.case_id.toUpperCase() === key);
    if (!c) return 0;
    try {
      return await prisma.grievanceWatcher.count({ where: { case_id: c.id } });
    } catch {
      return 0;
    }
  }

  /** Idempotent public watch subscription. Returns the new watcher count. */
  public async subscribePublicWatcher(registryNo: string, email: string) {
    const store = getInMemoryStore();
    const key = registryNo.trim().toUpperCase();
    const c = store.cases.find((item) => item.case_id.toUpperCase() === key);
    if (!c) return null;
    await prisma.grievanceWatcher.upsert({
      where: { case_id_email: { case_id: c.id, email } },
      create: { case_id: c.id, email },
      update: {},
    });
    return await prisma.grievanceWatcher.count({ where: { case_id: c.id } });
  }

  public async getAuditLogs() {
    // Ensure the in-memory store (and its seeded ledger) is initialised before
    // reading, so route handlers see the same history as the audit page.
    const store = getInMemoryStore();
    seedAuditLedger(store.cases);
    return inMemoryAuditLogs;
  }
}

export const repository = new ComplaintRepository();
export default repository;
