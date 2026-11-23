'use client';
import { useState } from 'react';
import { ShieldOff, X } from 'lucide-react';
import { EXEMPTION_REASONS } from '@/lib/config';

interface Props {
  open: boolean;
  seatId: number | null;
  onClose: () => void;
  onConfirm: (seatId: number, reason: string) => void;
}

export function SeatExemptDialog({ open, seatId, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState(EXEMPTION_REASONS[0]);
  const [custom, setCustom] = useState('');

  if (!open || seatId === null) return null;

  const effectiveReason = reason === 'Other' ? custom || 'Other' : reason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <ShieldOff className="w-4 h-4 text-slate-500" />
            Exempt Seat {seatId}
          </h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="space-y-1.5 mb-4">
          {EXEMPTION_REASONS.map((r) => (
            <label
              key={r}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer text-sm transition ${
                reason === r
                  ? 'bg-blue-50 border-blue-300 text-blue-900 font-medium'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-blue-200'
              }`}
            >
              <input
                type="radio"
                name="exempt-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-blue-600"
              />
              {r}
            </label>
          ))}
        </div>

        {reason === 'Other' && (
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Describe the reason"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 mb-4 text-sm bg-white text-slate-900"
          />
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(seatId, effectiveReason)}
            className="flex-1 py-2.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}