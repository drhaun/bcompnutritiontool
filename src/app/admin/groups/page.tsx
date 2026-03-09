'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Copy, ExternalLink, Check, DollarSign, Tag, RefreshCw, FileText, ChevronDown, ChevronUp, Link2, Lock } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FormConfigBuilder } from '@/components/admin/form-config-builder';
import { FormFieldAssignmentsEditor } from '@/components/admin/form-field-assignments-editor';
import { FieldLibraryPanel } from '@/components/admin/field-library-panel';
import { FormLinksPanel } from '@/components/admin/form-links-panel';
import { SubmissionReviewEditor } from '@/components/admin/submission-review-editor';
import { ALL_BLOCK_IDS } from '@/lib/form-library';
import { getFormCustomFields, getNumberCustomFields } from '@/lib/form-pricing';
import { hydrateFormAssignments, mergeFormConfigWithAssignments, normalizeFormConfig } from '@/lib/form-fields';
import { buildAssignmentPayload } from '@/lib/unified-field-library';
import type { ClientGroup, FormBlockConfig, IntakeForm, GroupFormLink, FormPricingConfig, FormPricingMode, TieredPricingRule, ReusableCustomField } from '@/types';

interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  defaultPriceId: string | null;
  defaultPriceAmount: number | null;
  defaultPriceCurrency: string | null;
}

interface FormSubmission {
  id: string;
  client_id: string;
  group_id: string | null;
  group_name: string | null;
  group_slug: string | null;
  form_id?: string | null;
  form_config: FormBlockConfig[];
  form_data: Record<string, unknown>;
  reviewed_form_data?: Record<string, unknown> | null;
  pricing_snapshot?: Record<string, unknown> | null;
  review_status?: 'pending' | 'reviewed' | 'published';
  status: 'submitted' | 'reviewed' | 'archived' | 'pending_payment';
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  published_at?: string | null;
  published_by?: string | null;
  published_link_id?: string | null;
  notes: string | null;
  stripe_payment_id: string | null;
  clientName: string;
  clientEmail: string;
}

const EMPTY_GROUP: Partial<ClientGroup> = {
  name: '', slug: '', description: '', formConfig: [], welcomeTitle: '', welcomeDescription: '',
  stripeEnabled: false, stripePriceId: '', stripePromoEnabled: false, stripePromoCode: '', stripePromoCodeId: '', paymentDescription: '', isActive: true,
};

const EMPTY_FORM: Partial<IntakeForm> = {
  name: '', slug: '', description: '', formConfig: [], welcomeTitle: '', welcomeDescription: '',
  stripeEnabled: false, stripePriceId: '', stripePromoEnabled: false, stripePromoCode: null, stripePromoCodeId: null, paymentDescription: '',
  pricingConfig: null,
  clientCreationMode: 'on_start', isActive: true,
};

const PRICING_MODE_OPTIONS: Array<{ value: FormPricingMode; label: string; desc: string }> = [
  { value: 'fixed', label: 'Fixed', desc: 'One flat checkout price for the form.' },
  { value: 'per_player', label: 'Per Player', desc: 'Charge the same amount for each player entered.' },
  { value: 'base_plus_per_player', label: 'Base + Per Player', desc: 'Charge a base setup fee plus a per-player fee.' },
  { value: 'tiered', label: 'Tiered', desc: 'Choose one flat price based on player count range.' },
  { value: 'manual_quote', label: 'Manual Quote', desc: 'Collect count now and quote or invoice later.' },
];

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ClientGroup> | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState('');

  // Standalone forms
  const [forms, setForms] = useState<IntakeForm[]>([]);
  const [editingForm, setEditingForm] = useState<Partial<IntakeForm> | null>(null);
  const [savingForm, setSavingForm] = useState(false);
  const [fields, setFields] = useState<ReusableCustomField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  // Stripe (used by form editor)
  const [stripeProducts, setStripeProducts] = useState<StripeProduct[]>([]);
  const [stripePromoCodes, setStripePromoCodes] = useState<{ id: string; code: string; percentOff: number | null; amountOff: number | null; timesRedeemed: number; maxRedemptions: number | null }[]>([]);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [promoSearch, setPromoSearch] = useState('');
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCreatePromo, setShowCreatePromo] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', recurring: false, interval: 'month' });
  const [newPromo, setNewPromo] = useState({ code: '', percentOff: '', amountOff: '', maxRedemptions: '' });
  const [stripeCreating, setStripeCreating] = useState(false);
  const [stripeMessage, setStripeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Submissions
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsGroupFilter, setSubmissionsGroupFilter] = useState<string>('all');
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [submissionDrafts, setSubmissionDrafts] = useState<Record<string, { reviewedFormData: Record<string, unknown>; notes: string }>>({});
  const [savingSubmissionId, setSavingSubmissionId] = useState<string | null>(null);
  const [publishingSubmissionId, setPublishingSubmissionId] = useState<string | null>(null);

  // Form links
  const [allFormLinks, setAllFormLinks] = useState<GroupFormLink[]>([]);
  const [formLinksGroupId, setFormLinksGroupId] = useState<string>('');

  const [mainTab, setMainTab] = useState<'groups' | 'forms' | 'field_library' | 'form_links' | 'submissions'>('groups');

  /* ── Data fetching ── */

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      setGroups(data.groups || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch('/api/forms');
      const data = await res.json();
      setForms(data.forms || []);
    } catch { /* */ }
  }, []);

  const fetchFields = useCallback(async () => {
    setFieldsLoading(true);
    try {
      const res = await fetch('/api/fields?include_inactive=true');
      const data = await res.json();
      setFields(data.fields || []);
    } catch { /* */ }
    setFieldsLoading(false);
  }, []);

  const backfillLegacyFields = useCallback(async () => {
    await fetch('/api/fields/backfill', { method: 'POST' });
    await fetchForms();
    await fetchFields();
  }, [fetchFields, fetchForms]);

  const fetchAllFormLinks = useCallback(async () => {
    try {
      const res = await fetch('/api/form-links');
      if (res.ok) {
        const data = await res.json();
        setAllFormLinks(data.formLinks || []);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => { fetchGroups(); fetchForms(); fetchFields(); fetchAllFormLinks(); }, [fetchGroups, fetchForms, fetchFields, fetchAllFormLinks]);

  const formLinksMap = useMemo(() => {
    const map: Record<string, { links: GroupFormLink[]; asSource: GroupFormLink[]; asTarget: GroupFormLink[] }> = {};
    for (const link of allFormLinks) {
      if (!map[link.sourceFormId]) map[link.sourceFormId] = { links: [], asSource: [], asTarget: [] };
      if (!map[link.targetFormId]) map[link.targetFormId] = { links: [], asSource: [], asTarget: [] };
      map[link.sourceFormId].links.push(link);
      map[link.sourceFormId].asSource.push(link);
      map[link.targetFormId].links.push(link);
      map[link.targetFormId].asTarget.push(link);
    }
    return map;
  }, [allFormLinks]);

  /* ── Group CRUD ── */

  const handleSave = useCallback(async () => {
    if (!editing?.name?.trim()) return;
    setSaving(true);
    try {
      const isNew = !editing.id;
      const url = isNew ? '/api/groups' : `/api/groups/${editing.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      const slug = editing.slug || editing.name!.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editing, slug }),
      });
      if (res.ok) {
        setEditing(null);
        fetchGroups();
      }
    } catch { /* */ }
    setSaving(false);
  }, [editing, fetchGroups]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this group? Clients will not be deleted, but their group tag will be removed.')) return;
    await fetch(`/api/groups/${id}`, { method: 'DELETE' });
    fetchGroups();
  }, [fetchGroups]);

  const copyUrl = useCallback((path: string) => {
    const origin = window.location.hostname === 'localhost' ? window.location.origin : 'https://nutrition.fitomics.com';
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${origin}${normalizedPath}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(path);
    setTimeout(() => setCopiedLink(''), 2000);
  }, []);

  const buildCompatibleFormPath = useCallback((form: IntakeForm, group?: ClientGroup | null) => {
    if (!group) return `/intake/${form.slug}`;
    return group.defaultFormId === form.id
      ? `/intake/${group.slug}`
      : `/intake/${group.slug}?form=${form.id}`;
  }, []);

  const buildPreviewPath = useCallback((path: string) => (
    path.includes('?') ? `${path}&preview=1` : `${path}?preview=1`
  ), []);

  const editingFormBaseConfig = useMemo(() => normalizeFormConfig((editingForm?.formConfig || []) as FormBlockConfig[]), [editingForm?.formConfig]);
  const editingFormAssignments = useMemo(() => hydrateFormAssignments(
    editingFormBaseConfig,
    (editingForm?.fieldAssignments || []).filter(assignment =>
      editingFormBaseConfig.some(block => block.instanceId === assignment.blockInstanceId)
    )
  ), [editingForm?.fieldAssignments, editingFormBaseConfig]);
  const editingFormResolvedConfig = useMemo(() => mergeFormConfigWithAssignments(editingFormBaseConfig, editingFormAssignments), [editingFormAssignments, editingFormBaseConfig]);
  const selectedPricingMode = (editingForm?.pricingConfig?.mode || (editingForm?.stripeEnabled ? 'fixed' : 'manual_quote')) as FormPricingMode;
  const numberCustomFields = useMemo(() => {
    return getNumberCustomFields(getFormCustomFields(editingFormResolvedConfig));
  }, [editingFormResolvedConfig]);
  const priceOptions = useMemo(() => (
    stripeProducts
      .filter(product => !!product.defaultPriceId)
      .map(product => ({
        value: product.defaultPriceId as string,
        label: `${product.name}${product.defaultPriceAmount != null ? ` (${(product.defaultPriceAmount / 100).toLocaleString('en-US', { style: 'currency', currency: (product.defaultPriceCurrency || 'usd').toUpperCase() })})` : ''}`,
      }))
  ), [stripeProducts]);

  const setEditingPricingConfig = useCallback((pricingConfig: FormPricingConfig | null) => {
    setEditingForm(prev => prev ? { ...prev, pricingConfig } : prev);
  }, []);

  const updateTierRule = useCallback((tierId: string, patch: Partial<TieredPricingRule>) => {
    setEditingForm(prev => {
      if (!prev?.pricingConfig || prev.pricingConfig.mode !== 'tiered') return prev;
      return {
        ...prev,
        pricingConfig: {
          ...prev.pricingConfig,
          tiers: prev.pricingConfig.tiers.map(tier => tier.id === tierId ? { ...tier, ...patch } : tier),
        },
      };
    });
  }, []);

  /* ── Form CRUD ── */

  const handleSaveForm = useCallback(async () => {
    if (!editingForm?.name?.trim()) return;
    setSavingForm(true);
    try {
      const isNew = !editingForm.id;
      const url = isNew ? '/api/forms' : `/api/forms/${editingForm.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      const slug = editingForm.slug || editingForm.name!.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const pricingConfig = editingForm.stripeEnabled
        ? (editingForm.pricingConfig || { mode: 'fixed', fixedPriceId: editingForm.stripePriceId || '' })
        : null;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingForm, formConfig: editingFormBaseConfig, slug, pricingConfig }),
      });
      if (res.ok) {
        const data = await res.json();
        const savedFormId = data.form?.id;
        if (savedFormId) {
          await fetch(`/api/forms/${savedFormId}/fields`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              replaceAll: true,
              assignments: buildAssignmentPayload(editingFormAssignments),
            }),
          });
        }
        setEditingForm(null);
        fetchForms();
        fetchFields();
      }
    } catch { /* */ }
    setSavingForm(false);
  }, [editingForm, editingFormAssignments, editingFormBaseConfig, fetchFields, fetchForms]);

  const handleDeleteForm = useCallback(async (id: string) => {
    if (!confirm('Delete this form permanently? Existing submissions will be preserved, linked form mappings will be removed, and any group default reference will be cleared.')) return;
    await fetch(`/api/forms/${id}`, { method: 'DELETE' });
    fetchForms();
    fetchFields();
    fetchGroups();
    fetchAllFormLinks();
  }, [fetchAllFormLinks, fetchFields, fetchForms, fetchGroups]);

  const handleToggleFormActive = useCallback(async (form: IntakeForm) => {
    await fetch(`/api/forms/${form.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !form.isActive }),
    });
    fetchForms();
  }, [fetchForms]);

  /* ── Submissions ── */

  const fetchSubmissions = useCallback(async (groupId?: string) => {
    setSubmissionsLoading(true);
    try {
      const url = groupId && groupId !== 'all' ? `/api/submissions?groupId=${groupId}` : '/api/submissions';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch { /* */ }
    setSubmissionsLoading(false);
  }, []);

  const updateSubmissionStatus = useCallback(async (id: string, status: string) => {
    await fetch('/api/submissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    fetchSubmissions(submissionsGroupFilter);
  }, [submissionsGroupFilter, fetchSubmissions]);

  const getSubmissionDraft = useCallback((submission: FormSubmission) => (
    submissionDrafts[submission.id] || {
      reviewedFormData: submission.reviewed_form_data || submission.form_data,
      notes: submission.notes || '',
    }
  ), [submissionDrafts]);

  const saveSubmissionReview = useCallback(async (submission: FormSubmission) => {
    const draft = getSubmissionDraft(submission);
    setSavingSubmissionId(submission.id);
    try {
      const res = await fetch('/api/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: submission.id,
          reviewedFormData: draft.reviewedFormData,
          notes: draft.notes,
          reviewStatus: 'reviewed',
          status: submission.status === 'pending_payment' ? 'pending_payment' : 'reviewed',
          reviewedBy: 'admin',
        }),
      });
      if (!res.ok) throw new Error('Failed to save review');
      await fetchSubmissions(submissionsGroupFilter);
    } finally {
      setSavingSubmissionId(null);
    }
  }, [fetchSubmissions, getSubmissionDraft, submissionsGroupFilter]);

  const publishSubmission = useCallback(async (submission: FormSubmission) => {
    const draft = getSubmissionDraft(submission);
    setPublishingSubmissionId(submission.id);
    try {
      const reviewRes = await fetch('/api/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: submission.id,
          reviewedFormData: draft.reviewedFormData,
          notes: draft.notes,
          reviewStatus: 'reviewed',
          reviewedBy: 'admin',
        }),
      });
      if (!reviewRes.ok) throw new Error('Failed to save review');
      const publishRes = await fetch(`/api/submissions/${submission.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedBy: 'admin' }),
      });
      if (!publishRes.ok) throw new Error('Failed to publish submission');
      await fetchSubmissions(submissionsGroupFilter);
    } finally {
      setPublishingSubmissionId(null);
    }
  }, [fetchSubmissions, getSubmissionDraft, submissionsGroupFilter]);

  useEffect(() => {
    fetchSubmissions(submissionsGroupFilter);
  }, [submissionsGroupFilter, fetchSubmissions]);

  /* ── Stripe ── */

  const fetchStripeData = useCallback(async () => {
    setStripeLoading(true);
    try {
      const [prodRes, promoRes] = await Promise.all([
        fetch('/api/stripe?type=products'),
        fetch('/api/stripe?type=promo_codes'),
      ]);
      if (prodRes.ok) { const d = await prodRes.json(); setStripeProducts(d.products || []); }
      if (promoRes.ok) { const d = await promoRes.json(); setStripePromoCodes(d.promoCodes || []); }
    } catch { /* */ }
    setStripeLoading(false);
  }, []);

  useEffect(() => {
    if (editingForm?.stripeEnabled && stripeProducts.length === 0 && !stripeLoading) {
      fetchStripeData();
    }
  }, [editingForm?.stripeEnabled, stripeProducts.length, stripeLoading, fetchStripeData]);

  const handleCreateProduct = useCallback(async () => {
    if (!newProduct.name || !newProduct.price) return;
    setStripeCreating(true);
    setStripeMessage(null);
    try {
      const res = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_product',
          name: newProduct.name,
          description: newProduct.description || undefined,
          priceAmount: parseFloat(newProduct.price),
          recurring: newProduct.recurring,
          recurringInterval: newProduct.interval,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.price?.id) {
          setEditingForm(p => ({ ...p, stripePriceId: data.price.id }));
        }
        setNewProduct({ name: '', description: '', price: '', recurring: false, interval: 'month' });
        setShowCreateProduct(false);
        setStripeMessage({ type: 'success', text: `Product "${newProduct.name}" created with price $${newProduct.price}` });
        fetchStripeData();
      } else {
        setStripeMessage({ type: 'error', text: data.error || 'Failed to create product' });
      }
    } catch (err) {
      setStripeMessage({ type: 'error', text: err instanceof Error ? err.message : 'Network error creating product' });
    }
    setStripeCreating(false);
  }, [newProduct, fetchStripeData]);

  const handleCreatePromo = useCallback(async () => {
    if (!newPromo.code || (!newPromo.percentOff && !newPromo.amountOff)) return;
    setStripeCreating(true);
    setStripeMessage(null);
    try {
      const cRes = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_coupon',
          name: `Promo: ${newPromo.code}`,
          percentOff: newPromo.percentOff ? parseFloat(newPromo.percentOff) : undefined,
          amountOff: newPromo.amountOff ? parseFloat(newPromo.amountOff) : undefined,
          maxRedemptions: newPromo.maxRedemptions ? parseInt(newPromo.maxRedemptions) : undefined,
        }),
      });
      const cData = await cRes.json();
      if (!cRes.ok) {
        setStripeMessage({ type: 'error', text: cData.error || 'Failed to create coupon' });
        setStripeCreating(false);
        return;
      }
      const couponId = cData.coupon?.id;
      if (!couponId) {
        setStripeMessage({ type: 'error', text: 'Coupon creation returned no ID' });
        setStripeCreating(false);
        return;
      }

      const pRes = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_promo_code',
          couponId,
          code: newPromo.code,
          maxRedemptions: newPromo.maxRedemptions ? parseInt(newPromo.maxRedemptions) : undefined,
        }),
      });
      const pData = await pRes.json();
      if (pRes.ok) {
        const promoCodeId = pData.promoCode?.id;
        setEditingForm(p => ({ ...p, stripePromoEnabled: true, stripePromoCode: newPromo.code, stripePromoCodeId: promoCodeId }));
        setStripeMessage({ type: 'success', text: `Promo code "${newPromo.code}" created and assigned to this form.` });
        setNewPromo({ code: '', percentOff: '', amountOff: '', maxRedemptions: '' });
        setShowCreatePromo(false);
        fetchStripeData();
      } else {
        setStripeMessage({ type: 'error', text: pData.error || 'Failed to create promo code' });
      }
    } catch (err) {
      setStripeMessage({ type: 'error', text: err instanceof Error ? err.message : 'Network error creating promo code' });
    }
    setStripeCreating(false);
  }, [newPromo, fetchStripeData]);

  /* ════════════════════════════════════════════════
     Form Editor View
     ════════════════════════════════════════════════ */
  if (editingForm) {
    const autoSlug = editingForm.slug || (editingForm.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <button onClick={() => setEditingForm(null)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Back to Forms
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{editingForm.id ? 'Edit Form' : 'New Form'}</h1>

          {/* General */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">General</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Form Name *</label>
                <input value={editingForm.name || ''} onChange={e => setEditingForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="e.g. Standard Nutrition Form" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Slug (URL)</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 whitespace-nowrap">/intake/</span>
                  <input value={editingForm.slug || autoSlug} onChange={e => setEditingForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="standard-form" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
              <textarea value={editingForm.description || ''} onChange={e => setEditingForm(p => ({ ...p, description: e.target.value }))} rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="Internal description..." />
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setEditingForm(p => ({ ...p, isActive: !p?.isActive }))}
                className={cn('relative w-10 h-6 rounded-full transition-colors', editingForm.isActive ? 'bg-green-500' : 'bg-gray-300')}>
                <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform', editingForm.isActive && 'translate-x-4')} />
              </button>
              <span className="text-sm text-gray-600">Active</span>
            </div>
          </section>

          {/* Welcome screen */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Welcome Screen</h2>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
              <input value={editingForm.welcomeTitle || ''} onChange={e => setEditingForm(p => ({ ...p, welcomeTitle: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="Nutrition Intake Form" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
              <textarea value={editingForm.welcomeDescription || ''} onChange={e => setEditingForm(p => ({ ...p, welcomeDescription: e.target.value }))} rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="Welcome text shown to clients..." />
            </div>
          </section>

          {/* Form steps */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Form Steps</h2>
            <p className="text-xs text-gray-400">Choose which steps appear in this form and their order. This builder now handles structure and built-in block overrides only. A &quot;Review &amp; Submit&quot; step is always added at the end.</p>
            <FormConfigBuilder
              value={editingFormBaseConfig}
              onChange={fc => setEditingForm(p => {
                if (!p) return p;
                const normalized = normalizeFormConfig(fc);
                const validInstanceIds = new Set(normalized.map(block => block.instanceId));
                return {
                  ...p,
                  formConfig: normalized,
                  fieldAssignments: (p.fieldAssignments || []).filter(assignment => validInstanceIds.has(assignment.blockInstanceId)),
                };
              })}
            />
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Assigned Reusable Fields</h2>
                <p className="text-xs text-gray-400 mt-1">Create or edit reusable custom fields in the Field Library, then assign them to steps here.</p>
              </div>
              <button
                type="button"
                onClick={() => { setEditingForm(null); setMainTab('field_library'); }}
                className="h-9 px-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Open Field Library
              </button>
            </div>
            <FormFieldAssignmentsEditor
              formConfig={editingFormBaseConfig}
              availableFields={fields}
              value={editingFormAssignments}
              onChange={assignments => setEditingForm(p => p ? ({ ...p, fieldAssignments: assignments }) : p)}
            />
          </section>

          {/* Client Profile Creation */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Client Profile Creation</h2>
            <p className="text-xs text-gray-400">Control when a client profile is created for people who fill out this form.</p>
            <div className="space-y-2">
              {([
                { value: 'on_start' as const, label: 'On start', desc: 'Create client when they enter name and email (default)' },
                { value: 'on_submit' as const, label: 'On submission', desc: 'Create client only when they submit the form' },
                { value: 'none' as const, label: 'Never', desc: 'No client profile created (e.g., coach-only forms)' },
              ] as const).map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setEditingForm(p => ({ ...p, clientCreationMode: opt.value }))}
                  className={cn('w-full text-left p-3 rounded-lg border-2 transition-colors',
                    (editingForm.clientCreationMode || 'on_start') === opt.value
                      ? 'border-[#c19962] bg-[#c19962]/5'
                      : 'border-gray-200 hover:border-gray-300')}>
                  <div className="flex items-center gap-3">
                    <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      (editingForm.clientCreationMode || 'on_start') === opt.value
                        ? 'border-[#c19962]' : 'border-gray-300')}>
                      {(editingForm.clientCreationMode || 'on_start') === opt.value && (
                        <div className="w-2 h-2 rounded-full bg-[#c19962]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{opt.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Linked Fields indicator */}
          {editingForm.id && (() => {
            const fl = formLinksMap[editingForm.id];
            const asTarget = fl?.asTarget || [];
            const asSource = fl?.asSource || [];
            if (asTarget.length === 0 && asSource.length === 0) return null;
            return (
              <section className="bg-white rounded-xl border border-amber-200 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-amber-600" />
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Form Links</h2>
                </div>
                {asTarget.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600">This form receives data from:</p>
                    {asTarget.map(link => (
                      <div key={link.id} className="bg-amber-50 rounded-lg border border-amber-200 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-700">{link.sourceFormName || 'Source form'}</span>
                          {link.groupName && <span className="text-xs text-gray-400">in {link.groupName}</span>}
                          {link.sourceData ? (
                            <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                              <Check className="h-2.5 w-2.5" /> Filled
                            </span>
                          ) : (
                            <span className="ml-auto text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Not filled</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {link.fieldMappings.map(m => {
                            const meta = ALL_BLOCK_IDS.find(b => b.id === m.sourceBlockId);
                            return (
                              <span key={m.id} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border',
                                m.isLocked
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-gray-50 text-gray-600 border-gray-200')}>
                                {m.isLocked && <Lock className="h-2.5 w-2.5" />}
                                {meta?.label || m.sourceBlockId}
                                {m.fields && m.fields.length > 0 && ` (${m.fields.length} field${m.fields.length > 1 ? 's' : ''})`}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {asSource.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600">This form sends data to:</p>
                    {asSource.map(link => (
                      <div key={link.id} className="bg-purple-50 rounded-lg border border-purple-200 p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-700">{link.targetFormName || 'Target form'}</span>
                          {link.groupName && <span className="text-xs text-gray-400">in {link.groupName}</span>}
                          <span className="ml-auto text-[10px] text-gray-400">{link.fieldMappings.length} block{link.fieldMappings.length !== 1 ? 's' : ''} linked</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-gray-400">Manage form links on the Form Links tab.</p>
              </section>
            );
          })()}

          {/* Stripe / Payment */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Payment (Stripe)</h2>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => {
                const enabling = !editingForm.stripeEnabled;
                setEditingForm(p => p ? ({
                  ...p,
                  stripeEnabled: enabling,
                  pricingConfig: enabling
                    ? (p.pricingConfig || { mode: 'fixed', fixedPriceId: p.stripePriceId || '' })
                    : p.pricingConfig,
                }) : p);
                if (enabling && stripeProducts.length === 0) fetchStripeData();
              }}
                className={cn('relative w-10 h-6 rounded-full transition-colors', editingForm.stripeEnabled ? 'bg-[#c19962]' : 'bg-gray-300')}>
                <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform', editingForm.stripeEnabled && 'translate-x-4')} />
              </button>
              <span className="text-sm text-gray-600">Require payment after form submission</span>
            </div>
            {editingForm.stripeEnabled && (() => {
              const selectedProduct = stripeProducts.find(p => p.defaultPriceId === editingForm.stripePriceId);
              const filteredProducts = stripeProducts.filter(p =>
                !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
              );
              return (
              <div className="space-y-5 pl-1">
                {stripeMessage && (
                  <div className={cn('px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between',
                    stripeMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
                    <span>{stripeMessage.text}</span>
                    <button type="button" onClick={() => setStripeMessage(null)} className="ml-2 opacity-50 hover:opacity-100">&times;</button>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#00263d] text-white text-[10px] font-bold flex items-center justify-center">1</span>
                      Pricing Model
                    </p>
                  </div>
                  <div className="grid gap-2">
                    {PRICING_MODE_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          const firstNumberFieldId = numberCustomFields[0]?.id || '';
                          const nextConfig: FormPricingConfig | null =
                            option.value === 'fixed' ? { mode: 'fixed', fixedPriceId: editingForm.stripePriceId || '' } :
                            option.value === 'per_player' ? { mode: 'per_player', playerCountFieldId: firstNumberFieldId, perPlayerPriceId: '' } :
                            option.value === 'base_plus_per_player' ? { mode: 'base_plus_per_player', playerCountFieldId: firstNumberFieldId, basePriceId: '', perPlayerPriceId: '' } :
                            option.value === 'tiered' ? { mode: 'tiered', playerCountFieldId: firstNumberFieldId, tiers: [{ id: `tier-${Date.now()}`, minPlayers: 1, maxPlayers: null, flatPriceId: '', label: 'Default tier' }] } :
                            { mode: 'manual_quote', playerCountFieldId: firstNumberFieldId, message: 'We will review your submission and send a quote.' };
                          setEditingPricingConfig(nextConfig);
                        }}
                        className={cn('w-full text-left p-3 rounded-lg border transition-colors',
                          selectedPricingMode === option.value ? 'border-[#c19962] bg-[#c19962]/5' : 'border-gray-200 hover:border-[#c19962]/50')}
                      >
                        <p className="text-sm font-medium text-gray-900">{option.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
                      </button>
                    ))}
                  </div>

                  {selectedPricingMode !== 'fixed' && (
                    <div className="space-y-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Player Count Question</label>
                        <select
                          value={(editingForm.pricingConfig && 'playerCountFieldId' in editingForm.pricingConfig ? editingForm.pricingConfig.playerCountFieldId || '' : '')}
                          onChange={e => {
                            if (!editingForm.pricingConfig || !('playerCountFieldId' in editingForm.pricingConfig)) return;
                            setEditingPricingConfig({ ...editingForm.pricingConfig, playerCountFieldId: e.target.value });
                          }}
                          className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]"
                        >
                          <option value="">Select a number field...</option>
                          {numberCustomFields.map(field => (
                            <option key={field.id} value={field.id}>{field.label}</option>
                          ))}
                        </select>
                        {numberCustomFields.length === 0 && (
                          <p className="text-[11px] text-amber-600 mt-1">Add a custom number question to this form so pricing can use the entered player count.</p>
                        )}
                      </div>

                      {editingForm.pricingConfig?.mode === 'per_player' && (
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Per-Player Price ID</label>
                          <input
                            value={editingForm.pricingConfig.perPlayerPriceId}
                            onChange={e => setEditingPricingConfig({ ...editingForm.pricingConfig!, perPlayerPriceId: e.target.value })}
                            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#c19962]"
                            placeholder="price_..."
                          />
                        </div>
                      )}

                      {editingForm.pricingConfig?.mode === 'base_plus_per_player' && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-xs font-medium text-gray-700 mb-1 block">Base Price ID</label>
                            <input
                              value={editingForm.pricingConfig.basePriceId}
                              onChange={e => setEditingPricingConfig({ ...editingForm.pricingConfig!, basePriceId: e.target.value })}
                              className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#c19962]"
                              placeholder="price_..."
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700 mb-1 block">Per-Player Price ID</label>
                            <input
                              value={editingForm.pricingConfig.perPlayerPriceId}
                              onChange={e => setEditingPricingConfig({ ...editingForm.pricingConfig!, perPlayerPriceId: e.target.value })}
                              className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#c19962]"
                              placeholder="price_..."
                            />
                          </div>
                        </div>
                      )}

                      {editingForm.pricingConfig?.mode === 'tiered' && (
                        <div className="space-y-3">
                          {editingForm.pricingConfig.tiers.map(tier => (
                            <div key={tier.id} className="grid gap-2 sm:grid-cols-4 items-end rounded-lg border border-gray-200 bg-white p-3">
                              <div>
                                <label className="text-[11px] text-gray-500 mb-1 block">Label</label>
                                <input
                                  value={tier.label || ''}
                                  onChange={e => updateTierRule(tier.id, { label: e.target.value })}
                                  className="w-full h-8 px-2 rounded border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#c19962]"
                                  placeholder="1-10 Players"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-gray-500 mb-1 block">Min</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={tier.minPlayers}
                                  onChange={e => updateTierRule(tier.id, { minPlayers: parseInt(e.target.value || '1', 10) || 1 })}
                                  className="w-full h-8 px-2 rounded border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#c19962]"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-gray-500 mb-1 block">Max</label>
                                <input
                                  type="number"
                                  min={tier.minPlayers}
                                  value={tier.maxPlayers ?? ''}
                                  onChange={e => updateTierRule(tier.id, { maxPlayers: e.target.value ? parseInt(e.target.value, 10) : null })}
                                  className="w-full h-8 px-2 rounded border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#c19962]"
                                  placeholder="No max"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-gray-500 mb-1 block">Flat Price ID</label>
                                <input
                                  value={tier.flatPriceId}
                                  onChange={e => updateTierRule(tier.id, { flatPriceId: e.target.value })}
                                  className="w-full h-8 px-2 rounded border border-gray-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#c19962]"
                                  placeholder="price_..."
                                />
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              if (editingForm.pricingConfig?.mode !== 'tiered') return;
                              setEditingPricingConfig({
                                ...editingForm.pricingConfig,
                                tiers: [...editingForm.pricingConfig.tiers, { id: `tier-${Date.now()}-${editingForm.pricingConfig.tiers.length}`, minPlayers: 1, maxPlayers: null, flatPriceId: '', label: '' }],
                              });
                            }}
                            className="text-xs text-[#c19962] hover:text-[#a8833e] font-medium"
                          >
                            + Add Tier
                          </button>
                        </div>
                      )}

                      {editingForm.pricingConfig?.mode === 'manual_quote' && (
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Message</label>
                          <textarea
                            value={editingForm.pricingConfig.message || ''}
                            onChange={e => setEditingPricingConfig({ ...editingForm.pricingConfig!, message: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962]"
                            placeholder="We will review your submission and send a quote."
                          />
                        </div>
                      )}

                      {priceOptions.length > 0 && selectedPricingMode !== 'manual_quote' && (
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Reference Existing Stripe Price</label>
                          <select
                            onChange={e => {
                              const value = e.target.value;
                              if (!value || !editingForm.pricingConfig) return;
                              if (editingForm.pricingConfig.mode === 'per_player') setEditingPricingConfig({ ...editingForm.pricingConfig, perPlayerPriceId: value });
                              if (editingForm.pricingConfig.mode === 'base_plus_per_player') setEditingPricingConfig({ ...editingForm.pricingConfig, perPlayerPriceId: editingForm.pricingConfig.perPlayerPriceId || value, basePriceId: editingForm.pricingConfig.basePriceId || value });
                              if (editingForm.pricingConfig.mode === 'tiered') updateTierRule(editingForm.pricingConfig.tiers[0]?.id || '', { flatPriceId: value });
                            }}
                            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]"
                            defaultValue=""
                          >
                            <option value="">Choose a saved default price...</option>
                            {priceOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Product & Price */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#00263d] text-white text-[10px] font-bold flex items-center justify-center">2</span>
                      Stripe Product &amp; Fixed Price
                    </p>
                    <button type="button" onClick={fetchStripeData} disabled={stripeLoading}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                      <RefreshCw className={cn('h-3 w-3', stripeLoading && 'animate-spin')} /> Refresh
                    </button>
                  </div>

                  {selectedProduct && (
                    <div className="flex items-center justify-between p-3 rounded-lg border-2 border-[#c19962] bg-[#c19962]/5">
                      <div className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-[#c19962] flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{selectedProduct.name}</p>
                          {selectedProduct.description && <p className="text-xs text-gray-400">{selectedProduct.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {selectedProduct.defaultPriceAmount !== null && (
                          <p className="text-sm font-bold text-gray-900">${(selectedProduct.defaultPriceAmount / 100).toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962]"
                    placeholder={selectedProduct ? 'Search to change product...' : 'Search products...'} />

                  {stripeLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
                  ) : filteredProducts.length > 0 ? (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {filteredProducts.map(p => (
                        <button key={p.id} type="button"
                          onClick={() => {
                            if (p.defaultPriceId) {
                              setEditingForm(prev => prev ? ({
                                ...prev,
                                stripePriceId: p.defaultPriceId!,
                                pricingConfig: !prev.pricingConfig
                                  ? { mode: 'fixed', fixedPriceId: p.defaultPriceId! }
                                  : prev.pricingConfig.mode === 'fixed'
                                    ? { ...prev.pricingConfig, fixedPriceId: p.defaultPriceId! }
                                    : prev.pricingConfig.mode === 'per_player'
                                      ? { ...prev.pricingConfig, perPlayerPriceId: prev.pricingConfig.perPlayerPriceId || p.defaultPriceId! }
                                      : prev.pricingConfig.mode === 'base_plus_per_player'
                                        ? {
                                            ...prev.pricingConfig,
                                            basePriceId: prev.pricingConfig.basePriceId || p.defaultPriceId!,
                                            perPlayerPriceId: prev.pricingConfig.perPlayerPriceId || p.defaultPriceId!,
                                          }
                                        : prev.pricingConfig.mode === 'tiered'
                                          ? {
                                              ...prev.pricingConfig,
                                              tiers: prev.pricingConfig.tiers.map((tier, index) => (
                                                index === 0 && !tier.flatPriceId
                                                  ? { ...tier, flatPriceId: p.defaultPriceId! }
                                                  : tier
                                              )),
                                            }
                                          : prev.pricingConfig,
                              }) : prev);
                              setProductSearch('');
                            }
                          }}
                          className={cn('w-full text-left p-3 rounded-lg border transition-colors',
                            editingForm.stripePriceId === p.defaultPriceId
                              ? 'border-[#c19962] bg-[#c19962]/5'
                              : 'border-gray-200 hover:border-[#c19962] hover:bg-[#c19962]/5')}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {editingForm.stripePriceId === p.defaultPriceId && <Check className="h-3.5 w-3.5 text-[#c19962] flex-shrink-0" />}
                              <div>
                                <p className="text-sm font-medium text-gray-900">{p.name}</p>
                                {p.description && <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              {p.defaultPriceAmount !== null && (
                                <p className="text-sm font-semibold text-gray-900">
                                  ${(p.defaultPriceAmount / 100).toFixed(2)}
                                  <span className="text-xs text-gray-400 ml-0.5 uppercase">{p.defaultPriceCurrency}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : productSearch ? (
                    <p className="text-xs text-gray-400 italic py-2 text-center">No products match &ldquo;{productSearch}&rdquo;</p>
                  ) : stripeProducts.length === 0 && !stripeLoading ? (
                    <p className="text-xs text-gray-400 italic py-3 text-center">No active products in Stripe. Create one below.</p>
                  ) : null}

                  {!selectedProduct && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Or paste a Price ID directly</label>
                      <input value={editingForm.stripePriceId || ''} onChange={e => setEditingForm(p => p ? ({
                        ...p,
                        stripePriceId: e.target.value,
                        pricingConfig: selectedPricingMode === 'fixed'
                          ? { mode: 'fixed', fixedPriceId: e.target.value }
                          : p.pricingConfig,
                      }) : p)}
                        className="w-full h-9 px-3 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="price_..." />
                    </div>
                  )}

                  <button type="button" onClick={() => setShowCreateProduct(v => !v)}
                    className="w-full text-left text-xs text-[#c19962] hover:text-[#a8833e] font-medium flex items-center gap-1 py-1">
                    <Plus className={cn('h-3.5 w-3.5 transition-transform', showCreateProduct && 'rotate-45')} />
                    {showCreateProduct ? 'Cancel' : 'Create a new product'}
                  </button>

                  {showCreateProduct && (
                    <div className="space-y-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Product Name *</label>
                        <input value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                          className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="e.g. Team Standard Nutrition Plan" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Description</label>
                        <input value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                          className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="Optional description" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Price (USD) *</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input type="number" step="0.01" min="0" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
                              className="w-full h-9 pl-8 pr-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="49.99" />
                          </div>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setNewProduct(p => ({ ...p, recurring: !p.recurring }))}
                              className={cn('relative w-9 h-5 rounded-full transition-colors', newProduct.recurring ? 'bg-[#c19962]' : 'bg-gray-300')}>
                              <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform', newProduct.recurring && 'translate-x-4')} />
                            </button>
                            <span className="text-xs text-gray-600">Recurring</span>
                          </div>
                        </div>
                      </div>
                      {newProduct.recurring && (
                        <select value={newProduct.interval} onChange={e => setNewProduct(p => ({ ...p, interval: e.target.value }))}
                          className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]">
                          <option value="week">Weekly</option>
                          <option value="month">Monthly</option>
                          <option value="year">Yearly</option>
                        </select>
                      )}
                      <button type="button" onClick={handleCreateProduct} disabled={stripeCreating || !newProduct.name || !newProduct.price}
                        className="w-full h-9 rounded-lg bg-[#00263d] hover:bg-[#003a5c] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                        {stripeCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Create Product &amp; Price
                      </button>
                    </div>
                  )}
                </div>

                {/* Promo Code */}
                {(() => {
                  const selectedPromo = stripePromoCodes.find(p => p.id === editingForm.stripePromoCodeId);
                  const filteredPromos = stripePromoCodes.filter(p =>
                    !promoSearch || p.code.toLowerCase().includes(promoSearch.toLowerCase())
                  );
                  return (
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#00263d] text-white text-[10px] font-bold flex items-center justify-center">2</span>
                        Promo Code
                      </p>
                      <button type="button" onClick={fetchStripeData} disabled={stripeLoading}
                        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                        <RefreshCw className={cn('h-3 w-3', stripeLoading && 'animate-spin')} /> Refresh
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setEditingForm(p => ({ ...p, stripePromoEnabled: !p?.stripePromoEnabled }))}
                        className={cn('relative w-10 h-6 rounded-full transition-colors', editingForm.stripePromoEnabled ? 'bg-[#c19962]' : 'bg-gray-300')}>
                        <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform', editingForm.stripePromoEnabled && 'translate-x-4')} />
                      </button>
                      <span className="text-sm text-gray-600">Allow promotion codes at checkout</span>
                    </div>

                    {editingForm.stripePromoEnabled && (
                      <div className="space-y-3">
                        {selectedPromo && (
                          <div className="flex items-center justify-between p-3 rounded-lg border-2 border-[#c19962] bg-[#c19962]/5">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-[#c19962] flex-shrink-0" />
                              <span className="text-sm font-mono font-bold">{selectedPromo.code}</span>
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500">
                                {selectedPromo.percentOff ? `${selectedPromo.percentOff}% off` : selectedPromo.amountOff ? `$${(selectedPromo.amountOff / 100).toFixed(2)} off` : 'discount'}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                {selectedPromo.timesRedeemed} used{selectedPromo.maxRedemptions ? ` / ${selectedPromo.maxRedemptions}` : ''}
                              </span>
                            </div>
                          </div>
                        )}

                        {!selectedPromo && editingForm.stripePromoCode && (
                          <div className="flex items-center justify-between p-3 rounded-lg border-2 border-[#c19962] bg-[#c19962]/5">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-[#c19962]" />
                              <span className="text-sm font-mono font-bold">{editingForm.stripePromoCode}</span>
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500">Assigned</span>
                            </div>
                          </div>
                        )}

                        <input value={promoSearch} onChange={e => setPromoSearch(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962]"
                          placeholder={editingForm.stripePromoCode ? 'Search to change promo code...' : 'Search existing promo codes...'} />

                        {stripeLoading ? (
                          <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-gray-400" /></div>
                        ) : filteredPromos.length > 0 ? (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {filteredPromos.map(p => (
                              <button key={p.id} type="button"
                                onClick={() => { setEditingForm(prev => ({ ...prev, stripePromoCode: p.code, stripePromoCodeId: p.id })); setPromoSearch(''); }}
                                className={cn('w-full text-left p-2.5 rounded-lg border transition-colors',
                                  editingForm.stripePromoCodeId === p.id
                                    ? 'border-[#c19962] bg-[#c19962]/5'
                                    : 'border-gray-200 hover:border-[#c19962] hover:bg-[#c19962]/5')}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {editingForm.stripePromoCodeId === p.id && <Check className="h-3.5 w-3.5 text-[#c19962] flex-shrink-0" />}
                                    <Tag className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm font-mono font-semibold">{p.code}</span>
                                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500">
                                      {p.percentOff ? `${p.percentOff}% off` : p.amountOff ? `$${(p.amountOff / 100).toFixed(2)} off` : 'discount'}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">
                                    {p.timesRedeemed} used{p.maxRedemptions ? ` / ${p.maxRedemptions}` : ''}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : promoSearch ? (
                          <p className="text-xs text-gray-400 italic py-2 text-center">No promo codes match &ldquo;{promoSearch}&rdquo;</p>
                        ) : stripePromoCodes.length === 0 && !stripeLoading ? (
                          <p className="text-xs text-gray-400 italic py-2 text-center">No promo codes in Stripe yet. Create one below.</p>
                        ) : null}

                        <button type="button" onClick={() => setShowCreatePromo(v => !v)}
                          className="w-full text-left text-xs text-[#c19962] hover:text-[#a8833e] font-medium flex items-center gap-1 py-1">
                          <Plus className={cn('h-3.5 w-3.5 transition-transform', showCreatePromo && 'rotate-45')} />
                          {showCreatePromo ? 'Cancel' : 'Create a new promo code'}
                        </button>

                        {showCreatePromo && (
                          <div className="space-y-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Code *</label>
                              <input value={newPromo.code} onChange={e => setNewPromo(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="e.g. UAB, TEAM2025" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Discount</label>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                                  <input type="number" min="1" max="100" value={newPromo.percentOff}
                                    onChange={e => setNewPromo(p => ({ ...p, percentOff: e.target.value, amountOff: '' }))}
                                    className={cn('w-full h-9 pl-7 pr-3 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]',
                                      newPromo.percentOff ? 'border-[#c19962] bg-[#c19962]/5' : 'border-gray-200')}
                                    placeholder="Percent off" />
                                </div>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                                  <input type="number" step="0.01" min="0.01" value={newPromo.amountOff}
                                    onChange={e => setNewPromo(p => ({ ...p, amountOff: e.target.value, percentOff: '' }))}
                                    className={cn('w-full h-9 pl-7 pr-3 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]',
                                      newPromo.amountOff ? 'border-[#c19962] bg-[#c19962]/5' : 'border-gray-200')}
                                    placeholder="Dollar off" />
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 mb-1 block">Max redemptions <span className="text-gray-400">(blank = unlimited)</span></label>
                              <input type="number" min="1" value={newPromo.maxRedemptions} onChange={e => setNewPromo(p => ({ ...p, maxRedemptions: e.target.value }))}
                                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="Unlimited" />
                            </div>

                            {newPromo.code && (newPromo.percentOff || newPromo.amountOff) && (
                              <div className="bg-[#00263d]/5 border border-[#00263d]/10 rounded-lg p-3">
                                <p className="text-xs text-gray-700">
                                  <span className="font-semibold">Preview:</span> Code <span className="font-mono font-bold text-[#c19962]">{newPromo.code}</span>
                                  {newPromo.percentOff ? ` → ${newPromo.percentOff}% off` : ` → $${parseFloat(newPromo.amountOff || '0').toFixed(2)} off`}
                                  {newPromo.maxRedemptions ? `, max ${newPromo.maxRedemptions} uses` : ''}
                                </p>
                              </div>
                            )}

                            <button type="button" onClick={handleCreatePromo}
                              disabled={stripeCreating || !newPromo.code || (!newPromo.percentOff && !newPromo.amountOff)}
                              className="w-full h-9 rounded-lg bg-[#c19962] hover:bg-[#a8833e] text-[#00263d] text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                              {stripeCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                              Create Promo Code
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })()}

                {/* Checkout details */}
                <div className="border-t pt-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#00263d] text-white text-[10px] font-bold flex items-center justify-center">3</span>
                    Checkout Details
                  </p>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Payment Description</label>
                    <textarea value={editingForm.paymentDescription || ''} onChange={e => setEditingForm(p => ({ ...p, paymentDescription: e.target.value }))} rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="Text shown before checkout..." />
                  </div>
                </div>
              </div>
              );
            })()}
          </section>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-8">
            <button onClick={() => setEditingForm(null)} className="h-10 px-5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSaveForm} disabled={savingForm || !editingForm.name?.trim()}
              className="h-10 px-6 rounded-lg bg-[#c19962] hover:bg-[#a8833e] text-[#00263d] text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
              {savingForm && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingForm.id ? 'Save Changes' : 'Create Form'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════
     Group Editor View (simplified — no Stripe/FormConfig)
     ════════════════════════════════════════════════ */
  if (editing) {
    const autoSlug = editing.slug || (editing.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Back to Groups
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{editing.id ? 'Edit Group' : 'New Group'}</h1>

          {/* Basic info */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">General</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Group Name *</label>
                <input value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="e.g. FitCare DPC" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Slug (URL)</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">nutrition.fitomics.com/</span>
                  <input value={editing.slug || autoSlug} onChange={e => setEditing(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="fitcare-dpc" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
              <textarea value={editing.description || ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="Internal description..." />
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setEditing(p => ({ ...p, isActive: !p?.isActive }))}
                className={cn('relative w-10 h-6 rounded-full transition-colors', editing.isActive ? 'bg-green-500' : 'bg-gray-300')}>
                <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform', editing.isActive && 'translate-x-4')} />
              </button>
              <span className="text-sm text-gray-600">Active</span>
            </div>
          </section>

          {/* Default Form */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Default Intake Form</h2>
            <p className="text-xs text-gray-400">Select a form for this group. Clients in this group will be directed to this form. Forms can be created and configured on the Forms tab.</p>
            <select
              value={editing.defaultFormId || ''}
              onChange={e => setEditing(p => ({ ...p, defaultFormId: e.target.value || null }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]">
              <option value="">— No form linked —</option>
              {forms.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.slug})</option>
              ))}
            </select>
            {editing.defaultFormId && (() => {
              const linked = forms.find(f => f.id === editing.defaultFormId);
              return linked ? (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{linked.formConfig.length} step{linked.formConfig.length !== 1 ? 's' : ''}</span>
                  {linked.stripeEnabled && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">Stripe</span>}
                  <button type="button" onClick={() => { setEditing(null); setEditingForm({ ...linked }); }}
                    className="ml-auto text-[#c19962] hover:underline">Edit Form</button>
                </div>
              ) : null;
            })()}
          </section>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-8">
            <button onClick={() => setEditing(null)} className="h-10 px-5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving || !editing.name?.trim()}
              className="h-10 px-6 rounded-lg bg-[#c19962] hover:bg-[#a8833e] text-[#00263d] text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing.id ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════
     Main Tab View
     ════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 mb-2">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Groups &amp; Forms</h1>
            <p className="text-sm text-gray-500 mt-1">Manage client groups, customize intake forms, and configure payments.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditingForm({ ...EMPTY_FORM })}
              className="h-10 px-4 rounded-lg border-2 border-[#c19962] text-[#c19962] hover:bg-[#c19962]/10 text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> New Form
            </button>
            <button onClick={() => setEditing({ ...EMPTY_GROUP })}
              className="h-10 px-4 rounded-lg bg-[#c19962] hover:bg-[#a8833e] text-[#00263d] text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Group
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {[
            { key: 'groups' as const, label: 'Groups', count: groups.length },
            { key: 'forms' as const, label: 'Forms', count: forms.length },
            { key: 'field_library' as const, label: 'Field Library', count: fields.length },
            { key: 'form_links' as const, label: 'Form Links', count: null },
            { key: 'submissions' as const, label: 'Submissions', count: submissions.length > 0 ? submissions.length : null },
          ].map(t => (
            <button key={t.key} onClick={() => setMainTab(t.key)}
              className={cn('flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2',
                mainTab === t.key ? 'bg-[#00263d] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
              {t.label}
              {t.count !== null && <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', mainTab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500')}>{t.count}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : mainTab === 'groups' ? (
          /* ── Groups Tab ── */
          groups.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg font-medium">No groups yet</p>
              <p className="text-sm mt-1">Create a group to organize clients and link intake forms.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map(g => {
                const linkedForm = forms.find(f => f.id === g.defaultFormId);
                return (
                <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900">{g.name}</h3>
                        {!g.isActive && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 uppercase">Inactive</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{g.description || 'No description'}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="font-mono bg-gray-50 px-2 py-0.5 rounded">/{g.slug}</span>
                        {linkedForm ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#c19962]/10 text-[#c19962] font-medium">
                            <FileText className="h-3 w-3" /> {linkedForm.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No form linked</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {linkedForm && (
                        <button onClick={() => copyUrl(`/intake/${g.slug}`)} title="Copy group intake URL"
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                          {copiedLink === `/intake/${g.slug}` ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      )}
                      <button onClick={() => setEditing({ ...g })} title="Edit group settings"
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(g.id)} title="Delete group"
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )
        ) : mainTab === 'forms' ? (
          /* ── Forms Tab ── */
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Forms can be reused across groups. When a form participates in a group workflow or field link, share the group-specific link so mappings and pre-filled fields work correctly.</p>
            {forms.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-lg font-medium">No forms yet</p>
                <p className="text-sm mt-1">Create a form to start collecting client intake data.</p>
                <button onClick={() => setEditingForm({ ...EMPTY_FORM })}
                  className="mt-4 h-9 px-4 rounded-lg bg-[#c19962] hover:bg-[#a8833e] text-[#00263d] text-sm font-semibold inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Create Form
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {forms.map(f => {
                  const linkedGroups = groups.filter(g => g.defaultFormId === f.id);
                  const fl = formLinksMap[f.id];
                  const asSource = fl?.asSource || [];
                  const asTarget = fl?.asTarget || [];
                  const compatibleGroups = Array.from(new Set([
                    ...linkedGroups.map(g => g.id),
                    ...asSource.map(link => link.groupId),
                    ...asTarget.map(link => link.groupId),
                  ]))
                    .map(groupId => groups.find(g => g.id === groupId))
                    .filter((group): group is ClientGroup => !!group);
                  const primaryGroup = compatibleGroups[0] || null;
                  const primarySharePath = buildCompatibleFormPath(f, primaryGroup);
                  return (
                    <div key={f.id} className={cn('bg-white rounded-xl border overflow-hidden transition-all',
                      f.isActive ? 'border-gray-200 hover:shadow-sm' : 'border-gray-100 opacity-60')}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-semibold text-gray-900">{f.name}</h3>
                              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium uppercase',
                                f.formConfig.length > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400')}>
                                {f.formConfig.length} step{f.formConfig.length !== 1 ? 's' : ''}
                              </span>
                              {f.stripeEnabled && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 uppercase">Stripe</span>}
                              {!f.isActive && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 uppercase">Inactive</span>}
                              {asSource.length > 0 && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                  <Link2 className="h-2.5 w-2.5" /> Source for {asSource.length} link{asSource.length > 1 ? 's' : ''}
                                </span>
                              )}
                              {asTarget.length > 0 && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <Lock className="h-2.5 w-2.5" /> Target for {asTarget.length} link{asTarget.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            {f.description && <p className="text-xs text-gray-400 mt-0.5">{f.description}</p>}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-[11px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                                {primarySharePath}
                              </span>
                              {linkedGroups.length > 0 && (
                                <span className="text-[11px] text-gray-500">
                                  Used by: {linkedGroups.map(g => g.name).join(', ')}
                                </span>
                              )}
                            </div>
                            {compatibleGroups.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                <p className="text-[11px] text-gray-500">
                                  Share a group-specific link for linked-field compatibility:
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {compatibleGroups.map(group => {
                                    const sharePath = buildCompatibleFormPath(f, group);
                                    return (
                                      <button
                                        key={`${f.id}-${group.id}`}
                                        onClick={() => copyUrl(sharePath)}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border border-gray-200 bg-gray-50 text-gray-600 hover:border-[#c19962] hover:text-[#00263d]"
                                      >
                                        {copiedLink === sharePath ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                        {group.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {/* Show linked field details */}
                            {asTarget.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {asTarget.map(link => (
                                  <div key={link.id} className="flex items-center gap-2 text-[11px] text-gray-500">
                                    <Link2 className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                    <span>
                                      From <span className="font-medium text-gray-700">{link.sourceFormName || 'source'}</span>
                                      {link.groupName && <> in <span className="font-medium text-gray-700">{link.groupName}</span></>}
                                      {': '}
                                      {link.fieldMappings.length > 0
                                        ? link.fieldMappings.map(m => {
                                          const meta = ALL_BLOCK_IDS.find(b => b.id === m.sourceBlockId);
                                          return meta?.label || m.sourceBlockId;
                                        }).join(', ')
                                        : 'no fields mapped'}
                                      {link.fieldMappings.some(m => m.isLocked) && (
                                        <span className="ml-1 text-amber-600 font-medium">(locked)</span>
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleToggleFormActive(f)}
                              title={f.isActive ? 'Set form inactive' : 'Set form active'}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                                f.isActive
                                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                              )}
                            >
                              {f.isActive ? 'Set Inactive' : 'Set Active'}
                            </button>
                            <a href={buildPreviewPath(primarySharePath)} target="_blank" rel="noopener noreferrer" title="Preview form"
                              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                            <button onClick={() => copyUrl(primarySharePath)} title="Copy shareable form URL"
                              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                              {copiedLink === primarySharePath ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </button>
                            <button onClick={() => setEditingForm({ ...f })}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#00263d] text-white hover:bg-[#003a5c] transition-colors">
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button onClick={() => handleDeleteForm(f.id)} title="Delete form"
                              className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : mainTab === 'field_library' ? (
          <FieldLibraryPanel fields={fields} forms={forms} loading={fieldsLoading} onRefresh={fetchFields} onRefreshForms={fetchForms} onBackfillLegacy={backfillLegacyFields} />
        ) : mainTab === 'form_links' ? (
          /* ── Form Links Tab ── */
          <FormLinksPanel
            groups={groups}
            forms={forms}
            selectedGroupId={formLinksGroupId}
            onSelectedGroupIdChange={setFormLinksGroupId}
            onLinksChanged={fetchAllFormLinks}
          />
        ) : mainTab === 'submissions' ? (
          /* ── Submissions Tab ── */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <select value={submissionsGroupFilter} onChange={e => setSubmissionsGroupFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]">
                <option value="all">All Groups</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button onClick={() => fetchSubmissions(submissionsGroupFilter)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"><RefreshCw className="h-4 w-4" /></button>
              {submissionsLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              <span className="ml-auto text-sm text-gray-400">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</span>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-lg font-medium">No submissions yet</p>
                <p className="text-sm mt-1">Form submissions will appear here once clients complete their forms.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {submissions.map(sub => {
                  const isExpanded = expandedSubmissionId === sub.id;
                  const isPaid = !!sub.stripe_payment_id;
                  const statusColors: Record<string, string> = {
                    pending_payment: 'bg-blue-100 text-blue-800',
                    submitted: 'bg-yellow-100 text-yellow-800',
                    reviewed: 'bg-green-100 text-green-800',
                    archived: 'bg-gray-100 text-gray-600',
                  };
                  const reviewStatusColors: Record<string, string> = {
                    pending: 'bg-orange-100 text-orange-800',
                    reviewed: 'bg-indigo-100 text-indigo-800',
                    published: 'bg-green-100 text-green-800',
                  };
                  const fd = sub.form_data;
                  const up = ((fd as Record<string, unknown>).userProfile || {}) as Record<string, unknown>;
                  const draft = getSubmissionDraft(sub);
                  const sourceLinks = allFormLinks.filter(link => link.groupId === sub.group_id && link.sourceFormId === sub.form_id);
                  const str = (v: unknown): string => String(v ?? '');

                  return (
                    <div key={sub.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <button onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#00263d]/10 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-[#00263d]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{sub.clientName || 'Unknown Client'}</p>
                            <p className="text-xs text-gray-400 truncate">{sub.clientEmail} {sub.group_name ? `· ${sub.group_name}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isPaid && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-[10px] font-medium text-green-700">
                              <DollarSign className="h-3 w-3" /> Paid
                            </span>
                          )}
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium capitalize', statusColors[sub.status] || 'bg-gray-100 text-gray-500')}>{sub.status}</span>
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium capitalize', reviewStatusColors[sub.review_status || 'pending'] || 'bg-gray-100 text-gray-500')}>
                            Review: {sub.review_status || 'pending'}
                          </span>
                          <span className="text-xs text-gray-400">{new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/30">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Status:</span>
                            {(['pending_payment', 'submitted', 'reviewed', 'archived'] as const).map(st => (
                              <button key={st} onClick={() => updateSubmissionStatus(sub.id, st)}
                                className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors capitalize',
                                  sub.status === st ? 'bg-[#00263d] text-white border-[#00263d]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#c19962]')}>
                                {st}
                              </button>
                            ))}
                            {sub.reviewed_at && (
                              <span className="text-[10px] text-gray-400 ml-auto">Reviewed {new Date(sub.reviewed_at).toLocaleDateString()}{sub.reviewed_by ? ` by ${sub.reviewed_by}` : ''}</span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Submission Info</h4>
                              <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-1.5 text-xs">
                                <div className="flex justify-between"><span className="text-gray-400">Submitted</span><span className="text-gray-700">{new Date(sub.submitted_at).toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Group</span><span className="text-gray-700">{sub.group_name || '—'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Payment</span><span className={isPaid ? 'text-green-600 font-medium' : 'text-gray-400'}>{isPaid ? `Paid (${sub.stripe_payment_id || ''})` : 'No payment required'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Review status</span><span className="text-gray-700 capitalize">{sub.review_status || 'pending'}</span></div>
                                {sub.published_at ? <div className="flex justify-between"><span className="text-gray-400">Published</span><span className="text-gray-700">{new Date(sub.published_at).toLocaleString()}</span></div> : null}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client Profile</h4>
                              <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-1.5 text-xs">
                                {up.name ? <div className="flex justify-between"><span className="text-gray-400">Name</span><span className="text-gray-700">{str(up.name)}</span></div> : null}
                                {sub.clientEmail ? <div className="flex justify-between"><span className="text-gray-400">Email</span><span className="text-gray-700">{sub.clientEmail}</span></div> : null}
                                {up.heightFt ? <div className="flex justify-between"><span className="text-gray-400">Height</span><span className="text-gray-700">{str(up.heightFt)}&apos;{str(up.heightIn || 0)}&quot;</span></div> : null}
                                {up.weight ? <div className="flex justify-between"><span className="text-gray-400">Weight</span><span className="text-gray-700">{str(up.weight)} lbs</span></div> : null}
                                {up.bodyFatPercentage ? <div className="flex justify-between"><span className="text-gray-400">Body Fat</span><span className="text-gray-700">{str(up.bodyFatPercentage)}%</span></div> : null}
                                {up.goalType ? <div className="flex justify-between"><span className="text-gray-400">Goal</span><span className="text-gray-700 capitalize">{str(up.goalType).replace('_', ' ')}</span></div> : null}
                                {up.goalWeight ? <div className="flex justify-between"><span className="text-gray-400">Goal Weight</span><span className="text-gray-700">{str(up.goalWeight)}</span></div> : null}
                                {up.goalBodyFatPercent ? <div className="flex justify-between"><span className="text-gray-400">Goal BF%</span><span className="text-gray-700">{str(up.goalBodyFatPercent)}%</span></div> : null}
                              </div>
                            </div>
                          </div>

                          {sub.pricing_snapshot ? (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pricing Snapshot</h4>
                              <div className="bg-white rounded-lg border border-gray-200 p-3 text-xs">
                                <pre className="overflow-auto max-h-40 text-[10px] text-gray-600">{JSON.stringify(sub.pricing_snapshot, null, 2)}</pre>
                              </div>
                            </div>
                          ) : null}

                          {sourceLinks.length > 0 ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reviewed Source Data</h4>
                                  <p className="text-[11px] text-gray-400 mt-1">Edit the reviewed values below, save them, then publish to linked player forms when ready.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => saveSubmissionReview(sub)}
                                    disabled={savingSubmissionId === sub.id}
                                    className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    {savingSubmissionId === sub.id ? 'Saving...' : 'Save Review'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => publishSubmission(sub)}
                                    disabled={publishingSubmissionId === sub.id}
                                    className="h-8 px-3 rounded-lg bg-[#c19962] text-[#00263d] text-xs font-semibold hover:bg-[#a8833e] disabled:opacity-50"
                                  >
                                    {publishingSubmissionId === sub.id ? 'Publishing...' : 'Publish To Linked Forms'}
                                  </button>
                                </div>
                              </div>

                              <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Reviewer Notes</label>
                                  <textarea
                                    value={draft.notes}
                                    onChange={e => setSubmissionDrafts(prev => ({
                                      ...prev,
                                      [sub.id]: {
                                        reviewedFormData: draft.reviewedFormData,
                                        notes: e.target.value,
                                      },
                                    }))}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962]"
                                    placeholder="Internal notes about the review or publish decision"
                                  />
                                </div>
                                <SubmissionReviewEditor
                                  formConfig={sub.form_config || []}
                                  value={draft.reviewedFormData}
                                  onChange={next => setSubmissionDrafts(prev => ({
                                    ...prev,
                                    [sub.id]: {
                                      reviewedFormData: next,
                                      notes: prev[sub.id]?.notes ?? sub.notes ?? '',
                                    },
                                  }))}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reviewed Data</h4>
                              <div className="bg-white rounded-lg border border-gray-200 p-3 text-xs text-gray-500">
                                This submission is not currently a linked source form, so there is nothing to publish to target forms.
                              </div>
                            </div>
                          )}

                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-400 hover:text-gray-600">View raw data</summary>
                            <pre className="mt-2 p-3 bg-gray-100 rounded-lg overflow-auto max-h-60 text-[10px] text-gray-600">{JSON.stringify(sub.form_data, null, 2)}</pre>
                          </details>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
