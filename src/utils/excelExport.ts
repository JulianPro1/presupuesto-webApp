import * as XLSX from 'xlsx';
import type {
  Expense,
  Income,
  Payable,
  Receivable,
  Rates,
} from '../stores/budgetStore';
import { contraValues } from '../stores/budgetStore';
import { monthLabel } from './formatters';

const USD_FMT = '"$ "#,##0.00';
const VES_FMT = '"Bs. "#,##0.00';
const RATE_FMT = '#,##0.00';
const NUM_FMT = '#,##0.00';
const PCT_FMT = '0.00%';

const FIRST_DATA_ROW = 9;
const LAST_COL = 12; // columna M (Vencimiento, solo en Por pagar)

export interface ExportInput {
  expenses: readonly Expense[];
  incomes: readonly Income[];
  payables: readonly Payable[];
  receivables: readonly Receivable[];
  rates: Rates;
  /** Total de ingresos en USDT (para el saldo disponible) */
  incomeUsd: number;
  date?: Date;
}

interface SheetRow {
  date: string;
  description: string;
  /** Categoría (gastos/por pagar) o Fuente (ingresos) */
  group: string;
  amount: number;
  currency: 'USDT' | 'VES';
  rateBcv: number;
  rateUsdt: number;
  dueDate?: string;
}

interface SheetOptions {
  title: string;
  thirdHeader: string;
  rows: SheetRow[];
  rates: Rates;
  incomeUsd: number;
  date: Date;
  /** Incluye la fila "Saldo disponible" al final (solo hoja Gastos) */
  withBalance?: boolean;
  /** Incluye columna extra "Vencimiento" (hoja Por pagar) */
  withDueDate?: boolean;
}

/**
 * Construye una hoja de datos con el mismo layout que el reporte original:
 *  - Filas 1-6: parámetros (mes, ingresos $B$3, tasas $B$4/$B$5, brecha)
 *  - Fila 8: encabezados; filas 9+: un movimiento por fila
 *  - Columnas H-L: fórmulas nativas sobre el snapshot de la fila
 *  - Columna M (opcional): vencimiento
 *  - Fila final: totales =SUM() y, si aplica, saldo =$B$3-I{total}
 */
function buildDataSheet(opts: SheetOptions): XLSX.WorkSheet {
  const {
    title,
    thirdHeader,
    rows,
    rates,
    incomeUsd,
    date,
    withBalance = false,
    withDueDate = false,
  } = opts;

  const headers = [
    'Fecha',
    'Descripción',
    thirdHeader,
    'Monto',
    'Moneda',
    'Tasa BCV',
    'Tasa USDT',
    'Monto $ BCV',
    'Monto $ USDT',
    'Bs. a BCV',
    'Bs. a USDT',
    'Brecha (Bs.)',
  ];
  if (withDueDate) headers.push('Vencimiento');

  const aoa: (string | number)[][] = [
    [title],
    ['Mes:', monthLabel(date)],
    ['Ingresos del mes (USDT):', incomeUsd],
    ['Tasa BCV actual (Bs./$):', rates.bcv],
    ['Tasa USDT actual (Bs./$):', rates.usdt],
    ['Brecha cambiaria actual:'],
    [],
    headers,
  ];

  const effectiveRates = rows.map((r) => ({
    bcv: r.rateBcv > 0 ? r.rateBcv : rates.bcv,
    usdt: r.rateUsdt > 0 ? r.rateUsdt : rates.usdt,
  }));

  rows.forEach((r, i) => {
    const row: (string | number)[] = [
      r.date,
      r.description,
      r.group,
      r.amount,
      r.currency === 'USDT' ? 'USDT' : 'Bs.',
      effectiveRates[i].bcv,
      effectiveRates[i].usdt,
      '',
      '',
      '',
      '',
      '',
    ];
    if (withDueDate) row.push(r.dueDate ?? '');
    aoa.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['B3'].z = USD_FMT;
  ws['B4'].z = RATE_FMT;
  ws['B5'].z = RATE_FMT;
  ws['B6'] = {
    t: 'n',
    f: '(B5-B4)/B4',
    v: rates.bcv > 0 ? (rates.usdt - rates.bcv) / rates.bcv : 0,
    z: PCT_FMT,
  };

  const lastDataRow = FIRST_DATA_ROW + rows.length - 1;
  let sumUsdBcv = 0;
  let sumUsdUsdt = 0;
  let sumVesBcv = 0;
  let sumVesUsdt = 0;

  rows.forEach((r, i) => {
    const row = FIRST_DATA_ROW + i;
    const c = contraValues(r, effectiveRates[i]);

    sumUsdBcv += c.usdBcv;
    sumUsdUsdt += c.usdUsdt;
    sumVesBcv += c.vesBcv;
    sumVesUsdt += c.vesUsdt;

    ws[`D${row}`].z = NUM_FMT;
    ws[`F${row}`].z = RATE_FMT;
    ws[`G${row}`].z = RATE_FMT;
    // $ a tasa BCV: USDT -> D*G/F  |  Bs. -> D/F
    ws[`H${row}`] = {
      t: 'n',
      f: `IF(E${row}="USDT",D${row}*G${row}/F${row},D${row}/F${row})`,
      v: c.usdBcv,
      z: USD_FMT,
    };
    // $ a tasa USDT: USDT -> D  |  Bs. -> D/G
    ws[`I${row}`] = {
      t: 'n',
      f: `IF(E${row}="USDT",D${row},D${row}/G${row})`,
      v: c.usdUsdt,
      z: USD_FMT,
    };
    // Bs. valorado a cada tasa a partir del costo real en USDT
    ws[`J${row}`] = { t: 'n', f: `I${row}*F${row}`, v: c.vesBcv, z: VES_FMT };
    ws[`K${row}`] = { t: 'n', f: `I${row}*G${row}`, v: c.vesUsdt, z: VES_FMT };
    ws[`L${row}`] = {
      t: 'n',
      f: `K${row}-J${row}`,
      v: c.gapVes,
      z: VES_FMT,
    };
  });

  const totalRow = lastDataRow + 1;
  ws[`A${totalRow}`] = { t: 's', v: 'TOTAL' };
  const totals: Record<string, { v: number; z: string }> = {
    H: { v: sumUsdBcv, z: USD_FMT },
    I: { v: sumUsdUsdt, z: USD_FMT },
    J: { v: sumVesBcv, z: VES_FMT },
    K: { v: sumVesUsdt, z: VES_FMT },
    L: { v: sumVesUsdt - sumVesBcv, z: VES_FMT },
  };
  for (const [col, { v, z }] of Object.entries(totals)) {
    ws[`${col}${totalRow}`] = {
      t: 'n',
      f: `SUM(${col}${FIRST_DATA_ROW}:${col}${lastDataRow})`,
      v,
      z,
    };
  }

  let lastRow = totalRow;
  if (withBalance) {
    const saldoRow = totalRow + 1;
    const remainingUsd = incomeUsd - sumUsdUsdt;
    ws[`A${saldoRow}`] = { t: 's', v: 'Saldo disponible (USDT):' };
    ws[`I${saldoRow}`] = {
      t: 'n',
      f: `$B$3-I${totalRow}`,
      v: remainingUsd,
      z: USD_FMT,
    };
    ws[`J${saldoRow}`] = {
      t: 'n',
      f: `I${saldoRow}*$B$4`,
      v: remainingUsd * rates.bcv,
      z: VES_FMT,
    };
    lastRow = saldoRow;
  }

  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastRow - 1, c: withDueDate ? LAST_COL : LAST_COL - 1 },
  });
  ws['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 32 }, // Descripción
    { wch: 15 }, // Categoría / Fuente
    { wch: 12 }, // Monto
    { wch: 8 }, // Moneda
    { wch: 11 }, // Tasa BCV
    { wch: 11 }, // Tasa USDT
    { wch: 13 }, // $ BCV
    { wch: 13 }, // $ USDT
    { wch: 15 }, // Bs. BCV
    { wch: 15 }, // Bs. USDT
    { wch: 14 }, // Brecha
    ...(withDueDate ? [{ wch: 12 }] : []), // Vencimiento
  ];
  ws['!merges'] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: withDueDate ? LAST_COL : LAST_COL - 1 },
    },
  ];

  return ws;
}

/**
 * Genera y descarga un .xlsx 100% en el cliente con tres hojas emparejadas:
 * "Ingresos", "Gastos" y "Por pagar" — todo el presupuesto viaja en un
 * solo archivo para poder reimportarlo completo.
 */
export function exportBudgetToExcel({
  expenses,
  incomes,
  payables,
  receivables,
  rates,
  incomeUsd,
  date = new Date(),
}: ExportInput): void {
  const wb = XLSX.utils.book_new();

  const incomeRows: SheetRow[] = incomes.map((i) => ({
    date: i.date,
    description: i.description,
    group: i.source,
    amount: i.amount,
    currency: i.currency,
    rateBcv: i.rateBcv,
    rateUsdt: i.rateUsdt,
  }));

  const expenseRows: SheetRow[] = expenses.map((e) => ({
    date: e.date,
    description: e.description,
    group: e.category,
    amount: e.amount,
    currency: e.currency,
    rateBcv: e.rateBcv,
    rateUsdt: e.rateUsdt,
  }));

  const payableRows: SheetRow[] = payables.map((p) => ({
    date: p.date,
    description: p.description,
    group: p.category,
    amount: p.amount,
    currency: p.currency,
    rateBcv: p.rateBcv,
    rateUsdt: p.rateUsdt,
    dueDate: p.dueDate,
  }));

  const receivableRows: SheetRow[] = receivables.map((r) => ({
    date: r.date,
    description: r.description,
    group: r.source,
    amount: r.amount,
    currency: r.currency,
    rateBcv: r.rateBcv,
    rateUsdt: r.rateUsdt,
    dueDate: r.dueDate,
  }));

  XLSX.utils.book_append_sheet(
    wb,
    buildDataSheet({
      title: 'INGRESOS DEL MES',
      thirdHeader: 'Fuente',
      rows: incomeRows,
      rates,
      incomeUsd,
      date,
    }),
    'Ingresos',
  );

  XLSX.utils.book_append_sheet(
    wb,
    buildDataSheet({
      title: 'REPORTE DE PRESUPUESTO MENSUAL',
      thirdHeader: 'Categoría',
      rows: expenseRows,
      rates,
      incomeUsd,
      date,
      withBalance: true,
    }),
    'Gastos',
  );

  XLSX.utils.book_append_sheet(
    wb,
    buildDataSheet({
      title: 'CUENTAS POR PAGAR',
      thirdHeader: 'Categoría',
      rows: payableRows,
      rates,
      incomeUsd,
      date,
      withDueDate: true,
    }),
    'Por pagar',
  );

  XLSX.utils.book_append_sheet(
    wb,
    buildDataSheet({
      title: 'CUENTAS POR COBRAR',
      thirdHeader: 'Fuente',
      rows: receivableRows,
      rates,
      incomeUsd,
      date,
      withDueDate: true,
    }),
    'Por cobrar',
  );

  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  XLSX.writeFile(wb, `presupuesto-${stamp}.xlsx`);
}
