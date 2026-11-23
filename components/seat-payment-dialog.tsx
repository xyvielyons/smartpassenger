'use client';
import { useState, useMemo } from 'react';
import { Banknote, CreditCard, ShieldOff, X } from 'lucide-react';
import { ROUTE_STOPS, FARE_PRESETS } from '@/lib/config';
import { ksh } from '@/lib/format';

interface Props {
  open: boolean;
  seatId: number | null;
  onClose: () => void;
  onCash: (seatId: number, amount: number, destinationId: string, destinationName: string) => void;
  onMpesa: (seatId: number, amount: number, destinationId: string, destinationName: string) => void;
  onExempt: (seatId: number) => void;
}

export function SeatPaymentDialog({
  open,
  seatId,
  onClose,
  onCash,
  onMpesa,
  onExempt,
}: Props) {
  const [destId, setDestId] = useState(ROUTE_STOPS[0].id);
  const [amount, setAmount] = useState(ROUTE_STOPS[0].fare);

  const stop = useMemo(() => ROUTE_STOPS.find((s) => s.id === destId)!, [destId]);

  if (!open || seatId === null) return null;

  const handleDest = (id: string) => {
    setDestId(id);
    const s = ROUTE_STOPS.find((x) => x.id === id);
    if (s) setAmount(s.fare);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">Seat {seatId} — Collect Fare</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <label className="block text-xs uppercase tracking-wide text-slate-500 font-medium mb-1">
          Destination
        </label>
        <select
          value={destId}
          onChange={(e) => handleDest(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mb-3 bg-white text-slate-900"
        >
          {ROUTE_STOPS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {ksh(s.fare)}
            </option>
          ))}
        </select>

        <label className="block text-xs uppercase tracking-wide text-slate-500 font-medium mb-1">
          Amount
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 mb-3 bg-white text-slate-900 font-mono"
        />
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {FARE_PRESETS.map((f) => (
            <button
              key={f}
              onClick={() => setAmount(f)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
                amount === f
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onCash(seatId, amount, destId, stop.name)}
            className="bg-blue-600 text-white rounded-xl p-4 text-left font-semibold hover:bg-blue-700 transition"
          >
            <Banknote className="w-5 h-5 mb-2" />
            <div className="text-sm">Cash</div>
            <div className="text-xs text-blue-100 font-normal mt-0.5">{ksh(amount)}</div>
          </button>

          <button
            onClick={() => onMpesa(seatId, amount, destId, stop.name)}
            className="bg-white border border-slate-200 rounded-xl p-4 text-left font-semibold text-slate-900 hover:border-blue-300 hover:bg-slate-50 transition"
          >
            <CreditCard className="w-5 h-5 mb-2 text-blue-600" />
            <div className="text-sm">M-Pesa</div>
            <div className="text-xs text-slate-500 font-normal mt-0.5">{ksh(amount)}</div>
          </button>
        </div>

        <button
          onClick={() => onExempt(seatId)}
          className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-700 font-medium py-2"
        >
          <ShieldOff className="w-3.5 h-3.5" />
          Log exemption instead
        </button>
      </div>
    </div>
  );
}