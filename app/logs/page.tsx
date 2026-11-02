'use client';
import { useState } from 'react';
import { Trash2, Pause, Play } from 'lucide-react';
import { useApp } from '@/lib/store';
import { clock } from '@/lib/format';

type Filter = 'all' | 'telemetry' | 'event' | 'alert' | 'payment';

export default function LogsPage() {
  const logs = useApp((s) => s.logs);
  const clearLogs = useApp((s) => s.clearLogs);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.type === filter);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Live MQTT log</h1>
          <p className="text-sm text-slate-500">
            All messages received from the bus, newest first
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {filtered.length} messages
          </span>
          <button
            onClick={clearLogs}
            className="px-3 py-1.5 rounded-md border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(['all', 'telemetry', 'event', 'alert', 'payment'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide transition ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[80px_90px_1fr] bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 font-medium">
          <div className="px-3 py-2">Time</div>
          <div className="px-3 py-2">Type</div>
          <div className="px-3 py-2">Payload</div>
        </div>

        <div className="max-h-[calc(100vh-280px)] overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 && (
            <div className="p-12 text-center text-sm text-slate-400">
              No messages yet — is the ESP32 running?
            </div>
          )}

          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-[80px_90px_1fr] text-xs hover:bg-slate-50"
            >
              <div className="px-3 py-2 font-mono text-slate-500">
                {clock(entry.receivedAt)}
              </div>
              <div className="px-3 py-2">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                    entry.type === 'telemetry' ? 'bg-slate-100 text-slate-700' :
                    entry.type === 'event' ? 'bg-blue-100 text-blue-800' :
                    entry.type === 'alert' ? 'bg-slate-900 text-white' :
                    entry.type === 'payment' ? 'bg-blue-600 text-white' :
                    'bg-slate-100 text-slate-600'
                  }`}
                >
                  {entry.type}
                </span>
              </div>
              <div className="px-3 py-2 font-mono text-[11px] text-slate-700 break-all">
                <span className="text-slate-400">{entry.topic.split('/').pop()} </span>
                {JSON.stringify(entry.data)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}