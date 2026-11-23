'use client';
import { useMemo } from 'react';
import {
  TrendingUp, Users, AlertTriangle, MapPin,
  CheckCircle2, ShieldAlert, Navigation, RotateCcw,
  Armchair, Wallet, ArrowDownRight, ArrowUpRight,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { ksh, relativeTime, clock } from '@/lib/format';
import { MapView } from '@/components/map-view';
import { DEFAULT_FARE, ROUTE_STOPS, SEAT_COUNT } from '@/lib/config';
import { sendReset } from '@/lib/mqtt';
import { BusModel } from '@/components/bus-model';

export default function OwnerPage() {
  const connected = useApp((s) => s.connected);
  const live = useApp((s) => s.liveStats);
  const telem = useApp((s) => s.telemetry);
  const alerts = useApp((s) => s.alerts) ?? [];
  const payments = useApp((s) => s.payments) ?? [];
  const seats = useApp((s) => s.seats);
  const resetSession = useApp((s) => s.resetSession);

  // ---- Seat categorisation -------------------------------------
  const paidSeats     = useMemo(() => seats.filter((s) => s.status === 'paid'), [seats]);
  const exemptSeats   = useMemo(() => seats.filter((s) => s.status === 'exempt'), [seats]);
  const unpaidSeats   = useMemo(() => seats.filter((s) => s.status === 'unpaid'), [seats]);
  const occupiedSeats = useMemo(() => seats.filter((s) => s.status !== 'vacant'), [seats]);

  // ---- Body-vs-seat reconciliation -----------------------------
  const onboard       = live?.onboard ?? 0;               // IR body counter
  const seatsOccupied = occupiedSeats.length;
  const standees      = Math.max(0, onboard - seatsOccupied); // bodies without a tracked seat

  // ---- Revenue reconciliation ----------------------------------
  const collected      = live?.collected ?? 0;
  const totalEntered   = telem?.total_entries ?? 0;
  const exemptions     = telem?.exemptions ?? 0;

  // What should have come in if every body paid full fare
  const expectedGross    = totalEntered * DEFAULT_FARE;
  const exemptValue      = exemptions * DEFAULT_FARE;

  // At-risk = currently unpaid seats + standees (still onboard, still collectible)
  const atRiskCount   = unpaidSeats.length + standees;
  const atRiskRevenue = atRiskCount * DEFAULT_FARE;

  // Confirmed lost = expected − collected − waived − at-risk (never negative)
  const confirmedLost = Math.max(
    0,
    expectedGross - collected - exemptValue - atRiskRevenue
  );

  // ---- Hourly chart --------------------------------------------
  const revenueBuckets = useMemo(() => {
    const buckets: { hour: string; amount: number }[] = [];
    for (let i = 7; i <= 21; i++) {
      const h = String(i).padStart(2, '0');
      const amount = payments
        .filter((p) => {
          if (p.status !== 'payment_verified') return false;
          return new Date(p.ts).getHours() === i;
        })
        .reduce((sum, p) => sum + (p.amount ?? 0), 0);
      buckets.push({ hour: h, amount });
    }
    return buckets;
  }, [payments]);

  const maxAmount = Math.max(1, ...revenueBuckets.map((b) => b.amount));

  // ---- Route breakdown -----------------------------------------
  const routeManifest = useMemo(() => {
    const counts: Record<string, number> = {};
    paidSeats.forEach((s) => {
      if (s.dest) counts[s.dest] = (counts[s.dest] || 0) + 1;
    });
    return ROUTE_STOPS.map((stop) => ({
      ...stop,
      dropCount: counts[stop.name] || 0,
    }));
  }, [paidSeats]);

  const handleReset = () => {
    if (confirm('Reset all trip counters? This clears every seat and starts a new trip.')) {
      sendReset();
      resetSession();
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Owner Dashboard</h1>
          <p className="text-sm text-slate-500">Live monitoring, per-seat revenue and alerts</p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-semibold text-sm transition shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Trip
        </button>
      </div>

      {/* ============================================================
          Top KPIs — the revenue story
          ============================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Kpi icon={TrendingUp} label="Collected" value={ksh(collected)} highlight />
        <Kpi icon={Armchair}   label="Seats filled" value={`${seatsOccupied}/${SEAT_COUNT}`} />
        <Kpi
          icon={ShieldAlert}
          label="At-risk"
          value={ksh(atRiskRevenue)}
          warn={atRiskRevenue > 0}
          sub={`${atRiskCount} unpaid/standee`}
        />
        <Kpi
          icon={AlertTriangle}
          label="Confirmed lost"
          value={ksh(confirmedLost)}
          warn={confirmedLost > 0}
          danger={confirmedLost > 0}
          sub="left without paying"
        />
        <Kpi
          icon={Users}
          label="Bodies onboard"
          value={String(onboard)}
          sub={standees > 0 ? `${standees} standee${standees > 1 ? 's' : ''}` : 'all seated'}
        />
      </div>

      {/* ============================================================
          Bus model — the visual focal point
          ============================================================ */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Armchair className="w-4 h-4 text-blue-600" /> Live Bus
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {paidSeats.length} paid · {unpaidSeats.length} unpaid · {exemptSeats.length} exempt ·{' '}
                {SEAT_COUNT - occupiedSeats.length} empty
              </p>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${connected ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`}
            />
          </div>
          <BusModel seats={seats} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Live location</h2>
            <span
              className={`w-2 h-2 rounded-full ${connected ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`}
            />
          </div>
          <MapView
            lat={telem?.gps.lat ?? null}
            lng={telem?.gps.lng ?? null}
            fixed={telem?.gps.fixed ?? false}
          />
          <div className="mt-4 space-y-1.5 text-xs">
            <Row label="Speed"     value={`${(telem?.gps.speed ?? 0).toFixed(0)} km/h`} />
            <Row label="Latitude"  value={telem?.gps.lat?.toFixed(5) ?? '—'} />
            <Row label="Longitude" value={telem?.gps.lng?.toFixed(5) ?? '—'} />
            <Row label="Last seen" value={live ? relativeTime(live.updatedAt) : '—'} />
          </div>
        </div>
      </div>

      {/* ============================================================
          Revenue reconciliation — the honest breakdown
          ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-blue-600" /> Revenue reconciliation
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Recon
            label="Expected (IR)"
            value={ksh(expectedGross)}
            hint={`${totalEntered} bodies × ${ksh(DEFAULT_FARE)}`}
          />
          <Recon
            label="Collected"
            value={ksh(collected)}
            hint={`${live?.loggedPaid ?? 0} paid`}
            tone="positive"
          />
          <Recon
            label="Waived (exempt)"
            value={ksh(exemptValue)}
            hint={`${exemptions} exemption${exemptions === 1 ? '' : 's'}`}
            tone="muted"
          />
          <Recon
            label="Unaccounted"
            value={ksh(atRiskRevenue + confirmedLost)}
            hint={
              atRiskRevenue + confirmedLost > 0
                ? `${ksh(atRiskRevenue)} at-risk + ${ksh(confirmedLost)} lost`
                : 'fully reconciled'
            }
            tone={atRiskRevenue + confirmedLost > 0 ? 'negative' : 'positive'}
          />
        </div>
      </div>

      {/* ============================================================
          Hourly chart + route manifest
          ============================================================ */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-900">Hourly revenue</h2>
              <p className="text-xs text-slate-500 mt-0.5">Today · bucketed by hour</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{ksh(collected)}</div>
              <div className="text-xs text-slate-500">{live?.loggedPaid ?? 0} fares logged</div>
            </div>
          </div>
          <div className="flex items-end gap-1 h-40">
            {revenueBuckets.map((b) => {
              const h = (b.amount / maxAmount) * 100;
              return (
                <div key={b.hour} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full bg-blue-600 rounded-t transition-all"
                      style={{ height: `${Math.max(2, h)}%` }}
                      title={`${b.hour}:00 — ${ksh(b.amount)}`}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400">{b.hour}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <Navigation className="w-4 h-4 text-blue-600" /> Drop-off breakdown
          </h2>
          <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
            {routeManifest.map((stop) => {
              const hasDrops = stop.dropCount > 0;
              return (
                <div
                  key={stop.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${
                    hasDrops
                      ? 'bg-blue-50/50 border-blue-200'
                      : 'bg-slate-50 border-slate-100 opacity-60'
                  }`}
                >
                  <span className={`font-medium ${hasDrops ? 'text-slate-700' : 'text-slate-500'}`}>
                    {stop.name}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      hasDrops ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {stop.dropCount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================
          Alerts + Payments
          ============================================================ */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Alerts</h2>
            <span className="text-xs text-slate-400">{alerts.length}</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {alerts.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-400">No alerts — system clean</div>
            )}
            {alerts.slice(0, 30).map((a, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900">
                    {a.alert === 'unaccounted_boarding'
                      ? 'Seat occupied without fare'
                      : 'Passenger exited without paying'}
                    {typeof a.seat_id === 'number' && ` · Seat ${a.seat_id}`}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {a.unaccounted} unpaid ·{' '}
                    {a.gps.fixed
                      ? `(${a.gps.lat!.toFixed(3)}, ${a.gps.lng!.toFixed(3)})`
                      : 'no GPS'}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">{clock(a.ts)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Payments</h2>
            <span className="text-xs text-slate-400">{payments.length}</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {payments.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-400">No payments yet</div>
            )}
            {payments.slice(0, 40).map((p, i) => (
              <div key={i} className="px-5 py-2.5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-slate-900">
                    {p.status === 'payment_verified'
                      ? `Seat ${p.seat_id ?? '?'} · ${ksh(p.amount ?? 0)}`
                      : `Seat ${p.seat_id ?? '?'} · Exempt`}
                  </span>
                  {p.destination && (
                    <span className="text-xs text-slate-500">→ {p.destination}</span>
                  )}
                  {p.reason && <span className="text-xs text-slate-500">({p.reason})</span>}
                </div>
                <span className="text-xs text-slate-400 font-mono">{clock(p.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function Kpi({
  icon: Icon, label, value, sub, highlight, warn, danger,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  warn?: boolean;
  danger?: boolean;
}) {
  const tone = danger
    ? 'border-red-200 bg-red-50'
    : warn
    ? 'border-blue-200'
    : 'border-slate-200';
  const valueColor = danger
    ? 'text-red-700'
    : highlight
    ? 'text-blue-700'
    : 'text-slate-900';
  return (
    <div className={`rounded-xl border p-4 bg-white shadow-sm ${tone}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500 font-bold">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`text-xl font-bold mt-1 ${valueColor}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function Recon({
  label, value, hint, tone = 'default',
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'default' | 'positive' | 'negative' | 'muted';
}) {
  const colors = {
    default:  { bg: 'bg-slate-50 border-slate-200',   text: 'text-slate-900' },
    positive: { bg: 'bg-blue-50 border-blue-200',     text: 'text-blue-700' },
    negative: { bg: 'bg-red-50 border-red-200',       text: 'text-red-700' },
    muted:    { bg: 'bg-slate-50 border-slate-200',   text: 'text-slate-500' },
  }[tone];

  return (
    <div className={`rounded-xl border p-3 ${colors.bg}`}>
      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">
        {label}
      </div>
      <div className={`text-lg font-bold mt-1 ${colors.text}`}>{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{hint}</div>
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