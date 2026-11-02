'use client';
import { useState, useMemo } from 'react';
import {
  Banknote, CreditCard, ShieldOff, Users,
  AlertTriangle, CheckCircle2, MapPin, Clock,
  Navigation,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { ksh, relativeTime, clock } from '@/lib/format';
import { sendCash, sendExemption, sendReset, sendMpesa } from '@/lib/mqtt';
import { CashDialog, ExemptionDialog } from '@/components/dialogs';
import { ROUTE_STOPS } from '@/lib/config';
import { PesapalDialog } from '@/components/pesapal-dialog';

export default function ConductorPage() {
  const connected = useApp((s) => s.connected);
  const live = useApp((s) => s.liveStats);
  const telem = useApp((s) => s.telemetry);
  const events = useApp((s) => s.events) ?? [];
  const payments = useApp((s) => s.payments) ?? [];
  const alerts = useApp((s) => s.alerts) ?? [];
  const onboardPassengers = useApp((s) => s.onboardPassengers) ?? [];
  const cashTickets = useApp((s) => s.cashTickets) ?? [];
  const addCashTicket = useApp((s) => s.addCashTicket);
  const resetSession = useApp((s) => s.resetSession);
  
  const [cashOpen, setCashOpen] = useState(false);
  const [exemptOpen, setExemptOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  const unaccounted = live?.unaccounted ?? 0;
  const latestAlert = alerts[0];

  const handleCash = (
    amount: number,
    destinationId: string,
    destinationName: string
  ) => {
    if (!sendCash(amount, destinationName)) {
      alert('Not connected to broker — command not sent');
      return;
    }
    addCashTicket({ amount, destinationId, destinationName });
  };

  const handleReset = () => {
    if (confirm("End current trip and reset all counters?")) {
      sendReset();
      resetSession();
    }
  };

  const handleExempt = (reason: string) => {
    if (!sendExemption(reason)) {
      alert('Not connected to broker — command not sent');
    }
  };

  // This is called by the Pesapal Dialog when payment succeeds
  const handleCardSuccess = (destinationId: string, destinationName: string) => {
    // 1. Get the actual fare for this route (e.g., Roysambu is 80)
    const stop = ROUTE_STOPS.find(s => s.id === destinationId);
    const actualFare = stop ? stop.fare : 0;

    // 2. Tell the ESP32 the passenger paid the ACTUAL fare
    sendMpesa(actualFare, destinationName, "PESAPAL");

    // 3. Update the local web UI instantly
    addCashTicket({ amount: actualFare, destinationId, destinationName });
  };

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

  const todayTotal = cashTickets.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Conductor Console</h1>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium text-sm transition"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Trip
        </button>
      </div>

      {unaccounted > 0 && latestAlert && (
        <div className="rounded-xl bg-slate-900 text-white p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-blue-300" />
          <div className="flex-1">
            <div className="font-semibold">
              {unaccounted} unaccounted passenger{unaccounted > 1 ? 's' : ''} onboard
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {latestAlert.alert === 'unaccounted_boarding'
                ? 'Passenger boarded without a logged fare.'
                : 'Passenger exited without paying.'}
              {' · '}
              {relativeTime(latestAlert.ts)}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Onboard</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">{live?.onboard ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Unaccounted</div>
          <div className={`text-3xl font-bold mt-1 ${unaccounted > 0 ? 'text-blue-700' : 'text-slate-900'}`}>
            {unaccounted}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">Collected</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{ksh(live?.collected ?? 0)}</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <button
          onClick={() => setCashOpen(true)}
          disabled={!connected || unaccounted === 0}
          className="group bg-blue-600 text-white rounded-xl p-5 text-left font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 transition shadow-sm flex flex-col justify-between"
        >
          <Banknote className="w-6 h-6 mb-3" />
          <div>
            <div>Collect Cash</div>
            <div className="text-xs font-normal text-blue-100 mt-1">
              {unaccounted === 0 ? 'No unaccounted passengers' : 'Pick destination + amount'}
            </div>
          </div>
        </button>

        <button
          onClick={() => setCardOpen(true)}
          disabled={!connected || unaccounted === 0}
          className="bg-white border border-slate-200 rounded-xl p-5 text-left font-semibold text-slate-900 hover:border-blue-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm flex flex-col justify-between"
        >
          <CreditCard className="w-6 h-6 mb-3 text-blue-600" />
          <div>
            <div>Credit / Mpesa</div>
            <div className="text-xs font-normal text-slate-500 mt-1">
              {unaccounted === 0 ? 'No unaccounted passengers' : 'Generate payment link'}
            </div>
          </div>
        </button>

        <button
          onClick={() => setExemptOpen(true)}
          disabled={!connected || unaccounted === 0}
          className="bg-white border border-slate-200 rounded-xl p-5 text-left font-semibold text-slate-900 hover:border-blue-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm flex flex-col justify-between"
        >
          <ShieldOff className="w-6 h-6 mb-3 text-slate-500" />
          <div>
            <div>Exemption</div>
            <div className="text-xs font-normal text-slate-500 mt-1">
              {unaccounted === 0 ? 'No unaccounted passengers' : 'Child, staff, luggage'}
            </div>
          </div>
        </button>
      </div>

      {telem && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
          <MapPin className={`w-5 h-5 ${telem.gps.fixed ? 'text-blue-600' : 'text-slate-400'}`} />
          <div className="text-sm">
            <div className="font-medium text-slate-900">
              {telem.gps.fixed ? `${telem.gps.lat!.toFixed(4)}, ${telem.gps.lng!.toFixed(4)}` : 'GPS acquiring…'}
            </div>
            <div className="text-xs text-slate-500">
              {telem.gps.fixed && `Speed ${telem.gps.speed.toFixed(0)} km/h · `}
              Updated {relativeTime(live?.updatedAt ?? Date.now())}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <Navigation className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-sm font-bold text-slate-900">Current Route Manifest</div>
            </div>
            <span className="text-xs text-slate-500">{onboardPassengers.length} onboard</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {routeManifest.stops.map((stop) => {
               const hasDrops = stop.dropCount > 0;
               return (
                <div key={stop.id} className={`px-2.5 py-1.5 rounded-md font-medium border flex justify-between items-center ${
                  hasDrops ? 'bg-blue-50 text-blue-800 border-blue-200 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}>
                  <span className="truncate pr-2">{stop.name}</span>
                  <span className={`font-bold ${hasDrops ? 'text-blue-600' : 'text-slate-400'}`}>{stop.dropCount}</span>
                </div>
              )
            })}
        </div>
        
        <div className="flex flex-wrap gap-2 text-xs mt-3 pt-3 border-t border-slate-100">
            {routeManifest.unaccountedCount > 0 && (
              <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-md font-bold border border-red-200 animate-pulse flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Needs Payment: {routeManifest.unaccountedCount}
              </span>
            )}
            {routeManifest.exemptedCount > 0 && (
              <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-medium border border-slate-200">
                Exempted: {routeManifest.exemptedCount}
              </span>
            )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-slate-900">Cash tickets — this session</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {cashTickets.length} ticket{cashTickets.length === 1 ? '' : 's'} · {ksh(todayTotal)}
            </p>
          </div>
          <Clock className="w-4 h-4 text-slate-400" />
        </div>

        <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
          {cashTickets.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-400">No cash tickets logged yet</div>
          )}
          {cashTickets.map((t) => (
            <div key={t.id} className="px-4 py-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3 min-w-0">
                {t.verifiedAt ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-medium text-slate-900">{t.destinationName}</div>
                  <div className="text-xs text-slate-500">
                    {clock(t.ts)}
                    {!t.verifiedAt && ' · awaiting hardware confirm'}
                  </div>
                </div>
              </div>
              <div className="font-mono font-semibold text-slate-900">{ksh(t.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      <CashDialog open={cashOpen} onClose={() => setCashOpen(false)} onConfirm={handleCash} unaccounted={unaccounted} />
      <ExemptionDialog open={exemptOpen} onClose={() => setExemptOpen(false)} onConfirm={handleExempt} />
      <PesapalDialog open={cardOpen} onClose={() => setCardOpen(false)} onSuccess={handleCardSuccess} />
    </div>
  );
}