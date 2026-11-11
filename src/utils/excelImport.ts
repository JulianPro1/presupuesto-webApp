import * as XLSX from 'xlsx';
import {
  CATEGORIES,
  INCOME_SOURCES,
  type Category,
  type ExpenseCurrency,
  type IncomeSource,
} from '../stores/budgetStore';
import { parseAmount } from './formatters';

export interface ExcelValidationError {
  cell: string;       // ej. "C3"
  row: number;        // Número de fila en Excel (1-indexed, ej. 3)
  col: number;        // Índice de columna (0-indexed, ej. 2 para C)
  colLetter: string;  // Letra de columna en Excel, ej. "C"
  header: string;     // Nombre de la cabecera correspondiente
  value: string;      // Valor encontrado o representación
  message: string;    // Explicación amigable del error
  sheet: string;      // Hoja de Excel donde ocurrió el error
}

export interface ParsedExpenseItem {
  date: string;
  description: string;
  category: Category;
  amount: number;
  currency: ExpenseCurrency;
  rateBcv?: number;
  rateUsdt?: number;
}

export interface ParsedIncomeItem {
  date: string;
  description: string;
  source: IncomeSource;
  amount: number;
  currency: ExpenseCurrency;
  rateBcv?: number;
  rateUsdt?: number;
}

export interface ParsedPayableItem {
  date: string;
  description: string;
  category: Category;
  amount: number;
  currency: ExpenseCurrency;
  dueDate?: string;
  rateBcv?: number;
  rateUsdt?: number;
}

export interface ParsedReceivableItem {
  date: string;
  description: string;
  source: IncomeSource;
  amount: number;
  currency: ExpenseCurrency;
  dueDate?: string;
  rateBcv?: number;
  rateUsdt?: number;
}

export type SheetKind = 'expenses' | 'incomes' | 'payables' | 'receivables';

export interface DetectedSheet {
  kind: SheetKind;
  sheetName: string;
  itemCount: number;
}

export interface WorkbookValidationResult {
  isValid: boolean;
  errors: ExcelValidationError[];
  expenses: ParsedExpenseItem[];
  incomes: ParsedIncomeItem[];
  payables: ParsedPayableItem[];
  receivables: ParsedReceivableItem[];
  sheets: DetectedSheet[];
  /** Filas de datos detectadas en total (todas las hojas) */
  totalRows: number;
}

/**
 * Normaliza una cadena para comparación quitando tildes y caracteres especiales.
 */
function cleanStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza y valida la categoría contra CATEGORIES.
 */
function matchCategory(raw: unknown): Category | null {
  const clean = cleanStr(raw);
  if (!clean) return null;

  for (const cat of CATEGORIES) {
    if (cleanStr(cat) === clean) {
      return cat;
    }
  }
  return null;
}

/**
 * Normaliza y valida la fuente de ingreso contra INCOME_SOURCES.
 */
function matchIncomeSource(raw: unknown): IncomeSource | null {
  const clean = cleanStr(raw);
  if (!clean) return null;

  for (const src of INCOME_SOURCES) {
    if (cleanStr(src) === clean) {
      return src;
    }
  }
  return null;
}

/**
 * Normaliza la moneda a 'USDT' o 'VES'.
 */
function matchCurrency(raw: unknown): ExpenseCurrency | null {
  const clean = cleanStr(raw);
  if (!clean) return null;

  if (['usdt', 'usd', 'dolar', 'dolares'].includes(clean)) {
    return 'USDT';
  }
  if (['bs', 'bs.', 'ves', 'bolivar', 'bolivares'].includes(clean)) {
    return 'VES';
  }
  return null;
}

/**
 * Normaliza fechas provenientes de Excel (Date, serial numérico o string).
 * Devuelve "YYYY-MM-DD" o null si no es válida.
 */
function parseDateCell(val: unknown): string | null {
  if (!val) return null;

  // Si ya es un objeto Date
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Si es un número serial de Excel
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        const y = parsed.y;
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // Ignorar fallback
    }
  }

  // Si es texto
  const s = String(val).trim();
  if (!s) return null;

  // Formato YYYY-MM-DD o YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    const testDate = new Date(`${y}-${m}-${d}T00:00:00`);
    if (!isNaN(testDate.getTime())) return `${y}-${m}-${d}`;
  }

  // Formato DD-MM-YYYY o DD/MM/YYYY
  const latamMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (latamMatch) {
    const d = latamMatch[1].padStart(2, '0');
    const m = latamMatch[2].padStart(2, '0');
    const y = latamMatch[3];
    const testDate = new Date(`${y}-${m}-${d}T00:00:00`);
    if (!isNaN(testDate.getTime())) return `${y}-${m}-${d}`;
  }

  return null;
}

/** Clasifica una hoja del workbook por su nombre */
function classifySheet(name: string): SheetKind | null {
  const s = cleanStr(name);
  if (/cobrar|receiv/.test(s)) return 'receivables';
  if (/ingreso|income/.test(s)) return 'incomes';
  if (/pagar|pendiente|deuda|payable/.test(s)) return 'payables';
  if (/gasto|presupuesto|expense|plantilla/.test(s)) return 'expenses';
  return null;
}

interface ColumnMap {
  dateCol?: number;
  descCol?: number;
  groupCol?: number;
  amountCol?: number;
  currencyCol?: number;
  bcvCol?: number;
  usdtCol?: number;
  dueCol?: number;
}

interface ParsedRow {
  date: string;
  description: string;
  /** Categoría o fuente, según el tipo de hoja */
  group: string;
  amount: number;
  currency: ExpenseCurrency;
  dueDate?: string;
  rateBcv?: number;
  rateUsdt?: number;
}

interface SheetParseOutcome {
  items: ParsedRow[];
  errors: ExcelValidationError[];
  totalRows: number;
}

/**
 * Valida una hoja de datos (gastos, ingresos o por pagar) casilla por casilla.
 */
function parseDataSheet(
  ws: XLSX.WorkSheet,
  sheetName: string,
  kind: SheetKind,
): SheetParseOutcome {
  const errors: ExcelValidationError[] = [];
  const items: ParsedRow[] = [];

  const isIncomeLike = kind === 'incomes' || kind === 'receivables';
  const hasDueDate = kind === 'payables' || kind === 'receivables';
  const groupHeader = isIncomeLike ? 'Fuente' : 'Categoría';
  const groupOptions: readonly string[] = isIncomeLike
    ? INCOME_SOURCES
    : CATEGORIES;
  const matchGroup = (raw: unknown): string | null =>
    isIncomeLike ? matchIncomeSource(raw) : matchCategory(raw);

  if (!ws || !ws['!ref']) {
    errors.push({
      cell: 'A1',
      row: 1,
      col: 0,
      colLetter: 'A',
      header: 'General',
      value: '',
      message: `La hoja "${sheetName}" está completamente vacía.`,
      sheet: sheetName,
    });
    return { items, errors, totalRows: 0 };
  }

  const range = XLSX.utils.decode_range(ws['!ref']);
  const maxRows = range.e.r + 1;
  const maxCols = range.e.c + 1;

  // Localizar fila de encabezados
  let headerRowIndex = -1;
  const colMap: ColumnMap = {};

  for (let r = 0; r < Math.min(maxRows, 15); r++) {
    const tempMap: ColumnMap = {};
    for (let c = 0; c < maxCols; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellAddress];
      const val = cleanStr(cell ? cell.v : '');

      if (/^fecha$|^date$/i.test(val)) tempMap.dateCol = c;
      else if (/descrip|concepto|detalle/i.test(val)) tempMap.descCol = c;
      else if (/categor/i.test(val)) {
        if (!isIncomeLike) tempMap.groupCol = c;
      } else if (/fuente|source|origen|tipo/i.test(val)) {
        if (isIncomeLike) tempMap.groupCol = c;
      } else if (/^monto$|^importe$|^precio$|^amount$/i.test(val))
        tempMap.amountCol = c;
      else if (/^moneda$|^divisa$|^currency$/i.test(val))
        tempMap.currencyCol = c;
      else if (/vencim|due\s*date/i.test(val)) tempMap.dueCol = c;
      else if (/tasa\s*bcv|bcv/i.test(val) && tempMap.bcvCol === undefined)
        tempMap.bcvCol = c;
      else if (/tasa\s*usdt|usdt/i.test(val) && tempMap.usdtCol === undefined)
        tempMap.usdtCol = c;
    }

    if (
      tempMap.dateCol !== undefined &&
      tempMap.descCol !== undefined &&
      tempMap.amountCol !== undefined
    ) {
      headerRowIndex = r;
      Object.assign(colMap, tempMap);
      break;
    }
  }

  // Si no se encontraron encabezados obligatorios
  if (headerRowIndex === -1) {
    errors.push({
      cell: 'A1',
      row: 1,
      col: 0,
      colLetter: 'A',
      header: 'Encabezados',
      value: '',
      message: `No se encontraron los encabezados obligatorios en la hoja "${sheetName}". Debe incluir al menos: "Fecha", "Descripción", "${groupHeader}", "Monto" y "Moneda".`,
      sheet: sheetName,
    });
    return { items, errors, totalRows: 0 };
  }

  // Verificar si faltan columnas requeridas específicas
  const requiredCols: { key: keyof ColumnMap; name: string }[] = [
    { key: 'dateCol', name: 'Fecha' },
    { key: 'descCol', name: 'Descripción' },
    { key: 'groupCol', name: groupHeader },
    { key: 'amountCol', name: 'Monto' },
    { key: 'currencyCol', name: 'Moneda' },
  ];

  for (const req of requiredCols) {
    if (colMap[req.key] === undefined) {
      errors.push({
        cell: `Fila ${headerRowIndex + 1}`,
        row: headerRowIndex + 1,
        col: 0,
        colLetter: 'A',
        header: req.name,
        value: '(Columna ausente)',
        message: `Falta la columna obligatoria "${req.name}" en la fila de encabezados de la hoja "${sheetName}".`,
        sheet: sheetName,
      });
    }
  }

  if (errors.length > 0) {
    return { items, errors, totalRows: 0 };
  }

  const startRow = headerRowIndex + 1;
  let totalDataRows = 0;

  // Recorrer fila por fila de datos
  for (let r = startRow; r < maxRows; r++) {
    const excelRow = r + 1; // 1-indexed para el usuario

    // Obtener valores de celdas para esta fila
    const getCell = (colIdx?: number) => {
      if (colIdx === undefined) return undefined;
      const addr = XLSX.utils.encode_cell({ r, c: colIdx });
      return ws[addr];
    };

    const rawDate = getCell(colMap.dateCol)?.v;
    const rawDesc = getCell(colMap.descCol)?.v;
    const rawGroup = getCell(colMap.groupCol)?.v;
    const rawAmount = getCell(colMap.amountCol)?.v;
    const rawCurrency = getCell(colMap.currencyCol)?.v;
    const rawDue = getCell(colMap.dueCol)?.v;
    const rawBcv = getCell(colMap.bcvCol)?.v;
    const rawUsdt = getCell(colMap.usdtCol)?.v;

    // Verificar si la fila está completamente vacía
    const isRowEmpty = [
      rawDate,
      rawDesc,
      rawGroup,
      rawAmount,
      rawCurrency,
      rawDue,
    ].every((v) => v === undefined || v === null || String(v).trim() === '');
    if (isRowEmpty) continue;

    // Verificar si es fila de totales o resumen al pie de la tabla
    const firstCellStr = cleanStr(rawDate);
    if (
      firstCellStr.includes('total') ||
      firstCellStr.includes('saldo disponible')
    ) {
      break;
    }

    totalDataRows++;

    // Guardaremos los errores de esta fila evaluando columna por columna en orden A -> Z
    // Casilla 1: Fecha
    const dateColIdx = colMap.dateCol!;
    const dateColLetter = XLSX.utils.encode_col(dateColIdx);
    const dateCellAddr = `${dateColLetter}${excelRow}`;
    let parsedDate: string | null = null;

    if (rawDate === undefined || rawDate === null || String(rawDate).trim() === '') {
      errors.push({
        cell: dateCellAddr,
        row: excelRow,
        col: dateColIdx,
        colLetter: dateColLetter,
        header: 'Fecha',
        value: '(vacío)',
        message:
          'La fecha es obligatoria. Ingrese una fecha en formato YYYY-MM-DD o DD/MM/YYYY.',
        sheet: sheetName,
      });
    } else {
      parsedDate = parseDateCell(rawDate);
      if (!parsedDate) {
        errors.push({
          cell: dateCellAddr,
          row: excelRow,
          col: dateColIdx,
          colLetter: dateColLetter,
          header: 'Fecha',
          value: String(rawDate),
          message: `Formato de fecha inválido ("${rawDate}"). Se espera YYYY-MM-DD o DD/MM/YYYY.`,
          sheet: sheetName,
        });
      }
    }

    // Casilla 2: Descripción
    const descColIdx = colMap.descCol!;
    const descColLetter = XLSX.utils.encode_col(descColIdx);
    const descCellAddr = `${descColLetter}${excelRow}`;
    let parsedDesc = '';

    if (rawDesc === undefined || rawDesc === null || String(rawDesc).trim() === '') {
      errors.push({
        cell: descCellAddr,
        row: excelRow,
        col: descColIdx,
        colLetter: descColLetter,
        header: 'Descripción',
        value: '(vacío)',
        message: 'La descripción no puede estar vacía.',
        sheet: sheetName,
      });
    } else {
      parsedDesc = String(rawDesc).trim();
    }

    // Casilla 3: Categoría / Fuente
    const groupColIdx = colMap.groupCol!;
    const groupColLetter = XLSX.utils.encode_col(groupColIdx);
    const groupCellAddr = `${groupColLetter}${excelRow}`;
    let parsedGroup: string | null = null;

    if (rawGroup === undefined || rawGroup === null || String(rawGroup).trim() === '') {
      errors.push({
        cell: groupCellAddr,
        row: excelRow,
        col: groupColIdx,
        colLetter: groupColLetter,
        header: groupHeader,
        value: '(vacío)',
        message: `La ${groupHeader.toLowerCase()} es obligatoria. Opciones válidas: ${groupOptions.join(', ')}.`,
        sheet: sheetName,
      });
    } else {
      parsedGroup = matchGroup(rawGroup);
      if (!parsedGroup) {
        errors.push({
          cell: groupCellAddr,
          row: excelRow,
          col: groupColIdx,
          colLetter: groupColLetter,
          header: groupHeader,
          value: String(rawGroup),
          message: `${groupHeader} no válida ("${rawGroup}"). Opciones permitidas: ${groupOptions.join(', ')}.`,
          sheet: sheetName,
        });
      }
    }

    // Casilla 4: Monto
    const amountColIdx = colMap.amountCol!;
    const amountColLetter = XLSX.utils.encode_col(amountColIdx);
    const amountCellAddr = `${amountColLetter}${excelRow}`;
    let parsedAmount = 0;

    if (rawAmount === undefined || rawAmount === null || String(rawAmount).trim() === '') {
      errors.push({
        cell: amountCellAddr,
        row: excelRow,
        col: amountColIdx,
        colLetter: amountColLetter,
        header: 'Monto',
        value: '(vacío)',
        message: 'El monto es obligatorio y debe ser mayor a 0.',
        sheet: sheetName,
      });
    } else {
      if (typeof rawAmount === 'number') {
        parsedAmount = rawAmount;
      } else {
        parsedAmount = parseAmount(String(rawAmount));
      }

      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        errors.push({
          cell: amountCellAddr,
          row: excelRow,
          col: amountColIdx,
          colLetter: amountColLetter,
          header: 'Monto',
          value: String(rawAmount),
          message: `El monto debe ser un número positivo mayor a 0 (se encontró "${rawAmount}").`,
          sheet: sheetName,
        });
      }
    }

    // Casilla 5: Moneda
    const currencyColIdx = colMap.currencyCol!;
    const currencyColLetter = XLSX.utils.encode_col(currencyColIdx);
    const currencyCellAddr = `${currencyColLetter}${excelRow}`;
    let parsedCurrency: ExpenseCurrency | null = null;

    if (rawCurrency === undefined || rawCurrency === null || String(rawCurrency).trim() === '') {
      errors.push({
        cell: currencyCellAddr,
        row: excelRow,
        col: currencyColIdx,
        colLetter: currencyColLetter,
        header: 'Moneda',
        value: '(vacío)',
        message: 'La moneda es obligatoria. Debe ser "USDT" o "Bs.".',
        sheet: sheetName,
      });
    } else {
      parsedCurrency = matchCurrency(rawCurrency);
      if (!parsedCurrency) {
        errors.push({
          cell: currencyCellAddr,
          row: excelRow,
          col: currencyColIdx,
          colLetter: currencyColLetter,
          header: 'Moneda',
          value: String(rawCurrency),
          message: `Moneda no reconocida ("${rawCurrency}"). Debe ser "USDT" o "Bs." (VES).`,
          sheet: sheetName,
        });
      }
    }

    // Casilla 6: Vencimiento (opcional, por pagar / por cobrar)
    let parsedDue: string | undefined;
    if (
      hasDueDate &&
      colMap.dueCol !== undefined &&
      rawDue !== undefined &&
      rawDue !== null &&
      String(rawDue).trim() !== ''
    ) {
      const dueColIdx = colMap.dueCol;
      const dueColLetter = XLSX.utils.encode_col(dueColIdx);
      const dueCellAddr = `${dueColLetter}${excelRow}`;
      const parsed = parseDateCell(rawDue);
      if (!parsed) {
        errors.push({
          cell: dueCellAddr,
          row: excelRow,
          col: dueColIdx,
          colLetter: dueColLetter,
          header: 'Vencimiento',
          value: String(rawDue),
          message: `Formato de vencimiento inválido ("${rawDue}"). Se espera YYYY-MM-DD o DD/MM/YYYY.`,
          sheet: sheetName,
        });
      } else {
        parsedDue = parsed;
      }
    }

    // Casilla 7: Tasa BCV (Opcional)
    let parsedBcv: number | undefined;
    if (colMap.bcvCol !== undefined && rawBcv !== undefined && rawBcv !== null && String(rawBcv).trim() !== '') {
      const bcvColIdx = colMap.bcvCol;
      const bcvColLetter = XLSX.utils.encode_col(bcvColIdx);
      const bcvCellAddr = `${bcvColLetter}${excelRow}`;
      const numBcv = typeof rawBcv === 'number' ? rawBcv : parseAmount(String(rawBcv));
      if (!Number.isFinite(numBcv) || numBcv < 0) {
        errors.push({
          cell: bcvCellAddr,
          row: excelRow,
          col: bcvColIdx,
          colLetter: bcvColLetter,
          header: 'Tasa BCV',
          value: String(rawBcv),
          message: 'La tasa BCV debe ser un número mayor o igual a 0.',
          sheet: sheetName,
        });
      } else {
        parsedBcv = numBcv;
      }
    }

    // Casilla 8: Tasa USDT (Opcional)
    let parsedUsdt: number | undefined;
    if (colMap.usdtCol !== undefined && rawUsdt !== undefined && rawUsdt !== null && String(rawUsdt).trim() !== '') {
      const usdtColIdx = colMap.usdtCol;
      const usdtColLetter = XLSX.utils.encode_col(usdtColIdx);
      const usdtCellAddr = `${usdtColLetter}${excelRow}`;
      const numUsdt = typeof rawUsdt === 'number' ? rawUsdt : parseAmount(String(rawUsdt));
      if (!Number.isFinite(numUsdt) || numUsdt < 0) {
        errors.push({
          cell: usdtCellAddr,
          row: excelRow,
          col: usdtColIdx,
          colLetter: usdtColLetter,
          header: 'Tasa USDT',
          value: String(rawUsdt),
          message: 'La tasa USDT debe ser un número mayor o igual a 0.',
          sheet: sheetName,
        });
      } else {
        parsedUsdt = numUsdt;
      }
    }

    // Si toda la fila fue válida, guardar el movimiento
    if (parsedDate && parsedDesc && parsedGroup && parsedAmount > 0 && parsedCurrency) {
      items.push({
        date: parsedDate,
        description: parsedDesc,
        group: parsedGroup,
        amount: parsedAmount,
        currency: parsedCurrency,
        dueDate: parsedDue,
        rateBcv: parsedBcv,
        rateUsdt: parsedUsdt,
      });
    }
  }

  return { items, errors, totalRows: totalDataRows };
}

/**
 * Lee un workbook Excel y valida todas las hojas reconocidas
 * ("Ingresos", "Gastos", "Por pagar"). Si el archivo no tiene hojas
 * reconocibles, se intenta importar la primera hoja como gastos
 * (compatibilidad con archivos exportados por versiones anteriores).
 */
export async function parseAndValidateWorkbook(
  file: File,
): Promise<WorkbookValidationResult> {
  const result: WorkbookValidationResult = {
    isValid: false,
    errors: [],
    expenses: [],
    incomes: [],
    payables: [],
    receivables: [],
    sheets: [],
    totalRows: 0,
  };

  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
  });

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    result.errors.push({
      cell: 'A1',
      row: 1,
      col: 0,
      colLetter: 'A',
      header: 'General',
      value: '',
      message: 'El archivo Excel no contiene ninguna hoja válida.',
      sheet: '',
    });
    return result;
  }

  // Clasificar hojas reconocidas; si ninguna aplica, usar la primera como gastos
  const targets = wb.SheetNames.map((name) => ({
    name,
    kind: classifySheet(name),
  })).filter((t): t is { name: string; kind: SheetKind } => t.kind !== null);

  if (targets.length === 0) {
    targets.push({ name: wb.SheetNames[0], kind: 'expenses' });
  }

  for (const { name, kind } of targets) {
    const ws = wb.Sheets[name];
    const outcome = parseDataSheet(ws, name, kind);
    result.errors.push(...outcome.errors);
    result.totalRows += outcome.totalRows;

    if (outcome.items.length > 0 || outcome.errors.length === 0) {
      result.sheets.push({
        kind,
        sheetName: name,
        itemCount: outcome.items.length,
      });
    }

    for (const item of outcome.items) {
      const base = {
        date: item.date,
        description: item.description,
        amount: item.amount,
        currency: item.currency,
        rateBcv: item.rateBcv,
        rateUsdt: item.rateUsdt,
      };
      if (kind === 'incomes') {
        result.incomes.push({ ...base, source: item.group as IncomeSource });
      } else if (kind === 'receivables') {
        result.receivables.push({
          ...base,
          source: item.group as IncomeSource,
          dueDate: item.dueDate,
        });
      } else if (kind === 'payables') {
        result.payables.push({
          ...base,
          category: item.group as Category,
          dueDate: item.dueDate,
        });
      } else {
        result.expenses.push({ ...base, category: item.group as Category });
      }
    }
  }

  // Ordenar errores estrictamente por el orden de casillas de Excel:
  // 1. Por hoja  2. Por fila  3. Por columna
  result.errors.sort((a, b) => {
    if (a.sheet !== b.sheet) return a.sheet.localeCompare(b.sheet);
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Genera y descarga una plantilla Excel oficial del presupuesto con las
 * tres hojas emparejadas (Ingresos, Gastos, Por pagar), ejemplos y una
 * hoja de instrucciones.
 */
export function downloadBudgetTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Ingresos
  const incomeHeaders = [
    'Fecha',
    'Descripción',
    'Fuente',
    'Monto',
    'Moneda',
    'Tasa BCV',
    'Tasa USDT',
  ];
  const incomeRows = [
    ['2026-10-01', 'Sueldo mensual', 'Sueldo', 450, 'USDT', '', ''],
    ['2026-10-05', 'Proyecto freelance diseño web', 'Freelance', 120, 'USDT', '', ''],
    ['2026-10-08', 'Venta de artículos usados', 'Ventas', 3500, 'Bs.', '', ''],
  ];
  const wsIncome = XLSX.utils.aoa_to_sheet([incomeHeaders, ...incomeRows]);
  wsIncome['!cols'] = [
    { wch: 14 },
    { wch: 38 },
    { wch: 18 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsIncome, 'Ingresos');

  // Hoja 2: Gastos
  const expenseHeaders = [
    'Fecha',
    'Descripción',
    'Categoría',
    'Monto',
    'Moneda',
    'Tasa BCV',
    'Tasa USDT',
  ];
  const expenseRows = [
    ['2026-10-01', 'Compras del supermercado', 'Alimentación', 45.5, 'USDT', '', ''],
    ['2026-10-02', 'Pago de servicio eléctrico e internet', 'Servicios', 1250.0, 'Bs.', '', ''],
    ['2026-10-03', 'Consultas médicas y farmacia', 'Salud', 25.0, 'USDT', '', ''],
    ['2026-10-04', 'Mantenimiento del vehículo', 'Transporte', 35.0, 'USDT', '', ''],
  ];
  const wsExpenses = XLSX.utils.aoa_to_sheet([expenseHeaders, ...expenseRows]);
  wsExpenses['!cols'] = [
    { wch: 14 },
    { wch: 38 },
    { wch: 18 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Gastos');

  // Hoja 3: Por pagar
  const payableHeaders = [
    'Fecha',
    'Descripción',
    'Categoría',
    'Monto',
    'Moneda',
    'Vencimiento',
    'Tasa BCV',
    'Tasa USDT',
  ];
  const payableRows = [
    ['2026-10-05', 'Alquiler del mes', 'Vivienda', 300, 'USDT', '2026-10-10', '', ''],
    ['2026-10-06', 'Mensualidad del gimnasio', 'Salud', 20, 'USDT', '2026-10-15', '', ''],
  ];
  const wsPayables = XLSX.utils.aoa_to_sheet([payableHeaders, ...payableRows]);
  wsPayables['!cols'] = [
    { wch: 14 },
    { wch: 38 },
    { wch: 18 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPayables, 'Por pagar');

  // Hoja 4: Por cobrar
  const receivableHeaders = [
    'Fecha',
    'Descripción',
    'Fuente',
    'Monto',
    'Moneda',
    'Vencimiento',
    'Tasa BCV',
    'Tasa USDT',
  ];
  const receivableRows = [
    ['2026-10-05', 'Pago pendiente proyecto freelance', 'Freelance', 80, 'USDT', '2026-10-20', '', ''],
    ['2026-10-07', 'Venta por cobrar equipo usado', 'Ventas', 60, 'USDT', '2026-10-25', '', ''],
  ];
  const wsReceivables = XLSX.utils.aoa_to_sheet([
    receivableHeaders,
    ...receivableRows,
  ]);
  wsReceivables['!cols'] = [
    { wch: 14 },
    { wch: 38 },
    { wch: 18 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsReceivables, 'Por cobrar');

  // Hoja 5: Instrucciones y opciones permitidas
  const instructions = [
    ['GUÍA DE LLENADO DE LA PLANTILLA'],
    [],
    [
      'El archivo contiene cuatro hojas: "Ingresos", "Gastos", "Por pagar" y "Por cobrar".',
      'Todas se importan juntas desde el mismo archivo.',
    ],
    [],
    ['Columna', 'Obligatorio', 'Formato aceptado', 'Notas y Opciones permitidas'],
    [
      'Fecha',
      'SÍ',
      'YYYY-MM-DD o DD/MM/YYYY',
      'Ejemplo: 2026-10-01 o 01/10/2026.',
    ],
    [
      'Descripción',
      'SÍ',
      'Texto libre',
      'Detalle explicativo del movimiento (ej. Supermercado semanal).',
    ],
    [
      'Categoría (Gastos / Por pagar)',
      'SÍ',
      'Categoría exacta',
      `Opciones válidas: ${CATEGORIES.join(', ')}.`,
    ],
    [
      'Fuente (Ingresos / Por cobrar)',
      'SÍ',
      'Fuente exacta',
      `Opciones válidas: ${INCOME_SOURCES.join(', ')}.`,
    ],
    [
      'Monto',
      'SÍ',
      'Número positivo',
      'Monto mayor a 0 (ej. 45.50 o 1200).',
    ],
    [
      'Moneda',
      'SÍ',
      'USDT o Bs.',
      'Escribe "USDT" para dólares/USDT o "Bs." para bolívares.',
    ],
    [
      'Vencimiento (Por pagar / Por cobrar)',
      'NO (Opcional)',
      'YYYY-MM-DD o DD/MM/YYYY',
      'Fecha límite de pago o cobro de la cuenta.',
    ],
    [
      'Tasa BCV',
      'NO (Opcional)',
      'Número',
      'Si se deja vacío, la app aplicará automáticamente la tasa BCV actual.',
    ],
    [
      'Tasa USDT',
      'NO (Opcional)',
      'Número',
      'Si se deja vacío, la app aplicará automáticamente la tasa USDT actual.',
    ],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [
    { wch: 28 },
    { wch: 14 },
    { wch: 25 },
    { wch: 60 },
  ];

  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  XLSX.writeFile(wb, 'plantilla_presupuesto.xlsx');
}
