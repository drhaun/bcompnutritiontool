'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { IntakeForm } from '@/components/intake/intake-form';
import type { FormBlockConfig } from '@/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ClientData {
  clientId: string;
  name: string;
  email: string;
  userProfile: Record<string, unknown>;
  dietPreferences: Record<string, unknown>;
  weeklySchedule: Record<string, unknown>;
  intakeStatus: string;
}

interface GroupData {
  formConfig: FormBlockConfig[];
  stripeEnabled: boolean;
  stripePriceId?: string;
  stripePromoEnabled: boolean;
  welcomeTitle?: string;
  welcomeDescription?: string;
  slug: string;
}

export default function IntakeTokenPage() {
  const params = useParams();
  const router = useRouter();
  const raw = params.token as string;
  const isToken = UUID_RE.test(raw);

  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Slug mode: show self-signup landing
  const [slugMode, setSlugMode] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signingUp, setSigningUp] = useState(false);

  useEffect(() => {
    async function init() {
      if (isToken) {
        // Token mode — validate token and get client data
        try {
          const res = await fetch('/api/intake/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: raw }),
          });
          const data = await res.json();
          if (!res.ok) { setError(data.error || 'Invalid link'); return; }
          setClientData(data);

          // If client has a group, load its form config
          if (data.groupSlug) {
            const gRes = await fetch(`/api/groups?slug=${data.groupSlug}`);
            const gData = await gRes.json();
            if (gData.groups?.[0]) {
              const g = gData.groups[0];
              setGroupData({ formConfig: g.formConfig, stripeEnabled: g.stripeEnabled, stripePriceId: g.stripePriceId, stripePromoEnabled: g.stripePromoEnabled, welcomeTitle: g.welcomeTitle, welcomeDescription: g.welcomeDescription, slug: g.slug });
            }
          }
        } catch { setError('Network error. Please check your connection.'); }
      } else {
        // Slug mode — look up the group
        try {
          const gRes = await fetch(`/api/groups?slug=${raw}&active_only=true`);
          const gData = await gRes.json();
          if (!gData.groups?.length) { setError('This form is not available.'); return; }
          const g = gData.groups[0];
          setGroupData({ formConfig: g.formConfig, stripeEnabled: g.stripeEnabled, stripePriceId: g.stripePriceId, stripePromoEnabled: g.stripePromoEnabled, welcomeTitle: g.welcomeTitle, welcomeDescription: g.welcomeDescription, slug: g.slug });
          setSlugMode(true);
        } catch { setError('Network error. Please check your connection.'); }
      }
      setLoading(false);
    }
    init();
  }, [raw, isToken]);

  const handleSlugSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim()) return;
    setSigningUp(true);
    try {
      const res = await fetch('/api/intake/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signupName.trim(), email: signupEmail.trim(), groupSlug: raw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); setSigningUp(false); return; }
      router.push(`/intake/${data.token}`);
    } catch { setError('Network error.'); setSigningUp(false); }
  }, [signupName, signupEmail, raw, router]);

  const handleCheckout = useCallback(async () => {
    if (!clientData) return;
    try {
      const res = await fetch(`/api/intake/${raw}/checkout`, { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { /* silent */ }
  }, [clientData, raw]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#00263d] to-[#001a2b] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-40 h-12 mx-auto">
            <Image src="/images/fitomicshorizontalgold.png" alt="Fitomics" fill className="object-contain" priority />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-[#c19962] mx-auto" />
          <p className="text-sm text-white/50">Loading your form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#00263d] to-[#001a2b] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="relative w-40 h-12 mx-auto mb-8">
            <Image src="/images/fitomicshorizontalgold.png" alt="Fitomics" fill className="object-contain" priority />
          </div>
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 space-y-4">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
            <h1 className="text-xl font-bold text-[#00263d]">Link Issue</h1>
            <p className="text-gray-600 text-sm">{error}</p>
            <a href="/intake" className="inline-block mt-4 px-6 py-3 rounded-xl bg-[#c19962] text-[#00263d] font-semibold hover:bg-[#a8833e] transition-colors">Start a New Form</a>
          </div>
        </div>
      </div>
    );
  }

  // Slug mode — self-signup landing for this group
  if (slugMode && !clientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#00263d] to-[#001a2b] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="relative w-48 h-14 mx-auto mb-6">
              <Image src="/images/fitomicshorizontalgold.png" alt="Fitomics" fill className="object-contain" priority />
            </div>
            <h1 className="text-2xl font-bold text-white">{groupData?.welcomeTitle || 'Intake Form'}</h1>
            {groupData?.welcomeDescription && <p className="text-white/60 mt-2 text-sm leading-relaxed">{groupData.welcomeDescription}</p>}
          </div>
          <form onSubmit={handleSlugSignup} className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#00263d]">Full Name</label>
              <input type="text" value={signupName} onChange={e => setSignupName(e.target.value)} placeholder="Jane Smith"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-[#c19962] focus:border-transparent" autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#00263d]">Email Address</label>
              <input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="jane@example.com"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-[#c19962] focus:border-transparent" autoComplete="email" />
            </div>
            <button type="submit" disabled={signingUp}
              className="w-full h-12 rounded-xl bg-[#c19962] hover:bg-[#a8833e] text-[#00263d] font-semibold text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {signingUp ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting...</> : 'Get Started'}
            </button>
            <p className="text-xs text-center text-gray-400">Your information is private and only shared with your coach.</p>
          </form>
          <p className="text-white/20 text-xs text-center mt-6">&copy; {new Date().getFullYear()} Fitomics. All rights reserved.</p>
        </div>
      </div>
    );
  }

  if (clientData?.intakeStatus === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#00263d] to-[#001a2b] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="relative w-40 h-12 mx-auto mb-8">
            <Image src="/images/fitomicshorizontalgold.png" alt="Fitomics" fill className="object-contain" priority />
          </div>
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h1 className="text-xl font-bold text-[#00263d]">Already Submitted</h1>
            <p className="text-gray-600 text-sm">You&apos;ve already completed this intake form. Your coach has your information. If you need to make changes, please contact them directly.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <IntakeForm
      token={raw}
      initialData={clientData!}
      formConfig={groupData?.formConfig}
      stripeEnabled={groupData?.stripeEnabled}
      onCheckout={handleCheckout}
      welcomeTitle={groupData?.welcomeTitle}
      successTitle={groupData?.slug === 'team-standard' ? 'Congrats!' : undefined}
      successMessage={groupData?.slug === 'team-standard'
        ? 'Your entry has been submitted. Your personalized nutrition targets are under construction by the Fitomics Nutrition Team. Please allow up to 72 hours for careful review and calculation.'
        : undefined}
    />
  );
}
