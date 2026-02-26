'use client';

import { useState, useCallback } from 'react';
import { GripVertical, Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, ChevronRight, Settings2, Type, MessageSquare, HelpCircle, ListPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormBlockConfig, FormBlockId, CustomField, CustomFieldType } from '@/types';

// ── Block metadata with available fields per block ──────────────────────────

interface BlockMeta {
  id: FormBlockId;
  label: string;
  description: string;
  fields: { key: string; label: string }[];
}

const ALL_BLOCK_IDS: BlockMeta[] = [
  { id: 'personal_info', label: 'Personal Info', description: 'Name, gender, age/DOB, height, weight',
    fields: [
      { key: 'name', label: 'Full Name' },
      { key: 'gender', label: 'Gender' },
      { key: 'age', label: 'Age / Date of Birth' },
      { key: 'height', label: 'Height' },
      { key: 'weight', label: 'Weight' },
    ] },
  { id: 'body_composition', label: 'Body Composition', description: 'Body fat source, body fat %',
    fields: [
      { key: 'bodyFatSource', label: 'Body Fat Source (estimate/measured)' },
      { key: 'bodyFatPercent', label: 'Body Fat Percentage' },
    ] },
  { id: 'lifestyle', label: 'Lifestyle', description: 'Wake/sleep, work type/schedule, activity level',
    fields: [
      { key: 'wakeTime', label: 'Wake Time' },
      { key: 'bedTime', label: 'Bed Time' },
      { key: 'workType', label: 'Work Type / Schedule' },
      { key: 'activityLevel', label: 'Daily Activity Level' },
    ] },
  { id: 'training', label: 'Training', description: 'Workouts/week, type, duration, intensity, time',
    fields: [
      { key: 'workoutsPerWeek', label: 'Workouts Per Week' },
      { key: 'workoutType', label: 'Default Workout Type' },
      { key: 'duration', label: 'Default Duration' },
      { key: 'intensity', label: 'Default Intensity' },
      { key: 'timeSlot', label: 'Default Time Slot' },
    ] },
  { id: 'meals', label: 'Meal Structure', description: 'Meals/day, snacks, fasting, peri-workout prefs',
    fields: [
      { key: 'mealsPerDay', label: 'Meals Per Day' },
      { key: 'snacksPerDay', label: 'Snacks Per Day' },
      { key: 'fasting', label: 'Fasting Protocol / Feeding Window' },
      { key: 'energyDistribution', label: 'Energy Distribution' },
      { key: 'periWorkout', label: 'Pre/Post Workout Nutrition' },
    ] },
  { id: 'supplements', label: 'Supplements', description: 'Supplement list',
    fields: [
      { key: 'supplements', label: 'Supplement Checklist' },
      { key: 'customSupplement', label: 'Custom Supplement Entry' },
    ] },
  { id: 'diet_preferences', label: 'Diet Preferences', description: 'Restrictions, allergies, protein/carb/fat prefs',
    fields: [
      { key: 'restrictions', label: 'Dietary Restrictions' },
      { key: 'allergies', label: 'Allergies' },
      { key: 'proteinPrefs', label: 'Preferred Proteins' },
      { key: 'carbPrefs', label: 'Preferred Carbs' },
      { key: 'fatPrefs', label: 'Preferred Fats' },
    ] },
  { id: 'cuisine_foods', label: 'Cuisine & Foods', description: 'Cuisine styles, foods to emphasize/avoid',
    fields: [
      { key: 'cuisines', label: 'Cuisine Preferences' },
      { key: 'foodsToEmphasize', label: 'Foods to Emphasize' },
      { key: 'foodsToAvoid', label: 'Foods to Avoid' },
    ] },
  { id: 'practical_flavor', label: 'Practical & Flavor', description: 'Variety, cooking time, budget, spice, flavors',
    fields: [
      { key: 'variety', label: 'Variety Level' },
      { key: 'cookingTime', label: 'Cooking Time' },
      { key: 'budget', label: 'Budget' },
      { key: 'spice', label: 'Spice Tolerance' },
      { key: 'flavors', label: 'Flavor Profiles' },
    ] },
  { id: 'goals_notes', label: 'Goals & Notes', description: 'Health goals, performance goals, notes',
    fields: [
      { key: 'healthGoals', label: 'Health Goals' },
      { key: 'performanceGoals', label: 'Performance Goals' },
      { key: 'notes', label: 'Additional Notes' },
    ] },
  { id: 'team_personal', label: 'Team: Personal', description: 'First/Middle/Last name, email, phone, age/DOB',
    fields: [
      { key: 'firstName', label: 'First Name' },
      { key: 'middleName', label: 'Middle Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'ageDOB', label: 'Age / Date of Birth' },
    ] },
  { id: 'team_units', label: 'Team: Units', description: 'Imperial or metric unit preference',
    fields: [
      { key: 'unitSystem', label: 'Unit System Toggle' },
    ] },
  { id: 'team_body_comp', label: 'Team: Body Comp', description: 'Height, weight, BF%, derived FM/FFM',
    fields: [
      { key: 'height', label: 'Height' },
      { key: 'weight', label: 'Weight' },
      { key: 'bodyFat', label: 'Body Fat %' },
      { key: 'fatMass', label: 'Fat Mass (derived)' },
      { key: 'fatFreeMass', label: 'Fat-Free Mass (derived)' },
    ] },
  { id: 'team_goals', label: 'Team: Goals', description: 'Goal type, target weight, target BF% with constraints',
    fields: [
      { key: 'goalType', label: 'Goal Type' },
      { key: 'goalWeight', label: 'Goal Weight' },
      { key: 'goalBF', label: 'Goal Body Fat %' },
      { key: 'goalFM', label: 'Goal Fat Mass' },
      { key: 'goalFFM', label: 'Goal Fat-Free Mass' },
    ] },
  { id: 'team_rmr', label: 'Team: RMR', description: 'Resting metabolic rate (estimated or measured)',
    fields: [
      { key: 'rmrToggle', label: 'Estimated vs. Measured Toggle' },
      { key: 'measuredRMR', label: 'Measured RMR Input' },
    ] },
  { id: 'team_activity', label: 'Team: Activity Grid', description: 'Sun-Sat weekly activity with up to 3 bouts/day',
    fields: [
      { key: 'activityGrid', label: 'Weekly Activity Grid' },
    ] },
  { id: 'custom_questions', label: 'Custom Questions', description: 'Add your own questions (text, select, number, etc.)',
    fields: [] },
];

const FIELD_TYPE_OPTIONS: { value: CustomFieldType; label: string; desc: string }[] = [
  { value: 'text', label: 'Short Text', desc: 'Single-line text input' },
  { value: 'textarea', label: 'Long Text', desc: 'Multi-line text area' },
  { value: 'number', label: 'Number', desc: 'Numeric input' },
  { value: 'select', label: 'Dropdown', desc: 'Pick one from a list' },
  { value: 'multiselect', label: 'Multi-Select', desc: 'Pick multiple from a list' },
  { value: 'toggle', label: 'Yes / No', desc: 'Toggle switch' },
  { value: 'date', label: 'Date', desc: 'Date picker' },
];

export function getBlockMeta(id: FormBlockId) {
  return ALL_BLOCK_IDS.find(b => b.id === id);
}

// ── Custom Field Editor ─────────────────────────────────────────────────────

function CustomFieldEditor({ field, onChange, onRemove }: {
  field: CustomField;
  onChange: (patch: Partial<CustomField>) => void;
  onRemove: () => void;
}) {
  const [optionDraft, setOptionDraft] = useState('');
  const needsOptions = field.type === 'select' || field.type === 'multiselect';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <input
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className="w-full h-8 px-2 rounded border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#c19962]"
            placeholder="Question text *" />
          <div className="flex items-center gap-2">
            <select
              value={field.type}
              onChange={(e) => onChange({ type: e.target.value as CustomFieldType, options: undefined })}
              className="h-8 px-2 rounded border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#c19962]">
              {FIELD_TYPE_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <span className="text-[10px] text-gray-400">{FIELD_TYPE_OPTIONS.find(t => t.value === field.type)?.desc}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
          <button type="button" onClick={() => onChange({ required: !field.required })}
            className={cn('px-2 py-0.5 rounded text-[10px] font-medium border transition-colors',
              field.required ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500')}>
            {field.required ? 'Req' : 'Opt'}
          </button>
          <button type="button" onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <input
        value={field.placeholder || ''}
        onChange={(e) => onChange({ placeholder: e.target.value || undefined })}
        className="w-full h-7 px-2 rounded border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#c19962]"
        placeholder="Placeholder text (optional)" />

      {needsOptions && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Options</label>
          {(field.options || []).map((opt, oi) => (
            <div key={oi} className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 w-4 text-right">{oi + 1}.</span>
              <input
                value={opt}
                onChange={(e) => {
                  const next = [...(field.options || [])];
                  next[oi] = e.target.value;
                  onChange({ options: next });
                }}
                className="flex-1 h-7 px-2 rounded border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#c19962]" />
              <button type="button" onClick={() => {
                const next = (field.options || []).filter((_, i) => i !== oi);
                onChange({ options: next });
              }} className="p-0.5 text-gray-400 hover:text-red-500"><X className="h-3 w-3" /></button>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 w-4 text-right">+</span>
            <input
              value={optionDraft}
              onChange={(e) => setOptionDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && optionDraft.trim()) {
                  onChange({ options: [...(field.options || []), optionDraft.trim()] });
                  setOptionDraft('');
                }
              }}
              className="flex-1 h-7 px-2 rounded border border-dashed border-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-[#c19962]"
              placeholder="Type option and press Enter" />
            <button type="button" disabled={!optionDraft.trim()} onClick={() => {
              if (optionDraft.trim()) {
                onChange({ options: [...(field.options || []), optionDraft.trim()] });
                setOptionDraft('');
              }
            }} className="px-2 h-7 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40">Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

interface FormConfigBuilderProps {
  value: FormBlockConfig[];
  onChange: (config: FormBlockConfig[]) => void;
}

export function FormConfigBuilder({ value, onChange }: FormConfigBuilderProps) {
  const activeIds = new Set(value.map(b => b.id));
  // custom_questions can be added multiple times, so don't filter it from available
  const available = ALL_BLOCK_IDS.filter(b => b.id === 'custom_questions' || !activeIds.has(b.id));
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const moveUp = useCallback((idx: number) => {
    if (idx <= 0) return;
    const next = [...value];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
    setExpandedIdx(idx - 1);
  }, [value, onChange]);

  const moveDown = useCallback((idx: number) => {
    if (idx >= value.length - 1) return;
    const next = [...value];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
    setExpandedIdx(idx + 1);
  }, [value, onChange]);

  const remove = useCallback((idx: number) => {
    if (expandedIdx === idx) setExpandedIdx(null);
    onChange(value.filter((_, i) => i !== idx));
  }, [value, onChange, expandedIdx]);

  const toggleRequired = useCallback((idx: number) => {
    const next = [...value];
    next[idx] = { ...next[idx], required: !next[idx].required };
    onChange(next);
  }, [value, onChange]);

  const updateBlock = useCallback((idx: number, patch: Partial<FormBlockConfig>) => {
    const next = [...value];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }, [value, onChange]);

  const toggleField = useCallback((idx: number, fieldKey: string) => {
    const next = [...value];
    const hidden = new Set(next[idx].hiddenFields || []);
    if (hidden.has(fieldKey)) {
      hidden.delete(fieldKey);
    } else {
      hidden.add(fieldKey);
    }
    next[idx] = { ...next[idx], hiddenFields: hidden.size > 0 ? Array.from(hidden) : undefined };
    onChange(next);
  }, [value, onChange]);

  const addBlock = useCallback((id: FormBlockId) => {
    const newBlock: FormBlockConfig = { id, required: false };
    if (id === 'custom_questions') {
      newBlock.label = 'Custom Questions';
      newBlock.customFields = [];
    }
    onChange([...value, newBlock]);
    setExpandedIdx(value.length);
  }, [value, onChange]);

  const addCustomField = useCallback((blockIdx: number) => {
    const next = [...value];
    const fields = [...(next[blockIdx].customFields || [])];
    fields.push({
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: '',
      type: 'text',
      required: false,
    });
    next[blockIdx] = { ...next[blockIdx], customFields: fields };
    onChange(next);
  }, [value, onChange]);

  const updateCustomField = useCallback((blockIdx: number, fieldIdx: number, patch: Partial<CustomField>) => {
    const next = [...value];
    const fields = [...(next[blockIdx].customFields || [])];
    fields[fieldIdx] = { ...fields[fieldIdx], ...patch };
    next[blockIdx] = { ...next[blockIdx], customFields: fields };
    onChange(next);
  }, [value, onChange]);

  const removeCustomField = useCallback((blockIdx: number, fieldIdx: number) => {
    const next = [...value];
    const fields = (next[blockIdx].customFields || []).filter((_, i) => i !== fieldIdx);
    next[blockIdx] = { ...next[blockIdx], customFields: fields.length > 0 ? fields : undefined };
    onChange(next);
  }, [value, onChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">Active Form Steps</div>
        <span className="text-xs text-gray-400">{value.length} step{value.length !== 1 ? 's' : ''}</span>
      </div>

      {value.length === 0 && (
        <div className="text-sm text-gray-400 italic py-6 text-center border-2 border-dashed rounded-lg">
          No steps configured. Add steps from the available blocks below, or add a &ldquo;Custom Questions&rdquo; step to create your own.
        </div>
      )}

      <div className="space-y-2">
        {value.map((block, idx) => {
          const meta = ALL_BLOCK_IDS.find(b => b.id === block.id);
          const isExpanded = expandedIdx === idx;
          const isCustomBlock = block.id === 'custom_questions';
          const displayLabel = block.label || meta?.label || block.id;
          const hasCustomLabel = !!block.label && block.label !== meta?.label;
          const hasDescription = !!block.description;
          const hasHelpText = !!block.helpText;
          const hiddenCount = (block.hiddenFields || []).length;
          const totalFields = meta?.fields.length || 0;
          const visibleFields = totalFields - hiddenCount;
          const customFieldCount = (block.customFields || []).length;
          const hasCustomizations = hasCustomLabel || hasDescription || hasHelpText || hiddenCount > 0 || customFieldCount > 0;

          return (
            <div key={`${block.id}-${idx}`} className={cn('bg-white rounded-lg border shadow-sm transition-all',
              isExpanded ? 'border-[#c19962] ring-1 ring-[#c19962]/20' : 'border-gray-200')}>
              {/* Step header row */}
              <div className="flex items-center gap-2 p-3">
                <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0 cursor-grab" />
                <button type="button" onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="flex-1 min-w-0 text-left flex items-center gap-2">
                  <span className="text-xs font-bold text-[#c19962] w-5 flex-shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900 truncate">{displayLabel}</span>
                      {isCustomBlock && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-600 uppercase">Custom</span>
                      )}
                      {hasCustomizations && !isCustomBlock && (
                        <Settings2 className="h-3 w-3 text-[#c19962] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {isCustomBlock
                        ? `${customFieldCount} question${customFieldCount !== 1 ? 's' : ''}`
                        : meta?.description}
                    </p>
                  </div>
                  <ChevronRight className={cn('h-4 w-4 text-gray-300 flex-shrink-0 transition-transform', isExpanded && 'rotate-90')} />
                </button>
                <button type="button" onClick={() => toggleRequired(idx)}
                  className={cn('px-2 py-0.5 rounded text-xs font-medium border transition-colors whitespace-nowrap',
                    block.required ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500')}>
                  {block.required ? 'Required' : 'Optional'}
                </button>
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0}
                    className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-25"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => moveDown(idx)} disabled={idx === value.length - 1}
                    className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-25"><ChevronDown className="h-3.5 w-3.5" /></button>
                </div>
                <button type="button" onClick={() => remove(idx)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>

              {/* Expanded editing panel */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4 bg-gray-50/50 space-y-4">
                  {/* Step title */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
                      <Type className="h-3 w-3" /> Step Title
                    </label>
                    <input
                      value={block.label ?? ''}
                      onChange={(e) => updateBlock(idx, { label: e.target.value || undefined })}
                      className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962] bg-white"
                      placeholder={meta?.label || 'Step title'} />
                    {!isCustomBlock && (
                      <p className="text-[10px] text-gray-400 mt-1">Leave blank to use default: &ldquo;{meta?.label}&rdquo;</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3" /> Step Description
                    </label>
                    <textarea
                      value={block.description || ''}
                      onChange={(e) => updateBlock(idx, { description: e.target.value || undefined })}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962] bg-white"
                      placeholder="Optional description shown at the top of this step..." />
                  </div>

                  {/* Help text */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
                      <HelpCircle className="h-3 w-3" /> Help Text
                    </label>
                    <textarea
                      value={block.helpText || ''}
                      onChange={(e) => updateBlock(idx, { helpText: e.target.value || undefined })}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#c19962] bg-white"
                      placeholder="Optional tip or instruction shown below the fields..." />
                  </div>

                  {/* Field visibility toggles (predefined blocks only) */}
                  {meta && meta.fields.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1.5">
                        <Eye className="h-3 w-3" /> Built-in Fields
                        <span className="text-gray-400 font-normal ml-1">{visibleFields}/{totalFields} shown</span>
                      </label>
                      <div className="space-y-1">
                        {meta.fields.map(f => {
                          const isHidden = (block.hiddenFields || []).includes(f.key);
                          return (
                            <button key={f.key} type="button" onClick={() => toggleField(idx, f.key)}
                              className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors text-sm',
                                isHidden
                                  ? 'border-gray-200 bg-gray-100 text-gray-400 line-through'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-[#c19962]')}>
                              {isHidden
                                ? <EyeOff className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                : <Eye className="h-3.5 w-3.5 text-[#c19962] flex-shrink-0" />}
                              {f.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Custom Questions Editor */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1.5">
                      <ListPlus className="h-3 w-3" />
                      {isCustomBlock ? 'Questions' : 'Additional Questions'}
                      <span className="text-gray-400 font-normal ml-1">
                        {customFieldCount} question{customFieldCount !== 1 ? 's' : ''}
                      </span>
                    </label>

                    {!isCustomBlock && customFieldCount === 0 && (
                      <p className="text-[10px] text-gray-400 mb-2">
                        You can add custom questions that will appear after the built-in fields in this step.
                      </p>
                    )}

                    {customFieldCount > 0 && (
                      <div className="space-y-2 mb-3">
                        {(block.customFields || []).map((field, fi) => (
                          <CustomFieldEditor
                            key={field.id}
                            field={field}
                            onChange={(patch) => updateCustomField(idx, fi, patch)}
                            onRemove={() => removeCustomField(idx, fi)}
                          />
                        ))}
                      </div>
                    )}

                    <button type="button" onClick={() => addCustomField(idx)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#c19962] hover:bg-[#c19962]/5 transition-colors text-sm text-gray-500 hover:text-[#c19962]">
                      <Plus className="h-3.5 w-3.5" /> Add Question
                    </button>
                  </div>

                  {/* Summary */}
                  {hasCustomizations && (
                    <div className="bg-[#c19962]/5 border border-[#c19962]/20 rounded-lg px-3 py-2">
                      <p className="text-[11px] text-gray-600">
                        <span className="font-medium text-[#c19962]">Customizations:</span>{' '}
                        {[
                          hasCustomLabel && 'Custom title',
                          hasDescription && 'Description',
                          hasHelpText && 'Help text',
                          hiddenCount > 0 && `${hiddenCount} field${hiddenCount !== 1 ? 's' : ''} hidden`,
                          customFieldCount > 0 && `${customFieldCount} custom question${customFieldCount !== 1 ? 's' : ''}`,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Available blocks to add */}
      {available.length > 0 && (
        <>
          <div className="text-sm font-medium text-gray-700 mt-6">Available Blocks</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {available.map((block, ai) => (
              <button key={`${block.id}-${ai}`} type="button" onClick={() => addBlock(block.id)}
                className={cn('flex items-center gap-2 p-3 rounded-lg border border-dashed transition-colors text-left',
                  block.id === 'custom_questions'
                    ? 'border-purple-300 hover:border-purple-500 hover:bg-purple-50'
                    : 'border-gray-300 hover:border-[#c19962] hover:bg-[#c19962]/5')}>
                <Plus className={cn('h-4 w-4 flex-shrink-0',
                  block.id === 'custom_questions' ? 'text-purple-400' : 'text-gray-400')} />
                <div>
                  <span className={cn('text-sm font-medium',
                    block.id === 'custom_questions' ? 'text-purple-700' : 'text-gray-700')}>{block.label}</span>
                  <p className="text-xs text-gray-400">{block.description}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
