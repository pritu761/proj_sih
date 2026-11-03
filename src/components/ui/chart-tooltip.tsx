export function ChartTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dark-surface rounded-xl border border-white/10 bg-ink-900/95 px-3.5 py-2.5 shadow-2xl backdrop-blur">
      {label && (
        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: p.color || p.payload?.fill || "#60a5fa" }}
            />
            <span className="font-medium text-slate-300">{p.name}</span>
            <span className="ml-auto font-bold tabular-nums text-white">
              {p.value}
              {suffix ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
