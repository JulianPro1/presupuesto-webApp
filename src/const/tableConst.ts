export interface TableHeader {
  key: string;
  label: string;
  /** Formato aplicado por defecto cuando la celda no usa un slot #cell(key) */
  format?: 'currency' | 'ves' | 'percentage' | string;
  /** Texto mostrado cuando el valor es null/undefined/'' */
  empty?: string;
}

export const TABLE_PAGINATION = {
  currentPage: 1,
  totalPages: 1,
  limit: 10,
  pageSizeOptions: [10, 20, 50],
};
