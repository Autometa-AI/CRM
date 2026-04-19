// Live exchange rates for AED ↔ USD ↔ INR etc.
// Source: open.er-api.com (free, no key, community tier). Next caches for 5 min.
// Fallback rates are used if the API is unreachable.

const FALLBACK_FROM_AED: Record<string, number> = {
  AED: 1,
  USD: 0.2723,
  INR: 22.89,
  EUR: 0.2518,
  GBP: 0.2147,
  SAR: 1.0209,
  GCC: 1,
};

export async function getRatesFromAED(): Promise<Record<string, number>> {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/AED", {
      next: { revalidate: 300 },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as { rates?: Record<string, number> };
    const rates = j.rates ?? {};
    if (!rates.USD || !rates.INR) throw new Error("missing rates");
    return rates;
  } catch {
    return FALLBACK_FROM_AED;
  }
}

export async function convert(amount: number, from: string, to: string): Promise<number> {
  if (!isFinite(amount)) return 0;
  const fromU = (from || "AED").toUpperCase();
  const toU = (to || "AED").toUpperCase();
  if (fromU === toU) return amount;
  const rates = await getRatesFromAED();
  const fromRate = fromU === "AED" ? 1 : rates[fromU];
  const toRate = toU === "AED" ? 1 : rates[toU];
  if (!fromRate || !toRate) return amount;
  return (amount / fromRate) * toRate;
}

export async function convertSum(
  items: Array<{ amount: number | null | undefined; currency?: string | null }>,
  to: string,
): Promise<number> {
  const rates = await getRatesFromAED();
  const toU = (to || "AED").toUpperCase();
  const toRate = toU === "AED" ? 1 : rates[toU] ?? 1;
  let total = 0;
  for (const { amount, currency } of items) {
    const n = typeof amount === "number" ? amount : parseFloat(String(amount ?? ""));
    if (!isFinite(n)) continue;
    const fromU = (currency || "AED").toUpperCase();
    const fromRate = fromU === "AED" ? 1 : rates[fromU] ?? 1;
    total += (n / fromRate) * toRate;
  }
  return total;
}
