import { getBuiltInFieldRegistry } from '@/lib/form-library';
import { makeFieldName, normalizeFormConfig } from '@/lib/form-fields';
import type { CustomField, FormBlockConfig, FormBlockId, FormFieldAssignment, ReusableCustomField } from '@/types';

type SupabaseLike = {
  from: (table: string) => {
    select: (query: string) => {
      order: (column: string, options: { ascending: boolean }) => Promise<{ data: Record<string, unknown>[] | null; error?: { message?: string } | null }>;
      eq: (column: string, value: string | boolean) => {
        order?: (column: string, options: { ascending: boolean }) => Promise<{ data: Record<string, unknown>[] | null; error?: { message?: string } | null }>;
        maybeSingle?: () => Promise<{ data: Record<string, unknown> | null; error?: { message?: string } | null }>;
      };
      in?: (column: string, values: string[]) => Promise<{ data: Record<string, unknown>[] | null; error?: { message?: string } | null }>;
    };
    upsert: (values: Record<string, unknown> | Record<string, unknown>[], options?: Record<string, unknown>) => Promise<{ error?: { message?: string } | null }>;
    update: (values: Record<string, unknown>) => { eq: (column: string, value: string) => Promise<{ error?: { message?: string } | null }> };
  };
};

function toFieldRow(field: ReusableCustomField) {
  return {
    id: field.id,
    name: field.name,
    label: field.label,
    type: field.type,
    required_default: !!field.required,
    placeholder: field.placeholder || null,
    help_text: field.helpText || null,
    options: field.options || [],
    is_active: field.isActive ?? true,
    field_kind: field.fieldKind || 'custom',
    built_in_key: field.builtInKey || null,
    supported_block_ids: field.supportedBlockIds || [],
    data_keys: field.dataKeys || [],
    updated_at: new Date().toISOString(),
  };
}

function legacyCustomFieldToLibraryField(field: CustomField, blockId: string): ReusableCustomField {
  return {
    id: field.id,
    name: `legacy_${makeFieldName(field.label, field.id)}_${field.id.toLowerCase()}`,
    label: field.label,
    type: field.type,
    required: !!field.required,
    placeholder: field.placeholder,
    helpText: field.helpText,
    options: field.options || [],
    isActive: true,
    fieldKind: 'custom',
    supportedBlockIds: [blockId as FormBlockId],
    dataKeys: field.dataKeys,
    createdAt: '',
    updatedAt: '',
  };
}

export async function syncUnifiedFieldLibrary(supabase: SupabaseLike) {
  const builtInFields = getBuiltInFieldRegistry();
  if (builtInFields.length > 0) {
    const { error } = await supabase.from('custom_fields').upsert(
      builtInFields.map(toFieldRow),
      { onConflict: 'id' }
    );
    if (error) throw new Error(error.message || 'Failed to seed built-in fields');
  }

  const { data: forms, error: formsError } = await supabase
    .from('intake_forms')
    .select('id, form_config')
    .order('created_at', { ascending: false });
  if (formsError) throw new Error(formsError.message || 'Failed to load forms');

  let migratedForms = 0;
  let migratedFields = builtInFields.length;
  let migratedAssignments = 0;

  for (const row of forms || []) {
    const formId = String((row as Record<string, unknown>).id);
    const formConfig = normalizeFormConfig((((row as Record<string, unknown>).form_config as FormBlockConfig[]) || []));
    const assignmentRows: Record<string, unknown>[] = [];

    for (const block of formConfig) {
      const hidden = new Set(block.hiddenFields || []);
      const builtInsForBlock = builtInFields.filter(field => field.supportedBlockIds?.includes(block.id));
      builtInsForBlock.forEach((field, index) => {
        assignmentRows.push({
          form_id: formId,
          block_id: block.id,
          block_instance_id: block.instanceId,
          field_id: field.id,
          sort_order: index,
          is_visible: !hidden.has(field.builtInKey || ''),
          required_override: null,
          label_override: null,
          help_text_override: null,
          placeholder_override: null,
          updated_at: new Date().toISOString(),
        });
      });

      for (const [index, field] of (block.customFields || []).entries()) {
        const libraryField = legacyCustomFieldToLibraryField(field, block.id);
        const { error } = await supabase.from('custom_fields').upsert(toFieldRow(libraryField), { onConflict: 'id' });
        if (error) throw new Error(error.message || 'Failed to upsert legacy field');
        migratedFields += 1;
        assignmentRows.push({
          form_id: formId,
          block_id: block.id,
          block_instance_id: block.instanceId,
          field_id: libraryField.id,
          sort_order: builtInsForBlock.length + index,
          is_visible: true,
          required_override: field.required ?? null,
          label_override: null,
          help_text_override: null,
          placeholder_override: null,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (assignmentRows.length > 0) {
      const { error } = await supabase
        .from('form_field_assignments')
        .upsert(assignmentRows, { onConflict: 'form_id,block_instance_id,field_id' });
      if (error) throw new Error(error.message || 'Failed to upsert form field assignments');
      migratedAssignments += assignmentRows.length;
    }

    const cleanedConfig = formConfig.map(block => ({ ...block, customFields: undefined }));
    const { error: updateError } = await supabase
      .from('intake_forms')
      .update({ form_config: cleanedConfig, updated_at: new Date().toISOString() })
      .eq('id', formId);
    if (updateError) throw new Error(updateError.message || 'Failed to clean legacy form config');

    migratedForms += 1;
  }

  return {
    migratedForms,
    migratedFields,
    migratedAssignments,
  };
}

export function buildAssignmentPayload(assignments: FormFieldAssignment[]) {
  return assignments.map((assignment, index) => ({
    blockId: assignment.blockId,
    blockInstanceId: assignment.blockInstanceId,
    fieldId: assignment.fieldId,
    sortOrder: assignment.sortOrder ?? index,
    isVisible: assignment.isVisible !== false,
    requiredOverride: assignment.requiredOverride ?? null,
    labelOverride: assignment.labelOverride ?? null,
    helpTextOverride: assignment.helpTextOverride ?? null,
    placeholderOverride: assignment.placeholderOverride ?? null,
  }));
}
