export function formatMoney(amount: number, currency: string): string {
  const locale = currency.toUpperCase() === "INR" ? "en-IN" : "en";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en")}`;
  }
}
