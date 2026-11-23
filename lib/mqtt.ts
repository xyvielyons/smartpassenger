'use client';
import mqtt, { MqttClient } from 'mqtt';
import { BUS_ID } from './config';

let _client: MqttClient | null = null;

export interface Handlers {
  onConnect: () => void;
  onDisconnect: () => void;
  onMessage: (topic: string, payload: string) => void;
  onError: (err: Error) => void;
}

export function connectMQTT(url: string, handlers: Handlers): MqttClient {
  const clientId = `sp-web-${Math.random().toString(16).slice(2, 10)}`;
  const client = mqtt.connect(url, {
    clientId,
    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 8000,
    keepalive: 30,
  });

  client.on('connect', () => {
    client.subscribe(`smartpassenger/${BUS_ID}/#`, { qos: 0 });
    handlers.onConnect();
  });
  client.on('close', handlers.onDisconnect);
  client.on('error', handlers.onError);
  client.on('message', (t, p) => handlers.onMessage(t, p.toString()));

  _client = client;
  return client;
}

export function publish(topic: string, payload: object): boolean {
  if (!_client || !_client.connected) return false;
  _client.publish(topic, JSON.stringify(payload), { qos: 0 });
  return true;
}

// ---------------------------------------------------------------------
// Seat-targeted commands. `seatId` is 1-indexed in the UI, but the
// firmware expects `seat` = 0-indexed on the wire.
// ---------------------------------------------------------------------

export function paySeatCash(seatId: number, amount: number, destination: string) {
  return publish(`smartpassenger/${BUS_ID}/cmd/pay`, {
    seat: seatId - 1,
    type: 'cash',
    amount,
    destination,
  });
}

export function paySeatMpesa(
  seatId: number,
  amount: number,
  destination: string,
  ref = 'PESAPAL'
) {
  return publish(`smartpassenger/${BUS_ID}/cmd/pay`, {
    seat: seatId - 1,
    type: 'mpesa',
    amount,
    destination,
    ref,
  });
}

export function exemptSeat(seatId: number, reason: string) {
  return publish(`smartpassenger/${BUS_ID}/cmd/exempt`, {
    seat: seatId - 1,
    reason,
  });
}

export function vacateSeat(seatId: number) {
  return publish(`smartpassenger/${BUS_ID}/cmd/vacate`, {
    seat: seatId - 1,
  });
}

export function sendReset() {
  return publish(`smartpassenger/${BUS_ID}/cmd/reset`, {});
}

export function requestStatus() {
  return publish(`smartpassenger/${BUS_ID}/cmd/status`, {});
}

// ---------------------------------------------------------------------
// Legacy trip-level commands — kept for backward compatibility.
// ---------------------------------------------------------------------
export function sendCash(amount: number, destination?: string) {
  return publish(`smartpassenger/${BUS_ID}/cmd/pay`, {
    type: 'cash',
    amount,
    ...(destination ? { destination } : {}),
  });
}

export function sendMpesa(amount: number, destination?: string, ref = 'PESAPAL') {
  return publish(`smartpassenger/${BUS_ID}/cmd/pay`, {
    type: 'mpesa',
    amount,
    ...(destination ? { destination } : {}),
    ref,
  });
}

export function sendExemption(reason: string) {
  return publish(`smartpassenger/${BUS_ID}/cmd/exempt`, { reason });
}