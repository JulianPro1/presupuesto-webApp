import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

type DateInput = string | Date | null | undefined;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Convierte la entrada a moment interpretando "YYYY-MM-DD" como fecha LOCAL
 * (evita el desfase de día que produce el parseo UTC en zonas UTC-).
 */
function toMoment(value: DateInput): moment.Moment | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    const v = value.trim();
    if (v === '' || v === '-' || v === '—') return null;
  }

  const m =
    typeof value === 'string' && ISO_RE.test(value.trim())
      ? moment(value.trim(), 'YYYY-MM-DD', true)
      : moment(value);

  return m.isValid() ? m : null;
}

/** "11 nov. 2026" — formato amigable para columnas de tablas */
export function formatDateFriendly(value: DateInput): string {
  const m = toMoment(value);
  return m ? m.format('ll') : '—';
}

/** "11/11/2026" — formato corto numérico */
export function formatDateShort(value: DateInput): string {
  const m = toMoment(value);
  return m ? m.format('L') : '—';
}

/** "miércoles, 11 de noviembre de 2026" — formato largo */
export function formatDateLong(value: DateInput): string {
  const m = toMoment(value);
  return m ? m.format('LLLL') : '—';
}

/** "hace 2 días" / "en 3 días" — tiempo relativo */
export function formatDateRelative(value: DateInput): string {
  const m = toMoment(value);
  return m ? m.fromNow() : '—';
}

/** "2026-11-11" — ISO, útil para tooltips/atributos */
export function formatDateIso(value: DateInput): string {
  const m = toMoment(value);
  return m ? m.format('YYYY-MM-DD') : '—';
}

/**
 * Composable de formateo de fechas.
 *
 * @example
 * const { formatDateFriendly } = useDateFormat();
 * formatDateFriendly('2026-11-11') // "11 nov. 2026"
 */
export function useDateFormat() {
  return {
    formatDateFriendly,
    formatDateShort,
    formatDateLong,
    formatDateRelative,
    formatDateIso,
  };
}
