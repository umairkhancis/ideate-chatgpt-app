/**
 * Generic type definitions for domain models
 * 
 * These types support any business domain model configured via JSON.
 */

export type FieldType = 'string' | 'text' | 'number' | 'boolean' | 'date' | 'datetime';

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hidden?: boolean;
  showInList?: boolean;
  showInDetail?: boolean;
  placeholder?: string;
  helpText?: string;
  min?: number;
  max?: number;
  default?: any;
}

export interface BrandingConfig {
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
}

export interface FeaturesConfig {
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  archive?: boolean;
  search?: boolean;
}

export interface DomainConfig {
  domain: string;
  label: string;
  labelPlural: string;
  icon?: string;
  description?: string;
  branding?: BrandingConfig;
  features?: FeaturesConfig;
  fields: FieldConfig[];
}

export interface GenericEntity {
  id: string;
  archived?: boolean;
  created_date: string;
  updated_date: string;
  [key: string]: any; // Dynamic fields based on config
}

export interface GenericListToolOutput {
  items?: GenericEntity[];
  count?: number;
}

export interface GenericDetailToolOutput {
  item?: GenericEntity;
}

export interface GenericToolMetadata {
  config?: DomainConfig;
  [key: string]: any;
}

export interface GenericWidgetState extends Record<string, unknown> {
  selectedItem?: string;
  viewMode?: 'list' | 'detail';
  favorites?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Helper to get field value from entity with type safety
 */
export function getFieldValue(
  entity: GenericEntity,
  field: FieldConfig
): any {
  return entity[field.key];
}

/**
 * Helper to determine if a field should be shown
 */
export function shouldShowField(
  field: FieldConfig,
  view: 'list' | 'detail'
): boolean {
  if (field.hidden) return false;
  return view === 'list' ? field.showInList === true : field.showInDetail !== false;
}

/**
 * Get fields to display in a specific view
 */
export function getFieldsForView(
  config: DomainConfig,
  view: 'list' | 'detail'
): FieldConfig[] {
  return config.fields.filter(f => shouldShowField(f, view));
}

/**
 * Format field value for display
 */
export function formatFieldValue(
  value: any,
  field: FieldConfig
): string {
  if (value === null || value === undefined) return '—';

  switch (field.type) {
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'date':
      return new Date(value).toLocaleDateString();
    case 'datetime':
      return new Date(value).toLocaleString();
    default:
      return String(value);
  }
}

/**
 * Get priority/urgency info (generic version)
 */
export function getPriorityInfo(priority: number): {
  color: string;
  textColor: string;
  dot: string;
  label: string;
} {
  const priorityMap = {
    5: {
      color: 'bg-red-50',
      textColor: 'text-red-700',
      dot: 'bg-red-500',
      label: 'Urgent',
    },
    4: {
      color: 'bg-orange-50',
      textColor: 'text-orange-700',
      dot: 'bg-orange-500',
      label: 'High',
    },
    3: {
      color: 'bg-blue-50',
      textColor: 'text-blue-700',
      dot: 'bg-blue-500',
      label: 'Medium',
    },
    2: {
      color: 'bg-gray-50',
      textColor: 'text-gray-700',
      dot: 'bg-gray-500',
      label: 'Low',
    },
    1: {
      color: 'bg-gray-50',
      textColor: 'text-gray-500',
      dot: 'bg-gray-400',
      label: 'Lowest',
    },
  };

  return priorityMap[priority as keyof typeof priorityMap] || priorityMap[3];
}

/**
 * Sort generic entities by field
 */
export function sortEntities(
  entities: GenericEntity[],
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): GenericEntity[] {
  return [...entities].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    // Handle null/undefined
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    // Compare based on type
    let comparison = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });
}

