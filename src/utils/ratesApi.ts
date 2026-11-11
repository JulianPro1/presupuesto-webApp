import {
  $dolarVzlaApiKey,
  setRates,
  setRatesMeta,
  setRatesStatus,
} from '../stores/budgetStore';

/**
 * DolarVZLA:
 *  - BCV: JSON estático servido por CDN (sin auth, CORS abierto).
 *  - USDT: stream público por WebSocket que emite { currency, buy, sell, date }
 *    con las mejores puntas del libro de órdenes de Binance P2P (sin auth).
 *    El REST /public/usdt/exchange-rate requiere una API key que solo puede
 *    generarse desde el propio dominio de DolarVZLA, así que se usa el WS.
 */

const BCV_URL = 'https://rates.dolarvzla.com/bcv/current.json';
const USDT_REST_URL = 'https://api.dolarvzla.com/public/usdt/exchange-rate';
const USDT_WS_URL = 'wss://api.dolarvzla.com/public/ws/usdt-ves';

const ENV_API_KEY = import.meta.env.PUBLIC_DOLARVZLA_API_KEY ?? '';

interface BcvCurrentResponse {
  current?: {
    date?: string;
    usd?: number;
    eur?: number;
  };
}

interface UsdtExchangeRateResponse {
  current?: {
    buy?: number;
    sell?: number;
    average?: number;
    date?: string;
  };
}

/** Obtiene la tasa oficial BCV (USD/VES) desde el CDN de DolarVZLA. */
export async function syncBcvRate(): Promise<number> {
  const res = await fetch(BCV_URL, {
    headers: { Accept: 'application/json' },
    cache: 'no-cache',
  });
  if (!res.ok) throw new Error(`DolarVZLA CDN respondió HTTP ${res.status}`);

  const data = (await res.json()) as BcvCurrentResponse;
  const usd = data.current?.usd;
  if (typeof usd !== 'number' || !(usd > 0)) {
    throw new Error('Respuesta BCV inválida');
  }

  setRates({ bcv: usd });
  setRatesMeta({ bcvDate: data.current?.date ?? '' });
  return usd;
}

/**
 * Tasa USDT por REST (promedio compra/venta de Binance P2P).
 * Requiere PUBLIC_DOLARVZLA_API_KEY; sin key es no-op y devuelve false.
 */
export async function syncUsdtRate(): Promise<boolean> {
  const apiKey = $dolarVzlaApiKey.get() || ENV_API_KEY;
  if (!apiKey) return false;

  const res = await fetch(USDT_REST_URL, {
    headers: {
      Accept: 'application/json',
      'x-dolarvzla-key': apiKey,
    },
    cache: 'no-cache',
  });
  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? 'API key de DolarVZLA inválida o expirada'
        : `DolarVZLA API respondió HTTP ${res.status}`,
    );
  }

  const data = (await res.json()) as UsdtExchangeRateResponse;
  const average = data.current?.average;
  if (typeof average !== 'number' || !(average > 0)) {
    throw new Error('Respuesta USDT inválida');
  }

  setRates({ usdt: average });
  setRatesMeta({ usdtDate: data.current?.date ?? '' });
  return true;
}

interface UsdtWsEvent {
  currency?: string;
  buy?: number;
  sell?: number;
  average?: number;
  date?: string;
}

function isUsdtEvent(e: unknown): e is Required<UsdtWsEvent> {
  const ev = e as UsdtWsEvent;
  return (
    typeof ev?.buy === 'number' &&
    typeof ev?.sell === 'number' &&
    ev.buy > 0 &&
    ev.sell > 0
  );
}

/** Promedio publicado por el evento, o mid-point compra/venta. */
function eventAverage(e: Required<UsdtWsEvent>): number {
  return typeof e.average === 'number' && e.average > 0
    ? e.average
    : (e.buy + e.sell) / 2;
}

/**
 * Abre el stream público de USDT/VES y escribe el promedio compra/venta
 * en $rates.usdt en cada tick. Reconecta con backoff exponencial.
 * Devuelve una función para cerrar el stream.
 */
export function startUsdtStream(): () => void {
  let ws: WebSocket | null = null;
  let closed = false;
  let retries = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (closed) return;
    ws = new WebSocket(USDT_WS_URL);

    ws.onmessage = (ev) => {
      try {
        const raw = JSON.parse(String(ev.data)) as unknown;
        const events = Array.isArray(raw) ? raw : [raw];
        for (const e of events) {
          if (e == null || (e as UsdtWsEvent).currency !== 'USDT') continue;
          if (!isUsdtEvent(e)) continue;
          retries = 0;
          setRates({ usdt: eventAverage(e) });
          setRatesMeta({ usdtDate: e.date ?? '' });
          setRatesStatus('live');
        }
      } catch {
        // frame malformado: se ignora
      }
    };

    ws.onclose = () => {
      if (closed) return;
      retryTimer = setTimeout(
        connect,
        Math.min(30_000, 1_000 * 2 ** retries++),
      );
    };

    ws.onerror = () => {
      ws?.close();
    };
  };

  connect();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    ws?.close();
    ws = null;
  };
}

/**
 * Sincroniza ambas tasas: BCV por CDN y USDT por REST si hay API key.
 * Devuelve qué fuentes respondieron bien.
 */
export async function syncRates(): Promise<{ bcv: boolean; usdt: boolean }> {
  setRatesStatus('loading');
  const [bcv, usdt] = await Promise.allSettled([syncBcvRate(), syncUsdtRate()]);

  const ok = { bcv: bcv.status === 'fulfilled', usdt: usdt.status === 'fulfilled' && usdt.value };
  if (ok.bcv || ok.usdt) {
    setRatesStatus('idle');
  } else {
    setRatesStatus('error');
  }
  return ok;
}
