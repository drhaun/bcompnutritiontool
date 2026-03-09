'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp, Link2, Lock, Unlock, Check, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_BLOCK_IDS, type BlockMeta } from '@/lib/form-library';
import type { ClientGroup, IntakeForm, GroupFormLink, FieldMapping, FormBlockConfig, FormBlockId } from '@/types';

interface FormLinksPanelProps {
  groups: ClientGroup[];
  forms: IntakeForm[];
  selectedGroupId: string;
  onSelectedGroupIdChange: (id: string) => void;
  onLinksChanged?: () => void;
}

function generateId() {
  return `map-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getCommonBlocks(sourceConfig: FormBlockConfig[], targetConfig: FormBlockConfig[]): BlockMeta[] {
  const sourceIds = new Set(sourceConfig.map(b => b.id));
  const targetIds = new Set(targetConfig.map(b => b.id));
  return ALL_BLOCK_IDS.filter(b => sourceIds.has(b.id) && targetIds.has(b.id) && b.fields.length > 0);
}

export function FormLinksPanel({ groups, forms, selectedGroupId, onSelectedGroupIdChange, onLinksChanged }: FormLinksPanelProps) {
  const [links, setLinks] = useState<GroupFormLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newSourceFormId, setNewSourceFormId] = useState('');
  const [newTargetFormId, setNewTargetFormId] = useState('');
  const [newMappings, setNewMappings] = useState<FieldMapping[]>([]);

  const [fillingLinkId, setFillingLinkId] = useState<string | null>(null);
  const [fillSaving, setFillSaving] = useState(false);

  const fetchLinks = useCallback(async (groupId: string) => {
    if (!groupId) { setLinks([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/form-links`);
      if (res.ok) {
        const data = await res.json();
        setLinks(data.formLinks || []);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed to load form links (${res.status})`);
      }
    } catch {
      setError('Network error loading form links');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedGroupId) fetchLinks(selectedGroupId);
    else { setLinks([]); setError(null); }
  }, [selectedGroupId, fetchLinks]);

  const sourceForm = forms.find(f => f.id === newSourceFormId);
  const targetForm = forms.find(f => f.id === newTargetFormId);

  const newCommonBlocks = useMemo(() => {
    if (!sourceForm || !targetForm) return [];
    return getCommonBlocks(sourceForm.formConfig, targetForm.formConfig);
  }, [sourceForm, targetForm]);

  const resetCreateForm = () => {
    setCreating(false);
    setNewSourceFormId('');
    setNewTargetFormId('');
    setNewMappings([]);
  };

  const handleCreateLink = useCallback(async () => {
    if (!selectedGroupId || !newSourceFormId || !newTargetFormId) return;
    if (newMappings.length === 0) {
      setError('Please select at least one field mapping before creating.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}/form-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceFormId: newSourceFormId, targetFormId: newTargetFormId, fieldMappings: newMappings }),
      });
      if (res.ok) {
        const data = await res.json();
        resetCreateForm();
        await fetchLinks(selectedGroupId);
        if (data.formLink?.id) setExpandedLinkId(data.formLink.id);
        onLinksChanged?.();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed to create link (${res.status})`);
      }
    } catch {
      setError('Network error creating form link');
    }
    setSaving(false);
  }, [selectedGroupId, newSourceFormId, newTargetFormId, newMappings, fetchLinks]);

  const handleDeleteLink = useCallback(async (linkId: string) => {
    if (!confirm('Delete this form link? Players will no longer receive pre-populated data from it.')) return;
    setError(null);
    const res = await fetch(`/api/groups/${selectedGroupId}/form-links/${linkId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to delete link');
    }
    fetchLinks(selectedGroupId);
    onLinksChanged?.();
  }, [selectedGroupId, fetchLinks, onLinksChanged]);

  const handleSaveMappings = useCallback(async (linkId: string, mappings: FieldMapping[]) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}/form-links/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldMappings: mappings }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save mappings');
      }
      fetchLinks(selectedGroupId);
      onLinksChanged?.();
    } catch {
      setError('Network error saving mappings');
    }
    setSaving(false);
  }, [selectedGroupId, fetchLinks, onLinksChanged]);

  const handleFillSource = useCallback(async (linkId: string, formData: Record<string, unknown>) => {
    setFillSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}/fill-source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formLinkId: linkId, formData }),
      });
      if (res.ok) {
        setFillingLinkId(null);
        fetchLinks(selectedGroupId);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save source data');
      }
    } catch {
      setError('Network error saving source data');
    }
    setFillSaving(false);
  }, [selectedGroupId, fetchLinks]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Link a coach (source) form to a player (target) form within a group. When someone completes the source form
        using that group&apos;s shared link, the mapped fields will auto-populate on the target form for that group.
      </p>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs font-medium">Dismiss</button>
        </div>
      )}

      {/* Group selector */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Select Group</label>
        <select value={selectedGroupId} onChange={e => { onSelectedGroupIdChange(e.target.value); setError(null); }}
          className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]">
          <option value="">Choose a group...</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {selectedGroupId && loading && (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
      )}

      {selectedGroupId && !loading && (
        <>
          {links.length === 0 && !creating ? (
            <div className="text-center py-10 text-gray-400">
              <Link2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-base font-medium">No form links yet</p>
              <p className="text-sm mt-1">Create a link to connect a coach form to a player form.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map(link => (
                <FormLinkCard
                  key={link.id}
                  link={link}
                  forms={forms}
                  expanded={expandedLinkId === link.id}
                  onToggleExpand={() => setExpandedLinkId(expandedLinkId === link.id ? null : link.id)}
                  onDelete={() => handleDeleteLink(link.id)}
                  onSaveMappings={(m) => handleSaveMappings(link.id, m)}
                  saving={saving}
                  filling={fillingLinkId === link.id}
                  onStartFill={() => setFillingLinkId(link.id)}
                  onFillSource={(data) => handleFillSource(link.id, data)}
                  fillSaving={fillSaving}
                  onCancelFill={() => setFillingLinkId(null)}
                />
              ))}
            </div>
          )}

          {/* Create new link */}
          {creating ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
              <h3 className="text-sm font-semibold text-gray-700">New Form Link</h3>

              {/* Step 1: Select forms */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Source Form (Coach fills)</label>
                  <select value={newSourceFormId} onChange={e => { setNewSourceFormId(e.target.value); setNewMappings([]); }}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]">
                    <option value="">Select form...</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Target Form (Players receive)</label>
                  <select value={newTargetFormId} onChange={e => { setNewTargetFormId(e.target.value); setNewMappings([]); }}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]">
                    <option value="">Select form...</option>
                    {forms.filter(f => f.id !== newSourceFormId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Step 2: Field mappings (appears once both forms are selected) */}
              {newSourceFormId && newTargetFormId && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Select Fields to Link</h4>
                  <p className="text-xs text-gray-400 mb-3">Choose which blocks/fields from the source form should auto-populate the target form. Locked fields cannot be edited by the player.</p>
                  {newCommonBlocks.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">No matching blocks between the selected forms. Both forms must share at least one block type.</p>
                  ) : (
                    <FieldMappingBuilder
                      commonBlocks={newCommonBlocks}
                      mappings={newMappings}
                      onChange={setNewMappings}
                    />
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={handleCreateLink} disabled={saving || !newSourceFormId || !newTargetFormId || newMappings.length === 0}
                  className="h-9 px-4 rounded-lg bg-[#c19962] hover:bg-[#a8833e] text-[#00263d] text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Link
                </button>
                <button onClick={resetCreateForm}
                  className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setCreating(true); setError(null); }}
              className="h-10 px-4 rounded-lg bg-[#c19962] hover:bg-[#a8833e] text-[#00263d] text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Form Link
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Reusable Field Mapping Builder ──────────────────────────────────────

interface FieldMappingBuilderProps {
  commonBlocks: BlockMeta[];
  mappings: FieldMapping[];
  onChange: (mappings: FieldMapping[]) => void;
}

function FieldMappingBuilder({ commonBlocks, mappings, onChange }: FieldMappingBuilderProps) {
  const handleToggleBlock = (blockId: FormBlockId, enabled: boolean) => {
    if (enabled) {
      onChange([...mappings, { id: generateId(), sourceBlockId: blockId, targetBlockId: blockId, fields: null, isLocked: true }]);
    } else {
      onChange(mappings.filter(m => m.sourceBlockId !== blockId));
    }
  };

  const handleToggleLock = (blockId: FormBlockId) => {
    onChange(mappings.map(m =>
      m.sourceBlockId === blockId ? { ...m, isLocked: !m.isLocked } : m
    ));
  };

  const handleToggleField = (blockId: FormBlockId, fieldKey: string) => {
    const existing = mappings.find(m => m.sourceBlockId === blockId);
    if (!existing) {
      onChange([...mappings, { id: generateId(), sourceBlockId: blockId, targetBlockId: blockId, fields: [fieldKey], isLocked: true }]);
      return;
    }
    if (existing.fields === null) {
      const block = ALL_BLOCK_IDS.find(b => b.id === blockId);
      const allKeys = block?.fields.map(f => f.key) || [];
      const newFields = allKeys.filter(k => k !== fieldKey);
      if (newFields.length === 0) { onChange(mappings.filter(m => m.sourceBlockId !== blockId)); return; }
      onChange(mappings.map(m => m.sourceBlockId === blockId ? { ...m, fields: newFields } : m));
      return;
    }
    const hasField = existing.fields.includes(fieldKey);
    if (hasField) {
      const newFields = existing.fields.filter(k => k !== fieldKey);
      if (newFields.length === 0) { onChange(mappings.filter(m => m.sourceBlockId !== blockId)); return; }
      onChange(mappings.map(m => m.sourceBlockId === blockId ? { ...m, fields: newFields } : m));
    } else {
      const block = ALL_BLOCK_IDS.find(b => b.id === blockId);
      const allKeys = block?.fields.map(f => f.key) || [];
      const newFields = [...existing.fields, fieldKey];
      if (newFields.length === allKeys.length) {
        onChange(mappings.map(m => m.sourceBlockId === blockId ? { ...m, fields: null } : m));
      } else {
        onChange(mappings.map(m => m.sourceBlockId === blockId ? { ...m, fields: newFields } : m));
      }
    }
  };

  const isBlockMapped = (blockId: FormBlockId) => mappings.some(m => m.sourceBlockId === blockId);
  const isFieldMapped = (blockId: FormBlockId, fieldKey: string) => {
    const m = mappings.find(m => m.sourceBlockId === blockId);
    if (!m) return false;
    return m.fields === null || m.fields.includes(fieldKey);
  };
  const isBlockLocked = (blockId: FormBlockId) => mappings.find(m => m.sourceBlockId === blockId)?.isLocked ?? true;

  return (
    <div className="space-y-2">
      {commonBlocks.map(block => {
        const mapped = isBlockMapped(block.id);
        const locked = isBlockLocked(block.id);
        return (
          <div key={block.id} className={cn('rounded-lg border p-3', mapped ? 'border-[#c19962]/30 bg-[#c19962]/5' : 'border-gray-200')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => handleToggleBlock(block.id, !mapped)}
                  className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                    mapped ? 'bg-[#c19962] border-[#c19962]' : 'border-gray-300 hover:border-[#c19962]')}>
                  {mapped && <Check className="h-3 w-3 text-white" />}
                </button>
                <div>
                  <span className="text-sm font-medium text-gray-700">{block.label}</span>
                  <span className="text-xs text-gray-400 ml-2">{block.description}</span>
                </div>
              </div>
              {mapped && (
                <button onClick={() => handleToggleLock(block.id)} title={locked ? 'Players cannot edit' : 'Players can edit'}
                  className={cn('flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                    locked ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-500 border border-gray-200')}>
                  {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  {locked ? 'Locked' : 'Editable'}
                </button>
              )}
            </div>
            {mapped && block.fields.length > 1 && (
              <div className="mt-2 ml-8 flex flex-wrap gap-2">
                {block.fields.map(field => {
                  const active = isFieldMapped(block.id, field.key);
                  return (
                    <button key={field.key} onClick={() => handleToggleField(block.id, field.key)}
                      className={cn('px-2 py-1 rounded-md text-xs transition-colors border',
                        active ? 'bg-[#c19962]/20 border-[#c19962]/40 text-[#00263d] font-medium' : 'bg-white border-gray-200 text-gray-400')}>
                      {field.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Form Link Card ──────────────────────────────────────────────────────

interface FormLinkCardProps {
  link: GroupFormLink;
  forms: IntakeForm[];
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onSaveMappings: (mappings: FieldMapping[]) => void;
  saving: boolean;
  filling: boolean;
  onStartFill: () => void;
  onFillSource: (data: Record<string, unknown>) => void;
  fillSaving: boolean;
  onCancelFill: () => void;
}

function FormLinkCard({ link, forms, expanded, onToggleExpand, onDelete, onSaveMappings, saving, filling, onStartFill, onFillSource, fillSaving, onCancelFill }: FormLinkCardProps) {
  const sourceForm = forms.find(f => f.id === link.sourceFormId);
  const targetForm = forms.find(f => f.id === link.targetFormId);
  const [localMappings, setLocalMappings] = useState<FieldMapping[]>(link.fieldMappings);
  const [dirty, setDirty] = useState(false);

  const commonBlocks = useMemo(() => {
    if (!sourceForm || !targetForm) return [];
    return getCommonBlocks(sourceForm.formConfig, targetForm.formConfig);
  }, [sourceForm, targetForm]);

  const handleMappingsChange = useCallback((m: FieldMapping[]) => {
    setLocalMappings(m);
    setDirty(true);
  }, []);

  const hasFilled = !!link.sourceData;
  const mappedCount = localMappings.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={onToggleExpand}>
        <div className="flex items-center gap-3 min-w-0">
          <Link2 className="h-4 w-4 text-[#c19962] flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <span className="truncate">{link.sourceFormName || sourceForm?.name || 'Source'}</span>
              <span className="text-gray-400">&rarr;</span>
              <span className="truncate">{link.targetFormName || targetForm?.name || 'Target'}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
              <span>{mappedCount} block{mappedCount !== 1 ? 's' : ''} linked</span>
              {hasFilled ? (
                <span className="flex items-center gap-1 text-green-600"><Check className="h-3 w-3" /> Source filled</span>
              ) : (
                <span className="text-amber-600">Source not filled</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete link"
            className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-200 px-4 py-4 space-y-5">
          {/* Field mappings */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Field Mappings</h4>
            {commonBlocks.length === 0 ? (
              <p className="text-xs text-gray-400">No matching blocks between the source and target forms.</p>
            ) : (
              <FieldMappingBuilder
                commonBlocks={commonBlocks}
                mappings={localMappings}
                onChange={handleMappingsChange}
              />
            )}
            {dirty && (
              <button onClick={() => { onSaveMappings(localMappings); setDirty(false); }} disabled={saving}
                className="mt-3 h-9 px-4 rounded-lg bg-[#c19962] hover:bg-[#a8833e] text-[#00263d] text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save Mappings
              </button>
            )}
          </div>

          {/* Fill source form */}
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Source Form Data</h4>
            {hasFilled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  <Check className="h-4 w-4 flex-shrink-0" />
                  <span>Source data filled{link.sourceFilledAt ? ` on ${new Date(link.sourceFilledAt).toLocaleDateString()}` : ''}</span>
                </div>
                <SourceDataPreview data={link.sourceData as Record<string, unknown>} mappings={localMappings} />
                <div className="flex gap-2">
                  <button onClick={onStartFill}
                    className="h-8 px-3 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
                    <RefreshCw className="h-3 w-3" /> Re-fill Source Form
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Complete the source form through its shared link to populate this automatically, or use the button below to seed test data manually.
                </p>
                <button onClick={onStartFill}
                  className="h-9 px-4 rounded-lg bg-[#00263d] hover:bg-[#001a2b] text-white text-sm font-semibold flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" /> Fill Source Form
                </button>
              </div>
            )}
          </div>

          {/* Inline fill source */}
          {filling && sourceForm && (
            <div className="border-t border-gray-100 pt-4">
              <InlineSourceFill
                sourceForm={sourceForm}
                existingData={link.sourceData as Record<string, unknown> | null}
                onSubmit={(data) => onFillSource(data)}
                onCancel={onCancelFill}
                saving={fillSaving}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Source Data Preview ──────────────────────────────────────────────────

function SourceDataPreview({ data, mappings }: { data: Record<string, unknown>; mappings: FieldMapping[] }) {
  if (!data || mappings.length === 0) return null;
  const up = (data.userProfile || {}) as Record<string, unknown>;

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-gray-400 hover:text-gray-600">Preview mapped data</summary>
      <div className="mt-2 space-y-2">
        {mappings.map(m => {
          const block = ALL_BLOCK_IDS.find(b => b.id === m.sourceBlockId);
          if (!block) return null;
          return (
            <div key={m.id} className="bg-gray-50 rounded-lg p-2">
              <p className="font-medium text-gray-600 mb-1">{block.label} {m.isLocked ? '(locked)' : '(editable)'}</p>
              {m.sourceBlockId === 'team_activity' && Array.isArray(up.weeklyActivity) ? (
                <div className="space-y-0.5">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                    const bouts = (up.weeklyActivity as unknown[][])[i] as { type?: string; duration?: number; intensity?: string }[] || [];
                    return (
                      <div key={day} className="flex gap-2">
                        <span className="text-gray-400 w-8">{day}</span>
                        <span className="text-gray-700">{bouts.length === 0 ? 'Rest' : bouts.map(b => `${b.type} (${b.duration}m, ${b.intensity})`).join('; ')}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500">Data present</p>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}

// ── Inline Source Fill ───────────────────────────────────────────────────

interface InlineSourceFillProps {
  sourceForm: IntakeForm;
  existingData: Record<string, unknown> | null;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
}

function InlineSourceFill({ sourceForm, existingData, onSubmit, onCancel, saving }: InlineSourceFillProps) {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const ACTIVITY_TYPES = ['Resistance Training', 'Sport Practice', 'Conditioning', 'Cardio', 'Yoga/Mobility', 'Other'];
  const TIME_OPTIONS = [
    { value: 'early_am', label: 'Early AM (5-7)' },
    { value: 'morning', label: 'Morning (7-10)' },
    { value: 'midday', label: 'Midday (10-1)' },
    { value: 'afternoon', label: 'Afternoon (1-4)' },
    { value: 'evening', label: 'Evening (4-7)' },
    { value: 'night', label: 'Night (7+)' },
  ];

  const hasActivityBlock = sourceForm.formConfig.some(b => b.id === 'team_activity');

  const existingUp = (existingData?.userProfile || {}) as Record<string, unknown>;
  const [weeklyActivity, setWeeklyActivity] = useState<{ type: string; duration: number; intensity: string; timeOfDay: string }[][]>(
    () => {
      const existing = existingUp.weeklyActivity as { type: string; duration: number; intensity: string; timeOfDay: string }[][] | undefined;
      return existing || Array.from({ length: 7 }, () => []);
    }
  );

  const addBout = (dayIdx: number) => {
    setWeeklyActivity(prev => prev.map((d, i) =>
      i === dayIdx && d.length < 3
        ? [...d, { type: 'Resistance Training', duration: 60, intensity: 'medium', timeOfDay: 'morning' }]
        : d
    ));
  };

  const removeBout = (dayIdx: number, boutIdx: number) => {
    setWeeklyActivity(prev => prev.map((d, i) =>
      i === dayIdx ? d.filter((_, bi) => bi !== boutIdx) : d
    ));
  };

  const updateBout = (dayIdx: number, boutIdx: number, field: string, value: string | number) => {
    setWeeklyActivity(prev => prev.map((d, i) =>
      i === dayIdx ? d.map((b, bi) => bi === boutIdx ? { ...b, [field]: value } : b) : d
    ));
  };

  const handleSubmit = () => {
    const formData: Record<string, unknown> = {
      ...(existingData || {}),
      userProfile: {
        ...(existingUp || {}),
        weeklyActivity,
      },
    };
    onSubmit(formData);
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-4">
      <h4 className="text-sm font-semibold text-gray-700">Fill Source Form Data</h4>
      <p className="text-xs text-gray-500">Enter the data that will be pushed to all players in this group.</p>

      {hasActivityBlock && (
        <div className="space-y-3">
          <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Weekly Activity Grid</h5>
          {DAYS.map((day, dayIdx) => {
            const bouts = weeklyActivity[dayIdx];
            return (
              <div key={day} className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">{day}</span>
                    {bouts.length > 0 && <span className="text-[10px] text-gray-400">{bouts.length} session{bouts.length > 1 ? 's' : ''}</span>}
                  </div>
                  {bouts.length < 3 && (
                    <button type="button" onClick={() => addBout(dayIdx)} className="text-[10px] text-[#c19962] font-medium hover:text-[#a8833e]">+ Add</button>
                  )}
                </div>
                {bouts.length === 0 ? (
                  <div className="px-3 py-2 text-[10px] text-gray-400 text-center">Rest day</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {bouts.map((bout, bIdx) => (
                      <div key={bIdx} className="px-3 py-2 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <select value={bout.type} onChange={e => updateBout(dayIdx, bIdx, 'type', e.target.value)}
                            className="flex-1 h-7 px-1.5 rounded border border-gray-200 text-[10px] bg-white focus:outline-none focus:ring-1 focus:ring-[#c19962]">
                            {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <select value={bout.timeOfDay} onChange={e => updateBout(dayIdx, bIdx, 'timeOfDay', e.target.value)}
                            className="w-24 h-7 px-1.5 rounded border border-gray-200 text-[10px] bg-white focus:outline-none focus:ring-1 focus:ring-[#c19962]">
                            {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          <input type="number" value={bout.duration} onChange={e => updateBout(dayIdx, bIdx, 'duration', parseInt(e.target.value) || 0)}
                            className="w-14 h-7 px-1.5 rounded border border-gray-200 text-[10px] text-center focus:outline-none focus:ring-1 focus:ring-[#c19962]"
                            placeholder="min" />
                          <select value={bout.intensity} onChange={e => updateBout(dayIdx, bIdx, 'intensity', e.target.value)}
                            className="w-16 h-7 px-1.5 rounded border border-gray-200 text-[10px] bg-white focus:outline-none focus:ring-1 focus:ring-[#c19962]">
                            {['low', 'medium', 'high'].map(i => <option key={i} value={i}>{i[0].toUpperCase() + i.slice(1)}</option>)}
                          </select>
                          <button type="button" onClick={() => removeBout(dayIdx, bIdx)} className="text-gray-400 hover:text-red-500 text-[10px]">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={handleSubmit} disabled={saving}
          className="h-9 px-4 rounded-lg bg-[#c19962] hover:bg-[#a8833e] text-[#00263d] text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save Source Data
        </button>
        <button onClick={onCancel}
          className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  );
}
