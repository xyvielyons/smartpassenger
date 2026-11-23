'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Gauge, Users, Clock, AlertTriangle, Navigation,
  CheckCircle2, Circle, Armchair,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { ROUTE_STOPS, SEAT_COUNT } from '@/lib/config';
import { ksh, relativeTime } from '@/lib/format';
import { MapView } from '@/components/map-view';
import { SeatGrid } from '@/components/seat-grid';
import { BusModel } from '@/components/bus-model';

export default function DriverPage() {
  const connected = useApp((s) => s.connected);
  const live = useApp((s) => s.liveStats);
  const telem = useApp((s) => s.telemetry);
  const seats = useApp((s) => s.seats);

  const [tripStartedAt, setTripStartedAt] = useState<number | null>(null);
  useEffect(() => { setTripStartedAt(Date.now()); }, []);

  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedMs = tripStartedAt ? Date.now() - tripStartedAt : 0;
  const elapsedMin = Math.floor(elapsedMs / 60000);

  const onboard = live?.onboard ?? 0;
  const seatsOccupied = live?.seatsOccupied ?? 0;
  const crowded = seatsOccupied >= SEAT_COUNT;
  const standees = Math.max(0, onboard - seatsOccupied);
  const speed = telem?.gps.speed ?? 0;

  const routeManifest = useMemo(() => {
    const counts: Record<string, number> = {};
    let unaccountedCount = 0;
    let exemptedCount = 0;

    seats.forEach((seat) => {
      if (seat.status === 'unpaid') unaccountedCount++;
      else if (seat.status === 'exempt') exemptedCount++;
      else if (seat.status === 'paid' && seat.dest) {
        counts[seat.dest] = (counts[seat.dest] || 0) + 1;
      }
    });

    return {
      stops: ROUTE_STOPS.map((stop) => ({
        ...stop,
        dropCount: counts[stop.name] || 0,
      })),
      unaccountedCount,
      exemptedCount,
    };
  }, [seats]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Armchair} label="Seats occupied" value={`${seatsOccupied}/${SEAT_COUNT}`} tone={crowded ? 'warn' : 'default'} />
        <Stat icon={Users} label="Bodies (IR)" value={String(onboard)} tone={standees > 0 ? 'warn' : 'default'} />
        <Stat icon={Gauge} label="Speed" value={`${speed.toFixed(0)} km/h`} />
        <Stat icon={Clock} label="Trip time" value={tripStartedAt ? `${elapsedMin}m` : '—'} />
      </div>

      {standees > 0 && (
        <div className="rounded-xl bg-slate-900 text-white p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-300" />
          <div className="text-sm font-medium">
            {standees} standing passenger{standees > 1 ? 's' : ''} detected by IR. Check with conductor.
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* ---- Route Schedule ---- */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
              <Navigation className="w-5 h-5 text-blue-600" /> Route Schedule
            </h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
              {routeManifest.stops.reduce((s, x) => s + x.dropCount, 0)} drops
            </span>
          </div>

          <div className="p-5 flex-1 overflow-y-auto max-h-[500px]">
            {routeManifest.unaccountedCount > 0 && (
              <div className="mb-4 flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200 animate-pulse shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-sm">
                    {routeManifest.unaccountedCount}
                  </div>
                  <div>
                    <span className="font-bold text-red-800 text-base block">Unpaid seats</span>
                    <span className="text-xs text-red-600">Conductor should collect</span>
                  </div>
                </div>
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            )}

            {routeManifest.exemptedCount > 0 && (
              <div className="mb-4 flex items-center justify-between p-4 bg-slate-100 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm">
                    {routeManifest.exemptedCount}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-base block">Exempt</span>
                    <span className="text-xs text-slate-500">Staff, children</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 mt-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Drop-off Locations
              </h3>
              {routeManifest.stops.map((stop, index) => {
                const hasDrops = stop.dropCount > 0;
                return (
                  <div
                    key={stop.id}
                    className={`flex items-center justify-between p-3.5 rounded-lg border transition-all ${
                      hasDrops
                        ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                        : 'bg-slate-50 border-slate-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          hasDrops ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <span className={`font-bold text-base block ${hasDrops ? 'text-slate-900' : 'text-slate-600'}`}>
                          {stop.name}
                        </span>
                        <span className="text-xs text-slate-500">Fare: {ksh(stop.fare)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${hasDrops ? 'text-blue-700' : 'text-slate-400'}`}>
                        {stop.dropCount}
                      </span>
                      {hasDrops ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ---- Right column: seats + map ---- */}
        <div className="space-y-4">
          {/* <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Armchair className="w-4 h-4 text-blue-600" /> Live Seats
              </h2>
              <span className="text-xs text-slate-500">{seatsOccupied} occupied</span>
            </div>
            <SeatGrid interactive={false} />
          </div> */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Armchair className="w-4 h-4 text-blue-600" /> Live Bus
              </h2>
              <span className="text-xs text-slate-500">{seatsOccupied} occupied</span>
            </div>
            <BusModel seats={seats} />
          </div>

          <MapView
            lat={telem?.gps.lat ?? null}
            lng={telem?.gps.lng ?? null}
            fixed={telem?.gps.fixed ?? false}
          />

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Network</span>
              <span
                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-bold ${
                  connected ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'}`} />
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Collected</span>
              <span className="font-bold text-slate-900">{ksh(live?.collected ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">GPS</span>
              <span className="text-slate-700 font-mono text-xs">
                {telem?.gps.fixed ? 'Locked' : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: any;
  label: string;
  value: string;
  tone?: 'default' | 'warn';
}) {
  const color = tone === 'warn' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 font-medium">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}