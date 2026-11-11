import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

export const CATEGORIES = [
  'Alimentación',
  'Vivienda',
  'Servicios',
  'Transporte',
  'Salud',
  'Educación',
  'Entretenimiento',
  'Ocio',
  'Otros',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const INCOME_SOURCES = [
  'Sueldo',
  'Freelance',
  'Ventas',
  'Otros',
] as const;

export type IncomeSource = (typeof INCOME_SOURCES)[number];

export type ExpenseCurrency = 'USDT' | 'VES';

/** Campos comunes de todo movimiento con snapshot de tasas */
export interface RateSnapshot {
  /** Monto tal como lo ingresó el usuario */
  amount: number;
  /** Moneda en la que se ingresó el monto */
  currency: ExpenseCurrency;
  /** Snapshot: tasa BCV al momento del registro */
  rateBcv: number;
  /** Snapshot: tasa USDT al momento del registro */
  rateUsdt: number;
}

export interface Expense extends RateSnapshot {
  id: string;
  description: string;
  category: Category;
  /** Fecha "YYYY-MM-DD" */
  date: string;
}

export interface Income extends RateSnapshot {
  id: string;
  description: string;
  source: IncomeSource;
  /** Fecha "YYYY-MM-DD" */
  date: string;
}

export interface Payable extends RateSnapshot {
  id: string;
  description: string;
  category: Category;
  /** Fecha "YYYY-MM-DD" de registro */
  date: string;
  /** Fecha "YYYY-MM-DD" de vencimiento (opcional) */
  dueDate?: string;
}

export interface Receivable extends RateSnapshot {
  id: string;
  description: string;
  source: IncomeSource;
  /** Fecha "YYYY-MM-DD" de registro */
  date: string;
  /** Fecha "YYYY-MM-DD" de vencimiento (opcional) */
  dueDate?: string;
}

export interface Rates {
  /** Tasa oficial BCV (Bs. por USD) */
  bcv: number;
  /** Tasa USDT / P2P (Bs. por USDT) */
  usdt: number;
}

const jsonOr = <T>(fallback: T) => {
  return (raw: string): T => {
    try {
      const value = JSON.parse(raw) as T;
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };
};

export const $rates = persistentAtom<Rates>(
  'presupuesto:rates',
  { bcv: 0, usdt: 0 },
  {
    encode: JSON.stringify,
    decode: jsonOr<Rates>({ bcv: 0, usdt: 0 }),
  },
);

export const $salaryUsd = persistentAtom<number>(
  'presupuesto:salaryUsd',
  0,
  {
    encode: JSON.stringify,
    decode: jsonOr<number>(0),
  },
);

export const $expenses = persistentAtom<Expense[]>(
  'presupuesto:expenses',
  [],
  {
    encode: JSON.stringify,
    decode: (raw) => {
      try {
        const value = JSON.parse(raw);
        if (!Array.isArray(value)) return [];
        return (value as Partial<Expense>[]).map((e) => ({
          ...e,
          rateBcv: typeof e.rateBcv === 'number' ? e.rateBcv : 0,
          rateUsdt: typeof e.rateUsdt === 'number' ? e.rateUsdt : 0,
        })) as Expense[];
      } catch {
        return [];
      }
    },
  },
);

export const $incomes = persistentAtom<Income[]>(
  'presupuesto:incomes',
  [],
  {
    encode: JSON.stringify,
    decode: (raw) => {
      try {
        const value = JSON.parse(raw);
        if (!Array.isArray(value)) return [];
        return (value as Partial<Income>[]).map((e) => ({
          ...e,
          rateBcv: typeof e.rateBcv === 'number' ? e.rateBcv : 0,
          rateUsdt: typeof e.rateUsdt === 'number' ? e.rateUsdt : 0,
        })) as Income[];
      } catch {
        return [];
      }
    },
  },
);

export const $payables = persistentAtom<Payable[]>(
  'presupuesto:payables',
  [],
  {
    encode: JSON.stringify,
    decode: (raw) => {
      try {
        const value = JSON.parse(raw);
        if (!Array.isArray(value)) return [];
        return (value as Partial<Payable>[]).map((e) => ({
          ...e,
          rateBcv: typeof e.rateBcv === 'number' ? e.rateBcv : 0,
          rateUsdt: typeof e.rateUsdt === 'number' ? e.rateUsdt : 0,
        })) as Payable[];
      } catch {
        return [];
      }
    },
  },
);

export const $receivables = persistentAtom<Receivable[]>(
  'presupuesto:receivables',
  [],
  {
    encode: JSON.stringify,
    decode: (raw) => {
      try {
        const value = JSON.parse(raw);
        if (!Array.isArray(value)) return [];
        return (value as Partial<Receivable>[]).map((e) => ({
          ...e,
          rateBcv: typeof e.rateBcv === 'number' ? e.rateBcv : 0,
          rateUsdt: typeof e.rateUsdt === 'number' ? e.rateUsdt : 0,
        })) as Receivable[];
      } catch {
        return [];
      }
    },
  },
);

// Migración única: el antiguo "sueldo mensual" pasa a ser un ingreso
if (typeof window !== 'undefined') {
  const legacySalary = $salaryUsd.get();
  if (legacySalary > 0 && $incomes.get().length === 0) {
    $incomes.set([
      {
        id: crypto.randomUUID(),
        description: 'Sueldo mensual',
        source: 'Sueldo',
        amount: legacySalary,
        currency: 'USDT',
        rateBcv: $rates.get().bcv,
        rateUsdt: $rates.get().usdt,
        date: todayLocal(),
      },
    ]);
    $salaryUsd.set(0);
  }
}

export function setRates(patch: Partial<Rates>): void {
  $rates.set({ ...$rates.get(), ...patch });
}

export interface RatesMeta {
  /** Fecha de publicación de la tasa BCV (YYYY-MM-DD) */
  bcvDate: string;
  /** Timestamp del último tick USDT recibido por el stream */
  usdtDate: string;
  /** Epoch ms de la última actualización local */
  updatedAt: number;
}

export const $ratesMeta = persistentAtom<RatesMeta>(
  'presupuesto:ratesMeta',
  { bcvDate: '', usdtDate: '', updatedAt: 0 },
  {
    encode: JSON.stringify,
    decode: jsonOr<RatesMeta>({ bcvDate: '', usdtDate: '', updatedAt: 0 }),
  },
);

export function setRatesMeta(patch: Partial<RatesMeta>): void {
  $ratesMeta.set({ ...$ratesMeta.get(), ...patch, updatedAt: Date.now() });
}

/** API key opcional de DolarVZLA (header x-dolarvzla-key) para USDT por REST */
export const $dolarVzlaApiKey = persistentAtom<string>(
  'presupuesto:dolarvzlaApiKey',
  import.meta.env?.PUBLIC_DOLARVZLA_API_KEY ?? '',
  { encode: JSON.stringify, decode: jsonOr<string>('') },
);

export function setApiKey(key: string): void {
  $dolarVzlaApiKey.set(key.trim());
}

/** 'loading' durante el fetch BCV; 'live' cuando el stream USDT emite */
export type RatesStatus = 'idle' | 'loading' | 'live' | 'error';

export const $ratesStatus = atom<RatesStatus>('idle');

export function setRatesStatus(status: RatesStatus): void {
  $ratesStatus.set(status);
}

export function setSalaryUsd(amount: number): void {
  $salaryUsd.set(Number.isFinite(amount) && amount > 0 ? amount : 0);
}

export interface NewExpense {
  description: string;
  category: Category;
  amount: number;
  currency: ExpenseCurrency;
  date?: string;
}

export function addExpense(input: NewExpense): Expense {
  const { bcv, usdt } = $rates.get();

  const expense: Expense = {
    id: crypto.randomUUID(),
    description: input.description.trim(),
    category: input.category,
    amount: input.amount,
    currency: input.currency,
    rateBcv: bcv,
    rateUsdt: usdt,
    date: input.date ?? todayLocal(),
  };
  $expenses.set([expense, ...$expenses.get()]);
  return expense;
}

export function removeExpense(id: string): void {
  $expenses.set($expenses.get().filter((e) => e.id !== id));
}

export interface ImportExpenseInput {
  date: string;
  description: string;
  category: Category;
  amount: number;
  currency: ExpenseCurrency;
  rateBcv?: number;
  rateUsdt?: number;
}

export function importExpenses(
  items: ImportExpenseInput[],
  mode: 'append' | 'replace' = 'append',
): Expense[] {
  const { bcv, usdt } = $rates.get();

  const newExpenses: Expense[] = items.map((item) => ({
    id: crypto.randomUUID(),
    description: item.description.trim(),
    category: item.category,
    amount: item.amount,
    currency: item.currency,
    rateBcv: item.rateBcv && item.rateBcv > 0 ? item.rateBcv : bcv,
    rateUsdt: item.rateUsdt && item.rateUsdt > 0 ? item.rateUsdt : usdt,
    date: item.date || todayLocal(),
  }));

  if (mode === 'replace') {
    $expenses.set(newExpenses);
  } else {
    $expenses.set([...newExpenses, ...$expenses.get()]);
  }

  return newExpenses;
}

// --- Ingresos ---

export interface NewIncome {
  description: string;
  source: IncomeSource;
  amount: number;
  currency: ExpenseCurrency;
  date?: string;
}

export function addIncome(input: NewIncome): Income {
  const { bcv, usdt } = $rates.get();

  const income: Income = {
    id: crypto.randomUUID(),
    description: input.description.trim(),
    source: input.source,
    amount: input.amount,
    currency: input.currency,
    rateBcv: bcv,
    rateUsdt: usdt,
    date: input.date ?? todayLocal(),
  };
  $incomes.set([income, ...$incomes.get()]);
  return income;
}

export function removeIncome(id: string): void {
  $incomes.set($incomes.get().filter((e) => e.id !== id));
}

export interface ImportIncomeInput {
  date: string;
  description: string;
  source: IncomeSource;
  amount: number;
  currency: ExpenseCurrency;
  rateBcv?: number;
  rateUsdt?: number;
}

export function importIncomes(
  items: ImportIncomeInput[],
  mode: 'append' | 'replace' = 'append',
): Income[] {
  const { bcv, usdt } = $rates.get();

  const newIncomes: Income[] = items.map((item) => ({
    id: crypto.randomUUID(),
    description: item.description.trim(),
    source: item.source,
    amount: item.amount,
    currency: item.currency,
    rateBcv: item.rateBcv && item.rateBcv > 0 ? item.rateBcv : bcv,
    rateUsdt: item.rateUsdt && item.rateUsdt > 0 ? item.rateUsdt : usdt,
    date: item.date || todayLocal(),
  }));

  if (mode === 'replace') {
    $incomes.set(newIncomes);
  } else {
    $incomes.set([...newIncomes, ...$incomes.get()]);
  }

  return newIncomes;
}

// --- Cuentas por pagar ---

export interface NewPayable {
  description: string;
  category: Category;
  amount: number;
  currency: ExpenseCurrency;
  date?: string;
  dueDate?: string;
}

export function addPayable(input: NewPayable): Payable {
  const { bcv, usdt } = $rates.get();

  const payable: Payable = {
    id: crypto.randomUUID(),
    description: input.description.trim(),
    category: input.category,
    amount: input.amount,
    currency: input.currency,
    rateBcv: bcv,
    rateUsdt: usdt,
    date: input.date ?? todayLocal(),
    dueDate: input.dueDate || undefined,
  };
  $payables.set([payable, ...$payables.get()]);
  return payable;
}

export function removePayable(id: string): void {
  $payables.set($payables.get().filter((e) => e.id !== id));
}

/**
 * Marca una cuenta por pagar como pagada: la convierte en gasto
 * (con snapshot de las tasas actuales) y la saca de la lista.
 */
export function payPayable(id: string): Expense | null {
  const payable = $payables.get().find((p) => p.id === id);
  if (!payable) return null;

  const expense = addExpense({
    description: payable.description,
    category: payable.category,
    amount: payable.amount,
    currency: payable.currency,
    date: todayLocal(),
  });
  removePayable(id);
  return expense;
}

export interface ImportPayableInput {
  date: string;
  description: string;
  category: Category;
  amount: number;
  currency: ExpenseCurrency;
  dueDate?: string;
  rateBcv?: number;
  rateUsdt?: number;
}

export function importPayables(
  items: ImportPayableInput[],
  mode: 'append' | 'replace' = 'append',
): Payable[] {
  const { bcv, usdt } = $rates.get();

  const newPayables: Payable[] = items.map((item) => ({
    id: crypto.randomUUID(),
    description: item.description.trim(),
    category: item.category,
    amount: item.amount,
    currency: item.currency,
    rateBcv: item.rateBcv && item.rateBcv > 0 ? item.rateBcv : bcv,
    rateUsdt: item.rateUsdt && item.rateUsdt > 0 ? item.rateUsdt : usdt,
    date: item.date || todayLocal(),
    dueDate: item.dueDate || undefined,
  }));

  if (mode === 'replace') {
    $payables.set(newPayables);
  } else {
    $payables.set([...newPayables, ...$payables.get()]);
  }

  return newPayables;
}

// --- Cuentas por cobrar ---

export interface NewReceivable {
  description: string;
  source: IncomeSource;
  amount: number;
  currency: ExpenseCurrency;
  date?: string;
  dueDate?: string;
}

export function addReceivable(input: NewReceivable): Receivable {
  const { bcv, usdt } = $rates.get();

  const receivable: Receivable = {
    id: crypto.randomUUID(),
    description: input.description.trim(),
    source: input.source,
    amount: input.amount,
    currency: input.currency,
    rateBcv: bcv,
    rateUsdt: usdt,
    date: input.date ?? todayLocal(),
    dueDate: input.dueDate || undefined,
  };
  $receivables.set([receivable, ...$receivables.get()]);
  return receivable;
}

export function removeReceivable(id: string): void {
  $receivables.set($receivables.get().filter((e) => e.id !== id));
}

/**
 * Marca una cuenta por cobrar como cobrada: la convierte en ingreso
 * (con snapshot de las tasas actuales) y la saca de la lista.
 */
export function collectReceivable(id: string): Income | null {
  const receivable = $receivables.get().find((p) => p.id === id);
  if (!receivable) return null;

  const income = addIncome({
    description: receivable.description,
    source: receivable.source,
    amount: receivable.amount,
    currency: receivable.currency,
    date: todayLocal(),
  });
  removeReceivable(id);
  return income;
}

export interface ImportReceivableInput {
  date: string;
  description: string;
  source: IncomeSource;
  amount: number;
  currency: ExpenseCurrency;
  dueDate?: string;
  rateBcv?: number;
  rateUsdt?: number;
}

export function importReceivables(
  items: ImportReceivableInput[],
  mode: 'append' | 'replace' = 'append',
): Receivable[] {
  const { bcv, usdt } = $rates.get();

  const newReceivables: Receivable[] = items.map((item) => ({
    id: crypto.randomUUID(),
    description: item.description.trim(),
    source: item.source,
    amount: item.amount,
    currency: item.currency,
    rateBcv: item.rateBcv && item.rateBcv > 0 ? item.rateBcv : bcv,
    rateUsdt: item.rateUsdt && item.rateUsdt > 0 ? item.rateUsdt : usdt,
    date: item.date || todayLocal(),
    dueDate: item.dueDate || undefined,
  }));

  if (mode === 'replace') {
    $receivables.set(newReceivables);
  } else {
    $receivables.set([...newReceivables, ...$receivables.get()]);
  }

  return newReceivables;
}

function todayLocal(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Prefijo "YYYY-MM" del mes en curso (hora local) */
function currentMonthKey(): string {
  return todayLocal().slice(0, 7);
}

/** true si la fecha "YYYY-MM-DD" pertenece al mes en curso */
function inCurrentMonth(date: string): boolean {
  return date.startsWith(currentMonthKey());
}

/** Brecha cambiaria: ((USDT - BCV) / BCV) * 100 */
export const $spreadPct = computed($rates, ({ bcv, usdt }) =>
  bcv > 0 ? ((usdt - bcv) / bcv) * 100 : 0,
);

export interface UsdEquivalents {
  usd: number;
  vesBcv: number;
  vesUsdt: number;
}

/** Total de ingresos en USDT con sus equivalentes en Bs. a cada tasa */
export const $totalIncome = computed(
  [$incomes, $rates],
  (incomes, live): UsdEquivalents => {
    let usd = 0;
    for (const i of incomes) {
      if (!inCurrentMonth(i.date)) continue;
      usd += contraValues(i, live).usdUsdt;
    }
    return { usd, vesBcv: usd * live.bcv, vesUsdt: usd * live.usdt };
  },
);

/** Total pendiente en cuentas por pagar (USDT) y cantidad de items */
export const $pendingPayables = computed(
  [$payables, $rates],
  (payables, live): { usd: number; count: number } => {
    let usd = 0;
    for (const p of payables) usd += contraValues(p, live).usdUsdt;
    return { usd, count: payables.length };
  },
);

/** Total pendiente en cuentas por cobrar (USDT) y cantidad de items */
export const $pendingReceivables = computed(
  [$receivables, $rates],
  (receivables, live): { usd: number; count: number } => {
    let usd = 0;
    for (const r of receivables) usd += contraValues(r, live).usdUsdt;
    return { usd, count: receivables.length };
  },
);

/**
 * Cuentas por pagar vencidas (dueDate anterior a hoy) con su total en USDT
 * y la fecha de vencimiento más próxima entre las vigentes.
 */
export const $overduePayables = computed(
  [$payables, $rates],
  (payables, live): { count: number; usd: number; nextDue: string } => {
    const today = todayLocal();
    let count = 0;
    let usd = 0;
    let nextDue = '';
    for (const p of payables) {
      if (!p.dueDate) continue;
      if (p.dueDate < today) {
        count += 1;
        usd += contraValues(p, live).usdUsdt;
      } else if (!nextDue || p.dueDate < nextDue) {
        nextDue = p.dueDate;
      }
    }
    return { count, usd, nextDue };
  },
);

export interface BudgetStats {
  /** Total gastado en dólares a tasa USDT (costo real) */
  totalUsd: number;
  /** Total gastado en dólares a tasa BCV */
  totalUsdBcv: number;
  totalVesBcv: number;
  totalVesUsdt: number;
  gapVes: number;
  gapUsd: number;
  /** Total ingresado en dólares a tasa USDT */
  incomeUsd: number;
  /** Total ingresado valorado en Bs. a tasa BCV */
  incomeVesBcv: number;
  remainingUsd: number;
  remainingVesBcv: number;
  pctFree: number;
  count: number;
  /** Total pendiente por pagar en USDT y cantidad de items */
  pendingUsd: number;
  pendingCount: number;
  /** Total pendiente por cobrar en USDT y cantidad de items */
  receivableUsd: number;
  receivableCount: number;
}

export const $stats = computed(
  [$expenses, $incomes, $payables, $receivables, $rates],
  (expenses, incomes, payables, receivables, live): BudgetStats => {
    let totalUsd = 0;
    let totalUsdBcv = 0;
    let totalVesBcv = 0;
    let totalVesUsdt = 0;

    let expenseCount = 0;
    for (const e of expenses) {
      if (!inCurrentMonth(e.date)) continue;
      const c = contraValues(e, live);
      totalUsd += c.usdUsdt;
      totalUsdBcv += c.usdBcv;
      totalVesBcv += c.vesBcv;
      totalVesUsdt += c.vesUsdt;
      expenseCount += 1;
    }

    let incomeUsd = 0;
    for (const i of incomes) {
      if (!inCurrentMonth(i.date)) continue;
      incomeUsd += contraValues(i, live).usdUsdt;
    }

    let pendingUsd = 0;
    for (const p of payables) pendingUsd += contraValues(p, live).usdUsdt;

    let receivableUsd = 0;
    for (const r of receivables)
      receivableUsd += contraValues(r, live).usdUsdt;

    const remainingUsd = incomeUsd - totalUsd;
    return {
      totalUsd,
      totalUsdBcv,
      totalVesBcv,
      totalVesUsdt,
      gapVes: totalVesUsdt - totalVesBcv,
      gapUsd: totalUsdBcv - totalUsd,
      incomeUsd,
      incomeVesBcv: incomeUsd * live.bcv,
      remainingUsd,
      remainingVesBcv: remainingUsd * live.bcv,
      pctFree: incomeUsd > 0 ? (remainingUsd / incomeUsd) * 100 : 0,
      count: expenseCount,
      pendingUsd,
      pendingCount: payables.length,
      receivableUsd,
      receivableCount: receivables.length,
    };
  },
);

export interface SavingsBreakdown {
  /** Total ingresado (USDT) */
  incomeUsd: number;
  /** Total pendiente por cobrar (USDT) */
  receivableUsd: number;
  /** Total gastado (USDT) */
  expensesUsd: number;
  /** Total pendiente por pagar (USDT) */
  payablesUsd: number;
  /** Ahorro actual: ingresos − gastos */
  netUsd: number;
  /** Saldo proyectado: net + por cobrar − por pagar */
  projectedUsd: number;
  /** Tasa de ahorro: net / ingresos (%) */
  savingsRate: number;
}

/** Resumen de ahorro para el módulo "Saldo a favor" */
export const $savings = computed($stats, (s): SavingsBreakdown => {
  const net = s.incomeUsd - s.totalUsd;
  return {
    incomeUsd: s.incomeUsd,
    receivableUsd: s.receivableUsd,
    expensesUsd: s.totalUsd,
    payablesUsd: s.pendingUsd,
    netUsd: net,
    projectedUsd: net + s.receivableUsd - s.pendingUsd,
    savingsRate: s.incomeUsd > 0 ? (net / s.incomeUsd) * 100 : 0,
  };
});

export interface CategoryTotal {
  category: Category;
  totalUsd: number;
  count: number;
}

export const $byCategory = computed(
  [$expenses, $rates],
  (expenses, live): CategoryTotal[] => {
    const acc = new Map<Category, CategoryTotal>();
    for (const e of expenses) {
      if (!inCurrentMonth(e.date)) continue;
      const item =
        acc.get(e.category) ?? { category: e.category, totalUsd: 0, count: 0 };
      item.totalUsd += expenseContraValues(e, live).usdUsdt;
      item.count += 1;
      acc.set(e.category, item);
    }
    return [...acc.values()].sort((a, b) => b.totalUsd - a.totalUsd);
  },
);

export interface ExpenseContraValues {
  /** Dólares equivalentes a tasa oficial BCV */
  usdBcv: number;
  /** Dólares equivalentes a tasa USDT (costo real P2P) */
  usdUsdt: number;
  /** Bolívares valorados a tasa BCV */
  vesBcv: number;
  /** Bolívares valorados a tasa USDT */
  vesUsdt: number;
  /** Brecha en Bs. (vesUsdt - vesBcv) */
  gapVes: number;
  /** Brecha en USD (usdBcv - usdUsdt) */
  gapUsd: number;
}

/**
 * Contravalores de un movimiento (gasto, ingreso o cuenta por pagar) a ambas
 * tasas usando el snapshot guardado (rateBcv/rateUsdt). Si el snapshot está
 * vacío usa las tasas actuales.
 *
 * - `usdUsdt`: costo real en USDT — `amount` si se pagó en USDT, `amount/usdt` si en Bs.
 * - `usdBcv`: equivalente en dólares oficiales — `usdUsdt * usdt / bcv`.
 * - `vesBcv`/`vesUsdt`: el costo en USDT expresado en Bs. a cada tasa.
 */
export function contraValues(
  entry: RateSnapshot,
  live: Rates = $rates.get(),
): ExpenseContraValues {
  const bcv = entry.rateBcv > 0 ? entry.rateBcv : live.bcv;
  const usdt = entry.rateUsdt > 0 ? entry.rateUsdt : live.usdt;

  let usdUsdt: number;
  if (entry.currency === 'USDT') {
    usdUsdt = entry.amount;
  } else if (usdt > 0) {
    usdUsdt = entry.amount / usdt;
  } else {
    usdUsdt = bcv > 0 ? entry.amount / bcv : 0;
  }

  const usdBcv = bcv > 0 ? (usdUsdt * usdt) / bcv : usdUsdt;
  const vesBcv = usdUsdt * bcv;
  const vesUsdt = usdUsdt * usdt;

  return {
    usdBcv,
    usdUsdt,
    vesBcv,
    vesUsdt,
    gapVes: vesUsdt - vesBcv,
    gapUsd: usdBcv - usdUsdt,
  };
}

/** Alias retrocompatible de `contraValues` */
export const expenseContraValues = contraValues;
