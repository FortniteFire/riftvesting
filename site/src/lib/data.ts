import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

// The site lives in <repo>/site; the data files live in <repo>.
export const DATA_ROOT = resolve(process.env.DATA_ROOT ?? '..');

export type Sale = {
  date: string; price: number; type: string; source: string; via: string; unpaid: boolean; url?: string;
};
export type Grade = {
  alt_item_id?: string; alt_url?: string;
  alt_value?: { as_of: string; value: number; low: number; high: number } | null;
  last_checked?: string; image?: string; sales: Sale[];
};
export type Card = {
  card: { id: string; game: string; set: string; set_code: string; number: string; name: string; variant: string; title?: string; alt_title?: string; notes?: string };
  pops: Record<string, any>;
  grades: Record<string, Grade>;
};
export type Slot = { number: string | null; name: string; title?: string | null; variant?: string; rarity?: string; card_id: string | null };
export type Section = { key: string; label: string; complete?: boolean; slots: Slot[] };
export type SetDef = { code: string; name: string; released: string | null; size: number | null; note?: string; sections: Section[] };
export type InventoryItem = {
  id: string; card_id: string; grade: string; cert: string; status: string; ask: number | null;
  photos: { front?: string | null; back?: string | null }; notes?: string; added?: string; sold?: { date: string; price: number };
};

const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

let _cards: Card[] | null = null;
export function loadCards(): Card[] {
  if (_cards) return _cards;
  const dir = join(DATA_ROOT, 'cards');
  _cards = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => readJson(join(dir, f)) as Card)
    : [];
  return _cards;
}
export const cardById = (id: string) => loadCards().find((c) => c.card.id === id);
export function loadSets(): SetDef[] {
  const p = join(DATA_ROOT, 'sets.json');
  return existsSync(p) ? (readJson(p).sets as SetDef[]) : [];
}
export function loadInventory(): InventoryItem[] {
  const p = join(DATA_ROOT, 'inventory.json');
  return existsSync(p) ? (readJson(p).items as InventoryItem[]) : [];
}

// ---------- dates ----------
export const TODAY = new Date().toISOString().slice(0, 10);
const dayMs = 86400000;
export const toDate = (s: string) => new Date(s + 'T00:00:00Z');
export const daysBetween = (a: string, b: string) => Math.round((toDate(a).getTime() - toDate(b).getTime()) / dayMs);
export const shiftDate = (s: string, days: number) => new Date(toDate(s).getTime() + days * dayMs).toISOString().slice(0, 10);

// ---------- stats ----------
export type GradeStats = {
  paid: Sale[];
  last: Sale | null; prev: Sale | null; vsPrev: number | null;
  ref30: Sale | null; vs30: number | null;
  window: Sale[]; windowLabel: string; windowFrom: string | null; windowTo: string | null;
  n: number; avg: number | null; median: number | null; high: number | null; low: number | null;
};

const med = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function gradeStats(g: Grade, today = TODAY): GradeStats {
  // Sales arrive newest first; keep that order for ties, sort defensively by date.
  const paid = g.sales.filter((s) => !s.unpaid).slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const last = paid[0] ?? null, prev = paid[1] ?? null;
  const vsPrev = last && prev ? last.price / prev.price - 1 : null;

  // Reference sale ~30 days before the latest sale: nearest on or before that date, else the oldest more recent sale.
  let ref30: Sale | null = null;
  if (last && paid.length > 1) {
    const target = shiftDate(last.date, -30);
    ref30 = paid.find((s) => s.date <= target && s !== last) ?? paid[paid.length - 1];
    if (ref30 === last) ref30 = null;
  }
  const vs30 = last && ref30 ? last.price / ref30.price - 1 : null;

  const cut = shiftDate(today, -30);
  let window = paid.filter((s) => s.date >= cut);
  let windowLabel = 'last 30 days';
  if (window.length < 3) { window = paid.slice(0, 10); windowLabel = `last ${window.length} sales`; }
  const prices = window.map((s) => s.price);
  return {
    paid, last, prev, vsPrev, ref30, vs30, window, windowLabel,
    windowFrom: window.length ? window[window.length - 1].date : null,
    windowTo: window.length ? window[0].date : null,
    n: window.length, avg: mean(prices), median: med(prices),
    high: prices.length ? Math.max(...prices) : null, low: prices.length ? Math.min(...prices) : null,
  };
}

// 30-day median vs the 30 days before it. Needs 3 sales in each window.
export function mover(g: Grade, today = TODAY): { pct: number; now: number; before: number; n: number } | null {
  const paid = g.sales.filter((s) => !s.unpaid);
  const c1 = shiftDate(today, -30), c2 = shiftDate(today, -60);
  const now = paid.filter((s) => s.date >= c1).map((s) => s.price);
  const before = paid.filter((s) => s.date >= c2 && s.date < c1).map((s) => s.price);
  if (now.length < 3 || before.length < 3) return null;
  const a = med(now)!, b = med(before)!;
  return { pct: a / b - 1, now: a, before: b, n: now.length };
}

export type PopStat = { grader: string; total: number; tens: number; bl: number; gem: number | null };
export function popStats(pops: Record<string, any>): PopStat[] {
  return ['PSA', 'BGS', 'CGC', 'TAG', 'SGC'].filter((g) => pops[g]).map((grader) => {
    const dist = pops[grader] as Record<string, number>;
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    const tens = dist['10'] ?? 0, bl = dist['BL'] ?? 0;
    return { grader, total, tens, bl, gem: total ? tens / total : null };
  });
}

export const graderOf = (grade: string) => grade.split(' ')[0];
export const gradeLabel = (grade: string) => {
  const [grader, num] = grade.split(' ');
  if (grader === 'PSA' && num === '10') return 'Gem Mint';
  if (grader === 'BGS' && num === '10') return 'Pristine';
  if (grader === 'BGS' && num === 'BL') return 'Black Label';
  if (grader === 'CGC' && num === '10') return 'Gem Mint';
  if (num === '9.5') return 'Gem Mint';
  if (num === '9') return 'Mint';
  return '';
};

export type SaleRow = { card: Card; grade: string; sale: Sale };
export function allSales(): SaleRow[] {
  const rows: SaleRow[] = [];
  for (const card of loadCards()) for (const [grade, g] of Object.entries(card.grades))
    for (const sale of g.sales) if (!sale.unpaid) rows.push({ card, grade, sale });
  return rows.sort((a, b) => (a.sale.date < b.sale.date ? 1 : a.sale.date > b.sale.date ? -1 : b.sale.price - a.sale.price));
}

export const cardTitle = (c: Card) => (c.card.title ? `${c.card.name}, ${c.card.title}` : c.card.name);
export const numberLabel = (c: Card) => `#${c.card.number}`;
export const firstImage = (c: Card) => Object.values(c.grades).find((g) => g.image)?.image ?? null;
