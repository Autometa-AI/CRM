export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-44 bg-slate-200 rounded" />
        <div className="h-4 w-80 bg-slate-100 rounded mt-2" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-7 w-28 bg-slate-200 rounded mt-2" />
            <div className="h-3 w-32 bg-slate-100 rounded mt-2" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5 lg:col-span-2">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          <div className="h-3 w-48 bg-slate-100 rounded mt-2 mb-5" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 mb-2">
              <div className="w-24 h-5 bg-slate-100 rounded" />
              <div className="flex-1 h-6 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          <div className="h-3 w-48 bg-slate-100 rounded mt-2 mb-5" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between mb-3">
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-5 w-20 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="h-5 w-40 bg-slate-200 rounded" />
            <div className="h-3 w-56 bg-slate-100 rounded mt-2 mb-4" />
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-3 py-2.5">
                <div className="h-8 w-8 bg-slate-100 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-3/4 bg-slate-100 rounded" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
