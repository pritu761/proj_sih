import { SLA_CONFIGS } from "@/lib/demo-data";

export interface SlaConfigOverride {
  timeline_days: number;
  warning_threshold_percent: number;
}

export interface EffectiveSlaConfig extends SlaConfigOverride {
  category: string;
}

interface SlaOverrideRegistry {
  overrides: Record<string, SlaConfigOverride>;
}

/**
 * Administrable statutory schedule.
 *
 * Next.js bundles shared server modules once per layer (page renders, route
 * handlers, server actions), so a plain module-level override object would
 * leave some layers holding a different copy. The registry is anchored on
 * globalThis — the same technique used by the store, audit ledger and Prisma
 * client — so every call site of `calculateCaseSla` reads one authoritative
 * set of overrides. The in-memory store persists these overrides in the JSONB
 * snapshot; the Prisma `SlaConfig` table is only a best-effort mirror.
 */
const globalSla = globalThis as unknown as {
  __sentinelSlaOverrides?: SlaOverrideRegistry;
};
const slaRegistry: SlaOverrideRegistry = (globalSla.__sentinelSlaOverrides ??= {
  overrides: {},
});

/** Replaces the live override set (called by the repository on store hydration/save). */
export function setSlaConfigOverrides(
  overrides?: Record<string, SlaConfigOverride> | null
): void {
  const next: Record<string, SlaConfigOverride> = {};
  for (const [category, value] of Object.entries(overrides ?? {})) {
    if (!value) continue;
    const timeline = Math.round(Number(value.timeline_days));
    const threshold = Math.round(Number(value.warning_threshold_percent));
    if (
      !Number.isFinite(timeline) ||
      timeline < 1 ||
      timeline > 3650 ||
      !Number.isFinite(threshold) ||
      threshold < 1 ||
      threshold > 100
    ) {
      continue;
    }
    next[category] = {
      timeline_days: timeline,
      warning_threshold_percent: threshold,
    };
  }
  slaRegistry.overrides = next;
}

export function clearSlaConfigOverrides(): void {
  slaRegistry.overrides = {};
}

export function getSlaConfigOverrides(): Record<string, SlaConfigOverride> {
  return { ...slaRegistry.overrides };
}

/** Baseline schedule with any administrator overrides merged in by category. */
export function getEffectiveSlaConfigs(): EffectiveSlaConfig[] {
  return SLA_CONFIGS.map((base) => {
    const override = slaRegistry.overrides[base.category];
    return {
      category: base.category,
      timeline_days: override?.timeline_days ?? base.timeline_days,
      warning_threshold_percent:
        override?.warning_threshold_percent ?? base.warning_threshold_percent,
    };
  });
}

export function getEffectiveSlaConfig(
  category: string
): EffectiveSlaConfig | undefined {
  return getEffectiveSlaConfigs().find(
    (c) => c.category.toLowerCase() === category.toLowerCase()
  );
}

export interface SlaStatusResult {
  timelineDays: number;
  elapsedDays: number;
  remainingDays: number;
  isBreached: boolean;
  isApproaching: boolean; // >= warning_threshold_percent (default 80%)
  percentElapsed: number;
  statusColor: "emerald" | "amber" | "rose";
  statusText: string;
}

export interface AgeingBuckets {
  bucket_0_15: number;
  bucket_16_30: number;
  bucket_31_60: number;
  bucket_60_plus: number;
}

/**
 * Calculates real-time SLA metrics for a case
 */
export function calculateCaseSla(
  category: string,
  dateReceived: Date | string,
  currentStatus: string,
  referenceDate: Date = new Date()
): SlaStatusResult {
  const slaConfig = getEffectiveSlaConfig(category) || {
    category,
    timeline_days: 30,
    warning_threshold_percent: 80,
  };

  const received = new Date(dateReceived);
  const diffMs = referenceDate.getTime() - received.getTime();
  const elapsedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const timelineDays = slaConfig.timeline_days;
  const remainingDays = timelineDays - elapsedDays;
  const percentElapsed = Math.min(100, Math.round((elapsedDays / timelineDays) * 100));

  if (currentStatus === "DISPOSED") {
    return {
      timelineDays,
      elapsedDays,
      remainingDays: Math.max(0, remainingDays),
      isBreached: false,
      isApproaching: false,
      percentElapsed,
      statusColor: "emerald",
      statusText: "Resolved within SLA",
    };
  }

  const isBreached = remainingDays < 0;
  const isApproaching = !isBreached && percentElapsed >= slaConfig.warning_threshold_percent;

  let statusColor: "emerald" | "amber" | "rose" = "emerald";
  let statusText = `${remainingDays} days remaining`;

  if (isBreached) {
    statusColor = "rose";
    statusText = `SLA Breached (${Math.abs(remainingDays)} days overdue)`;
  } else if (isApproaching) {
    statusColor = "amber";
    statusText = `SLA Approaching (${remainingDays} days left)`;
  }

  return {
    timelineDays,
    elapsedDays,
    remainingDays,
    isBreached,
    isApproaching,
    percentElapsed,
    statusColor,
    statusText,
  };
}

/**
 * Groups pending/under-process cases into chronological ageing buckets
 */
export function computeAgeingBuckets(
  cases: { date_received: Date | string; status: string }[],
  referenceDate: Date = new Date()
): AgeingBuckets {
  const buckets: AgeingBuckets = {
    bucket_0_15: 0,
    bucket_16_30: 0,
    bucket_31_60: 0,
    bucket_60_plus: 0,
  };

  const activeCases = cases.filter(
    (c) => c.status === "PENDING" || c.status === "UNDER_PROCESS" || c.status === "ESCALATED"
  );

  for (const c of activeCases) {
    const received = new Date(c.date_received);
    const ageDays = Math.floor(
      (referenceDate.getTime() - received.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (ageDays <= 15) {
      buckets.bucket_0_15++;
    } else if (ageDays <= 30) {
      buckets.bucket_16_30++;
    } else if (ageDays <= 60) {
      buckets.bucket_31_60++;
    } else {
      buckets.bucket_60_plus++;
    }
  }

  return buckets;
}
