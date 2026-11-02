'use client';
import { useState } from 'react';
import { X, CreditCard, Loader2, CheckCircle2 } from 'lucide-react';
import { InitiatePayment, TransactionStatus } from '@/actions/pesapal';
import { ROUTE_STOPS } from '@/lib/config';

export function PesapalDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (destinationId: string, destinationName: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [destinationId, setDestinationId] = useState(ROUTE_STOPS[ROUTE_STOPS.length - 1].id);

  const selectedDest = ROUTE_STOPS.find(s => s.id === destinationId) || ROUTE_STOPS[0];

  if (!open) return null;

  const handlePay = async () => {
    if (!phone) {
      alert('Please enter a phone number');
      return;
    }

    setLoading(true);
    try {
      const { redirect_url, order_tracking_id } = await InitiatePayment({
        phoneNumber: phone,
        name: name,
        email: email
      });

      window.open(redirect_url, '_blank');
      
      setLoading(false);
      setPolling(true);

      const interval = setInterval(async () => {
        try {
          const status = await TransactionStatus(order_tracking_id);
          
          if (status.status_code === 1) { // Completed
            clearInterval(interval);
            setPolling(false);
            setSuccess(true);
            onSuccess(selectedDest.id, selectedDest.name);
            
            setTimeout(() => {
              setSuccess(false);
              onClose();
            }, 2000);
          } else if (status.status_code === 2 || status.status_code === 3) {
            clearInterval(interval);
            setPolling(false);
            alert('Payment failed or was cancelled.');
          }
        } catch (err) {
          // Ignore network errors
        }
      }, 3000);

    } catch (error) {
      setLoading(false);
      alert('Failed to initiate payment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" /> Collect Card / M-Pesa
          </h3>
          <button onClick={onClose} disabled={polling || success} className="p-1 rounded hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <CheckCircle2 className="w-16 h-16 text-blue-600" />
              <h4 className="text-xl font-bold text-slate-900">Payment Successful!</h4>
              <p className="text-sm text-slate-500">The passenger has been logged.</p>
            </div>
          ) : polling ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <div>
                <h4 className="text-lg font-bold text-slate-900">Waiting for payment...</h4>
                <p className="text-sm text-slate-500 mt-1">Complete the checkout in the new window.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Destination</label>
                <select
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  className="mt-2 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                >
                  {ROUTE_STOPS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.fare > 0 ? `— KSh ${s.fare}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Customer Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
                <div className="text-sm text-blue-900 font-medium mb-1">Actual Ticket Fare</div>
                <div className="text-2xl font-bold text-blue-700">KSh {selectedDest.fare}</div>
                <div className="text-xs text-blue-500 mt-2 font-medium bg-blue-100 py-1 rounded">
                  (Test Charge via Pesapal: KSh 1)
                </div>
              </div>

              <button
                onClick={handlePay}
                disabled={loading}
                className="w-full py-3 mt-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate Payment Link'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}