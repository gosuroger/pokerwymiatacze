const currencyFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
});

export function formatMoney(grosze: number): string {
  return currencyFormatter.format(grosze / 100);
}

export function formatSignedMoney(grosze: number): string {
  if (grosze > 0) return `+${formatMoney(grosze)}`;
  if (grosze < 0) return `−${formatMoney(Math.abs(grosze))}`;
  return formatMoney(0);
}

export function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp));
}

export function parseMoneyInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
