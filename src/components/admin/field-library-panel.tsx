'use client';

import { FormFieldAssignmentsEditor } from '@/components/admin/form-field-assignments-editor';
import { getBlockMeta } from '@/lib/form-library';
import { cn } from '@/lib/utils';
import { hydrateFormAssignments, normalizeFormConfig } from '@/lib/form-fields';
import { buildAssignmentPayload } from '@/lib/unified-field-library';
import { Copy, ExternalLink, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormBlockConfig, FormFieldAssignment, IntakeForm, ReusableCustomField } from '@/types';

const EMPTY_FIELD: Partial<ReusableCustomField> = {
  label: '',
  name: '',
  type: 'text',
  required: false,
  placeholder: '',
  helpText: '',
  options: [],
  isActive: true,
  fieldKind: 'custom',
};

interface FieldLibraryPanelProps {
  fields: ReusableCustomField[];
  forms: IntakeForm[];
  loading: boolean;
  onRefresh: () => Promise<void> | void;
  onRefreshForms: () => Promise<void> | void;
  onBackfillLegacy: () => Promise<void> | void;
}

export function FieldLibraryPanel({ fields, forms, loading, onRefresh, onRefreshForms, onBackfillLegacy }: FieldLibraryPanelProps) {
  const [editingField, setEditingField] = useState<Partial<ReusableCustomField> | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedFormId, setSelectedFormId] = useState('');
  const [formDraft, setFormDraft] = useState<{ formConfig: FormBlockConfig[]; fieldAssignments: FormFieldAssignment[] } | null>(null);
  const [savingForm, setSavingForm] = useState(false);

  const filteredFields = useMemo(() => fields.filter(field =>
    !filter
    || field.label.toLowerCase().includes(filter.toLowerCase())
    || field.name.toLowerCase().includes(filter.toLowerCase())
    || field.type.toLowerCase().includes(filter.toLowerCase())
  ), [fields, filter]);
  const selectedForm = useMemo(() => forms.find(form => form.id === selectedFormId) || null, [forms, selectedFormId]);

  useEffect(() => {
    if (!selectedForm && forms.length > 0 && !selectedFormId) {
      setSelectedFormId(forms[0].id);
    }
  }, [forms, selectedForm, selectedFormId]);

  useEffect(() => {
    if (!selectedForm) {
      setFormDraft(null);
      return;
    }
    setFormDraft({
      formConfig: normalizeFormConfig((selectedForm.formConfig || []) as FormBlockConfig[]),
      fieldAssignments: hydrateFormAssignments(
        normalizeFormConfig((selectedForm.formConfig || []) as FormBlockConfig[]),
        (selectedForm.fieldAssignments || []).map(assignment => ({ ...assignment }))
      ),
    });
  }, [selectedForm]);

  async function saveField() {
    if (!editingField?.label?.trim()) return;
    setSaving(true);
    try {
      const isNew = !editingField.id;
      const res = await fetch(isNew ? '/api/fields' : `/api/fields/${editingField.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingField),
      });
      if (res.ok) {
        setEditingField(null);
        await onRefresh();
        await onRefreshForms();
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(field: ReusableCustomField) {
    await fetch(`/api/fields/${field.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !field.isActive }),
    });
    await onRefresh();
    await onRefreshForms();
  }

  async function deleteField(field: ReusableCustomField) {
    if (!confirm(`Delete "${field.label}" permanently?`)) return;
    await fetch(`/api/fields/${field.id}`, { method: 'DELETE' });
    await onRefresh();
    await onRefreshForms();
  }

  async function saveSelectedFormConfig() {
    if (!selectedForm || !formDraft) return;
    setSavingForm(true);
    try {
      const formRes = await fetch(`/api/forms/${selectedForm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formConfig: formDraft.formConfig }),
      });
      if (!formRes.ok) return;

      const assignmentsRes = await fetch(`/api/forms/${selectedForm.id}/fields`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replaceAll: true,
          assignments: buildAssignmentPayload(formDraft.fieldAssignments),
        }),
      });
      if (!assignmentsRes.ok) return;

      await onRefreshForms();
      await onRefresh();
    } finally {
      setSavingForm(false);
    }
  }

  function buildPreviewPath(form: IntakeForm) {
    return `/intake/${form.slug}?preview=1`;
  }

  function renderFieldPreview(field: Partial<ReusableCustomField>) {
    const label = field.label || 'Field label';
    const placeholder = field.placeholder || 'Preview placeholder';
    const helpText = field.helpText;
    const options = field.options || [];
    switch (field.type) {
      case 'textarea':
        return (
          <>
            <textarea
              rows={3}
              placeholder={placeholder}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base resize-none bg-white"
            />
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
          </>
        );
      case 'number':
        return (
          <>
            <input type="text" inputMode="decimal" placeholder={placeholder} className="w-full h-12 px-4 rounded-xl border border-gray-200 text-base bg-white" />
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
          </>
        );
      case 'date':
        return (
          <>
            <input type="date" className="w-full h-12 px-4 rounded-xl border border-gray-200 text-base bg-white" />
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
          </>
        );
      case 'select':
        return (
          <>
            <select className="w-full h-12 px-4 rounded-xl border border-gray-200 text-base bg-white">
              <option>{options[0] || 'Select an option'}</option>
              {options.slice(1).map(option => <option key={option}>{option}</option>)}
            </select>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
          </>
        );
      case 'multiselect':
        return (
          <>
            <div className="flex flex-wrap gap-2">
              {(options.length > 0 ? options : ['Option A', 'Option B', 'Option C']).map(option => (
                <span key={option} className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-sm text-gray-700">{option}</span>
              ))}
            </div>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
          </>
        );
      case 'toggle':
        return (
          <>
            <div className="flex items-center gap-3">
              <button type="button" className="relative w-10 h-6 rounded-full bg-[#c19962]">
                <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full translate-x-4" />
              </button>
              <span className="text-sm text-gray-700">{label}</span>
            </div>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
          </>
        );
      case 'text':
      default:
        return (
          <>
            <input type="text" placeholder={placeholder} className="w-full h-12 px-4 rounded-xl border border-gray-200 text-base bg-white" />
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
          </>
        );
    }
  }

  if (editingField) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{editingField.id ? 'Edit Field' : 'New Field'}</h2>
            <p className="text-sm text-gray-500 mt-1">Reusable fields can be assigned to any existing or new form.</p>
          </div>
          <button onClick={() => setEditingField(null)} className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Back</button>
        </div>

        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Public Label *</label>
              <input value={editingField.label || ''} onChange={e => setEditingField(prev => ({ ...prev, label: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962]" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Internal Name</label>
              <input value={editingField.name || ''} onChange={e => setEditingField(prev => ({ ...prev, name: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962]" placeholder="Optional stable internal name" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Field Type</label>
              <select
                value={editingField.type || 'text'}
                onChange={e => setEditingField(prev => ({ ...prev, type: e.target.value as ReusableCustomField['type'], options: ['select', 'multiselect'].includes(e.target.value) ? (prev?.options || []) : [] }))}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]"
              >
                <option value="text">Short Text</option>
                <option value="textarea">Long Text</option>
                <option value="number">Number</option>
                <option value="select">Dropdown</option>
                <option value="multiselect">Multi-Select</option>
                <option value="toggle">Yes / No</option>
                <option value="date">Date</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <button type="button" onClick={() => setEditingField(prev => ({ ...prev, required: !prev?.required }))}
                className={`relative w-10 h-6 rounded-full transition-colors ${editingField.required ? 'bg-[#c19962]' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${editingField.required ? 'translate-x-4' : ''}`} />
              </button>
              <span className="text-sm text-gray-600">Required by default</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Placeholder</label>
            <input value={editingField.placeholder || ''} onChange={e => setEditingField(prev => ({ ...prev, placeholder: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962]" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Help Text</label>
            <textarea value={editingField.helpText || ''} onChange={e => setEditingField(prev => ({ ...prev, helpText: e.target.value }))} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962]" />
          </div>

          {(editingField.type === 'select' || editingField.type === 'multiselect') && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Options</label>
              <textarea
                value={(editingField.options || []).join('\n')}
                onChange={e => setEditingField(prev => ({ ...prev, options: e.target.value.split('\n').map(item => item.trim()).filter(Boolean) }))}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962]"
                placeholder="One option per line"
              />
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Live Form Preview</p>
              <p className="text-[11px] text-gray-500 mt-1">This is how the field will render inside the intake form.</p>
            </div>
            <div className="rounded-2xl bg-white border border-gray-200 p-4 space-y-2">
              {editingField.type !== 'toggle' && (
                <label className="block text-sm font-medium text-gray-700">
                  {editingField.label || 'Field label'}
                  {editingField.required ? ' *' : ''}
                </label>
              )}
              {renderFieldPreview(editingField)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setEditingField(null)} className="h-10 px-5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={saveField} disabled={saving || !editingField.label?.trim()}
              className="h-10 px-6 rounded-lg bg-[#c19962] hover:bg-[#a8833e] text-[#00263d] text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving...' : editingField.id ? 'Save Field' : 'Create Field'}
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Current Form Fields</h2>
            <p className="text-sm text-gray-500 mt-1">Edit the actual field assignments on a specific form, including built-in fields, visibility, ordering, and form-specific overrides.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedFormId}
              onChange={e => setSelectedFormId(e.target.value)}
              className="h-10 min-w-[260px] rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]"
            >
              <option value="">Choose a form...</option>
              {forms.map(form => (
                <option key={form.id} value={form.id}>{form.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={saveSelectedFormConfig}
              disabled={!selectedForm || !formDraft || savingForm}
              className="h-10 px-4 rounded-lg bg-[#c19962] hover:bg-[#a8833e] text-[#00263d] text-sm font-semibold disabled:opacity-50"
            >
              {savingForm ? 'Saving...' : 'Save Form Fields'}
            </button>
            {selectedForm && (
              <a
                href={buildPreviewPath(selectedForm)}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 inline-flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" /> Preview Form
              </a>
            )}
          </div>
        </div>

        {!selectedForm || !formDraft ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-400 text-center">
            Select a form to manage the fields that currently exist on it.
          </div>
        ) : (
          <div className="space-y-4">
            {formDraft.formConfig.map((block, index) => {
              const meta = getBlockMeta(block.id);
              return (
                <div key={block.instanceId || `${block.id}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{block.label || meta?.label || block.id}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{meta?.description || 'Form block'}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Step Title Override</label>
                      <input
                        value={block.label || ''}
                        onChange={e => setFormDraft(prev => prev ? ({
                          ...prev,
                          formConfig: prev.formConfig.map(item => item.instanceId === block.instanceId ? { ...item, label: e.target.value || undefined } : item),
                        }) : prev)}
                        className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962] bg-white"
                        placeholder={meta?.label || 'Step title'}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                      <input
                        value={block.description || ''}
                        onChange={e => setFormDraft(prev => prev ? ({
                          ...prev,
                          formConfig: prev.formConfig.map(item => item.instanceId === block.instanceId ? { ...item, description: e.target.value || undefined } : item),
                        }) : prev)}
                        className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962] bg-white"
                        placeholder="Optional description"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Help Text</label>
                      <input
                        value={block.helpText || ''}
                        onChange={e => setFormDraft(prev => prev ? ({
                          ...prev,
                          formConfig: prev.formConfig.map(item => item.instanceId === block.instanceId ? { ...item, helpText: e.target.value || undefined } : item),
                        }) : prev)}
                        className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962] bg-white"
                        placeholder="Optional help text"
                      />
                    </div>
                  </div>

                  {meta && meta.fields.length > 0 && (
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Block Default Fields</p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        {meta.fields.length} built-in field{meta.fields.length !== 1 ? 's' : ''} available for this block. Visibility and overrides are managed below in the unified field assignment editor.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Form Field Assignments</h3>
                <p className="text-xs text-gray-500 mt-1">Built-in and custom fields are managed together here.</p>
              </div>
              <FormFieldAssignmentsEditor
                formConfig={formDraft.formConfig}
                availableFields={fields}
                value={formDraft.fieldAssignments}
                onChange={assignments => setFormDraft(prev => prev ? ({ ...prev, fieldAssignments: assignments }) : prev)}
              />
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Field Library</h2>
          <p className="text-sm text-gray-500 mt-1">Create reusable fields once, then assign them to forms from this page or the Forms tab.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onBackfillLegacy()} className="h-10 px-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 inline-flex items-center gap-2">
            Backfill Legacy Fields
          </button>
          <button onClick={() => onRefresh()} className="h-10 px-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 inline-flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setEditingField({ ...EMPTY_FIELD })} className="h-10 px-4 rounded-lg bg-[#c19962] hover:bg-[#a8833e] text-[#00263d] text-sm font-semibold inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Field
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962]"
          placeholder="Search by label, name, or type..."
        />
      </div>

      <div className="space-y-3">
        {filteredFields.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            No fields yet. Create your first reusable field.
          </div>
        ) : filteredFields.map(field => {
          const usedByForms = forms.filter(form => (form.fieldAssignments || []).some(assignment => assignment.fieldId === field.id));
          return (
            <div key={field.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-900">{field.label}</h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 uppercase">{field.type}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${field.fieldKind === 'built_in' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                      {field.fieldKind === 'built_in' ? 'Built-in' : 'Custom'}
                    </span>
                    {!field.isActive && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 uppercase">Inactive</span>}
                    {field.required && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 uppercase">Required Default</span>}
                  </div>
                  <p className="text-[11px] font-mono text-gray-400 mt-1">{field.name} · {field.id}</p>
                  {field.builtInKey && <p className="text-[11px] text-gray-500 mt-1">Built-in key: <span className="font-mono">{field.builtInKey}</span></p>}
                  {field.helpText && <p className="text-sm text-gray-500 mt-2">{field.helpText}</p>}
                  <p className="text-[11px] text-gray-500 mt-2">Used by {usedByForms.length} form{usedByForms.length !== 1 ? 's' : ''}</p>
                  {usedByForms.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {usedByForms.map(form => (
                        <span key={form.id} className="px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-[11px] text-gray-600">{form.name}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEditingField({ ...field, options: field.options || [] })}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    title="Edit field"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingField({ ...field, id: undefined, name: `${field.name}_copy`, label: `${field.label} Copy`, fieldKind: 'custom', builtInKey: undefined })}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    title="Duplicate field"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleActive(field)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${field.isActive ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-green-200 bg-green-50 text-green-700'}`}
                    title={field.isActive ? 'Set inactive' : 'Set active'}
                  >
                    {field.isActive ? 'Set Inactive' : 'Set Active'}
                  </button>
                  {field.fieldKind !== 'built_in' && (
                    <button
                      onClick={() => deleteField(field)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
                      title="Delete field"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
