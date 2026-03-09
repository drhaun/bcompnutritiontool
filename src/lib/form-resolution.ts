import type { FormBlockConfig, FormFieldAssignment, IntakeForm, ReusableCustomField } from '@/types';
import { mergeFormConfigWithAssignments, normalizeFormConfig } from '@/lib/form-fields';

export function dbToReusableField(row: Record<string, unknown>): ReusableCustomField {
  const supportedBlockIds = Array.isArray(row.supported_block_ids)
    ? row.supported_block_ids.map(value => String(value))
    : Array.isArray(row.supportedBlockIds)
      ? (row.supportedBlockIds as string[])
      : [];
  const dataKeys = Array.isArray(row.data_keys)
    ? row.data_keys.map(value => String(value))
    : Array.isArray(row.dataKeys)
      ? (row.dataKeys as string[])
      : [];
  return {
    id: String(row.id),
    name: String(row.name || ''),
    label: String(row.label || ''),
    type: row.type as ReusableCustomField['type'],
    required: Boolean(row.required_default),
    placeholder: (row.placeholder as string) || undefined,
    helpText: (row.help_text as string) || undefined,
    options: Array.isArray(row.options) ? row.options as string[] : [],
    fieldKind: (row.field_kind as ReusableCustomField['fieldKind']) || 'custom',
    builtInKey: (row.built_in_key as string) || undefined,
    supportedBlockIds: supportedBlockIds as ReusableCustomField['supportedBlockIds'],
    dataKeys,
    isActive: row.is_active !== false,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
    usageCount: typeof row.usage_count === 'number' ? row.usage_count : undefined,
  };
}

export function dbToFormFieldAssignment(row: Record<string, unknown>): FormFieldAssignment {
  return {
    id: String(row.id),
    formId: String(row.form_id),
    blockId: row.block_id as FormFieldAssignment['blockId'],
    blockInstanceId: String(row.block_instance_id),
    fieldId: String(row.field_id),
    sortOrder: Number(row.sort_order || 0),
    isVisible: row.is_visible !== false,
    requiredOverride: typeof row.required_override === 'boolean' ? row.required_override : null,
    labelOverride: typeof row.label_override === 'string' ? row.label_override : null,
    helpTextOverride: typeof row.help_text_override === 'string' ? row.help_text_override : null,
    placeholderOverride: typeof row.placeholder_override === 'string' ? row.placeholder_override : null,
    field: row.field && typeof row.field === 'object' ? dbToReusableField(row.field as Record<string, unknown>) : undefined,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

export function resolveFormBlocks(formConfig: FormBlockConfig[], assignments: FormFieldAssignment[]) {
  return mergeFormConfigWithAssignments(normalizeFormConfig(formConfig), assignments);
}

export function applyResolvedFormConfig<T extends IntakeForm>(form: T, assignments: FormFieldAssignment[]): T {
  const normalizedBaseConfig = normalizeFormConfig(form.formConfig || []);
  return {
    ...form,
    formConfig: normalizedBaseConfig,
    resolvedFormConfig: resolveFormBlocks(normalizedBaseConfig, assignments),
    fieldAssignments: assignments,
  };
}

export async function fetchResolvedFormConfig(
  supabase: {
    from: (table: string) => {
      select: (query: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
          order: (column: string, options: { ascending: boolean }) => Promise<{ data: Record<string, unknown>[] | null }>;
        };
      };
    };
  },
  formId: string,
): Promise<FormBlockConfig[]> {
  const { data: formRow } = await supabase
    .from('intake_forms')
    .select('form_config')
    .eq('id', formId)
    .maybeSingle();

  const baseConfig = normalizeFormConfig(((formRow?.form_config as FormBlockConfig[]) || []));
  const assignmentsQuery = await supabase
    .from('form_field_assignments')
    .select('*, field:custom_fields(*)')
    .eq('form_id', formId)
    .order('sort_order', { ascending: true });

  const assignments = (assignmentsQuery.data || []).map(row => dbToFormFieldAssignment(row as Record<string, unknown>));
  return resolveFormBlocks(baseConfig, assignments);
}
