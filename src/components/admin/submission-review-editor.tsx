'use client';

import { useEffect, useMemo, useState } from 'react';
import { ALL_BLOCK_IDS } from '@/lib/form-library';
import { getBlockPayloadPaths, getNestedValue } from '@/lib/field-mapping-utils';
import type { CustomField, FormBlockConfig } from '@/types';

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

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function setNestedValue(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let current: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = current[part];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function buildBlockPayload(block: FormBlockConfig, value: Record<string, unknown>) {
  const meta = ALL_BLOCK_IDS.find(item => item.id === block.id);
  if (!meta) return {};

  const payload: Record<string, unknown> = {};
  for (const field of meta.fields) {
    const paths = getBlockPayloadPaths(block.id, field.key);
    for (const path of paths) {
      payload[path] = getNestedValue(value, path);
    }
  }
  return payload;
}

function applyBlockPayload(block: FormBlockConfig, currentValue: Record<string, unknown>, nextPayload: Record<string, unknown>) {
  const next = cloneData(currentValue);
  const meta = ALL_BLOCK_IDS.find(item => item.id === block.id);
  if (!meta) return next;

  for (const field of meta.fields) {
    const paths = getBlockPayloadPaths(block.id, field.key);
    for (const path of paths) {
      if (Object.prototype.hasOwnProperty.call(nextPayload, path)) {
        setNestedValue(next, path, nextPayload[path]);
      }
    }
  }
  return next;
}

function BlockJsonEditor({
  block,
  value,
  onChange,
}: {
  block: FormBlockConfig;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const payload = useMemo(() => buildBlockPayload(block, value), [block, value]);
  const [draft, setDraft] = useState(JSON.stringify(payload, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(JSON.stringify(payload, null, 2));
    setError(null);
  }, [payload]);

  return (
    <div className="space-y-2">
      <textarea
        value={draft}
        onChange={e => {
          const nextDraft = e.target.value;
          setDraft(nextDraft);
          try {
            const parsed = JSON.parse(nextDraft) as Record<string, unknown>;
            onChange(applyBlockPayload(block, value, parsed));
            setError(null);
          } catch {
            setError('Invalid JSON for this block.');
          }
        }}
        rows={6}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#c19962]"
      />
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function renderCustomQuestionInput(
  field: CustomField,
  value: unknown,
  onChange: (next: unknown) => void,
) {
  switch (field.type) {
    case 'textarea':
      return <textarea value={(value as string) || ''} onChange={e => onChange(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962]" />;
    case 'number':
      return <input type="number" value={(value as string) || ''} onChange={e => onChange(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962]" />;
    case 'date':
      return <input type="date" value={(value as string) || ''} onChange={e => onChange(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962]" />;
    case 'select':
      return (
        <select value={(value as string) || ''} onChange={e => onChange(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]">
          <option value="">Select...</option>
          {(field.options || []).map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    case 'multiselect': {
      const selected = Array.isArray(value) ? value as string[] : [];
      return (
        <div className="flex flex-wrap gap-2">
          {(field.options || []).map(option => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(selected.includes(option) ? selected.filter(item => item !== option) : [...selected, option])}
              className={`px-2 py-1 rounded-md border text-xs ${selected.includes(option) ? 'border-[#c19962] bg-[#c19962]/10 text-[#00263d]' : 'border-gray-200 text-gray-500'}`}
            >
              {option}
            </button>
          ))}
        </div>
      );
    }
    case 'toggle':
      return (
        <button type="button" onClick={() => onChange(!value)} className={`relative w-10 h-6 rounded-full transition-colors ${value ? 'bg-[#c19962]' : 'bg-gray-300'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-4' : ''}`} />
        </button>
      );
    case 'text':
    default:
      return <input type="text" value={(value as string) || ''} onChange={e => onChange(e.target.value)} className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c19962]" />;
  }
}

export function SubmissionReviewEditor({
  formConfig,
  value,
  onChange,
}: {
  formConfig: FormBlockConfig[];
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const weeklyActivity = (((value.userProfile || {}) as Record<string, unknown>).weeklyActivity as Array<Array<Record<string, unknown>>>) || Array.from({ length: 7 }, () => []);

  return (
    <div className="space-y-4">
      {formConfig.map((block, index) => {
        const customFields = block.customFields || [];
        const blockLabel = block.label || ALL_BLOCK_IDS.find(item => item.id === block.id)?.label || block.id;

        return (
          <div key={`${block.id}-${index}`} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">{blockLabel}</p>
              {block.description && <p className="text-xs text-gray-500 mt-0.5">{block.description}</p>}
            </div>

            {block.id === 'team_activity' ? (
              <div className="space-y-3">
                {DAYS.map((day, dayIdx) => {
                  const bouts = weeklyActivity[dayIdx] || [];
                  return (
                    <div key={day} className="rounded-lg border border-gray-200 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                        <span className="text-xs font-semibold text-gray-700">{day}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = cloneData(value);
                            const up = ((next.userProfile || {}) as Record<string, unknown>);
                            const nextWeekly = (((up.weeklyActivity as Array<Array<Record<string, unknown>>>) || Array.from({ length: 7 }, () => [])).map(dayBouts => [...dayBouts]));
                            nextWeekly[dayIdx] = [...(nextWeekly[dayIdx] || []), { type: 'Resistance Training', duration: 60, intensity: 'medium', timeOfDay: 'morning' }];
                            up.weeklyActivity = nextWeekly;
                            next.userProfile = up;
                            onChange(next);
                          }}
                          className="text-[11px] text-[#c19962] font-medium"
                        >
                          + Add
                        </button>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {bouts.length === 0 ? (
                          <div className="px-3 py-2 text-[11px] text-gray-400">Rest day</div>
                        ) : bouts.map((bout, boutIdx) => (
                          <div key={boutIdx} className="grid gap-2 px-3 py-2 md:grid-cols-5">
                            <select
                              value={(bout.type as string) || 'Resistance Training'}
                              onChange={e => {
                                const next = cloneData(value);
                                const up = next.userProfile as Record<string, unknown>;
                                const nextWeekly = (up.weeklyActivity as Array<Array<Record<string, unknown>>>).map(dayBouts => [...dayBouts]);
                                nextWeekly[dayIdx][boutIdx] = { ...nextWeekly[dayIdx][boutIdx], type: e.target.value };
                                up.weeklyActivity = nextWeekly;
                                onChange(next);
                              }}
                              className="h-8 rounded border border-gray-200 px-2 text-xs bg-white"
                            >
                              {ACTIVITY_TYPES.map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                            <select
                              value={(bout.timeOfDay as string) || 'morning'}
                              onChange={e => {
                                const next = cloneData(value);
                                const up = next.userProfile as Record<string, unknown>;
                                const nextWeekly = (up.weeklyActivity as Array<Array<Record<string, unknown>>>).map(dayBouts => [...dayBouts]);
                                nextWeekly[dayIdx][boutIdx] = { ...nextWeekly[dayIdx][boutIdx], timeOfDay: e.target.value };
                                up.weeklyActivity = nextWeekly;
                                onChange(next);
                              }}
                              className="h-8 rounded border border-gray-200 px-2 text-xs bg-white"
                            >
                              {TIME_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                            <input
                              type="number"
                              value={String(bout.duration || '')}
                              onChange={e => {
                                const next = cloneData(value);
                                const up = next.userProfile as Record<string, unknown>;
                                const nextWeekly = (up.weeklyActivity as Array<Array<Record<string, unknown>>>).map(dayBouts => [...dayBouts]);
                                nextWeekly[dayIdx][boutIdx] = { ...nextWeekly[dayIdx][boutIdx], duration: parseInt(e.target.value || '0', 10) || 0 };
                                up.weeklyActivity = nextWeekly;
                                onChange(next);
                              }}
                              className="h-8 rounded border border-gray-200 px-2 text-xs"
                              placeholder="Minutes"
                            />
                            <select
                              value={(bout.intensity as string) || 'medium'}
                              onChange={e => {
                                const next = cloneData(value);
                                const up = next.userProfile as Record<string, unknown>;
                                const nextWeekly = (up.weeklyActivity as Array<Array<Record<string, unknown>>>).map(dayBouts => [...dayBouts]);
                                nextWeekly[dayIdx][boutIdx] = { ...nextWeekly[dayIdx][boutIdx], intensity: e.target.value };
                                up.weeklyActivity = nextWeekly;
                                onChange(next);
                              }}
                              className="h-8 rounded border border-gray-200 px-2 text-xs bg-white"
                            >
                              {['low', 'medium', 'high'].map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const next = cloneData(value);
                                const up = next.userProfile as Record<string, unknown>;
                                const nextWeekly = (up.weeklyActivity as Array<Array<Record<string, unknown>>>).map(dayBouts => [...dayBouts]);
                                nextWeekly[dayIdx] = nextWeekly[dayIdx].filter((_, idx2) => idx2 !== boutIdx);
                                up.weeklyActivity = nextWeekly;
                                onChange(next);
                              }}
                              className="h-8 rounded border border-red-200 text-red-600 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : block.id === 'custom_questions' ? (
              <div className="space-y-3">
                {customFields.map(field => {
                  const customAnswers = ((value.customAnswers || {}) as Record<string, unknown>);
                  return (
                    <div key={field.id}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                      {renderCustomQuestionInput(field, customAnswers[field.id], nextValue => {
                        const next = cloneData(value);
                        const nextCustomAnswers = ((next.customAnswers || {}) as Record<string, unknown>);
                        nextCustomAnswers[field.id] = nextValue;
                        next.customAnswers = nextCustomAnswers;
                        onChange(next);
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              <BlockJsonEditor block={block} value={value} onChange={onChange} />
            )}
          </div>
        );
      })}
    </div>
  );
}
