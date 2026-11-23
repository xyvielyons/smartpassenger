'use client';
import {
  Armchair, CheckCircle2, AlertCircle, ShieldOff, User,
} from 'lucide-react';
import type { SeatSnapshot } from '@/lib/types';
import { ksh } from '@/lib/format';

interface BusModelProps {
  seats: SeatSnapshot[];
  interactive?: boolean;
  onSeatClick?: (seatId: number) => void;
}

const SEAT_ROWS: number[][] = [
  [1, 2],
  [3, 4],
  [5, 6],
];

export function BusModel({ seats, interactive = false, onSeatClick }: BusModelProps) {
  return (
    <div className="relative mx-auto max-w-md">
      <div
        className="
          relative bg-gradient-to-b from-white via-slate-50 to-slate-100
          rounded-[2rem] border-4 border-slate-800
          shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)]
          overflow-hidden
        "
      >
        {/* Windshield tint */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-sky-100/70 to-transparent pointer-events-none" />

        {/* Front row: Driver (right in Kenya) + Door (left/kerbside) */}
        <div className="relative flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-12 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.7)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Entry
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Driver
            </span>
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center shadow-inner">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Aisle */}
        <div className="absolute left-1/2 top-20 bottom-6 w-0.5 -translate-x-1/2 bg-slate-300/60 pointer-events-none" />

        {/* Seats */}
        <div className="relative px-5 pb-5 pt-2 space-y-3">
          {SEAT_ROWS.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-x-10 sm:gap-x-16">
              {row.map((seatId) => {
                const seat =
                  seats.find((s) => s.id === seatId) ?? {
                    id: seatId,
                    status: 'vacant' as const,
                    paid: 0,
                    dest: '',
                  };
                return (
                  <SeatTile
                    key={seatId}
                    seat={seat}
                    interactive={interactive}
                    onClick={() => onSeatClick?.(seatId)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SeatTile({
  seat, interactive, onClick,
}: {
  seat: SeatSnapshot;
  interactive: boolean;
  onClick?: () => void;
}) {
  const { status, paid, dest, id } = seat;

  const config = {
    vacant: {
      icon: Armchair,
      label: 'Empty',
      tileClass:
        'bg-white border-slate-300 text-slate-400 hover:border-slate-500',
      iconClass: 'text-slate-300',
      subClass: 'text-slate-400',
    },
    unpaid: {
      icon: AlertCircle,
      label: 'Unpaid',
      tileClass:
        'bg-gradient-to-b from-red-50 to-red-100 border-red-500 text-red-800 ' +
        'ring-2 ring-red-300 ring-offset-1 animate-pulse ' +
        'shadow-lg shadow-red-200',
      iconClass: 'text-red-600',
      subClass: 'text-red-700',
    },
    paid: {
      icon: CheckCircle2,
      label: ksh(paid),
      tileClass:
        'bg-gradient-to-b from-blue-500 to-blue-600 border-blue-700 text-white ' +
        'shadow-lg shadow-blue-300',
      iconClass: 'text-blue-100',
      subClass: 'text-blue-100',
    },
    exempt: {
      icon: ShieldOff,
      label: 'Exempt',
      tileClass:
        'bg-slate-100 border-slate-400 border-dashed text-slate-600',
      iconClass: 'text-slate-500',
      subClass: 'text-slate-500',
    },
  }[status];

  const Icon = config.icon;
  const clickable = interactive && status === 'unpaid' && onClick;

  return (
    <button
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`
        relative aspect-square rounded-xl border-2 transition-all duration-200
        flex flex-col items-center justify-center p-2
        ${config.tileClass}
        ${clickable ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}
      `}
    >
      <span
        className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${
          status === 'paid' ? 'text-blue-100' : 'opacity-70 text-current'
        }`}
      >
        Seat {id}
      </span>
      <Icon className={`w-5 h-5 mb-0.5 ${config.iconClass}`} />
      <span className={`text-[11px] font-bold leading-tight truncate max-w-full px-0.5 ${config.subClass}`}>
        {config.label}
      </span>
      {status === 'paid' && dest && (
        <span className="text-[9px] opacity-90 truncate max-w-full px-0.5 mt-0.5">
          → {dest}
        </span>
      )}
    </button>
  );
}