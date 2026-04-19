export default function FinancesLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-32 bg-slate-200 rounded" />
          <div className="h-4 w-80 bg-slate-100 rounded mt-2" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="h-7 w-28 bg-slate-200 rounded mt-2" />
            <div className="h-3 w-20 bg-slate-100 rounded mt-2" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="h-5 w-36 bg-slate-200 rounded mb-4" />
            {[0, 1, 2, 3, 4, 5].map((j) => (
              <div key={j} className="flex items-center gap-3 mb-2">
                <div className="w-14 h-4 bg-slate-100 rounded" />
                <div className="flex-1 h-5 bg-slate-100 rounded" />
                <div className="w-24 h-4 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-5">
          <div className="h-5 w-32 bg-slate-200 rounded" />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 py-3 border-t border-slate-100 flex items-center gap-4">
            <div className="h-4 w-40 bg-slate-100 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
            <div className="flex-1" />
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
