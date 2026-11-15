import {
  $dolarVzlaApiKey,
  setRates,
  setRatesMeta,
  setRatesStatus,
} from '../stores/budgetStore';

/**
 * Fuentes de tasas con fallback:
 *  - BCV: DolarVZLA CDN → DolarApi "oficial".
 *  - USDT: DolarVZLA REST (requiere key) → DolarApi "paralelo" como proxy
 *    del mercado P2P. El stream WS de DolarVZLA se mantiene por si revive.
 *  - DolarApi (ve.dolarapi.com): gratis, sin auth, CORS abierto.
 */

const BCV_URL = 'https://rates.dolarvzla.com/bcv/current.json';
const USDT_REST_URL = 'https://api.dolarvzla.com/public/usdt/exchange-rate';
const USDT_WS_URL = 'wss://api.dolarvzla.com/public/ws/usdt-ves';
const DOLARAPI_BASE = 'https://ve.dolarapi.com/v1/dolares';

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

interface DolarApiRate {
  promedio?: number;
  fechaActualizacion?: string;
}

/** Consulta una fuente de DolarApi ('oficial' | 'paralelo'). */
async function fetchDolarApi(
  source: 'oficial' | 'paralelo',
): Promise<{ rate: number; date: string }> {
  const res = await fetch(`${DOLARAPI_BASE}/${source}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-cache',
  });
  if (!res.ok) throw new Error(`DolarApi respondió HTTP ${res.status}`);

  const data = (await res.json()) as DolarApiRate;
  if (typeof data.promedio !== 'number' || !(data.promedio > 0)) {
    throw new Error('Respuesta DolarApi inválida');
  }
  return { rate: data.promedio, date: data.fechaActualizacion ?? '' };
}

/** Obtiene la tasa oficial BCV: DolarVZLA CDN → DolarApi "oficial". */
export async function syncBcvRate(): Promise<number> {
  try {
    const res = await fetch(BCV_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-cache',
    });
    if (!res.ok)
      throw new Error(`DolarVZLA CDN respondió HTTP ${res.status}`);

    const data = (await res.json()) as BcvCurrentResponse;
    const usd = data.current?.usd;
    if (typeof usd !== 'number' || !(usd > 0)) {
      throw new Error('Respuesta BCV inválida');
    }

    setRates({ bcv: usd });
    setRatesMeta({ bcvDate: data.current?.date ?? '' });
    return usd;
  } catch {
    const { rate, date } = await fetchDolarApi('oficial');
    setRates({ bcv: rate });
    setRatesMeta({ bcvDate: date });
    return rate;
  }
}

/**
 * Tasa USDT: DolarVZLA REST (si hay key) → DolarApi "paralelo" como
 * fallback (su promedio se calcula del mismo mercado P2P).
 */
export async function syncUsdtRate(): Promise<boolean> {
  const apiKey = $dolarVzlaApiKey.get() || ENV_API_KEY;

  if (apiKey) {
    try {
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
    } catch {
      // cae al fallback de DolarApi
    }
  }

  const { rate, date } = await fetchDolarApi('paralelo');
  setRates({ usdt: rate });
  setRatesMeta({ usdtDate: date });
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
 * Sincroniza ambas tasas con cadena de fallback DolarVZLA → DolarApi.
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
