const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
/** Prefix an absolute site path with the configured base ("/riftvesting" on GitHub Pages, "" on the custom domain). */
export const url = (path: string) => `${base}${path.startsWith('/') ? path : '/' + path}`;

export const money = (n: number | null | undefined, opts: { compact?: boolean } = {}) => {
  if (n == null) return '—';
  if (opts.compact && n >= 10000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
};
export const pct = (x: number | null | undefined, digits = 1) => {
  if (x == null || !isFinite(x)) return '—';
  const v = x * 100;
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(digits)}%`;
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dateLong = (s: string | null | undefined) => {
  if (!s) return '—';
  const [y, m, d] = s.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
export const dateShort = (s: string | null | undefined) => {
  if (!s) return '—';
  const [, m, d] = s.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
};
export const saleType = (t: string) => ({ auction: 'Auction', buy_now: 'Buy now', best_offer: 'Best offer' } as Record<string, string>)[t] ?? t;
export const saleSource = (s: string) => ({ ebay: 'eBay', alt: 'ALT', pwcc: 'PWCC', goldin: 'Goldin' } as Record<string, string>)[s] ?? s;
export const num = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-US'));
