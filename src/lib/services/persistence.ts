import prisma from "@/lib/prisma";
import type { AuditEntry } from "./audit";
import type {
  SeedCase,
  SeedComment,
  SeedDocument,
  SeedInstitution,
  SeedOverlapAlert,
} from "@/lib/mock-data-generator";

/**
 * Durable persistence via a Postgres-backed JSONB snapshot.
 *
 * The whole demo store is serialized into a single `AppSnapshotState` row with
 * a short write-behind debounce after every mutation. On a cold start the
 * snapshot is hydrated back into the in-memory store, so data survives restarts
 * and serverless invocations whenever PostgreSQL is attached — while continuing
 * to work with zero database configuration (the README's "clean npm run dev"
 * guarantee) when it is not.
 */

export const SNAPSHOT_VERSION = 5;

/** Users known to the platform (mirrors the `User` table content). */
export interface StoreUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  bureau: string;
  region?: string | null;
  designation?: string | null;
  active: boolean;
  created_at: Date;
}

export interface StoreNotification {
  id: string;
  type: string;
  case_id?: string;
  target_bureau?: string;
  target_user?: string;
  title: string;
  message: string;
  read: boolean;
  created_at: Date;
}

export interface StoreCaseLink {
  id: string;
  case_a_id: string;
  case_b_id: string;
  link_type: string;
  created_by: string;
  created_at: Date;
  note?: string;
}

/** The canonical mutable demo store shape (owned by the repository). */
export interface StoreState {
  institutions: SeedInstitution[];
  cases: SeedCase[];
  overlapAlerts: SeedOverlapAlert[];
  caseLinks: StoreCaseLink[];
  notifications: StoreNotification[];
  comments: SeedComment[];
  documents: SeedDocument[];
  users: StoreUser[];
  /** UTC day (YYYY-MM-DD) the synthetic daily intake last ran for. */
  lastDailyIntake?: string;
  /** UTC day (YYYY-MM-DD) the auto-escalation sweep last ran for. */
  lastAutoEscalation?: string;
  /** Merge-suggestion pair keys an officer already reviewed ("not duplicates"). */
  dismissedMergeSuggestions?: string[];
}

interface SnapshotPayload {
  version: number;
  store: StoreState;
  auditLogs: AuditEntry[];
}

type SnapshotProvider = () => { store: StoreState; auditLogs: AuditEntry[]; isDirtyAtHydration?: boolean } | null;

let provider: SnapshotProvider | null = null;
let hydrationComplete = false;
let mutatedDuringHydration = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const DATE_KEYS = new Set([
  "timestamp",
  "created_at",
  "uploaded_at",
  "detected_at",
  "date_received",
  "last_action_date",
  "expected_disposal_date",
  "hearing_date",
  "merged_at",
  "updated_at",
  "feedback_at",
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

/** Restores `Date` objects lost to JSON serialization, by known field names. */
function revive<T>(value: T): T {
  if (Array.isArray(value)) return value.map(revive) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === "string" && DATE_KEYS.has(k) && ISO_DATE.test(v)) {
        out[k] = new Date(v);
      } else if (v && typeof v === "object") {
        out[k] = revive(v);
      } else {
        out[k] = v;
      }
    }
    return out as unknown as T;
  }
  return value;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`snapshot op exceeded ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

/** The repository registers its live store so persistence never imports it back. */
export function registerSnapshotSource(source: SnapshotProvider): void {
  provider = source;
}

/** Schedules a write-behind snapshot flush (batched, at most one per window). */
export function markStoreDirty(): void {
  if (!hydrationComplete) mutatedDuringHydration = true;
  if (!provider || flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void persistSnapshot();
  }, 2000);
}

export async function persistSnapshot(): Promise<void> {
  if (!provider) return;
  const snapshot = provider();
  if (!snapshot) return;
  const payload: SnapshotPayload = {
    version: SNAPSHOT_VERSION,
    store: snapshot.store,
    auditLogs: snapshot.auditLogs,
  };
  try {
    await withTimeout(
      prisma.appStateSnapshot.upsert({
        where: { id: "singleton" },
        update: { data: payload as object },
        create: { id: "singleton", data: payload as object },
      }),
      4000
    );
  } catch {
    // No reachable database (demo mode). The in-memory store remains the
    // authoritative source and the UI keeps working untouched.
    console.debug("Snapshot persistence skipped (database unreachable).");
  }
}

/**
 * Hydrates a freshly seeded store from the persisted snapshot when one is
 * available. Arrays are refilled in place so every reference captured earlier
 * keeps pointing at the same live store object.
 */
export async function hydrateFromSnapshot(
  store: StoreState,
  auditLogs: AuditEntry[]
): Promise<void> {
  try {
    const row = await withTimeout(
      prisma.appStateSnapshot.findUnique({ where: { id: "singleton" } }),
      2500
    );
    if (!row?.data) {
      hydrationComplete = true;
      return;
    }
    const payload = row.data as unknown as SnapshotPayload;
    if (payload?.version !== SNAPSHOT_VERSION || !payload.store) {
      console.debug("Snapshot version mismatch; falling back to seed data.");
      hydrationComplete = true;
      return;
    }
    if (mutatedDuringHydration) {
      // A mutation already happened this boot — the live state wins.
      hydrationComplete = true;
      return;
    }

    const revived = revive(payload.store);
    Object.assign(store, revived);

    if (Array.isArray(payload.auditLogs)) {
      const revivedLogs = revive(payload.auditLogs) as AuditEntry[];
      auditLogs.splice(0, auditLogs.length, ...revivedLogs);
    }
    hydrationComplete = true;
  } catch {
    // Demo mode without a database — seed data stays.
    hydrationComplete = true;
  }
}
