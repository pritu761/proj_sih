import { SLA_CONFIGS } from "@/lib/demo-data";

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
  const slaConfig = SLA_CONFIGS.find(
    (c) => c.category.toLowerCase() === category.toLowerCase()
  ) || { category, timeline_days: 30, warning_threshold_percent: 80 };

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
