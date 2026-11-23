export interface Gps {
  lat: number | null;
  lng: number | null;
  speed: number;
  fixed: boolean;
}

export type SeatStatus = 'vacant' | 'unpaid' | 'paid' | 'exempt';

export interface SeatSnapshot {
  id: number;          // 1..6 (1-indexed, matches hardware seat_id)
  status: SeatStatus;
  paid: number;
  dest: string;
}

export interface Telemetry {
  bus_id: string;
  ts: number;
  onboard: number;              // IR body counter
  logged_paid: number;
  unaccounted: number;          // seats occupied but unpaid
  exemptions: number;
  total_entries: number;
  total_exits: number;
  unpaid_exits: number;
  expected_revenue: number;
  collected_revenue: number;
  seats_occupied: number;       // button count
  seats: SeatSnapshot[];
  gps: Gps;
}

export interface CounterEvent {
  ts: number;
  event: 'entered' | 'exited';
  onboard: number;
  unaccounted: number;
  collected: number;
  gps: Gps;
}

export interface SeatEvent {
  ts: number;
  event: 'seat_occupied' | 'seat_vacated';
  seat_id: number;
  onboard: number;
  unaccounted: number;
  collected: number;
  gps: Gps;
}

export type EventMessage = CounterEvent | SeatEvent;

export interface AlertMessage {
  ts: number;
  alert: 'unaccounted_boarding' | 'unpaid_passenger_exit';
  seat_id?: number;
  onboard: number;
  unaccounted: number;
  collected: number;
  gps: Gps;
}

export interface PaymentMessage {
  ts: number;
  status: 'payment_verified' | 'exemption_logged';
  seat_id?: number;
  amount?: number;
  reason?: string;
  destination?: string;
  onboard: number;
  unaccounted: number;
  collected: number;
  gps: Gps;
}

export interface CashTicket {
  id: string;
  ts: number;
  seatId: number;               // 1..6
  amount: number;
  destinationId: string;
  destinationName: string;
  method: 'cash' | 'mpesa';
  verifiedAt?: number;
}

export interface LiveStats {
  onboard: number;
  seatsOccupied: number;
  unaccounted: number;
  collected: number;
  loggedPaid: number;
  unpaidExits: number;
  updatedAt: number;
}

export type LogEntry =
  | { id: string; receivedAt: number; type: 'telemetry'; topic: string; data: Telemetry }
  | { id: string; receivedAt: number; type: 'event'; topic: string; data: EventMessage }
  | { id: string; receivedAt: number; type: 'alert'; topic: string; data: AlertMessage }
  | { id: string; receivedAt: number; type: 'payment'; topic: string; data: PaymentMessage }
  | { id: string; receivedAt: number; type: 'other'; topic: string; data: unknown };