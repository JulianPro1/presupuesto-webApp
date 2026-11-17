import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

export const CATEGORIES = [
  'Alimentación',
  'Servicios',
  'Transporte',
  'Salud',
  'Educación',
  'Ropa y calzado',
  'Higiene personal',
  'Mascotas',
  'Ocio',
  'Otros',
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Categorías eliminadas → destino de migración para datos persistidos
 * e importaciones Excel antiguas.
 */
const LEGACY_CATEGORY_MAP: Record<string, Category> = {
  vivienda: 'Servicios',
  entretenimiento: 'Ocio',
  'seguros y finanzas': 'Higiene personal',
};

const CATEGORY_LOOKUP = new Map(
  CATEGORIES.map((c) => [normalizeKey(c), c]),
);

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza una categoría (posiblemente legada) contra CATEGORIES.
 * Acepta strings crudos de localStorage o Excel.
 */
export function normalizeCategory(raw: unknown): Category | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const key = normalizeKey(raw);
  const mapped = LEGACY_CATEGORY_MAP[key] ?? key;
  return CATEGORY_LOOKUP.get(normalizeKey(mapped)) ?? null;
}

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
          category: normalizeCategory(e.category) ?? 'Otros',
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
          category: normalizeCategory(e.category) ?? 'Otros',
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

/**
 * Presupuesto mensual por categoría (USDT). La clave es la categoría y el
 * valor el monto asignado cada mes; el consumo se calcula solo con los
 * movimientos del mes en curso, así que el presupuesto "se reinicia" solo.
 */
export const $budgets = persistentAtom<Record<string, number>>(
  'presupuesto:budgets',
  {},
  {
    encode: JSON.stringify,
    decode: (raw) => {
      const value = jsonOr<Record<string, number>>({})(raw);
      // Migrar claves de categorías eliminadas (Vivienda, Entretenimiento)
      // sumando el monto si dos claves colisionan en la misma categoría.
      const migrated: Record<string, number> = {};
      for (const [key, amount] of Object.entries(value)) {
        const cat = normalizeCategory(key);
        if (!cat || typeof amount !== 'number') continue;
        migrated[cat] = (migrated[cat] ?? 0) + amount;
      }
      return migrated;
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

/** 'loading' mientras se consultan las tasas */
export type RatesStatus = 'idle' | 'loading' | 'error';

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

// --- Presupuestos por categoría ---

/**
 * Define (o quita, con amountUsd <= 0) el presupuesto mensual de una
 * categoría, en USDT.
 */
export function setBudget(category: Category, amountUsd: number): void {
  const next = { ...$budgets.get() };
  if (amountUsd > 0) {
    next[category] = amountUsd;
  } else {
    delete next[category];
  }
  $budgets.set(next);
}

export interface BudgetImportItem {
  category: Category;
  amountUsd: number;
}

/**
 * Aplica presupuestos importados desde Excel. En modo 'replace' el mapa
 * queda exactamente como el archivo; en 'append' se fusiona y los items
 * del archivo sobrescriben las categorías repetidas.
 */
export function importBudgets(
  items: BudgetImportItem[],
  mode: 'append' | 'replace' = 'append',
): void {
  const next =
    mode === 'replace' ? {} : { ...$budgets.get() };
  for (const item of items) {
    if (item.amountUsd > 0) {
      next[item.category] = item.amountUsd;
    } else {
      delete next[item.category];
    }
  }
  $budgets.set(next);
}

export type BudgetStatus = 'none' | 'ok' | 'near' | 'over';

export interface CategoryBudgetStatus {
  category: Category;
  /** Monto mensual asignado (USDT); 0 = sin presupuesto */
  budgetUsd: number;
  /** Consumido este mes: gastos del mes + cuentas por pagar pendientes (USDT) */
  consumedUsd: number;
  /** Lo que queda del presupuesto (negativo si hay excedente) */
  remainingUsd: number;
  /** Monto excedido sobre el presupuesto (0 si no hay) */
  overUsd: number;
  /** % del presupuesto consumido (0 si no hay presupuesto) */
  pctUsed: number;
  status: BudgetStatus;
}

/**
 * Resumen de presupuestos por categoría para el mes en curso.
 * El consumo incluye los gastos del mes y TODAS las cuentas por pagar
 * pendientes (son un compromiso vigente aunque se hayan registrado antes).
 */
export const $budgetSummary = computed(
  [$budgets, $expenses, $payables, $rates],
  (budgets, expenses, payables, live): CategoryBudgetStatus[] => {
    const consumedByCat = new Map<Category, number>();
    const add = (cat: Category, usd: number) =>
      consumedByCat.set(cat, (consumedByCat.get(cat) ?? 0) + usd);

    for (const e of expenses) {
      if (!inCurrentMonth(e.date)) continue;
      add(e.category, contraValues(e, live).usdUsdt);
    }
    for (const p of payables) {
      add(p.category, contraValues(p, live).usdUsdt);
    }

    return CATEGORIES.map((category) => {
      const budgetUsd = budgets[category] ?? 0;
      const consumedUsd = consumedByCat.get(category) ?? 0;
      const pctUsed = budgetUsd > 0 ? (consumedUsd / budgetUsd) * 100 : 0;
      const status: BudgetStatus =
        budgetUsd <= 0
          ? 'none'
          : consumedUsd > budgetUsd
            ? 'over'
            : pctUsed >= 90
              ? 'near'
              : 'ok';
      return {
        category,
        budgetUsd,
        consumedUsd,
        remainingUsd: budgetUsd - consumedUsd,
        overUsd: Math.max(0, consumedUsd - budgetUsd),
        pctUsed,
        status,
      };
    });
  },
);

export interface BudgetTotals {
  /** Suma de los presupuestos mensuales definidos (USDT) */
  budgetUsd: number;
  /** Consumido total del mes, con y sin presupuesto asignado */
  consumedUsd: number;
  /** Consumido solo en categorías CON presupuesto */
  budgetedConsumedUsd: number;
  /** Consumido en categorías SIN presupuesto definido */
  unbudgetedConsumedUsd: number;
  /** Remanente del presupuesto asignado (negativo = excedido) */
  remainingUsd: number;
  /** Monto total excedido sobre los presupuestos */
  overUsd: number;
  /** Categorías con presupuesto / categorías excedidas */
  definedCount: number;
  overCount: number;
}

export const $budgetTotals = computed($budgetSummary, (summary): BudgetTotals => {
  let budgetUsd = 0;
  let consumedUsd = 0;
  let budgetedConsumedUsd = 0;
  let overUsd = 0;
  let definedCount = 0;
  let overCount = 0;
  for (const s of summary) {
    budgetUsd += s.budgetUsd;
    consumedUsd += s.consumedUsd;
    overUsd += s.overUsd;
    if (s.budgetUsd > 0) {
      definedCount += 1;
      budgetedConsumedUsd += s.consumedUsd;
      if (s.status === 'over') overCount += 1;
    }
  }
  return {
    budgetUsd,
    consumedUsd,
    budgetedConsumedUsd,
    unbudgetedConsumedUsd: consumedUsd - budgetedConsumedUsd,
    remainingUsd: budgetUsd - budgetedConsumedUsd,
    overUsd,
    definedCount,
    overCount,
  };
});

/** Cantidad total de registros guardados (ingresos, gastos, por pagar y por cobrar). */
export function countAllRecords(): number {
  return (
    $expenses.get().length +
    $incomes.get().length +
    $payables.get().length +
    $receivables.get().length
  );
}

/**
 * Borra todos los listados (ingresos, gastos, por pagar y por cobrar)
 * y los presupuestos por categoría. No afecta las tasas guardadas ni la
 * configuración. Acción irreversible.
 */
export function clearAllData(): void {
  $expenses.set([]);
  $incomes.set([]);
  $payables.set([]);
  $receivables.set([]);
  $budgets.set({});
  // No hay nada que exportar tras vaciar los listados.
  $hasUnexportedChanges.set(false);
}

/**
 * Indica si hay cambios en los listados que todavía no se han exportado a
 * Excel. Los datos de esta app viven solo en el navegador (localStorage):
 * si el usuario cierra la pestaña sin exportar, los perdería si borra el
 * sitio o cambia de dispositivo. Se usa para advertir al cerrar/salir.
 */
export const $hasUnexportedChanges = persistentAtom<boolean>(
  'presupuesto:dirty',
  false,
  { encode: JSON.stringify, decode: jsonOr<boolean>(false) },
);

/** Debe llamarse justo después de una exportación completa exitosa. */
export function markChangesExported(): void {
  $hasUnexportedChanges.set(false);
}

// Cualquier cambio en los listados (alta, baja, pago/cobro o importación)
// marca los datos como "sin exportar". Se registra una sola vez al cargar
// el módulo; las mutaciones del snapshot inicial (migración de sueldo) ya
// ocurrieron arriba antes de este punto, así que no disparan el flag.
if (typeof window !== 'undefined') {
  const markDirty = () => $hasUnexportedChanges.set(true);
  $expenses.listen(markDirty);
  $incomes.listen(markDirty);
  $payables.listen(markDirty);
  $receivables.listen(markDirty);
  $budgets.listen(markDirty);
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
  /** Cantidad de cuentas por cobrar pendientes */
  receivableCount: number;
  /** Total gastado (USDT) */
  expensesUsd: number;
  /** Total pendiente por pagar (USDT) */
  payablesUsd: number;
  /** Cantidad de cuentas por pagar pendientes */
  payablesCount: number;
  /** Ahorro actual: ingresos − gastos */
  netUsd: number;
  /** Saldo proyectado: net + por cobrar − por pagar */
  projectedUsd: number;
  /** Remanente proyectado como % de los ingresos */
  projectedPct: number;
  /** Tasa de ahorro: net / ingresos (%) */
  savingsRate: number;
}

/** Resumen de ahorro para el módulo "Saldo a favor" */
export const $savings = computed($stats, (s): SavingsBreakdown => {
  const net = s.incomeUsd - s.totalUsd;
  return {
    incomeUsd: s.incomeUsd,
    receivableUsd: s.receivableUsd,
    receivableCount: s.receivableCount,
    expensesUsd: s.totalUsd,
    payablesUsd: s.pendingUsd,
    payablesCount: s.pendingCount,
    netUsd: net,
    projectedUsd: net + s.receivableUsd - s.pendingUsd,
    projectedPct:
      s.incomeUsd > 0 ? ((net + s.receivableUsd - s.pendingUsd) / s.incomeUsd) * 100 : 0,
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
