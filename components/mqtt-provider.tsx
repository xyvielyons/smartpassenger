'use client';
import { useEffect } from 'react';
import { connectMQTT } from '@/lib/mqtt';
import { MQTT_WS } from '@/lib/config';
import { useApp } from '@/lib/store';
import type { LogEntry } from '@/lib/types';

function parse(topic: string, raw: string): LogEntry | null {
  try {
    const data = JSON.parse(raw);
    const suffix = topic.split('/').pop();
    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const receivedAt = Date.now();
    if (suffix === 'telemetry') return { id, receivedAt, type: 'telemetry', topic, data };
    if (suffix === 'event')     return { id, receivedAt, type: 'event', topic, data };
    if (suffix === 'alert')     return { id, receivedAt, type: 'alert', topic, data };
    if (suffix === 'payment')   return { id, receivedAt, type: 'payment', topic, data };
    return { id, receivedAt, type: 'other', topic, data };
  } catch {
    return null;
  }
}

export function MqttProvider({ children }: { children: React.ReactNode }) {
  const setConnected = useApp((s) => s.setConnected);
  const setError = useApp((s) => s.setError);
  const ingest = useApp((s) => s.ingest);

  useEffect(() => {
    const client = connectMQTT(MQTT_WS, {
      onConnect: () => { setConnected(true); setError(null); },
      onDisconnect: () => setConnected(false),
      onError: (e) => setError(e.message),
      onMessage: (topic, payload) => {
        const entry = parse(topic, payload);
        if (entry) ingest(entry);
      },
    });
    return () => { client.end(true); };
  }, [setConnected, setError, ingest]);

  return <>{children}</>;
}