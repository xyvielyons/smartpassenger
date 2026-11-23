'use client';
import { Armchair, CheckCircle2, AlertCircle, ShieldOff } from 'lucide-react';
import type { SeatSnapshot } from '@/lib/types';
import { ksh } from '@/lib/format';

interface Props {
  seat: SeatSnapshot;
  onClick?: () => void;
  interactive?: boolean;
}

export function SeatCard({ seat, onClick, interactive = false }: Props) {
  const { status, paid, dest } = seat;

  const palette = {
    vacant:  'bg-slate-50 border-slate-200 text-slate-400',
    unpaid:  'bg-red-50 border-red-300 text-red-800 hover:border-red-500 hover:shadow-md',
    paid:    'bg-blue-50 border-blue-300 text-blue-800',
    exempt:  'bg-slate-100 border-slate-300 text-slate-600',
  }[status];

  const label = {
    vacant: 'Empty',
    unpaid: 'Tap to collect',
    paid:   ksh(paid),
    exempt: 'Exempt',
  }[status];

  const Icon = {
    vacant:  Armchair,
    unpaid:  AlertCircle,
    paid:    CheckCircle2,
    exempt:  ShieldOff,
  }[status];

  const clickable = interactive && status === 'unpaid' && onClick;

  return (
    <button
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`
        relative rounded-xl border p-4 text-left transition-all
        ${palette}
        ${clickable ? 'cursor-pointer' : 'cursor-default'}
        ${clickable ? '' : 'opacity-95'}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide font-bold opacity-70">
          Seat {seat.id}
        </span>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-sm font-bold">{label}</div>
      {status === 'paid' && dest && (
        <div className="text-xs mt-1 opacity-80 truncate">→ {dest}</div>
      )}
      {status === 'exempt' && dest && (
        <div className="text-xs mt-1 opacity-80 truncate">{dest}</div>
      )}
    </button>
  );
}