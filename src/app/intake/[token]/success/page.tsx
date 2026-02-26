'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PaymentSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    if (!sessionId || !token) {
      setStatus('error');
      return;
    }

    async function verify() {
      try {
        const res = await fetch(`/api/intake/${token}/checkout/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (res.ok) {
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    }

    verify();
  }, [token, sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00263d] to-[#001a2b] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="relative w-48 h-14 mx-auto mb-8">
          <Image src="/images/fitomicshorizontalgold.png" alt="Fitomics" fill className="object-contain" priority />
        </div>
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 space-y-4">
          {status === 'verifying' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-[#c19962] mx-auto" />
              <h1 className="text-xl font-bold text-[#00263d]">Verifying Payment...</h1>
              <p className="text-gray-600 text-sm">Please wait while we confirm your payment.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-[#00263d]">Congrats!</h1>
              <p className="text-gray-600 text-sm">
                Your entry has been submitted. Your personalized nutrition targets are under construction by the Fitomics Nutrition Team. Please allow up to 72 hours for careful review and calculation.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                <p className="font-medium">Questions?</p>
                <a href="mailto:nutrition@fitomics.org" className="text-[#c19962] hover:underline">nutrition@fitomics.org</a>
              </div>
            </>
          )}
          {status === 'error' && (
            <>
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
              <h1 className="text-xl font-bold text-[#00263d]">Something Went Wrong</h1>
              <p className="text-gray-600 text-sm">
                We couldn&apos;t verify your payment. If you were charged, please contact your coach — your payment is safe.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                <a href="mailto:nutrition@fitomics.org" className="text-[#c19962] hover:underline">nutrition@fitomics.org</a>
              </div>
            </>
          )}
        </div>
        <p className="text-white/20 text-xs mt-6">&copy; {new Date().getFullYear()} Fitomics. All rights reserved.</p>
      </div>
    </div>
  );
}
