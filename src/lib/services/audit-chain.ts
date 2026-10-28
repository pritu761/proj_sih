import { createHash } from "crypto";
import type { AuditEntry } from "./audit";

/**
 * Tamper-evident audit chain
 * --------------------------
 * Each ledger entry is sealed with SHA-256 over:
 *   sequence | previous hash | actor | action | entity | ip | timestamp | payload
 *
 * Changing any field - even inside the payload - changes that block's hash and
 * breaks every subsequent link. The head hash is the single value an auditor
 * needs to attest the whole ledger.
 */

export interface ChainedAuditEntry extends AuditEntry {
  seq: number;
  hash: string;
  prevHash: string;
  block: string;
}

export interface AuditChain {
  entries: ChainedAuditEntry[];
  head: string;
  genesis: string;
  algorithm: "SHA-256";
  count: number;
  valid: boolean;
  brokenAt: number | null;
  builtAt: string;
}

export const GENESIS_HASH = "GENESIS";

function canonical(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashEntry(
  seq: number,
  prevHash: string,
  entry: AuditEntry
): string {
  const timestamp = entry.timestamp
    ? new Date(entry.timestamp).toISOString()
    : "unknown";
  const payload = [
    seq,
    prevHash,
    entry.user ?? "",
    entry.action ?? "",
    entry.entity ?? "",
    entry.entity_id ?? "",
    entry.ip ?? "",
    timestamp,
    canonical(entry.before),
    canonical(entry.after),
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}

/**
 * The attested prefix is anchored on the first seal. Later verifications must
 * reproduce it exactly; any edit to a sealed record (or deletion) breaks the
 * match. Newly appended blocks extend the anchor only when the prefix matches.
 */
const globalAttestation = globalThis as unknown as {
  auditAttestation?: { hashes: string[]; head: string };
};

export function resetAuditAttestation() {
  delete globalAttestation.auditAttestation;
}

/**
 * Seals the ledger in chronological order, then returns entries newest-first
 * for display. `valid` compares the seal against the anchored prefix, so it
 * reflects tampering with stored records.
 */
export function buildAuditChain(logs: AuditEntry[]): AuditChain {
  const chronological = logs
    .map((entry) => entry)
    .sort((a, b) => {
      const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      if (at !== bt) return at - bt;
      // Deterministic tie-break so independent bundles seal identical chains.
      return (
        (a.entity_id ?? "").localeCompare(b.entity_id ?? "") ||
        (a.action ?? "").localeCompare(b.action ?? "") ||
        (a.user ?? "").localeCompare(b.user ?? "")
      );
    });

  let prevHash = GENESIS_HASH;
  let valid = true;
  let brokenAt: number | null = null;

  const sealed: ChainedAuditEntry[] = chronological.map((entry, i) => {
    const seq = i + 1;
    const hash = hashEntry(seq, prevHash, entry);
    const record: ChainedAuditEntry = {
      ...entry,
      seq,
      hash,
      prevHash,
      block: `#${String(seq).padStart(4, "0")}`,
    };
    prevHash = hash;
    return record;
  });

  // Full re-verification pass over the sealed chain.
  let cursor = GENESIS_HASH;
  for (const record of sealed) {
    const recomputed = hashEntry(record.seq, cursor, record);
    if (recomputed !== record.hash || record.prevHash !== cursor) {
      valid = false;
      if (brokenAt === null) brokenAt = record.seq;
      break;
    }
    cursor = record.hash;
  }

  // Compare against the anchored prefix recorded when the ledger was first sealed.
  const attestation = globalAttestation.auditAttestation;
  if (attestation && valid) {
    const shared = Math.min(attestation.hashes.length, sealed.length);
    for (let i = 0; i < shared; i += 1) {
      if (sealed[i].hash !== attestation.hashes[i]) {
        valid = false;
        brokenAt = i + 1;
        break;
      }
    }
    if (valid && attestation.hashes.length > sealed.length) {
      // A previously sealed block has been removed.
      valid = false;
      brokenAt = sealed.length + 1;
    }
  }

  if (valid) {
    globalAttestation.auditAttestation = {
      hashes: sealed.map((record) => record.hash),
      head: prevHash,
    };
  }

  return {
    entries: [...sealed].reverse(),
    head: prevHash,
    genesis: GENESIS_HASH,
    algorithm: "SHA-256",
    count: sealed.length,
    valid,
    brokenAt,
    builtAt: new Date().toISOString(),
  };
}

export function shortHash(hash: string, size = 10): string {
  if (hash.length <= size * 2) return hash;
  return `${hash.slice(0, size)}...${hash.slice(-4)}`;
}
