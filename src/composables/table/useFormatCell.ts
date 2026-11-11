import { formatUsd, formatVes, formatPct } from '@/utils/formatters'

/** Subconjunto de TableHeader que el formateador necesita. */
export interface CellFormatSource {
  format?: string
  /** Fallback cuando el valor está vacío/null (default: '-') */
  empty?: string
}

/**
 * Formato de celdas de tabla compartido entre TableBody (desktop) y
 * CardStack (móvil), para que una columna con `format`/`empty` se vea
 * igual en ambos breakpoints.
 */
export function useFormatCell() {
  const isEmpty = (value: any) =>
    value === null || value === undefined || value === '' || value === '-'

  const formatCell = (value: any, header?: CellFormatSource) => {
    if (isEmpty(value)) return header?.empty ?? '-'

    const format = header?.format
    if (format === 'currency') return formatUsd(Number(value))
    if (format === 'ves') return formatVes(Number(value))
    if (format === 'percentage') return formatPct(Number(value))
    if (format === 'boolean') return value ? 'Sí' : 'No'

    return value
  }

  return { formatCell, isCellEmpty: isEmpty }
}
