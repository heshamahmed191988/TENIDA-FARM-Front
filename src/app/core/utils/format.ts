// Formatting helpers — Egyptian pound (ج.م), Arabic digits, Gregorian dates.
// The shareholders section (installments / contributions) is in Saudi riyals (ر.س).

export const CURRENCY_SYMBOL = 'ج.م';
export const CURRENCY_NAME = 'جنيه مصري';
export const SAR_SYMBOL = 'ر.س';
export const SAR_NAME = 'ريال سعودي';

const numberFmt = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 });

export const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

/** 1234567.5 → "١٬٢٣٤٬٥٦٧٫٥" */
export function fmtNum(n: number | null | undefined): string {
  return numberFmt.format(n ?? 0);
}

/** Rounded integer with thousands separators. */
export function fmtInt(n: number | null | undefined): string {
  return intFmt.format(n ?? 0);
}

/** "١٬٢٣٤ ج.م" */
export function fmtMoney(n: number | null | undefined): string {
  return `${numberFmt.format(n ?? 0)} ${CURRENCY_SYMBOL}`;
}

/** "١٬٢٣٤ ر.س" */
export function fmtSar(n: number | null | undefined): string {
  return `${numberFmt.format(n ?? 0)} ${SAR_SYMBOL}`;
}

const rateFmt = new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Exchange rate EGP per SAR: "١٣٫١٩ ج.م / ريال" · plain → "١٣٫١٩" */
export function fmtRate(n: number | null | undefined, plain = false): string {
  if (!n || !isFinite(n)) return '—';
  return plain ? rateFmt.format(n) : `${rateFmt.format(n)} ج.م / ريال`;
}

/** Short form for charts / tight spaces: ١٫٢٥ م / ٤٥٫٠ ألف */
export function fmtCompact(n: number | null | undefined): string {
  const v = n ?? 0;
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${pctFmt.format(v / 1_000_000)} مليون`;
  if (abs >= 1_000) return `${pctFmt.format(v / 1_000)} ألف`;
  return intFmt.format(v);
}

/** Percent value already expressed 0–100. */
export function fmtPct(n: number | null | undefined): string {
  return `${pctFmt.format(n ?? 0)}٪`;
}

/** "2026-09-06T00:00:00" → "٦ سبتمبر ٢٠٢٦" */
export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d);
  if (isNaN(dt.getTime())) return '—';
  return `${intFmt.format(dt.getDate())} ${MONTHS_AR[dt.getMonth()]} ${intFmt.format(dt.getFullYear()).replace(/٬/g, '')}`;
}

/** Short numeric date: ٢٠٢٦/٠٩/٠٦ */
export function fmtDateShort(d: string | null | undefined): string {
  if (!d) return '—';
  const s = d.slice(0, 10).replace(/-/g, '/');
  return s.replace(/\d/g, x => '٠١٢٣٤٥٦٧٨٩'[+x]);
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS_AR[month - 1]} ${intFmt.format(year).replace(/٬/g, '')}`;
}

export function yearLabel(year: number): string {
  return intFmt.format(year).replace(/٬/g, '');
}

/** Today as yyyy-MM-dd (local). */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Extracts the user-facing message from an API error response. */
export function apiError(e: any, fallback = 'حدث خطأ غير متوقع'): string {
  return e?.error?.message || (e?.status === 0 ? 'تعذر الاتصال بالخادم' : fallback);
}

/** Triggers a browser download for a blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
