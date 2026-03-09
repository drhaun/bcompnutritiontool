import { getBlockMeta, getBuiltInFieldRegistry } from '@/lib/form-library';
import type { CustomField, FormBlockConfig, FormBlockId, FormFieldAssignment, ReusableCustomField, ResolvedFormField } from '@/types';

function slugifyName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function createBlockInstanceId(blockId: FormBlockId, index: number) {
  return `${blockId}__${index + 1}`;
}

export function normalizeFormConfig(formConfig: FormBlockConfig[]): FormBlockConfig[] {
  return formConfig.map((block, index) => ({
    ...block,
    instanceId: block.instanceId || createBlockInstanceId(block.id, index),
  }));
}

export function getFormCustomFields(formConfig: Array<{ customFields?: CustomField[] }>): CustomField[] {
  return formConfig.flatMap(block => block.customFields || []);
}

export function getNumberCustomFields(customFields: CustomField[]): CustomField[] {
  return customFields.filter(field => field.type === 'number');
}

export function reusableFieldToCustomField(
  field: ReusableCustomField,
  requiredOverride?: boolean | null,
  overrides?: { labelOverride?: string | null; helpTextOverride?: string | null; placeholderOverride?: string | null },
): CustomField {
  return {
    id: field.id,
    label: overrides?.labelOverride || field.label,
    type: field.type,
    required: requiredOverride ?? field.required ?? false,
    placeholder: overrides?.placeholderOverride ?? field.placeholder,
    helpText: overrides?.helpTextOverride ?? field.helpText,
    options: field.options,
    fieldKind: field.fieldKind,
    builtInKey: field.builtInKey,
    supportedBlockIds: field.supportedBlockIds,
    dataKeys: field.dataKeys,
  };
}

function assignmentToResolvedField(assignment: FormFieldAssignment): ResolvedFormField | null {
  if (!assignment.field) return null;
  const customField = reusableFieldToCustomField(assignment.field, assignment.requiredOverride, {
    labelOverride: assignment.labelOverride,
    helpTextOverride: assignment.helpTextOverride,
    placeholderOverride: assignment.placeholderOverride,
  });
  return {
    ...customField,
    fieldId: assignment.fieldId,
    fieldKind: assignment.field.fieldKind,
    builtInKey: assignment.field.builtInKey,
    blockId: assignment.blockId,
    blockInstanceId: assignment.blockInstanceId,
    sortOrder: assignment.sortOrder,
    isVisible: assignment.isVisible !== false,
    assignmentId: assignment.id,
    supportedBlockIds: assignment.field.supportedBlockIds,
    dataKeys: assignment.field.dataKeys,
  };
}

export function buildSyntheticAssignments(block: FormBlockConfig): FormFieldAssignment[] {
  const hidden = new Set(block.hiddenFields || []);
  const builtIns = getBuiltInFieldRegistry().filter(field => field.supportedBlockIds?.includes(block.id));
  const syntheticBuiltIns = builtIns.map((field, index) => ({
    id: `legacy_${block.instanceId}_${field.id}`,
    formId: '',
    blockId: block.id,
    blockInstanceId: block.instanceId || `${block.id}__1`,
    fieldId: field.id,
    sortOrder: index,
    isVisible: !hidden.has(field.builtInKey || ''),
    requiredOverride: null,
    labelOverride: null,
    helpTextOverride: null,
    placeholderOverride: null,
    field,
    createdAt: '',
    updatedAt: '',
  }));

  const legacyCustomAssignments = (block.customFields || []).map((field, index) => {
    const libraryField: ReusableCustomField = {
      id: field.id,
      name: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder,
      helpText: field.helpText,
      options: field.options || [],
      fieldKind: field.fieldKind || 'custom',
      builtInKey: field.builtInKey,
      supportedBlockIds: [block.id],
      dataKeys: field.dataKeys,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    };
    return {
      id: `legacy_${block.instanceId}_${field.id}`,
      formId: '',
      blockId: block.id,
      blockInstanceId: block.instanceId || `${block.id}__1`,
      fieldId: field.id,
      sortOrder: syntheticBuiltIns.length + index,
      isVisible: true,
      requiredOverride: field.required ?? null,
      labelOverride: null,
      helpTextOverride: null,
      placeholderOverride: null,
      field: libraryField,
      createdAt: '',
      updatedAt: '',
    } satisfies FormFieldAssignment;
  });

  return [...syntheticBuiltIns, ...legacyCustomAssignments];
}

export function hydrateFormAssignments(
  formConfig: FormBlockConfig[],
  assignments: FormFieldAssignment[],
): FormFieldAssignment[] {
  const normalizedConfig = normalizeFormConfig(formConfig);
  return normalizedConfig.flatMap(block => {
    const blockAssignments = assignments.filter(assignment => assignment.blockInstanceId === block.instanceId);
    const syntheticAssignments = buildSyntheticAssignments(block);
    if (blockAssignments.length === 0) return syntheticAssignments;
    const seenFieldIds = new Set(blockAssignments.map(assignment => assignment.fieldId));
    return [
      ...blockAssignments,
      ...syntheticAssignments.filter(assignment => !seenFieldIds.has(assignment.fieldId)),
    ].sort((a, b) => a.sortOrder - b.sortOrder);
  });
}

export function mergeFormConfigWithAssignments(
  formConfig: FormBlockConfig[],
  assignments: FormFieldAssignment[],
): FormBlockConfig[] {
  const normalizedConfig = normalizeFormConfig(formConfig);

  return normalizedConfig.map(block => {
    const effectiveAssignments = hydrateFormAssignments([block], assignments);
    const resolvedFields = effectiveAssignments
      .map(assignmentToResolvedField)
      .filter((field): field is ResolvedFormField => !!field);
    const resolvedBuiltInKeys = new Set(
      resolvedFields
        .filter(field => field.fieldKind === 'built_in' && !field.isVisible)
        .map(field => field.builtInKey)
        .filter((value): value is string => !!value)
    );
    const legacyById = new Map((block.customFields || []).map(field => [field.id, field]));
    const customFields = resolvedFields
      .filter(field => field.fieldKind === 'custom' && field.isVisible)
      .map(field => legacyById.get(field.fieldId) || {
        id: field.fieldId,
        label: field.label,
        type: field.type,
        required: field.required,
        placeholder: field.placeholder,
        helpText: field.helpText,
        options: field.options,
        fieldKind: field.fieldKind,
        builtInKey: field.builtInKey,
        supportedBlockIds: field.supportedBlockIds,
        dataKeys: field.dataKeys,
      });
    const defaultBlockFields = new Set((getBlockMeta(block.id)?.fields || []).map(field => field.key));
    const hiddenFields = new Set(block.hiddenFields || []);
    for (const key of resolvedBuiltInKeys) hiddenFields.add(key);
    for (const field of resolvedFields.filter(item => item.fieldKind === 'built_in' && item.isVisible)) {
      if (field.builtInKey && defaultBlockFields.has(field.builtInKey)) hiddenFields.delete(field.builtInKey);
    }

    return {
      ...block,
      hiddenFields: hiddenFields.size > 0 ? Array.from(hiddenFields) : undefined,
      customFields: customFields.length > 0 ? customFields : undefined,
      resolvedFields,
    };
  });
}

export function makeFieldName(label: string, fallbackId?: string) {
  return slugifyName(label) || fallbackId || 'custom_field';
}
