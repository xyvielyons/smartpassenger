import { Suspense } from 'react';
import { PassengerSeatInner } from './seat-inner';

export default function PassengerSeatPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-12 pb-24 text-center">
          <p className="text-slate-500">Loading seat…</p>
        </div>
      }
    >
      <PassengerSeatInner />
    </Suspense>
  );
}