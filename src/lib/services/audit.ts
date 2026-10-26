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

// In-memory audit log store for fallback
export const inMemoryAuditLogs: AuditEntry[] = [];

export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  const record = {
    user: entry.user,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entity_id,
    before: entry.before ? JSON.parse(JSON.stringify(entry.before)) : null,
    after: entry.after ? JSON.parse(JSON.stringify(entry.after)) : null,
    ip: entry.ip || "127.0.0.1",
    timestamp: entry.timestamp || new Date(),
  };

  inMemoryAuditLogs.unshift(record);

  try {
    await prisma.auditLog.create({
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
    });
  } catch {
    // Graceful fallback to in-memory audit log when live database is disconnected
    console.debug("Persisted audit log to memory buffer.");
  }
}
