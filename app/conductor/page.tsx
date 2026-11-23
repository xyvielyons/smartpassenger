'use client';
import { useState, useMemo } from 'react';
import {
  Users, AlertTriangle, CheckCircle2, Clock, MapPin,
  RotateCcw, Armchair, Banknote, TrendingUp,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { ksh, relativeTime, clock } from '@/lib/format';
import {
  paySeatCash, paySeatMpesa, exemptSeat, sendReset,
} from '@/lib/mqtt';
import { SeatGrid } from '@/components/seat-grid';
import { SeatPaymentDialog } from '@/components/seat-payment-dialog';
import { SeatExemptDialog } from '@/components/seat-exempt-dialog';
import { PesapalDialog } from '@/components/pesapal-dialog';
import { BusModel } from '@/components/bus-model';

export default function ConductorPage() {
  const connected = useApp((s) => s.connected);
  const live = useApp((s) => s.liveStats);
  const telem = useApp((s) => s.telemetry);
  const alerts = useApp((s) => s.alerts) ?? [];
  const cashTickets = useApp((s) => s.cashTickets) ?? [];
  const seats = useApp((s) => s.seats);
  const addCashTicket = useApp((s) => s.addCashTicket);
  const optimisticSeatPay = useApp((s) => s.optimisticSeatPay);
  const optimisticSeatExempt = useApp((s) => s.optimisticSeatExempt);
  const resetSession = useApp((s) => s.resetSession);

  const [paySeat, setPaySeat] = useState<number | null>(null);
  const [exemptSeatId, setExemptSeatId] = useState<number | null>(null);
  const [pesapalSeat, setPesapalSeat] = useState<number | null>(null);
  const [pesapalDest, setPesapalDest] = useState<{ id: string; name: string; amount: number } | null>(null);

  const unaccounted = live?.unaccounted ?? 0;
  const onboard = live?.onboard ?? 0;
  const seatsOccupied = live?.seatsOccupied ?? 0;
  const latestAlert = alerts[0];

  const handleCash = (seatId: number, amount: number, destId: string, destName: string) => {
    if (!paySeatCash(seatId, amount, destName)) {
      alert('Not connected to broker — command not sent');
      return;
    }
    addCashTicket({
      seatId,
      amount,
      destinationId: destId,
      destinationName: destName,
      method: 'cash',
    });
    optimisticSeatPay(seatId, amount, destName);
    setPaySeat(null);
  };

  const handleMpesa = (seatId: number, amount: number, destId: string, destName: string) => {
    // Open Pesapal first — only on success do we tell the ESP32
    setPesapalDest({ id: destId, name: destName, amount });
    setPesapalSeat(seatId);
    setPaySeat(null);
  };

  const handleExempt = (seatId: number, reason: string) => {
    if (!exemptSeat(seatId, reason)) {
      alert('Not connected to broker — command not sent');
      return;
    }
    optimisticSeatExempt(seatId, reason);
    setExemptSeatId(null);
  };

  const handlePesapalSuccess = () => {
    if (pesapalSeat === null || !pesapalDest) return;
    paySeatMpesa(pesapalSeat, pesapalDest.amount, pesapalDest.name, 'PESAPAL');
    addCashTicket({
      seatId: pesapalSeat,
      amount: pesapalDest.amount,
      destinationId: pesapalDest.id,
      destinationName: pesapalDest.name,
      method: 'mpesa',
    });
    optimisticSeatPay(pesapalSeat, pesapalDest.amount, pesapalDest.name);
    setPesapalSeat(null);
    setPesapalDest(null);
  };

  const handleReset = () => {
    if (confirm('End current trip and reset all counters?')) {
      sendReset();
      resetSession();
    }
  };

  const sessionTotal = useMemo(
    () => cashTickets.reduce((sum, t) => sum + t.amount, 0),
    [cashTickets]
  );

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

      {unaccounted > 0 && (
        <div className="rounded-xl bg-slate-900 text-white p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-blue-300" />
          <div className="flex-1">
            <div className="font-semibold">
              {unaccounted} unpaid seat{unaccounted > 1 ? 's' : ''} — tap to collect
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {latestAlert
                ? `${latestAlert.alert === 'unaccounted_boarding' ? 'Boarding without fare' : 'Exited without paying'} · ${relativeTime(latestAlert.ts)}`
                : 'Seats are held but no fare logged yet.'}
            </div>
          </div>
        </div>
      )}

      {/* ---- Live counters ---- */}
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Armchair} label="Seats" value={String(seatsOccupied)} tone={seatsOccupied > 0 ? 'default' : 'muted'} />
        <Stat icon={Users} label="Bodies" value={String(onboard)} tone="muted" />
        <Stat icon={AlertTriangle} label="Unpaid" value={String(unaccounted)} tone={unaccounted > 0 ? 'warn' : 'muted'} />
        {/* <Stat icon={TrendingUp} label="Collected" value={ksh(live?.collected ?? 0)} tone="default" /> */}
      </div>

      {/* ---- Seat grid — the main interaction ---- */}
      {/* <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-slate-900">Live Seats</h2>
            <p className="text-xs text-slate-500">Tap a red seat to collect its fare</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {seatsOccupied} / {seats.length} occupied
          </span>
        </div>
        <SeatGrid interactive onSeatClick={(id) => setPaySeat(id)} />
      </div> */}
      {/* ---- Live bus — the primary interaction surface ---- */}
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-slate-900">Live Bus</h2>
          <p className="text-xs text-slate-500">Tap a red seat to collect its fare</p>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {seatsOccupied} / {seats.length} occupied
        </span>
      </div>
      <BusModel seats={seats} interactive onSeatClick={(id) => setPaySeat(id)} />
    </div>

      {/* ---- GPS status ---- */}
      {telem && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
          <MapPin className={`w-5 h-5 ${telem.gps.fixed ? 'text-blue-600' : 'text-slate-400'}`} />
          <div className="text-sm">
            <div className="font-medium text-slate-900">
              {telem.gps.fixed
                ? `${telem.gps.lat!.toFixed(4)}, ${telem.gps.lng!.toFixed(4)}`
                : 'GPS acquiring…'}
            </div>
            <div className="text-xs text-slate-500">
              {telem.gps.fixed && `Speed ${telem.gps.speed.toFixed(0)} km/h · `}
              Updated {relativeTime(live?.updatedAt ?? Date.now())}
            </div>
          </div>
        </div>
      )}

      {/* ---- Cash tickets ---- */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-slate-900">Tickets — this session</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {cashTickets.length} ticket{cashTickets.length === 1 ? '' : 's'} · {ksh(sessionTotal)}
            </p>
          </div>
          <Clock className="w-4 h-4 text-slate-400" />
        </div>
        <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
          {cashTickets.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-400">
              No tickets yet — tap a red seat above
            </div>
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
                  <div className="font-medium text-slate-900">
                    Seat {t.seatId} → {t.destinationName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {clock(t.ts)} · {t.method === 'mpesa' ? 'M-Pesa' : 'Cash'}
                    {!t.verifiedAt && ' · awaiting hardware'}
                  </div>
                </div>
              </div>
              <div className="font-mono font-semibold text-slate-900">{ksh(t.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      <SeatPaymentDialog
        open={paySeat !== null}
        seatId={paySeat}
        onClose={() => setPaySeat(null)}
        onCash={handleCash}
        onMpesa={handleMpesa}
        onExempt={(id) => {
          setPaySeat(null);
          setExemptSeatId(id);
        }}
      />

      <SeatExemptDialog
        open={exemptSeatId !== null}
        seatId={exemptSeatId}
        onClose={() => setExemptSeatId(null)}
        onConfirm={handleExempt}
      />

      <PesapalDialog
        open={pesapalSeat !== null}
        onClose={() => {
          setPesapalSeat(null);
          setPesapalDest(null);
        }}
        onSuccess={handlePesapalSuccess}
        //@ts-ignore
        amount={pesapalDest?.amount}
        destinationName={pesapalDest?.name}
      />
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
  tone?: 'default' | 'warn' | 'muted';
}) {
  const color =
    tone === 'warn'
      ? 'text-red-600'
      : tone === 'muted'
      ? 'text-slate-600'
      : 'text-slate-900';
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500 font-medium">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-lg font-bold mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}