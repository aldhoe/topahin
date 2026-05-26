"use client";

// Skeleton shimmer components for loading states (#18)

export function SkeletonCard() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-slate-100" />
        <div className="h-3 bg-slate-100 rounded w-20" />
      </div>
      <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
      <div className="h-1.5 bg-slate-100 rounded-full mb-3" />
      <div className="flex justify-between">
        <div className="h-3 bg-slate-100 rounded w-24" />
        <div className="h-3 bg-slate-100 rounded w-8" />
      </div>
    </div>
  );
}

export function SkeletonTimeline() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Day header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-slate-100 rounded-xl" />
        <div className="space-y-1.5">
          <div className="h-3.5 bg-slate-100 rounded w-20" />
          <div className="h-2.5 bg-slate-100 rounded w-32" />
        </div>
      </div>
      {/* Items */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="grid grid-cols-[40px_1fr] gap-3">
          <div className="flex flex-col items-center pt-4">
            <div className="w-3 h-3 rounded-full bg-slate-100" />
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100">
            <div className="h-3 bg-slate-100 rounded w-16 mb-2" />
            <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-slate-100 rounded w-24" />
            <div className="h-2.5 bg-slate-100 rounded w-16" />
          </div>
          <div className="h-3.5 bg-slate-100 rounded w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 gap-3 animate-pulse">
      <div className="bg-white p-4 rounded-2xl border border-slate-100">
        <div className="h-2.5 bg-slate-100 rounded w-16 mb-2" />
        <div className="h-6 bg-slate-100 rounded w-10" />
      </div>
      <div className="bg-slate-200 p-4 rounded-2xl">
        <div className="h-2.5 bg-slate-300 rounded w-20 mb-2" />
        <div className="h-6 bg-slate-300 rounded w-24" />
      </div>
    </div>
  );
}
