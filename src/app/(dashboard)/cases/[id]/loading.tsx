export default function CaseDetailLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2.5">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-7 w-56" />
          <div className="flex gap-2">
            <div className="skeleton h-5 w-20 rounded-full" />
            <div className="skeleton h-5 w-24 rounded-full" />
            <div className="skeleton h-5 w-16 rounded-full" />
          </div>
        </div>
        <div className="hidden gap-2 sm:flex">
          <div className="skeleton h-9 w-24" />
          <div className="skeleton h-9 w-28" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel p-4">
            <div className="skeleton h-2.5 w-16" />
            <div className="skeleton mt-2.5 h-5 w-12" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="panel space-y-3 p-5 xl:col-span-2">
          <div className="skeleton h-3.5 w-40" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton h-2.5 w-24 shrink-0" />
              <div className="skeleton h-2.5 flex-1" />
            </div>
          ))}
        </div>
        <div className="panel p-5">
          <div className="skeleton h-3.5 w-28" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="skeleton h-7 w-7 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-2.5 w-3/4" />
                  <div className="skeleton h-2 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
