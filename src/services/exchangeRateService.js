const CACHE_KEY = 'exchange_rates_cache';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function getCachedRates() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cached = JSON.parse(raw);
        if (Date.now() - cached.timestamp > CACHE_TTL) return null;
        return cached.rates;
    } catch {
        return null;
    }
}

function setCachedRates(rates) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, timestamp: Date.now() }));
}

/**
 * Fetch exchange rates from open.er-api.com (free, no key needed).
 * Returns an object like { UYU: 43.5, EUR: 0.92, BRL: 5.1, ... }
 * All rates are relative to 1 USD.
 */
export async function fetchExchangeRates() {
    const cached = getCachedRates();
    if (cached) return cached;

    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error('Error al obtener cotizaciones');
    const data = await res.json();

    if (data.result !== 'success') throw new Error('Error en respuesta de cotizaciones');

    setCachedRates(data.rates);
    return data.rates;
}

/**
 * Convert an amount from a given currency to USD.
 * @param {number} amount - The amount in the source currency
 * @param {string} currency - The source currency code (e.g. 'UYU', 'EUR')
 * @param {object} rates - Exchange rates object from fetchExchangeRates()
 * @returns {{ amountUsd: number, exchangeRate: number }}
 */
export function convertToUsd(amount, currency, rates) {
    if (currency === 'USD') {
        return { amountUsd: amount, exchangeRate: 1 };
    }

    const rate = rates[currency];
    if (!rate) throw new Error(`Moneda no soportada: ${currency}`);

    return {
        amountUsd: Math.round((amount / rate) * 100) / 100,
        exchangeRate: rate,
    };
}

export async function buildUsdConversion(amount, currency) {
    const normalizedAmount = Number(amount || 0);
    if (!Number.isFinite(normalizedAmount)) {
        throw new Error('Monto inválido para convertir.');
    }

    if ((currency || 'USD') === 'USD') {
        return { amountUsd: normalizedAmount, exchangeRate: 1 };
    }

    const rates = await fetchExchangeRates();
    return convertToUsd(normalizedAmount, currency, rates);
}

/** Common currencies for the selector */
export const CURRENCY_OPTIONS = [
    { value: 'USD', label: 'USD — Dólar americano' },
    { value: 'UYU', label: 'UYU — Peso uruguayo' },
    { value: 'EUR', label: 'EUR — Euro' },
    { value: 'BRL', label: 'BRL — Real brasileño' },
    { value: 'ARS', label: 'ARS — Peso argentino' },
    { value: 'GBP', label: 'GBP — Libra esterlina' },
];
