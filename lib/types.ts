export interface Gps {
    lat: number | null;
    lng: number | null;
    speed: number;
    fixed: boolean;
  }
  export interface CashTicket {
    id: string;
    ts: number;
    amount: number;
    destinationId: string;
    destinationName: string;
    verifiedAt?: number; // set when the matching payment event comes back
  }
  
  export interface Telemetry {
    bus_id: string;
    ts: number;
    onboard: number;
    logged_paid: number;
    unaccounted: number;
    exemptions: number;
    total_entries: number;
    total_exits: number;
    unpaid_exits: number;      // <-- ADD THIS LINE
    expected_revenue: number;
    collected_revenue: number;
    gps: Gps;
  }
  
  export interface EventMessage {
    ts: number;
    event: 'entered' | 'exited';
    onboard: number;
    unaccounted: number;
    collected: number;
    gps: Gps;
  }
  
  export interface AlertMessage {
    ts: number;
    alert: 'unaccounted_boarding' | 'unpaid_passenger_exit';
    onboard: number;
    unaccounted: number;
    collected: number;
    gps: Gps;
  }
  
  export interface PaymentMessage {
    ts: number;
    status: 'payment_verified' | 'exemption_logged';
    amount?: number;
    reason?: string;
    destination?: string; // <-- ADD THIS
    onboard: number;
    unaccounted: number;
    collected: number;
    gps: Gps;
  }
  export interface OnboardPassenger {
    id: string;
    destination: string;
    status: 'paid' | 'unaccounted' | 'exempted'; // <-- ADD THIS
    paidAt: number;
}

  export interface LiveStats {
    onboard: number;
    unaccounted: number;
    collected: number;
    loggedPaid: number;
    unpaidExits: number;       // <-- ADD THIS LINE
    updatedAt: number;
  }
  
  export type LogEntry =
    | { id: string; receivedAt: number; type: 'telemetry'; topic: string; data: Telemetry }
    | { id: string; receivedAt: number; type: 'event'; topic: string; data: EventMessage }
    | { id: string; receivedAt: number; type: 'alert'; topic: string; data: AlertMessage }
    | { id: string; receivedAt: number; type: 'payment'; topic: string; data: PaymentMessage }
    | { id: string; receivedAt: number; type: 'other'; topic: string; data: unknown };