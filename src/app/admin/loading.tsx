import { Loader2 } from 'lucide-react';

export default function AdminLoading() {
  return (
    <div className="space-y-5">
      {/* Header skeleton */}
      <div className="bg-gradient-to-r from-[#101820] to-[#1a2530] rounded-xl px-5 py-3 h-12 animate-pulse" />

      {/* Stats skeleton */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border bg-card animate-pulse" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}
