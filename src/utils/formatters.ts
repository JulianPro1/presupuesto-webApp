const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const vesFormatter = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const monthFormatter = new Intl.DateTimeFormat('es-VE', {
  month: 'long',
  year: 'numeric',
});

/** "$1,234.56" */
export function formatUsd(value: number): string {
  return usdFormatter.format(Number.isFinite(value) ? value : 0);
}

/** "Bs. 1.234,56" */
export function formatVes(value: number): string {
  return `Bs. ${vesFormatter.format(Number.isFinite(value) ? value : 0)}`;
}

/** "12.34%" */
export function formatPct(value: number): string {
  return `${(Number.isFinite(value) ? value : 0).toFixed(2)}%`;
}

/**
 * Convierte el texto de un input a número.
 * Acepta formatos "1234.56", "1.234,56" y "1,5". Devuelve 0 si es inválido.
 */
export function parseAmount(raw: string): number {
  const clean = raw.trim().replace(/[^\d.,-]/g, '');
  if (!clean) return 0;

  const dots = clean.split('.').length - 1;
  const commas = clean.split(',').length - 1;

  let normalized: string;
  if (dots > 0 && commas > 0) {
    normalized = clean.replace(/\./g, '').replace(',', '.');
  } else if (commas > 0) {
    normalized = clean.replace(',', '.');
  } else if (dots > 1) {
    normalized = clean.replace(/\./g, '');
  } else {
    normalized = clean;
  }

  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

/** Fecha local "YYYY-MM-DD" */
export function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "Septiembre de 2026" */
export function monthLabel(date: Date = new Date()): string {
  const label = monthFormatter.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
