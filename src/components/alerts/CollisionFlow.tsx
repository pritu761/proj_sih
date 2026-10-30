"use client";

import { useMemo, useState } from "react";
import { Network, ArrowRight, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlowAlert {
  id: string;
  institution_id: string;
  case_ids: string[];
  bureaus_involved: string[];
  confidence: string;
  status: string;
  institution?: { name: string; city?: string; state?: string };
}

const BUREAU_META: Record<string, { short: string; label: string; color: string }> = {
  REGULATION_BUREAU: { short: "RB", label: "Regulation Bureau", color: "#6366f1" },
  PGRC: { short: "PGRC", label: "Grievance Redressal Cell", color: "#2559e8" },
  APPROVAL_BUREAU: { short: "AB", label: "Approval Bureau", color: "#f59e0b" },
  SKILL_CELL: { short: "SDC", label: "Skill Development Cell", color: "#10b981" },
};

const CONFIDENCE_COLOR: Record<string, string> = {
  HIGH: "#e11d48",
  MEDIUM: "#d97706",
  LOW: "#64748b",
};

const VIEW_W = 880;
const VIEW_H = 372;

function wrap(text: string, max = 25): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

export function CollisionFlow({
  alerts,
  onSelect,
}: {
  alerts: FlowAlert[];
  onSelect: (alertId: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const model = useMemo(() => {
    const active = alerts.filter(
      (a) => a.status === "OPEN" || a.status === "ACKNOWLEDGED"
    );

    const groups = new Map<
      string,
      {
        id: string;
        name: string;
        city: string;
        alerts: FlowAlert[];
        caseIds: Set<string>;
        confidence: string;
      }
    >();

    for (const alert of active) {
      const existing = groups.get(alert.institution_id);
      if (existing) {
        existing.alerts.push(alert);
        alert.case_ids.forEach((c) => existing.caseIds.add(c));
        if (alert.confidence === "HIGH") existing.confidence = "HIGH";
      } else {
        groups.set(alert.institution_id, {
          id: alert.institution_id,
          name: alert.institution?.name ?? "Unknown institution",
          city: alert.institution?.city ?? "",
          alerts: [alert],
          caseIds: new Set(alert.case_ids),
          confidence: alert.confidence,
        });
      }
    }

    const institutions = [...groups.values()]
      .sort((a, b) => b.caseIds.size - a.caseIds.size || a.name.localeCompare(b.name))
      .slice(0, 5);
    const bureaus = Object.keys(BUREAU_META).filter((b) =>
      active.some((a) => a.bureaus_involved.includes(b))
    );

    const leftSlots = Math.max(institutions.length, 1);
    const leftSlotH = (VIEW_H - 44) / leftSlots;
    const leftNodes = institutions.map((inst, i) => ({
      ...inst,
      x: 14,
      y: 22 + i * leftSlotH + (leftSlotH - 44) / 2,
      h: 44,
      w: 216,
    }));

    const rightSlotH = (VIEW_H - 44) / Math.max(bureaus.length, 1);
    const rightNodes = bureaus.map((b, i) => ({
      key: b,
      ...BUREAU_META[b],
      x: VIEW_W - 230,
      y: 22 + i * rightSlotH + (rightSlotH - 42) / 2,
      h: 42,
      w: 216,
    }));

    type Link = {
      key: string;
      instKey: string;
      bureauKey: string;
      count: number;
      alertId: string;
      confidence: string;
      d: string;
      color: string;
    };

    const links: Link[] = [];
    for (const inst of leftNodes) {
      const byBureau = new Map<string, { count: number; alert: FlowAlert }>();
      for (const alert of inst.alerts) {
        for (const bureau of alert.bureaus_involved) {
          const current = byBureau.get(bureau);
          if (current) current.count += alert.case_ids.length;
          else byBureau.set(bureau, { count: alert.case_ids.length, alert });
        }
      }
      for (const [bureauKey, data] of byBureau) {
        const right = rightNodes.find((n) => n.key === bureauKey);
        if (!right) continue;
        const x1 = inst.x + inst.w;
        const y1 = inst.y + inst.h / 2;
        const x2 = right.x;
        const y2 = right.y + right.h / 2;
        const cx = (x1 + x2) / 2;
        links.push({
          key: `${inst.id}-${bureauKey}`,
          instKey: inst.id,
          bureauKey,
          count: data.count,
          alertId: data.alert.id,
          confidence: inst.confidence,
          color: BUREAU_META[bureauKey]?.color ?? "#94a3b8",
          d: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`,
        });
      }
    }

    return {
      active,
      institutions: leftNodes,
      bureaus: rightNodes,
      links,
      institutionTotal: groups.size,
      totalCases: new Set(active.flatMap((a) => a.case_ids)).size,
      bureauCount: bureaus.length,
    };
  }, [alerts]);

  const hoveredLink = model.links.find((l) => l.key === hovered);
  const hoveredInstName = hoveredLink
    ? model.institutions.find((i) => i.id === hoveredLink.instKey)?.name
    : null;

  if (model.institutions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <Network className="mx-auto h-6 w-6 text-slate-400" />
        <p className="mt-2 text-[12px] font-semibold text-slate-500">
          No active collisions to plot.
        </p>
        <p className="mt-1 text-[10.5px] text-slate-400">
          The topology redraws as soon as the engine detects a parallel inquiry.
        </p>
      </div>
    );
  }

  return (
    <section className="panel overflow-hidden">
      <div className="panel-head items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-600">
            <Network className="h-[17px] w-[17px]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="panel-title">Collision topology</h2>
              <span className="badge border-slate-200 bg-slate-50 text-slate-500">
                Live map
              </span>
            </div>
            <p className="panel-sub">
              {model.institutionTotal > model.institutions.length
                ? `${model.institutionTotal} institutions in collision - top ${model.institutions.length} plotted`
                : `${model.institutions.length} institutions`}{" "}
              - {model.bureauCount} bureaus - {model.totalCases} parallel cases
            </p>
          </div>
        </div>
        <span className="hidden items-center gap-1 text-[9.5px] font-semibold text-slate-400 sm:flex">
          <MousePointerClick className="h-3 w-3" />
          Select a link to inspect the case
        </span>
      </div>

      <div className="overflow-x-auto px-2 py-1 sm:px-4">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-auto w-full min-w-[640px]"
          role="img"
          aria-label="Institution to bureau collision topology"
        >
          <defs>
            <linearGradient id="flow-head" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2559e8" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#2559e8" stopOpacity="0" />
            </linearGradient>
          </defs>

          <text x={14} y={12} fill="var(--text-muted)" fontSize="8.5" fontWeight="800" letterSpacing="1.4">
            INSTITUTIONS
          </text>
          <text x={VIEW_W - 14} y={12} textAnchor="end" fill="var(--text-muted)" fontSize="8.5" fontWeight="800" letterSpacing="1.4">
            RESPONDING BUREAUS
          </text>

          {model.links.map((link, li) => {
            const isHovered = hovered === link.key;
            const related =
              hovered &&
              (hoveredLink?.instKey === link.instKey || hoveredLink?.bureauKey === link.bureauKey);
            return (
              <g key={link.key}>
                <path
                  d={link.d}
                  pathLength={1}
                  fill="none"
                  stroke={link.color}
                  strokeWidth={isHovered ? 3.4 : 1.4 + link.count * 1.15}
                  strokeOpacity={isHovered ? 0.9 : related ? 0.6 : hovered ? 0.14 : 0.32}
                  strokeLinecap="round"
                  style={{ animationDelay: `${60 + li * 55}ms` }}
                  className="topology-link cursor-pointer transition-[stroke-opacity] duration-200"
                  onMouseEnter={() => setHovered(link.key)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelect(link.alertId)}
                />
                {isHovered && (
                  <circle r="4" fill={link.color}>
                    <animateMotion dur="1.4s" repeatCount="indefinite" path={link.d} />
                  </circle>
                )}
              </g>
            );
          })}

          {model.institutions.map((inst, ii) => {
            const active =
              hoveredLink?.instKey === inst.id;
            const border = CONFIDENCE_COLOR[inst.confidence] ?? "#64748b";
            const lines = wrap(inst.name);
            return (
              <g
                key={inst.id}
                style={{ animationDelay: `${260 + ii * 70}ms` }}
                onMouseEnter={() => {
                  const first = model.links.find((l) => l.instKey === inst.id);
                  if (first) setHovered(first.key);
                }}
                onMouseLeave={() => setHovered(null)}
                className="topology-node cursor-pointer"
                onClick={() => {
                  if (inst.alerts[0]) onSelect(inst.alerts[0].id);
                }}
              >
                <rect
                  x={inst.x}
                  y={inst.y}
                  width={inst.w}
                  height={inst.h}
                  rx={11}
                  fill="var(--surface-card)"
                  stroke={active ? border : "var(--border-subtle)"}
                  strokeWidth={active ? 1.6 : 1}
                />
                <rect x={inst.x} y={inst.y} width={3.5} height={inst.h} rx={2} fill={border} />
                {lines.map((line, li) => (
                  <text
                    key={li}
                    x={inst.x + 12}
                    y={inst.y + (lines.length === 1 ? 20 : 16 + li * 12)}
                    fill="var(--text-primary)"
                    fontSize="9.6"
                    fontWeight="700"
                  >
                    {line}
                  </text>
                ))}
                <text
                  x={inst.x + 12}
                  y={inst.y + inst.h - 7}
                  fill="var(--text-muted)"
                  fontSize="7.8"
                  fontWeight="600"
                >
                  {inst.city ? `${inst.city} - ` : ""}
                  {inst.caseIds.size} cases
                </text>
                <g transform={`translate(${inst.x + inst.w - 26}, ${inst.y + 8})`}>
                  <rect width={18} height={13} rx={4} fill={border} fillOpacity={0.14} />
                  <text
                    x={9}
                    y={9.4}
                    textAnchor="middle"
                    fill={border}
                    fontSize="7"
                    fontWeight="800"
                  >
                    {inst.alerts.length}
                  </text>
                </g>
              </g>
            );
          })}

          {model.bureaus.map((bureau, bi) => {
            const active = hoveredLink?.bureauKey === bureau.key;
            return (
              <g
                key={bureau.key}
                style={{ animationDelay: `${380 + bi * 70}ms` }}
                onMouseEnter={() => {
                  const first = model.links.find((l) => l.bureauKey === bureau.key);
                  if (first) setHovered(first.key);
                }}
                onMouseLeave={() => setHovered(null)}
                className="topology-node cursor-pointer"
              >
                <rect
                  x={bureau.x}
                  y={bureau.y}
                  width={bureau.w}
                  height={bureau.h}
                  rx={11}
                  fill="var(--surface-card)"
                  stroke={active ? bureau.color : "var(--border-subtle)"}
                  strokeWidth={active ? 1.6 : 1}
                />
                <circle cx={bureau.x + 18} cy={bureau.y + 21} r={8} fill={bureau.color} fillOpacity={0.14} />
                <circle cx={bureau.x + 18} cy={bureau.y + 21} r={3.2} fill={bureau.color} />
                <text
                  x={bureau.x + 32}
                  y={bureau.y + 18}
                  fill="var(--text-primary)"
                  fontSize="9.8"
                  fontWeight="800"
                >
                  {bureau.short}
                </text>
                <text
                  x={bureau.x + 32}
                  y={bureau.y + 29}
                  fill="var(--text-muted)"
                  fontSize="7.8"
                  fontWeight="600"
                >
                  {bureau.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div
        className={cn(
          "flex min-h-[38px] flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 px-4 py-2.5 text-[10px] font-medium transition-colors",
          hoveredLink ? "bg-brand-50/60 text-brand-800" : "bg-slate-50/60 text-slate-500"
        )}
      >
        {hoveredLink ? (
          <>
            <span className="flex items-center gap-1.5 font-bold">
              {hoveredInstName}
              <ArrowRight className="h-3 w-3" />
              {BUREAU_META[hoveredLink.bureauKey]?.short}
            </span>
            <span>{hoveredLink.count} parallel cases</span>
            <span
              className="rounded-full px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide"
              style={{
                color: CONFIDENCE_COLOR[hoveredLink.confidence],
                background: `${CONFIDENCE_COLOR[hoveredLink.confidence]}18`,
              }}
            >
              {hoveredLink.confidence} confidence
            </span>
            <span className="ml-auto hidden text-[9px] text-slate-400 sm:inline">
              Click to jump to the alert
            </span>
          </>
        ) : (
          <>
            <span>
              Thicker links carry more parallel cases. Every edge is an active cross-bureau
              collision, not a historical trend.
            </span>
            <span className="ml-auto text-[9px] text-slate-400 sm:hidden">
              Swipe the map to pan
            </span>
            <span className="ml-auto hidden items-center gap-2 text-[9px] text-slate-400 sm:flex">
              {Object.entries(BUREAU_META).map(([key, meta]) => (
                <span key={key} className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                  {meta.short}
                </span>
              ))}
            </span>
          </>
        )}
      </div>
    </section>
  );
}
