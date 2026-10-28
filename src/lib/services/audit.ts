import prisma from "@/lib/prisma";

export interface AuditEntry {
  user: string;
  action: string;
  entity: string;
  entity_id: string;
  before?: any;
  after?: any;
  ip?: string;
  timestamp?: Date;
}

// In-memory audit log store for fallback.
// Anchored on globalThis so that page renders, server actions and route
// handlers (which Next may bundle separately) all read the same ledger.
const globalAuditStore = globalThis as unknown as {
  inMemoryAuditLogs?: AuditEntry[];
};
export const inMemoryAuditLogs: AuditEntry[] =
  (globalAuditStore.inMemoryAuditLogs ??= []);

/**
 * Audit events must always be the newest blocks in the ledger. The chain is
 * sealed chronologically and anchored on the first seal, so a new event that
 * carried an earlier timestamp than an existing block would be inserted in the
 * middle and invalidate the attested prefix. Events therefore get at least
 * `max(now, newest block + 1ms)`.
 */
function nextAuditTimestamp(requested: Date): Date {
  let latest = 0;
  for (const existing of inMemoryAuditLogs) {
    const time = existing.timestamp ? new Date(existing.timestamp).getTime() : 0;
    if (Number.isFinite(time) && time > latest) latest = time;
  }
  const requestedTime = requested.getTime();
  const base = Number.isFinite(requestedTime) ? requestedTime : latest;
  return new Date(Math.max(base, latest + 1));
}

export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  const record = {
    user: entry.user,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entity_id,
    before: entry.before ? JSON.parse(JSON.stringify(entry.before)) : null,
    after: entry.after ? JSON.parse(JSON.stringify(entry.after)) : null,
    ip: entry.ip || "127.0.0.1",
    timestamp: nextAuditTimestamp(entry.timestamp ? new Date(entry.timestamp) : new Date()),
  };

  inMemoryAuditLogs.unshift(record);

  // Persist asynchronously. The in-memory ledger is authoritative for the demo,
  // and an unreachable database must never stall a user-facing mutation.
  void prisma.auditLog
    .create({
      data: {
        user: record.user,
        action: record.action,
        entity: record.entity,
        entity_id: record.entity_id,
        before: record.before,
        after: record.after,
        ip: record.ip,
        timestamp: record.timestamp,
      },
    })
    .catch(() => {
      // Graceful fallback to the in-memory audit log when the database is
      // disconnected or the deployment is running in demo mode.
      console.debug("Persisted audit log to memory buffer.");
    });
}
