import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/nav';
import { MqttProvider } from '@/components/mqtt-provider';
import { Footer } from '@/components/footer';
import { BottomNav } from '@/components/bottom-nav'; // <-- ADD
import { Suspense } from 'react';
// Add this line:

export const metadata: Metadata = {
  title: 'Smart Passenger',
  description: 'Matatu anti-theft & revenue dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MqttProvider>
          <div className="min-h-screen flex flex-col">
          <Suspense fallback={null}>
              <Nav />
            </Suspense>

            <main className="flex-1">{children}</main>
            <Footer />
          </div>

          {/* BottomNav is the one blocking the build right now */}
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        </MqttProvider>
      </body>
    </html>
  );
}