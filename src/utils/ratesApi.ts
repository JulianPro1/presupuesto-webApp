import { setRates, setRatesMeta, setRatesStatus } from '../stores/budgetStore';

/**
 * Fuente única de tasas: usdt.com.ve (gratis, sin API key, CORS abierto).
 * Un solo endpoint entrega BCV y USDT (Binance P2P) en la misma respuesta.
 * Atribución requerida por su licencia CC-BY-4.0: https://www.usdt.com.ve
 */

const USDT_VE_URL = 'https://www.usdt.com.ve/api/v1/rates/current';

interface UsdtVeResponse {
  success?: boolean;
  data?: {
    binance?: { buy_rate?: number };
    bcv?: { rate?: number };
    captured_at?: string;
  };
}

interface RatesSnapshot {
  bcv: number;
  usdt: number;
  date: string;
}

/** Consulta usdt.com.ve y valida que ambas tasas vengan presentes. */
async function fetchRatesSnapshot(): Promise<RatesSnapshot> {
  const res = await fetch(USDT_VE_URL, {
    headers: { Accept: 'application/json' },
    cache: 'no-cache',
  });
  if (!res.ok) throw new Error(`usdt.com.ve respondió HTTP ${res.status}`);

  const json = (await res.json()) as UsdtVeResponse;
  const bcv = json.data?.bcv?.rate;
  const usdt = json.data?.binance?.buy_rate;
  if (typeof bcv !== 'number' || !(bcv > 0)) {
    throw new Error('Respuesta usdt.com.ve sin tasa BCV válida');
  }
  if (typeof usdt !== 'number' || !(usdt > 0)) {
    throw new Error('Respuesta usdt.com.ve sin tasa USDT válida');
  }

  return { bcv, usdt, date: json.data?.captured_at ?? '' };
}

/** Obtiene la tasa oficial BCV (USD/VES) desde usdt.com.ve. */
export async function syncBcvRate(): Promise<number> {
  const { bcv, date } = await fetchRatesSnapshot();
  setRates({ bcv });
  setRatesMeta({ bcvDate: date });
  return bcv;
}

/** Obtiene el USDT/VES de Binance P2P desde usdt.com.ve. */
export async function syncUsdtRate(): Promise<boolean> {
  const { usdt, date } = await fetchRatesSnapshot();
  setRates({ usdt });
  setRatesMeta({ usdtDate: date });
  return true;
}

/**
 * Sincroniza BCV y USDT en una sola petición a usdt.com.ve.
 * Devuelve qué tasas quedaron actualizadas.
 */
export async function syncRates(): Promise<{ bcv: boolean; usdt: boolean }> {
  setRatesStatus('loading');
  try {
    const { bcv, usdt, date } = await fetchRatesSnapshot();
    setRates({ bcv, usdt });
    setRatesMeta({ bcvDate: date, usdtDate: date });
    setRatesStatus('idle');
    return { bcv: true, usdt: true };
  } catch {
    setRatesStatus('error');
    return { bcv: false, usdt: false };
  }
}
