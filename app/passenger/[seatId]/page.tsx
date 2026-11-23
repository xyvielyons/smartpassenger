'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2, AlertCircle, ShieldOff, Armchair, ArrowLeft,
  CreditCard, Banknote, MapPin,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { ROUTE_STOPS, SEAT_COUNT } from '@/lib/config';
import { ksh } from '@/lib/format';
import { paySeatMpesa } from '@/lib/mqtt';
import { PesapalDialog } from '@/components/pesapal-dialog';

export default function PassengerSeatPage() {
  const params = useParams();
  const router = useRouter();

  const seatIdStr = Array.isArray(params.seatId)
    ? params.seatId[0]
    : params.seatId;
  const seatId = Number(seatIdStr);

  const seats        = useApp((s) => s.seats);
  const connected    = useApp((s) => s.connected);
  const telem        = useApp((s) => s.telemetry);
  const addCashTicket    = useApp((s) => s.addCashTicket);
  const optimisticSeatPay = useApp((s) => s.optimisticSeatPay);

  const [destId, setDestId]         = useState(ROUTE_STOPS[0].id);
  const [pesapalOpen, setPesapalOpen] = useState(false);

  const stop = useMemo(
    () => ROUTE_STOPS.find((s) => s.id === destId) ?? ROUTE_STOPS[0],
    [destId]
  );

  // ---- Invalid seat guard --------------------------------------
  if (!Number.isInteger(seatId) || seatId < 1 || seatId > SEAT_COUNT) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 pb-24 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-slate-900">Invalid seat</h1>
        <p className="text-sm text-slate-500 mt-2">
          This link doesn't match a seat on this bus.
        </p>
        <Link
          href="/passenger"
          className="inline-block mt-6 text-blue-600 font-semibold text-sm"
        >
          Pick your seat
        </Link>
      </div>
    );
  }

  const seat = seats.find((s) => s.id === seatId);
  if (!seat) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 pb-24 text-center">
        <p className="text-slate-500">Loading seat…</p>
      </div>
    );
  }

  // ---- Called by PesapalDialog once money is confirmed ---------
  const handlePesapalSuccess = () => {
    if (seat.status !== 'unpaid') return;

    const ok = paySeatMpesa(seatId, stop.fare, stop.name, 'PESAPAL');
    if (!ok) {
      alert('Could not reach the bus — please tell the conductor');
      return;
    }
    addCashTicket({
      seatId,
      amount: stop.fare,
      destinationId: stop.id,
      destinationName: stop.name,
      method: 'mpesa',
    });
    optimisticSeatPay(seatId, stop.fare, stop.name);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-6 pb-24 min-h-screen">
      {/* Back nav */}
      <button
        onClick={() => router.push('/passenger')}
        className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-700"
      >
        <ArrowLeft className="w-4 h-4" /> All seats
      </button>

      {/* Seat header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-4 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 mx-auto flex items-center justify-center mb-3">
          <Armchair className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Seat {seatId}</h1>
        <StatusBadge status={seat.status} />
      </div>

      {/* Body per state */}
      {seat.status === 'vacant' && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-center">
          <Armchair className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h2 className="font-semibold text-slate-900">Please take your seat</h2>
          <p className="text-sm text-slate-500 mt-1">
            The seat activates the moment you sit down.
          </p>
        </div>
      )}

      {seat.status === 'unpaid' && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-4">
            <label className="block text-xs uppercase tracking-wide text-slate-500 font-medium mb-2">
              Where are you going?
            </label>
            <select
              value={destId}
              onChange={(e) => setDestId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-3 bg-white text-slate-900 font-medium text-base"
            >
              {ROUTE_STOPS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — KSh {s.fare}
                </option>
              ))}
            </select>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center mb-4">
              <div className="text-xs text-blue-700 font-medium uppercase tracking-wide">
                Fare
              </div>
              <div className="text-3xl font-bold text-blue-700 mt-1">
                {ksh(stop.fare)}
              </div>
            </div>

            <button
              onClick={() => setPesapalOpen(true)}
              disabled={!connected}
              className="w-full bg-blue-600 text-white rounded-xl p-4 font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition"
            >
              <CreditCard className="w-5 h-5" />
              {connected ? 'Pay with M-Pesa' : 'Bus offline — call conductor'}
            </button>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
            <Banknote className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600">
              <div className="font-medium text-slate-800">Prefer cash?</div>
              <div className="mt-1">
                Hand {ksh(stop.fare)} to the conductor — they'll log it for you.
              </div>
            </div>
          </div>
        </>
      )}

      {seat.status === 'paid' && (
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6 text-center">
          <CheckCircle2 className="w-14 h-14 mx-auto text-blue-600 mb-3" />
          <h2 className="text-xl font-bold text-slate-900">You're all set!</h2>
          <p className="text-sm text-slate-600 mt-1">
            {ksh(seat.paid)} paid
            {seat.dest && (
              <> · to <span className="font-semibold">{seat.dest}</span></>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-4">Enjoy your trip</p>
        </div>
      )}

      {seat.status === 'exempt' && (
        <div className="bg-slate-100 rounded-2xl border border-slate-300 p-6 text-center">
          <ShieldOff className="w-12 h-12 mx-auto text-slate-500 mb-3" />
          <h2 className="font-semibold text-slate-900">
            You're exempt from paying
          </h2>
          {seat.dest && (
            <p className="text-sm text-slate-600 mt-1">{seat.dest}</p>
          )}
        </div>
      )}

      {/* GPS footnote */}
      {telem?.gps.fixed && (
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <MapPin className="w-3 h-3" />
          {telem.gps.lat!.toFixed(4)}, {telem.gps.lng!.toFixed(4)}
        </div>
      )}

      <PesapalDialog
        open={pesapalOpen}
        seatId={seatId}
        amount={stop.fare}
        destinationName={stop.name}
        onClose={() => setPesapalOpen(false)}
        onSuccess={handlePesapalSuccess}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    vacant: { label: 'Waiting for you', cls: 'bg-slate-100 text-slate-600' },
    unpaid: { label: 'Unpaid',          cls: 'bg-red-100 text-red-700' },
    paid:   { label: 'Paid',            cls: 'bg-blue-100 text-blue-700' },
    exempt: { label: 'Exempt',          cls: 'bg-slate-200 text-slate-700' },
  };
  const { label, cls } = map[status] ?? map.vacant;
  return (
    <span
      className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}