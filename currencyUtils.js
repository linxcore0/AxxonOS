export const CURRENCIES = [
  { code: "USD", symbol: "$",    name: "USD - US Dollar",          baseRate: 1.0 },
  { code: "EUR", symbol: "€",    name: "EUR - Euro",               baseRate: 0.92 },
  { code: "GBP", symbol: "£",    name: "GBP - British Pound",       baseRate: 0.78 },
  { code: "NGN", symbol: "₦",    name: "NGN - Nigerian Naira",      baseRate: 1550.0 },
  { code: "CAD", symbol: "CA$",  name: "CAD - Canadian Dollar",     baseRate: 1.38 },
  { code: "AUD", symbol: "A$",   name: "AUD - Australian Dollar",   baseRate: 1.52 },
  { code: "ZAR", symbol: "R",    name: "ZAR - South African Rand",  baseRate: 18.50 },
  { code: "INR", symbol: "₹",    name: "INR - Indian Rupee",        baseRate: 83.50 },
  { code: "BRL", symbol: "R$",   name: "BRL - Brazilian Real",      baseRate: 5.50 },
  { code: "JPY", symbol: "¥",    name: "JPY - Japanese Yen",        baseRate: 155.0 },
  { code: "KES", symbol: "KSh",  name: "KES - Kenyan Shilling",     baseRate: 130.0 },
  { code: "GHS", symbol: "GH₵",  name: "GHS - Ghanaian Cedi",       baseRate: 15.50 },
  { code: "AED", symbol: "AED",  name: "AED - UAE Dirham",          baseRate: 3.67 },
];

export const DEFAULT_MARKUP = 15; // 15% higher rate for non-USD currencies

export function convertUSD(amountInUSD, targetCurrencyCode = "USD", markupPercent = DEFAULT_MARKUP) {
  const usdNum = Number(amountInUSD) || 0;
  const cur = CURRENCIES.find(c => c.code === targetCurrencyCode) || CURRENCIES[0];
  const mPercent = markupPercent !== undefined && markupPercent !== null && !isNaN(Number(markupPercent))
    ? Number(markupPercent)
    : DEFAULT_MARKUP;

  if (cur.code === "USD") {
    return {
      amount: usdNum,
      currency: "USD",
      code: "USD",
      symbol: "$",
      formatted: `$${usdNum.toLocaleString()} USD`,
      shortFormatted: `$${usdNum.toLocaleString()}`,
      isNormal: true,
      markupPercent: 0,
      effectiveRate: 1.0,
      rateText: "1 USD = $1.00 USD",
    };
  }

  // Non-USD: Higher equivalent rate conversion
  const markupMultiplier = 1 + mPercent / 100;
  const effectiveRate = cur.baseRate * markupMultiplier;
  const rawConverted = usdNum * effectiveRate;
  
  // Format logically depending on size (larger values like NGN/JPY rounded to integers)
  const convertedAmount = cur.baseRate > 10 ? Math.round(rawConverted) : Math.round(rawConverted * 100) / 100;

  const rateFormatted = cur.baseRate > 10
    ? `${cur.symbol}${Math.round(effectiveRate).toLocaleString()} ${cur.code}`
    : `${cur.symbol}${(Math.round(effectiveRate * 100) / 100).toLocaleString()} ${cur.code}`;

  return {
    amount: convertedAmount,
    currency: cur.code,
    code: cur.code,
    symbol: cur.symbol,
    formatted: `${cur.symbol}${convertedAmount.toLocaleString()} ${cur.code}`,
    shortFormatted: `${cur.symbol}${convertedAmount.toLocaleString()}`,
    isNormal: false,
    markupPercent: mPercent,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    rateText: `1 USD = ${rateFormatted} (${mPercent}% rate markup)`,
  };
}
