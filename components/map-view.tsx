'use client';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';

const Inner = dynamic(() => import('./map-view-inner'), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 text-sm">
      Loading map…
    </div>
  ),
});

export function MapView({
  lat, lng, fixed,
}: { lat: number | null; lng: number | null; fixed: boolean }) {
  if (!fixed || lat === null || lng === null) {
    return (
      <div className="h-[360px] bg-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-500">
        <MapPin className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm font-medium">Acquiring GPS…</p>
        <p className="text-xs mt-1">Requires outdoor sky view</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 relative isolate">
      <Inner lat={lat} lng={lng} />
    </div>
  );
}