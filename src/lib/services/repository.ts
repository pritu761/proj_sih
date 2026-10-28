import { generateSeedData, SeedInstitution, SeedCase, SeedOverlapAlert } from "@/lib/mock-data-generator";
import { calculateCaseSla, computeAgeingBuckets } from "./sla-engine";
import { buildRiskRadar, buildCaseInsight } from "./risk-engine";
import { overlapDetector } from "./overlap-detector";
import { logAuditEvent, inMemoryAuditLogs } from "./audit";
import { SessionUser, assertCanActOnCase } from "@/lib/rbac";

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
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
  sortBy?: "date_received" | "last_action_date" | "priority" | "status";
  sortOrder?: "asc" | "desc";
}

// Global In-Memory Cache to support instant preview and seamless unit/UI flows
const globalRepo = globalThis as unknown as {
  inMemoryData?: {
    institutions: SeedInstitution[];
    cases: SeedCase[];
    overlapAlerts: SeedOverlapAlert[];
    notifications: {
      id: string;
      type: string;
      case_id?: string;
      target_bureau?: string;
      target_user?: string;
      title: string;
      message: string;
      read: boolean;
      created_at: Date;
    }[];
    caseLinks: {
      id: string;
      case_a_id: string;
      case_b_id: string;
      link_type: string;
      created_by: string;
      created_at: Date;
      note?: string;
    }[];
  };
};

function seedAuditLedger(cases: SeedCase[]) {
  if (inMemoryAuditLogs.length > 0) return;
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

function getInMemoryStore() {
  if (!globalRepo.inMemoryData) {
    const seed = generateSeedData();
    globalRepo.inMemoryData = {
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
    };

    // Seed an initial tamper-evident audit ledger from the generated case actions
    seedAuditLedger(seed.cases);
  }
  return globalRepo.inMemoryData;
}

export class ComplaintRepository {
  /**
   * KPI and Charts Aggregation for Home Dashboard
   */
  public async getDashboardMetrics(user?: SessionUser) {
    const store = getInMemoryStore();
    const isRegional = user?.role === "REGIONAL_OFFICER" && Boolean(user.region);

    // Apply region filter if Regional Officer
    let allCases = store.cases;
    if (isRegional) {
      const regionInstIds = new Set(
        store.institutions.filter((i) => i.region === user.region).map((i) => i.id)
      );
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

    const openOverlapAlerts = store.overlapAlerts.filter((o) => o.status === "OPEN").length;
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
    const openOverlapList = store.overlapAlerts
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
    const scopedInstitutionIds = new Set(allCases.map((c) => c.institution_id));
    const scopedOverlaps = isRegional
      ? store.overlapAlerts.filter((o) => scopedInstitutionIds.has(o.institution_id))
      : store.overlapAlerts;
    const riskRadar = buildRiskRadar(allCases, store.institutions, scopedOverlaps);

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
  public async getInstitutionById(id: string) {
    const store = getInMemoryStore();
    const inst = store.institutions.find(
      (i) => i.id === id || i.aicte_permanent_id === id
    );

    if (!inst) return null;

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
  public async getCaseById(id: string) {
    const store = getInMemoryStore();
    const c = store.cases.find((item) => item.id === id || item.case_id === id);
    if (!c) return null;

    const inst = store.institutions.find((i) => i.id === c.institution_id);
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
  public async search(term: string) {
    const store = getInMemoryStore();
    const q = term.trim().toLowerCase();
    if (q.length < 2) return { cases: [], institutions: [] };

    const instMap = new Map(store.institutions.map((i) => [i.id, i]));

    const cases = store.cases
      .filter((c) => {
        const inst = instMap.get(c.institution_id);
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
      .filter((i) =>
        [i.name, i.aicte_permanent_id, i.city, i.state, i.region, i.institution_type]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
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

    await logAuditEvent({
      user: actor.email,
      action: "ESCALATE_CASE",
      entity: "Case",
      entity_id: c.case_id,
      before: { priority: prevPriority, status: c.status },
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
    const [c1, c2] = [caseAId, caseBId].sort();

    const existing = store.caseLinks.find(
      (l) => l.case_a_id === c1 && l.case_b_id === c2
    );

    if (existing) {
      existing.link_type = linkType;
      existing.note = note;
    } else {
      store.caseLinks.push({
        id: `link_${Date.now()}`,
        case_a_id: c1,
        case_b_id: c2,
        link_type: linkType,
        created_by: actor.email,
        created_at: new Date(),
        note,
      });
    }

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

    const caseCount = store.cases.length + 1;
    const caseIdCode = `AICTE/${bureauCode}/2026/${String(300 + caseCount).padStart(5, "0")}`;

    const newCase: SeedCase = {
      id: `case_${Date.now()}`,
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
      expected_disposal_date: new Date(Date.now() + 30 * 86400000),
      priority: data.priority || "MEDIUM",
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

    alert.status = "COORDINATED";
    alert.coordination_note = coordinationNote;

    // Automatically link the cases as OVERLAP
    if (alert.case_ids.length >= 2) {
      await this.linkCases(alert.case_ids[0], alert.case_ids[1], "OVERLAP", coordinationNote, actor);
    }

    await logAuditEvent({
      user: actor.email,
      action: "COORDINATE_OVERLAP",
      entity: "OverlapAlert",
      entity_id: alert.id,
      after: { coordinationNote },
    });

    return alert;
  }

  public async dismissOverlapAlert(
    alertId: string,
    dismissedReason: string,
    actor: SessionUser
  ) {
    const store = getInMemoryStore();
    const alert = store.overlapAlerts.find((o) => o.id === alertId);
    if (!alert) throw new Error("Overlap alert not found.");

    alert.status = "DISMISSED";
    alert.dismissed_reason = dismissedReason;

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

  public async markNotificationRead(id: string) {
    const store = getInMemoryStore();
    const n = store.notifications.find((item) => item.id === id);
    if (n) n.read = true;
    return true;
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
