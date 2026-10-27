export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-7 w-64" />
          <div className="skeleton h-3 w-80" />
        </div>
        <div className="hidden gap-2 sm:flex">
          <div className="skeleton h-9 w-28" />
          <div className="skeleton h-9 w-36" />
        </div>
      </div>

      <div className="skeleton h-[168px] rounded-[26px]" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="skeleton h-9 w-9 rounded-xl" />
            <div className="skeleton mt-4 h-2.5 w-20" />
            <div className="skeleton mt-2 h-6 w-14" />
            <div className="skeleton mt-3 h-1 w-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="panel xl:col-span-2">
          <div className="panel-head">
            <div className="space-y-1.5">
              <div className="skeleton h-3.5 w-44" />
              <div className="skeleton h-2.5 w-64" />
            </div>
          </div>
          <div className="p-5">
            <div className="skeleton h-[240px] w-full" />
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div className="space-y-1.5">
              <div className="skeleton h-3.5 w-28" />
              <div className="skeleton h-2.5 w-40" />
            </div>
          </div>
          <div className="flex items-center justify-center p-5">
            <div className="skeleton h-[160px] w-[160px] rounded-full" />
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="panel-head">
          <div className="skeleton h-3.5 w-40" />
        </div>
        <div className="space-y-3 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton h-3 w-28" />
              <div className="skeleton h-3 flex-1" />
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
