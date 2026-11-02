'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bus, Wallet, CarFront, User, ListOrdered } from 'lucide-react';
import { useApp } from '@/lib/store';
import { BUS_ID } from '@/lib/config';

const links = [
  { href: '/conductor', label: 'Conductor', icon: Wallet },
  { href: '/driver', label: 'Driver', icon: CarFront },
  { href: '/owner', label: 'Owner', icon: User },
  { href: '/logs', label: 'Logs', icon: ListOrdered },
];

export function Nav() {
  const pathname = usePathname();
  const connected = useApp((s) => s.connected);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <Bus className="w-5 h-5 text-blue-600" />
          <span>Smart Passenger</span>
          <span className="text-xs font-mono text-slate-500 px-2 py-0.5 bg-slate-100 rounded">
            {BUS_ID}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 text-sm">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              connected ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'
            }`}
          />
          <span className="text-slate-600 font-medium">
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}