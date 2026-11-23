'use client';
import Link from 'next/link';
import {
  Armchair, CheckCircle2, AlertCircle, ShieldOff,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { SEAT_COUNT } from '@/lib/config';
import { ksh } from '@/lib/format';

export default function PassengerLanding() {
  const seats = useApp((s) => s.seats);

  return (
    <div className="mx-auto max-w-md px-4 py-8 pb-24 min-h-screen">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome aboard</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Pick your seat to pay your fare
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: SEAT_COUNT }, (_, i) => {
          const seatId = i + 1;
          const seat = seats.find((x) => x.id === seatId) ?? {
            id: seatId,
            status: 'vacant' as const,
            paid: 0,
            dest: '',
          };

          const palette =
            seat.status === 'unpaid' ? 'bg-red-50 border-red-300 hover:border-red-500' :
            seat.status === 'paid'   ? 'bg-blue-50 border-blue-300' :
            seat.status === 'exempt' ? 'bg-slate-100 border-slate-300' :
                                       'bg-slate-50 border-slate-200';

          const Icon =
            seat.status === 'unpaid' ? AlertCircle :
            seat.status === 'paid'   ? CheckCircle2 :
            seat.status === 'exempt' ? ShieldOff :
                                       Armchair;

          return (
            <Link
              key={seatId}
              href={`/passenger/${seatId}`}
              className={`block rounded-xl border p-4 text-left transition ${palette}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-bold opacity-70">
                  Seat {seatId}
                </span>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-sm font-bold text-slate-900">
                {seat.status === 'unpaid' ? 'Tap to pay' :
                 seat.status === 'paid'   ? ksh(seat.paid) :
                 seat.status === 'exempt' ? 'Exempt' : 'Empty'}
              </div>
              {seat.status === 'paid' && seat.dest && (
                <div className="text-xs mt-1 opacity-80 truncate">
                  → {seat.dest}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 text-center mt-8">
        Your seat number is on the sticker in front of you
      </p>
    </div>
  );
}