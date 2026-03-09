'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { IntakeForm } from '@/components/intake/intake-form';
import { extractPrePopulatedFields, getLockedFormStateKeys } from '@/lib/field-mapping-utils';
import type { FormBlockConfig, FieldMapping, ClientCreationMode, FormPricingConfig } from '@/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ClientData {
  clientId: string;
  name: string;
  email: string;
  userProfile: Record<string, unknown>;
  dietPreferences: Record<string, unknown>;
  weeklySchedule: Record<string, unknown>;
  intakeStatus: string;
  groupId?: string;
}

interface ResolvedForm {
  formConfig: FormBlockConfig[];
  stripeEnabled: boolean;
  stripePriceId?: string;
  stripePromoEnabled: boolean;
  welcomeTitle?: string;
  welcomeDescription?: string;
  slug: string;
  formId?: string;
  pricingConfig?: FormPricingConfig | null;
  clientCreationMode?: ClientCreationMode;
  groupId?: string;
  groupSlug?: string;
}

interface FormLinkData {
  prePopulatedFields: Record<string, unknown>;
  lockedFields: string[];
}

export default function IntakeTokenPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = params.token as string;
  const isToken = UUID_RE.test(raw);
  const formIdParam = searchParams.get('form');
  const isPreview = searchParams.get('preview') === '1';

  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [groupData, setGroupData] = useState<ResolvedForm | null>(null);
  const [formLinkData, setFormLinkData] = useState<FormLinkData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Slug mode: show self-signup landing
  const [slugMode, setSlugMode] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signingUp, setSigningUp] = useState(false);

  // Local mode: for on_submit / none — form renders without a client record
  const [localMode, setLocalMode] = useState(false);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [showCheckoutPreview, setShowCheckoutPreview] = useState(false);

  const creationMode = groupData?.clientCreationMode || 'on_start';

  const buildPreviewCustomAnswers = useCallback((config: FormBlockConfig[] | undefined) => {
    const answers: Record<string, string | string[] | boolean> = {};
    const allFields = (config || []).flatMap(block => block.customFields || []);
    for (const field of allFields) {
      if (field.type === 'number') answers[field.id] = '25';
      else if (field.type === 'text' || field.type === 'textarea') answers[field.id] = `Sample ${field.label.toLowerCase()}`;
      else if (field.type === 'select') answers[field.id] = field.options?.[0] || '';
      else if (field.type === 'multiselect') answers[field.id] = field.options?.slice(0, 2) || [];
      else if (field.type === 'toggle') answers[field.id] = true;
      else if (field.type === 'date') answers[field.id] = new Date().toISOString().split('T')[0];
    }
    return answers;
  }, []);

  useEffect(() => {
    async function resolveFormFromGroup(groupSlug: string, preferredFormId?: string | null): Promise<ResolvedForm | null> {
      const gRes = await fetch(`/api/groups?slug=${groupSlug}`);
      const gData = await gRes.json();
      const g = gData.groups?.[0];
      if (!g) return null;

      if (preferredFormId) {
        const fRes = await fetch(`/api/forms/${preferredFormId}`);
        if (fRes.ok) {
          const fData = await fRes.json();
          const f = fData.form;
          if (f) {
            return {
              formConfig: f.resolvedFormConfig || f.formConfig,
              stripeEnabled: f.stripeEnabled,
              stripePriceId: f.stripePriceId,
              stripePromoEnabled: f.stripePromoEnabled,
              welcomeTitle: f.welcomeTitle,
              welcomeDescription: f.welcomeDescription,
              slug: f.slug,
              formId: f.id,
              pricingConfig: f.pricingConfig,
              groupId: g.id,
              groupSlug: g.slug,
              clientCreationMode: f.clientCreationMode,
            };
          }
        }
      }

      if (g.defaultFormId) {
        const fRes = await fetch(`/api/forms/${g.defaultFormId}`);
        if (fRes.ok) {
          const fData = await fRes.json();
          const f = fData.form;
          if (f) return {
            formConfig: f.resolvedFormConfig || f.formConfig,
            stripeEnabled: f.stripeEnabled,
            stripePriceId: f.stripePriceId,
            stripePromoEnabled: f.stripePromoEnabled,
            welcomeTitle: f.welcomeTitle,
            welcomeDescription: f.welcomeDescription,
            slug: f.slug,
            formId: f.id,
            pricingConfig: f.pricingConfig,
            groupId: g.id,
            groupSlug: g.slug,
            clientCreationMode: f.clientCreationMode,
          };
        }
      }

      return {
        formConfig: g.formConfig,
        stripeEnabled: g.stripeEnabled,
        stripePriceId: g.stripePriceId,
        stripePromoEnabled: g.stripePromoEnabled,
        welcomeTitle: g.welcomeTitle,
        welcomeDescription: g.welcomeDescription,
        slug: g.slug,
        pricingConfig: null,
        groupId: g.id,
        groupSlug: g.slug,
      };
    }

    async function resolveFormLink(groupId: string, targetFormId: string) {
      try {
        const res = await fetch(`/api/form-links/resolve?groupId=${groupId}&targetFormId=${targetFormId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.formLink?.sourceData && data.formLink?.fieldMappings?.length > 0) {
          const mappings = data.formLink.fieldMappings as FieldMapping[];
          const sourceData = data.formLink.sourceData as Record<string, unknown>;
          const prePopulatedFields = extractPrePopulatedFields(sourceData, mappings);
          const lockedFields = Array.from(getLockedFormStateKeys(mappings));
          setFormLinkData({ prePopulatedFields, lockedFields });
        }
      } catch { /* silent — form links are non-critical */ }
    }

    async function init() {
      if (isPreview && !isToken) {
        try {
          if (formIdParam) {
            const groupScopedForm = await resolveFormFromGroup(raw, formIdParam);
            if (groupScopedForm) {
              setGroupData(groupScopedForm);
              setSlugMode(true);
              setLocalMode(true);
              setLoading(false);
              return;
            }
          }

          const form = await resolveFormFromGroup(raw, formIdParam);
          if (form) {
            setGroupData(form);
            setSlugMode(true);
            setLocalMode(true);
            setLoading(false);
            return;
          }

          const standaloneRes = await fetch(`/api/forms?slug=${raw}&active_only=true`);
          const standaloneData = await standaloneRes.json();
          if (standaloneData.forms?.length) {
            const f = standaloneData.forms[0];
            setGroupData({
              formConfig: f.resolvedFormConfig || f.formConfig,
              stripeEnabled: f.stripeEnabled,
              stripePriceId: f.stripePriceId,
              stripePromoEnabled: f.stripePromoEnabled,
              welcomeTitle: f.welcomeTitle,
              welcomeDescription: f.welcomeDescription,
              slug: f.slug,
              formId: f.id,
              pricingConfig: f.pricingConfig,
              clientCreationMode: f.clientCreationMode,
            });
            setSlugMode(true);
            setLocalMode(true);
            setLoading(false);
            return;
          }
        } catch { setError('Preview could not be loaded.'); }
      }

      if (isToken) {
        // Token mode — client already exists, always server saves
        try {
          const res = await fetch('/api/intake/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: raw }),
          });
          const data = await res.json();
          if (!res.ok) { setError(data.error || 'Invalid link'); return; }
          setClientData(data);

          let resolvedGroupId = data.groupId as string | undefined;
          let resolvedFormId: string | undefined;

          if (formIdParam) {
            const fRes = await fetch(`/api/forms/${formIdParam}`);
            if (fRes.ok) {
              const fData = await fRes.json();
              const f = fData.form;
              if (f) {
                setGroupData({ formConfig: f.resolvedFormConfig || f.formConfig, stripeEnabled: f.stripeEnabled, stripePriceId: f.stripePriceId, stripePromoEnabled: f.stripePromoEnabled, welcomeTitle: f.welcomeTitle, welcomeDescription: f.welcomeDescription, slug: f.slug, formId: f.id, pricingConfig: f.pricingConfig, clientCreationMode: f.clientCreationMode });
                resolvedFormId = f.id;
              }
            }
          } else if (data.groupSlug) {
            const form = await resolveFormFromGroup(data.groupSlug, formIdParam);
            if (form) {
              setGroupData(form);
              resolvedFormId = form.formId;
              if (form.groupId) resolvedGroupId = form.groupId;
            }
          }

          if (resolvedGroupId && resolvedFormId) {
            await resolveFormLink(resolvedGroupId, resolvedFormId);
          }
        } catch { setError('Network error. Please check your connection.'); }
      } else {
        // Slug mode — try standalone form first, then group
        try {
          if (formIdParam) {
            const groupScopedForm = await resolveFormFromGroup(raw, formIdParam);
            if (groupScopedForm) {
              setGroupData(groupScopedForm);
              if (groupScopedForm.groupId && groupScopedForm.formId) {
                await resolveFormLink(groupScopedForm.groupId, groupScopedForm.formId);
              }
              setSlugMode(true);
              setLoading(false);
              return;
            }
          }

          const fRes = await fetch(`/api/forms?slug=${raw}&active_only=true`);
          const fData = await fRes.json();
          if (fData.forms?.length && !formIdParam) {
            const f = fData.forms[0];
            setGroupData({
              formConfig: f.resolvedFormConfig || f.formConfig,
              stripeEnabled: f.stripeEnabled,
              stripePriceId: f.stripePriceId,
              stripePromoEnabled: f.stripePromoEnabled,
              welcomeTitle: f.welcomeTitle,
              welcomeDescription: f.welcomeDescription,
              slug: f.slug,
              formId: f.id,
              pricingConfig: f.pricingConfig,
              clientCreationMode: f.clientCreationMode,
            });
            setSlugMode(true);
          } else {
            const form = await resolveFormFromGroup(raw, formIdParam);
            if (!form) { setError('This form is not available.'); return; }
            setGroupData(form);
            if (form.groupId && form.formId) {
              await resolveFormLink(form.groupId, form.formId);
            }
            setSlugMode(true);
          }
        } catch { setError('Network error. Please check your connection.'); }
      }
      setLoading(false);
    }
    init();
  }, [raw, isToken, formIdParam, isPreview]);

  // on_start: original flow — create client, redirect to token
  const handleSlugSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim()) return;
    setSigningUp(true);
    try {
      const res = await fetch('/api/intake/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signupName.trim(), email: signupEmail.trim(), groupSlug: groupData?.groupSlug || raw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); setSigningUp(false); return; }
      const formParam = groupData?.formId ? `?form=${groupData.formId}` : '';
      router.push(`/intake/${data.token}${formParam}`);
    } catch { setError('Network error.'); setSigningUp(false); }
  }, [signupName, signupEmail, raw, router, groupData]);

  // on_submit / none: store name/email locally, enter local form mode
  const handleLocalStart = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (creationMode !== 'none' && (!signupName.trim() || !signupEmail.trim())) return;
    setLocalMode(true);
  }, [signupName, signupEmail, creationMode]);

  // Local submit handler for on_submit / none modes
  const handleLocalSubmit = useCallback(async (formData: {
    userProfile: Record<string, unknown>;
    dietPreferences: Record<string, unknown>;
    weeklySchedule: Record<string, unknown>;
    customAnswers: Record<string, unknown>;
  }) => {
    setError(null);
    const res = await fetch('/api/intake/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: creationMode,
        name: signupName.trim(),
        email: signupEmail.trim().toLowerCase(),
        userProfile: formData.userProfile,
        dietPreferences: formData.dietPreferences,
        weeklySchedule: formData.weeklySchedule,
        customAnswers: formData.customAnswers,
        formId: groupData?.formId || null,
        groupSlug: groupData?.groupSlug || raw,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Submission failed');
      throw new Error(data.error || 'Submission failed');
    }
    const result = await res.json();

    // Clear localStorage draft
    const lsKey = `intake-draft-${raw}-${signupEmail.trim().toLowerCase()}`;
    try { localStorage.removeItem(lsKey); } catch { /* */ }

    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
      return false;
    }

    // If Stripe payment required, redirect to checkout
    if (result.stripeRequired && result.token) {
      try {
        const checkoutRes = await fetch(`/api/intake/${result.token}/checkout`, { method: 'POST' });
        const checkoutData = await checkoutRes.json();
        if (checkoutData.url) {
          window.location.href = checkoutData.url;
          return false;
        }
      } catch {
        setError('Unable to start checkout. Please try again.');
        throw new Error('Unable to start checkout');
      }
    }

    setLocalSubmitted(true);
    return true;
  }, [creationMode, signupName, signupEmail, groupData, raw]);

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
            <Link href="/intake" className="inline-block mt-4 px-6 py-3 rounded-xl bg-[#c19962] text-[#00263d] font-semibold hover:bg-[#a8833e] transition-colors">Start a New Form</Link>
          </div>
        </div>
      </div>
    );
  }

  // Local mode submitted
  if (localSubmitted) {
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
            <h1 className="text-xl font-bold text-[#00263d]">
              {groupData?.slug === 'team-standard' ? 'Congrats!' : 'Submitted!'}
            </h1>
            <p className="text-gray-600 text-sm">
              {groupData?.slug === 'team-standard'
                ? 'Your entry has been submitted. Your personalized nutrition targets are under construction by the Fitomics Nutrition Team. Please allow up to 72 hours for careful review and calculation.'
                : 'Your form has been submitted successfully. Thank you!'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Local mode form render (on_submit / none — after name/email collected)
  if (localMode && groupData) {
    const lsKey = `intake-draft-${raw}-${signupEmail.trim().toLowerCase()}`;
    return (
      <>
        <IntakeForm
          token={`local-${raw}`}
          initialData={{
            clientId: '',
            name: isPreview ? 'Preview Coach' : signupName.trim(),
            email: isPreview ? 'preview@fitomics.com' : signupEmail.trim(),
            userProfile: isPreview ? { firstName: 'Preview', lastName: 'Coach', gender: 'Male' } : {},
            dietPreferences: {},
            weeklySchedule: {},
          }}
          formConfig={groupData.formConfig}
          stripeEnabled={isPreview ? !!groupData.pricingConfig : !!groupData.stripeEnabled}
          onCheckout={isPreview ? () => setShowCheckoutPreview(true) : undefined}
          welcomeTitle={groupData.welcomeTitle}
          formId={groupData.formId}
          pricingConfig={groupData.pricingConfig}
          previewMode={isPreview}
          initialCustomAnswers={isPreview ? buildPreviewCustomAnswers(groupData.formConfig) : undefined}
          prePopulatedFields={formLinkData?.prePopulatedFields}
          lockedFields={formLinkData?.lockedFields}
          saveMode="local"
          localStorageKey={isPreview ? undefined : lsKey}
          onLocalSubmit={isPreview ? undefined : handleLocalSubmit}
        />
        {isPreview && showCheckoutPreview && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Checkout Preview</h2>
                <p className="text-sm text-gray-500 mt-1">Current live flow: the form review step shows pricing, then redirects to Stripe Checkout.</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What happens</p>
                  <p className="text-sm text-gray-700">1. Coach reviews entered values.</p>
                  <p className="text-sm text-gray-700">2. Pricing summary is shown on the final form step.</p>
                  <p className="text-sm text-gray-700">3. Clicking <span className="font-medium">Proceed to Payment</span> creates a Stripe Checkout session.</p>
                  <p className="text-sm text-gray-700">4. The coach is redirected to hosted Stripe Checkout.</p>
                </div>
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Current Status</p>
                  <p className="text-sm text-blue-900 mt-1">Inline embedded checkout is not implemented in this flow yet. This preview reflects the current hosted Stripe redirect behavior.</p>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
                <button onClick={() => setShowCheckoutPreview(false)} className="h-10 px-4 rounded-lg bg-[#00263d] text-white text-sm font-medium hover:bg-[#003a5c]">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Slug mode — self-signup landing
  if (slugMode && !clientData) {
    const isLocalMode = creationMode === 'on_submit' || creationMode === 'none';
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
          <form onSubmit={isLocalMode ? handleLocalStart : handleSlugSignup} className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 space-y-5">
            {creationMode !== 'none' && (
              <>
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
              </>
            )}
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

  // Server mode — existing client record, standard flow
  return (
    <IntakeForm
      token={raw}
      initialData={clientData!}
      formConfig={groupData?.formConfig}
      stripeEnabled={groupData?.stripeEnabled}
      onCheckout={handleCheckout}
      welcomeTitle={groupData?.welcomeTitle}
      formId={groupData?.formId}
      pricingConfig={groupData?.pricingConfig}
      successTitle={groupData?.slug === 'team-standard' ? 'Congrats!' : undefined}
      successMessage={groupData?.slug === 'team-standard'
        ? 'Your entry has been submitted. Your personalized nutrition targets are under construction by the Fitomics Nutrition Team. Please allow up to 72 hours for careful review and calculation.'
        : undefined}
      prePopulatedFields={formLinkData?.prePopulatedFields}
      lockedFields={formLinkData?.lockedFields}
      saveMode="server"
    />
  );
}
