'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Telemetry, EventMessage, AlertMessage, PaymentMessage,
  LogEntry, LiveStats, CashTicket, OnboardPassenger
} from './types';

interface State {
  connected: boolean;
  error: string | null;
  telemetry: Telemetry | null;
  liveStats: LiveStats | null;
  events: EventMessage[];
  alerts: AlertMessage[];
  payments: PaymentMessage[];
  cashTickets: CashTicket[];
  onboardPassengers: OnboardPassenger[];
  logs: LogEntry[];
  resetSession: () => void;

  setConnected: (c: boolean) => void;
  setError: (e: string | null) => void;
  ingest: (entry: LogEntry) => void;
  clearLogs: () => void;
  addCashTicket: (t: {
    amount: number;
    destinationId: string;
    destinationName: string;
  }) => void;
}

export const useApp = create<State>()(
  persist(
    (set) => ({
      connected: false,
      error: null,
      telemetry: null,
      liveStats: null,
      events: [],
      alerts: [],
      payments: [],
      cashTickets: [],
      logs: [],
      onboardPassengers: [],

      resetSession: () => set({
        telemetry: null,
        liveStats: null,
        events: [],
        alerts: [],
        payments: [],
        cashTickets: [],
        onboardPassengers: [],
      }),

      setConnected: (connected) => set({ connected }),
      setError: (error) => set({ error }),
      clearLogs: () => set({ logs: [] }),

      // OPTIMISTIC UPDATE: Updates UI instantly while waiting for ESP32
      addCashTicket: (t) =>
        set((s) => {
          const currentOnboard = s.onboardPassengers || [];
          const unaccIdx = currentOnboard.findIndex((p) => p.status === 'unaccounted');
          
          let updatedOnboard = currentOnboard;
          if (unaccIdx >= 0) {
            updatedOnboard = [...currentOnboard];
            updatedOnboard[unaccIdx] = {
              ...updatedOnboard[unaccIdx],
              destination: t.destinationName,
              status: 'paid',
            };
          }

          let newLiveStats = s.liveStats;
          if (s.liveStats) {
            newLiveStats = {
              ...s.liveStats,
              unaccounted: Math.max(0, s.liveStats.unaccounted - 1),
              collected: s.liveStats.collected + t.amount,
              loggedPaid: s.liveStats.loggedPaid + 1,
              updatedAt: Date.now(),
            };
          }

          return {
            cashTickets: [
              {
                id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                ts: Date.now(),
                amount: t.amount,
                destinationId: t.destinationId,
                destinationName: t.destinationName,
              },
              ...s.cashTickets,
            ].slice(0, 200),
            onboardPassengers: updatedOnboard,
            liveStats: newLiveStats,
          };
        }),

      ingest: (entry) =>
        set((s) => {
          const next: Partial<State> = { logs: [entry, ...s.logs].slice(0, 500) };
          let currentOnboard = s.onboardPassengers || [];

          if (entry.type === 'event') {
            next.events = [entry.data, ...s.events].slice(0, 100);

            if (entry.data.event === 'entered') {
              currentOnboard = [
                ...currentOnboard,
                {
                  id: `unacc-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
                  destination: 'Unaccounted',
                  status: 'unaccounted',
                  paidAt: Date.now(),
                },
              ];
            } else if (entry.data.event === 'exited') {
              const unaccIdx = currentOnboard.findIndex((p) => p.status === 'unaccounted');
              if (unaccIdx >= 0) {
                currentOnboard.splice(unaccIdx, 1);
              } else if (currentOnboard.length > 0) {
                currentOnboard.shift();
              }
            }
            next.onboardPassengers = currentOnboard;

            let newUnpaidExits = s.liveStats?.unpaidExits ?? 0;
            if (entry.data.event === 'exited' && s.liveStats && s.liveStats.unaccounted > 0) {
              newUnpaidExits++;
            }

            next.liveStats = {
              onboard: entry.data.onboard,
              unaccounted: entry.data.unaccounted,
              collected: entry.data.collected,
              loggedPaid: s.liveStats?.loggedPaid ?? 0,
              unpaidExits: newUnpaidExits,
              updatedAt: Date.now(),
            };
          }

          if (entry.type === 'payment') {
            next.payments = [entry.data, ...s.payments].slice(0, 100);

            if (entry.data.status === 'payment_verified') {
              const ticketIdx = (s.cashTickets || []).findIndex(
                (c) => !c.verifiedAt && c.amount === entry.data.amount && Date.now() - c.ts < 15000
              );
              
              if (ticketIdx >= 0) {
                const updatedTickets = [...s.cashTickets];
                updatedTickets[ticketIdx] = { ...updatedTickets[ticketIdx], verifiedAt: Date.now() };
                next.cashTickets = updatedTickets;
              } else {
                // If we missed the optimistic update, do it now based on MQTT payload
                const dest = entry.data.destination || "Unknown Destination";
                const unaccIdx = currentOnboard.findIndex((p) => p.status === 'unaccounted');
                if (unaccIdx >= 0) {
                  currentOnboard[unaccIdx] = { ...currentOnboard[unaccIdx], destination: dest, status: 'paid' };
                } else {
                  currentOnboard.push({ id: `paid-${Date.now()}`, destination: dest, status: 'paid', paidAt: Date.now() });
                }
                next.onboardPassengers = currentOnboard;
              }
            } 
            else if (entry.data.status === 'exemption_logged') {
              const unaccIdx = currentOnboard.findIndex((p) => p.status === 'unaccounted');
              if (unaccIdx >= 0) {
                currentOnboard[unaccIdx] = {
                  ...currentOnboard[unaccIdx],
                  destination: `Exempt: ${entry.data.reason || 'Other'}`,
                  status: 'exempted',
                };
              }
              next.onboardPassengers = currentOnboard;
            }
          }

          // TELEMETRY IS THE SOURCE OF TRUTH
          if (entry.type === 'telemetry') {
            next.telemetry = entry.data;
            
            if (currentOnboard.length > entry.data.onboard) {
              currentOnboard = currentOnboard.slice(0, entry.data.onboard);
            } else if (currentOnboard.length < entry.data.onboard) {
              const missing = entry.data.onboard - currentOnboard.length;
              for (let i = 0; i < missing; i++) {
                currentOnboard.push({
                  id: `sync-${Date.now()}-${i}`,
                  destination: 'Unaccounted',
                  status: 'unaccounted',
                  paidAt: Date.now(),
                });
              }
            }
            next.onboardPassengers = currentOnboard;

            // This overwrites any optimistic values with the hardware's exact numbers
            next.liveStats = {
              onboard: entry.data.onboard,
              unaccounted: entry.data.unaccounted,
              collected: entry.data.collected_revenue,
              loggedPaid: entry.data.logged_paid,
              unpaidExits: entry.data.unpaid_exits,
              updatedAt: Date.now(),
            };
          }

          return next;
        }),
    }),
    {
      name: 'smart-passenger-storage',
      partialize: (state) => ({
        // We only persist the tickets and manifest, NOT the liveStats.
        // This prevents ghost money from staying on screen if the ESP32 is reset.
        onboardPassengers: state.onboardPassengers,
        cashTickets: state.cashTickets,
        payments: state.payments,
        telemetry: state.telemetry,
      }),
    }
  )
);