'use client';
import { useMemo } from 'react';
import { TrendingUp, Users, Wallet, AlertTriangle, MapPin, CheckCircle2, ShieldAlert, Navigation, RotateCcw } from 'lucide-react';
import { useApp } from '@/lib/store';
import { ksh, relativeTime, clock } from '@/lib/format';
import { MapView } from '@/components/map-view';
import { DEFAULT_FARE, ROUTE_STOPS } from '@/lib/config';
import { sendReset } from '@/lib/mqtt';

export default function OwnerPage() {
  const connected = useApp((s) => s.connected);
  const live = useApp((s) => s.liveStats);
  const telem = useApp((s) => s.telemetry);
  const alerts = useApp((s) => s.alerts) ?? [];
  const payments = useApp((s) => s.payments) ?? [];
  const onboardPassengers = useApp((s) => s.onboardPassengers) ?? [];

  const routeManifest = useMemo(() => {
    const counts: Record<string, number> = {};
    let unaccountedCount = 0;
    let exemptedCount = 0;

    onboardPassengers.forEach(p => {
      if (p.status === 'unaccounted') unaccountedCount++;
      else if (p.status === 'exempted') exemptedCount++;
      else counts[p.destination] = (counts[p.destination] || 0) + 1;
    });

    return {
      stops: ROUTE_STOPS.map(stop => ({ ...stop, dropCount: counts[stop.name] || 0 })),
      unaccountedCount,
      exemptedCount
    };
  }, [onboardPassengers]);

  const revenueBuckets = useMemo(() => {
    const buckets: { hour: string; amount: number }[] = [];
    for (let i = 7; i <= 21; i++) {
      const h = String(i).padStart(2, '0');
      const amount = payments
        .filter((p) => {
          if (p.status !== 'payment_verified') return false;
          const d = new Date(p.ts);
          return d.getHours() === i;
        })
        .reduce((sum, p) => sum + (p.amount ?? 0), 0);
      buckets.push({ hour: `${h}`, amount });
    }
    return buckets;
  }, [payments]);

  const maxAmount = Math.max(1, ...revenueBuckets.map((b) => b.amount));
  const totalFreeRides = live?.unpaidExits ?? 0;
  const lostRevenue = totalFreeRides * DEFAULT_FARE;
  const resetSession = useApp((s) => s.resetSession);

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all trip counters? This will clear all passenger data and start a new trip.")) {
      sendReset();
      resetSession();
    }
  };
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Owner Dashboard</h1>
          <p className="text-sm text-slate-500">Live monitoring and revenue</p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-semibold text-sm transition shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Trip
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Kpi icon={TrendingUp} label="Revenue today" value={ksh(live?.collected ?? 0)} highlight />
        <Kpi icon={Users} label="Total entries" value={String(telem?.total_entries ?? 0)} />
        <Kpi icon={Wallet} label="Onboard now" value={String(live?.onboard ?? 0)} />
        <Kpi icon={ShieldAlert} label="Free Rides Given" value={String(totalFreeRides)} warn={totalFreeRides > 0} />
        <Kpi icon={AlertTriangle} label="Lost Revenue" value={ksh(lostRevenue)} warn={lostRevenue > 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-900">Hourly revenue</h2>
              <p className="text-xs text-slate-500 mt-0.5">Today · bucketed by hour</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{ksh(live?.collected ?? 0)}</div>
              <div className="text-xs text-slate-500">{live?.loggedPaid ?? 0} fares logged</div>
            </div>
          </div>
          <div className="flex items-end gap-1 h-40">
            {revenueBuckets.map((b) => {
              const h = (b.amount / maxAmount) * 100;
              return (
                <div key={b.hour} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex-1 w-full flex items-end">
                    <div className="w-full bg-blue-600 rounded-t transition-all" style={{ height: `${Math.max(2, h)}%` }} title={`${b.hour}:00 — ${ksh(b.amount)}`} />
                  </div>
                  <div className="text-[10px] text-slate-400">{b.hour}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Live location</h2>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`} />
          </div>
          <MapView lat={telem?.gps.lat ?? null} lng={telem?.gps.lng ?? null} fixed={telem?.gps.fixed ?? false} />
          <div className="mt-4 space-y-1.5 text-xs">
            <Row label="Speed" value={`${(telem?.gps.speed ?? 0).toFixed(0)} km/h`} />
            <Row label="Latitude" value={telem?.gps.lat?.toFixed(5) ?? '—'} />
            <Row label="Longitude" value={telem?.gps.lng?.toFixed(5) ?? '—'} />
            <Row label="Last seen" value={live ? relativeTime(live.updatedAt) : '—'} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-600" /> Live Route Manifest
          </h2>
          <span className="text-xs text-slate-500">{onboardPassengers.length} onboard</span>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            {routeManifest.unaccountedCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200 mb-3 shadow-sm animate-pulse">
                <span className="font-medium text-red-800 text-sm">Unaccounted (Needs Payment)</span>
                <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{routeManifest.unaccountedCount}</span>
              </div>
            )}

            {routeManifest.exemptedCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg border border-slate-200 mb-3 shadow-sm">
                <span className="font-medium text-slate-700 text-sm">Exempted (Staff/Child)</span>
                <span className="bg-slate-300 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-full">{routeManifest.exemptedCount}</span>
              </div>
            )}
            
            <div className="text-sm text-slate-500 mt-4">
               Track passengers across all stops in real-time. Watch the drop-off counters update as the conductor issues tickets.
            </div>
          </div>
          
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Drop-off Locations</h3>
            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2">
              {routeManifest.stops.map((stop) => {
                const hasDrops = stop.dropCount > 0;
                return (
                  <div key={stop.id} className={`flex items-center justify-between p-3 rounded-lg border mb-2 ${
                    hasDrops ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100 opacity-60'
                  }`}>
                    <span className={`font-medium text-sm ${hasDrops ? 'text-slate-700' : 'text-slate-500'}`}>{stop.name}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      hasDrops ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {stop.dropCount} drop{stop.dropCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Alerts</h2>
            <span className="text-xs text-slate-400">{alerts.length}</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {alerts.length === 0 && <div className="p-8 text-center text-sm text-slate-400">No alerts — system clean</div>}
            {alerts.slice(0, 30).map((a, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900">
                    {a.alert === 'unaccounted_boarding' ? 'Passenger boarded unbilled' : 'Passenger exited unpaid'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {a.onboard} onboard · {a.unaccounted} unaccounted · {a.gps.fixed ? ` (${a.gps.lat!.toFixed(3)}, ${a.gps.lng!.toFixed(3)})` : ' no GPS'}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">{clock(a.ts)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Payments</h2>
            <span className="text-xs text-slate-400">{payments.length}</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {payments.length === 0 && <div className="p-8 text-center text-sm text-slate-400">No payments yet</div>}
            {payments.slice(0, 40).map((p, i) => (
              <div key={i} className="px-5 py-2.5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-slate-900">
                    {p.status === 'payment_verified' ? ksh(p.amount ?? 0) : `Exemption`}
                  </span>
                  {p.reason && <span className="text-xs text-slate-500">({p.reason})</span>}
                </div>
                <span className="text-xs text-slate-400 font-mono">{clock(p.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniStat label="Total exits" value={telem?.total_exits ?? 0} />
        <MiniStat label="Exemptions" value={telem?.exemptions ?? 0} />
        <MiniStat label="Expected" value={ksh(telem?.expected_revenue ?? 0)} />
        <MiniStat label="Uncollected" value={ksh(Math.max(0, (telem?.expected_revenue ?? 0) - (telem?.collected_revenue ?? 0)))} />
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, highlight, warn }: any) {
  return (
    <div className={`rounded-xl border p-5 bg-white shadow-sm ${warn ? 'border-blue-200' : 'border-slate-200'}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 font-medium">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${highlight ? 'text-blue-700' : 'text-slate-900'}`}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
      <div className="text-lg font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono text-slate-900">{value}</span>
    </div>
  );
}