import type { JiraFieldInfo } from '@epic-plan/shared';

interface RawField {
  id: string;
  name: string;
  custom?: boolean;
  schema?: { type?: string; custom?: string; system?: string };
}

export function mapJiraFields(raw: unknown): JiraFieldInfo[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return (raw as RawField[])
    .map((field) => {
      const schemaType = field.schema?.type ?? 'unknown';
      return {
        id: field.id,
        name: field.name,
        custom: Boolean(field.custom),
        schemaType,
      };
    })
    .filter((field) => field.schemaType === 'date' || field.schemaType === 'datetime')
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}
