'use client';

import { ChevronDown, ChevronUp, Eye, EyeOff, Trash2 } from 'lucide-react';
import { getBlockMeta, getCompatibleLibraryFields } from '@/lib/form-library';
import type { FormBlockConfig, FormFieldAssignment, ReusableCustomField } from '@/types';

interface FormFieldAssignmentsEditorProps {
  formConfig: FormBlockConfig[];
  availableFields: ReusableCustomField[];
  value: FormFieldAssignment[];
  onChange: (assignments: FormFieldAssignment[]) => void;
}

function tempAssignmentId() {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function FormFieldAssignmentsEditor({
  formConfig,
  availableFields,
  value,
  onChange,
}: FormFieldAssignmentsEditorProps) {
  const activeFields = availableFields.filter(field => field.isActive);

  return (
    <div className="space-y-4">
      {formConfig.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-400 text-center">
          Add form steps first, then assign reusable fields to those steps here.
        </div>
      ) : formConfig.map((block, blockIndex) => {
        const blockAssignments = value
          .filter(assignment => assignment.blockInstanceId === block.instanceId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const blockLabel = block.label || getBlockMeta(block.id)?.label || block.id;
        const compatibleFields = getCompatibleLibraryFields(activeFields, block.id);
        const unassignedOptions = compatibleFields.filter(field => !blockAssignments.some(assignment => assignment.fieldId === field.id));

        return (
          <div key={block.instanceId || `${block.id}-${blockIndex}`} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{blockLabel}</p>
                <p className="text-[11px] text-gray-500">{blockAssignments.length} assigned field{blockAssignments.length !== 1 ? 's' : ''}</p>
              </div>
              <select
                value=""
                onChange={e => {
                  const fieldId = e.target.value;
                  if (!fieldId) return;
                  const field = activeFields.find(item => item.id === fieldId);
                  if (!field) return;
                  onChange([
                    ...value,
                    {
                      id: tempAssignmentId(),
                      formId: '',
                      blockId: block.id,
                      blockInstanceId: block.instanceId || `${block.id}-${blockIndex}`,
                      fieldId,
                      sortOrder: blockAssignments.length,
                      isVisible: true,
                      requiredOverride: null,
                      labelOverride: null,
                      helpTextOverride: null,
                      placeholderOverride: null,
                      field,
                      createdAt: '',
                      updatedAt: '',
                    },
                  ]);
                }}
                className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#c19962]"
              >
                <option value="">Assign reusable field...</option>
                {unassignedOptions.map(field => (
                  <option key={field.id} value={field.id}>{field.label} ({field.type})</option>
                ))}
              </select>
            </div>

            {blockAssignments.length === 0 ? (
              <p className="text-xs text-gray-400">No reusable fields assigned to this step yet.</p>
            ) : (
              <div className="space-y-2">
                {blockAssignments.map((assignment, index) => (
                  <div key={assignment.id} className="rounded-lg border border-gray-200 px-3 py-3 bg-gray-50 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 truncate">{assignment.labelOverride || assignment.field?.label || assignment.fieldId}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${assignment.field?.fieldKind === 'built_in' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                            {assignment.field?.fieldKind === 'built_in' ? 'Built-in' : 'Custom'}
                          </span>
                          {!assignment.isVisible && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase bg-gray-100 text-gray-500">Hidden</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500">
                          {assignment.field?.builtInKey || assignment.field?.type || 'field'}
                          {assignment.requiredOverride !== null && assignment.requiredOverride !== undefined
                            ? ` · ${assignment.requiredOverride ? 'Required override' : 'Optional override'}`
                            : assignment.field?.required ? ' · Required by default' : ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onChange(value.map(item => item.id === assignment.id ? { ...item, isVisible: !item.isVisible } : item))}
                        className={`p-1.5 rounded border ${assignment.isVisible ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-400'}`}
                        title={assignment.isVisible ? 'Visible on form' : 'Hidden on form'}
                      >
                        {assignment.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => {
                          const reordered = [...blockAssignments];
                          [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
                          onChange([
                            ...value.filter(item => item.blockInstanceId !== assignment.blockInstanceId),
                            ...reordered.map((item, reorderIndex) => ({ ...item, sortOrder: reorderIndex })),
                          ]);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-25"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index === blockAssignments.length - 1}
                        onClick={() => {
                          const reordered = [...blockAssignments];
                          [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
                          onChange([
                            ...value.filter(item => item.blockInstanceId !== assignment.blockInstanceId),
                            ...reordered.map((item, reorderIndex) => ({ ...item, sortOrder: reorderIndex })),
                          ]);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-25"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange(value.filter(item => item.id !== assignment.id))}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      <input
                        value={assignment.labelOverride || ''}
                        onChange={e => onChange(value.map(item => item.id === assignment.id ? { ...item, labelOverride: e.target.value || null } : item))}
                        className="h-8 rounded border border-gray-200 px-2 text-xs bg-white"
                        placeholder="Optional label override"
                      />
                      <input
                        value={assignment.placeholderOverride || ''}
                        onChange={e => onChange(value.map(item => item.id === assignment.id ? { ...item, placeholderOverride: e.target.value || null } : item))}
                        className="h-8 rounded border border-gray-200 px-2 text-xs bg-white"
                        placeholder="Optional placeholder override"
                      />
                    </div>

                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <input
                        value={assignment.helpTextOverride || ''}
                        onChange={e => onChange(value.map(item => item.id === assignment.id ? { ...item, helpTextOverride: e.target.value || null } : item))}
                        className="h-8 rounded border border-gray-200 px-2 text-xs bg-white"
                        placeholder="Optional help text override"
                      />
                      <select
                        value={assignment.requiredOverride === null || assignment.requiredOverride === undefined ? 'inherit' : assignment.requiredOverride ? 'required' : 'optional'}
                        onChange={e => {
                          const nextOverride =
                            e.target.value === 'inherit' ? null :
                            e.target.value === 'required';
                          onChange(value.map(item => item.id === assignment.id ? { ...item, requiredOverride: nextOverride } : item));
                        }}
                        className="h-8 rounded border border-gray-200 px-2 text-xs bg-white"
                      >
                        <option value="inherit">Inherit</option>
                        <option value="required">Required</option>
                        <option value="optional">Optional</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeFields.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 px-3 py-3 text-xs text-gray-500">
                Create reusable fields in the Field Library first, then assign them here.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
