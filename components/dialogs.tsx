'use client';
import { useState, useEffect } from 'react';
import { X, Banknote, AlertTriangle } from 'lucide-react';
import { ROUTE_STOPS, defaultDestination, EXEMPTION_REASONS } from '@/lib/config';
import { ksh } from '@/lib/format';

/* -------------------------------------------------------------------------- */
/* Internal Modal Wrapper                                                     */
/* -------------------------------------------------------------------------- */
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Cash Dialog (with Destination Dropdown)                                    */
/* -------------------------------------------------------------------------- */
export function CashDialog({
  open,
  onClose,
  onConfirm,
  unaccounted,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (
    amount: number,
    destinationId: string,
    destinationName: string
  ) => void;
  unaccounted: number;
}) {
  const def = defaultDestination();
  const [destinationId, setDestinationId] = useState(def.id);
  const [amount, setAmount] = useState(def.fare);

  // Reset state every time the dialog opens
  useEffect(() => {
    if (!open) return;
    setDestinationId(def.id);
    setAmount(def.fare);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDestinationChange = (id: string) => {
    setDestinationId(id);
    const stop = ROUTE_STOPS.find((s) => s.id === id);
    if (stop && stop.fare > 0) setAmount(stop.fare);
  };

  const selectedDest = ROUTE_STOPS.find((s) => s.id === destinationId) ?? def;

  return (
    <Modal open={open} onClose={onClose} title="Collect Cash">
      <div className="space-y-4">
        {/* Destination Picker */}
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Destination
          </label>
          <select
            value={destinationId}
            onChange={(e) => handleDestinationChange(e.target.value)}
            className="mt-2 w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ROUTE_STOPS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.fare > 0 ? ` — KSh ${s.fare}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Amount paid
          </label>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm font-mono text-slate-500">KSh</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-lg font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Warning if no unaccounted passengers */}
        {unaccounted === 0 && (
          <div className="flex gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
            No unaccounted passengers — this will still log a payment.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(amount, selectedDest.id, selectedDest.name);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 transition"
          >
            <Banknote className="w-4 h-4" />
            Confirm {ksh(amount)}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Exemption Dialog                                                           */
/* -------------------------------------------------------------------------- */
export function ExemptionDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState(EXEMPTION_REASONS[0]);

  useEffect(() => {
    if (open) setReason(EXEMPTION_REASONS[0]);
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Log Exemption">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Select the reason for exempting this passenger from paying a fare.
        </p>

        <div className="space-y-2">
          {EXEMPTION_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition ${
                reason === r
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(reason);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
}