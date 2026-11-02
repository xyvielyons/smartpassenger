export const BUS_ID = process.env.NEXT_PUBLIC_BUS_ID || 'KDA123X';
export const MQTT_WS =
  process.env.NEXT_PUBLIC_MQTT_WS || 'wss://broker.hivemq.com:8884/mqtt';

export const FARE_PRESETS = [40, 60, 80, 100, 120];
export const DEFAULT_FARE = 80;

export const EXEMPTION_REASONS = [
  'Child Under 5',
  'Staff / Inspector',
  'Luggage Only',
  'Other',
];
export function stopById(id: string): Stop | undefined {
  return ROUTE_STOPS.find((s) => s.id === id);
}

export function defaultDestination(): Stop {
  // Last stop = full-trip default (Githurai 44, KSh 120)
  return ROUTE_STOPS[ROUTE_STOPS.length - 1];
}

export interface Stop {
  id: string;
  name: string;
  fare: number;
}

export const ROUTE_STOPS: Stop[] = [
  { id: 'cbd', name: 'Nairobi CBD', fare: 30 }, // Changed from 0 to 30
  { id: 'muthaiga', name: 'Muthaiga', fare: 40 },
  { id: 'trm', name: 'Thika Road Mall', fare: 60 },
  { id: 'roysambu', name: 'Roysambu', fare: 80 },
  { id: 'kahawa', name: 'Kahawa Sukari', fare: 100 },
  { id: 'githurai', name: 'Githurai 44', fare: 120 },
];

export const BUS_CAPACITY = 14; // 14 seats + conductor + driver