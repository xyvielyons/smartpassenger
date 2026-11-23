'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Telemetry, EventMessage, AlertMessage, PaymentMessage,
  LogEntry, LiveStats, CashTicket, SeatSnapshot,
} from './types';
import { SEAT_COUNT } from './config';

// Helper — build an all-vacant seat array
function emptySeats(): SeatSnapshot[] {
  return Array.from({ length: SEAT_COUNT }, (_, i) => ({
    id: i + 1,
    status: 'vacant' as const,
    paid: 0,
    dest: '',
  }));
}

interface State {
  connected: boolean;
  error: string | null;
  telemetry: Telemetry | null;
  liveStats: LiveStats | null;
  seats: SeatSnapshot[];
  events: EventMessage[];
  alerts: AlertMessage[];
  payments: PaymentMessage[];
  cashTickets: CashTicket[];
  logs: LogEntry[];

  setConnected: (c: boolean) => void;
  setError: (e: string | null) => void;
  ingest: (entry: LogEntry) => void;
  clearLogs: () => void;

  // Optimistic local mutations (before telemetry confirms)
  optimisticSeatPay: (seatId: number, amount: number, dest: string) => void;
  optimisticSeatExempt: (seatId: number, reason: string) => void;

  addCashTicket: (t: Omit<CashTicket, 'id' | 'ts'>) => void;
  resetSession: () => void;
}

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      connected: false,
      error: null,
      telemetry: null,
      liveStats: null,
      seats: emptySeats(),
      events: [],
      alerts: [],
      payments: [],
      cashTickets: [],
      logs: [],

      setConnected: (connected) => set({ connected }),
      setError: (error) => set({ error }),
      clearLogs: () => set({ logs: [] }),

      resetSession: () =>
        set({
          telemetry: null,
          liveStats: null,
          seats: emptySeats(),
          events: [],
          alerts: [],
          payments: [],
          cashTickets: [],
        }),

      addCashTicket: (t) =>
        set((s) => ({
          cashTickets: [
            {
              id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
              ts: Date.now(),
              ...t,
            },
            ...s.cashTickets,
          ].slice(0, 300),
        })),

      // ---- Optimistic: flip seat to paid locally -------------------
      optimisticSeatPay: (seatId, amount, dest) =>
        set((s) => {
          const seats = s.seats.map((seat) =>
            seat.id === seatId
              ? { ...seat, status: 'paid' as const, paid: amount, dest }
              : seat
          );
          const stats = s.liveStats
            ? {
                ...s.liveStats,
                unaccounted: Math.max(0, s.liveStats.unaccounted - 1),
                collected: s.liveStats.collected + amount,
                loggedPaid: s.liveStats.loggedPaid + 1,
                updatedAt: Date.now(),
              }
            : s.liveStats;
          return { seats, liveStats: stats };
        }),

      // ---- Optimistic: flip seat to exempt locally -----------------
      optimisticSeatExempt: (seatId, reason) =>
        set((s) => {
          const seats = s.seats.map((seat) =>
            seat.id === seatId
              ? { ...seat, status: 'exempt' as const, dest: `Exempt: ${reason}` }
              : seat
          );
          const stats = s.liveStats
            ? {
                ...s.liveStats,
                unaccounted: Math.max(0, s.liveStats.unaccounted - 1),
                updatedAt: Date.now(),
              }
            : s.liveStats;
          return { seats, liveStats: stats };
        }),

      // ---- Main ingest — dispatches by entry.type ------------------
      ingest: (entry) =>
        set((s) => {
          const next: Partial<State> = {
            logs: [entry, ...s.logs].slice(0, 500),
          };

          // ==========================================================
          // TELEMETRY — source of truth, overwrites seats + liveStats
          // ==========================================================
          if (entry.type === 'telemetry') {
            next.telemetry = entry.data;
            next.seats = Array.isArray(entry.data.seats)
              ? entry.data.seats
              : s.seats;
            next.liveStats = {
              onboard: entry.data.onboard,
              seatsOccupied: entry.data.seats_occupied ?? 0,
              unaccounted: entry.data.unaccounted,
              collected: entry.data.collected_revenue,
              loggedPaid: entry.data.logged_paid,
              unpaidExits: entry.data.unpaid_exits,
              updatedAt: Date.now(),
            };
          }

          // ==========================================================
          // EVENTS — seat_occupied / seat_vacated / entered / exited
          // ==========================================================
          if (entry.type === 'event') {
            next.events = [entry.data, ...s.events].slice(0, 100);

            const ev = entry.data as any;
            if (ev.event === 'seat_occupied' && typeof ev.seat_id === 'number') {
              next.seats = s.seats.map((seat) =>
                seat.id === ev.seat_id && seat.status === 'vacant'
                  ? { ...seat, status: 'unpaid' as const }
                  : seat
              );
            } else if (ev.event === 'seat_vacated' && typeof ev.seat_id === 'number') {
              next.seats = s.seats.map((seat) =>
                seat.id === ev.seat_id
                  ? { ...seat, status: 'vacant' as const, paid: 0, dest: '' }
                  : seat
              );
            }

            next.liveStats = {
              onboard: ev.onboard,
              seatsOccupied: s.liveStats?.seatsOccupied ?? 0,
              unaccounted: ev.unaccounted,
              collected: ev.collected,
              loggedPaid: s.liveStats?.loggedPaid ?? 0,
              unpaidExits: s.liveStats?.unpaidExits ?? 0,
              updatedAt: Date.now(),
            };
          }

          // ==========================================================
          // ALERTS — same shape as before, seat_id optional
          // ==========================================================
          if (entry.type === 'alert') {
            next.alerts = [entry.data, ...s.alerts].slice(0, 100);
          }

          // ==========================================================
          // PAYMENTS — confirm the matching cash ticket + seat
          // ==========================================================
          if (entry.type === 'payment') {
            next.payments = [entry.data, ...s.payments].slice(0, 200);

            const p = entry.data as any;

            if (p.status === 'payment_verified') {
              // Mark matching ticket as verified
              const ticketIdx = s.cashTickets.findIndex(
                (c) =>
                  !c.verifiedAt &&
                  typeof p.seat_id === 'number' &&
                  c.seatId === p.seat_id &&
                  Date.now() - c.ts < 20000
              );
              if (ticketIdx >= 0) {
                const updated = [...s.cashTickets];
                updated[ticketIdx] = {
                  ...updated[ticketIdx],
                  verifiedAt: Date.now(),
                };
                next.cashTickets = updated;
              }
              // Confirm seat is paid
              if (typeof p.seat_id === 'number') {
                next.seats = s.seats.map((seat) =>
                  seat.id === p.seat_id
                    ? {
                        ...seat,
                        status: 'paid' as const,
                        paid: p.amount ?? seat.paid,
                        dest: p.destination ?? seat.dest,
                      }
                    : seat
                );
              }
            } else if (p.status === 'exemption_logged') {
              if (typeof p.seat_id === 'number') {
                next.seats = s.seats.map((seat) =>
                  seat.id === p.seat_id
                    ? {
                        ...seat,
                        status: 'exempt' as const,
                        dest: `Exempt: ${p.reason ?? 'Other'}`,
                      }
                    : seat
                );
              }
            }
          }

          return next;
        }),
    }),
    {
      name: 'smart-passenger-v3',
      partialize: (state) => ({
        seats: state.seats,
        cashTickets: state.cashTickets,
        payments: state.payments,
        telemetry: state.telemetry,
      }),
    }
  )
);