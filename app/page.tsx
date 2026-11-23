'use client';
import Link from 'next/link';
import {
  Wallet, CarFront, User, ListOrdered,
  MapPin, Users, TrendingUp, Armchair,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { ksh, relativeTime } from '@/lib/format';
import { BUS_ID, SEAT_COUNT } from '@/lib/config';
import { SeatGrid } from '@/components/seat-grid';
import { BusModel } from '@/components/bus-model';

export default function Home() {
  const live = useApp((s) => s.liveStats);
  const telem = useApp((s) => s.telemetry);
  const connected = useApp((s) => s.connected);
  const seats = useApp((s) => s.seats);

  const roles = [
    { href: '/conductor', label: 'Conductor', desc: 'Tap seats to collect fares',     icon: Wallet },
    { href: '/driver',    label: 'Driver',    desc: 'Route progress and passengers',  icon: CarFront },
    { href: '/owner',     label: 'Owner',     desc: 'Revenue, seats, alerts',         icon: User },
    { href: '/logs',      label: 'Logs',      desc: 'Raw MQTT message stream',        icon: ListOrdered },
    { href: '/passenger', label: 'Passenger', desc: 'Self-service fare payment',      icon: Armchair },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Bus {BUS_ID}</h1>
        <p className="text-slate-500 mt-1">Choose your role to get started</p>
      </div>

      {live && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide font-medium">
              <Armchair className="w-3.5 h-3.5" /> Seats filled
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {live.seatsOccupied}/{SEAT_COUNT}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide font-medium">
              <Users className="w-3.5 h-3.5" /> Bodies
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{live.onboard}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> Collected
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{ksh(live.collected)}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide font-medium">
              <MapPin className="w-3.5 h-3.5" /> GPS
            </div>
            <div className="text-sm font-medium text-slate-700 mt-2">
              {telem?.gps.fixed ? 'Locked' : 'Acquiring…'}
            </div>
          </div>
        </div>
      )}

      {live && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8">
          <h2 className="font-bold text-slate-900 mb-3">Seats at a glance</h2>
          {/* <SeatGrid interactive={false} /> */}
          <BusModel seats={seats} />
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {roles.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-md transition"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition">
              <Icon className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900">{label}</h3>
            <p className="text-sm text-slate-500 mt-1">{desc}</p>
          </Link>
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-8 text-center">
        {connected
          ? 'Connected to MQTT broker'
          : 'Disconnected — start the ESP32 to see live data'}
        {live && ` · last update ${relativeTime(live.updatedAt)}`}
      </p>
    </div>
  );
}