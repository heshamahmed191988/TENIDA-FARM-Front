import { Pipe, PipeTransform } from '@angular/core';
import { fmtCompact, fmtDate, fmtDateShort, fmtMoney, fmtNum, fmtPct, fmtRate, fmtSar } from '../../../core/utils/format';

/** `{{ amount | egp }}` → "١٢٬٣٤٥ ج.م" · `| egp:'plain'` → number only · `| egp:'compact'` → "١٢٫٣ ألف" */
@Pipe({ name: 'egp', standalone: true })
export class EgpPipe implements PipeTransform {
  transform(value: number | null | undefined, mode: 'full' | 'plain' | 'compact' = 'full'): string {
    if (mode === 'plain') return fmtNum(value);
    if (mode === 'compact') return fmtCompact(value);
    return fmtMoney(value);
  }
}

/** Saudi riyals (shareholders section): `{{ amount | sar }}` → "١٢٬٣٤٥ ر.س" · `| sar:'plain'` · `| sar:'compact'` */
@Pipe({ name: 'sar', standalone: true })
export class SarPipe implements PipeTransform {
  transform(value: number | null | undefined, mode: 'full' | 'plain' | 'compact' = 'full'): string {
    if (mode === 'plain') return fmtNum(value);
    if (mode === 'compact') return `${fmtCompact(value)} ر.س`;
    return fmtSar(value);
  }
}

/** EGP per SAR: `{{ rate | rate }}` → "١٣٫٢٠ ج.م / ريال" · `| rate:'plain'` → "١٣٫٢٠" */
@Pipe({ name: 'rate', standalone: true })
export class RatePipe implements PipeTransform {
  transform(value: number | null | undefined, mode: 'full' | 'plain' = 'full'): string { return fmtRate(value, mode === 'plain'); }
}

@Pipe({ name: 'pct', standalone: true })
export class PctPipe implements PipeTransform {
  transform(value: number | null | undefined): string { return fmtPct(value); }
}

/** `{{ date | arDate }}` → "٦ سبتمبر ٢٠٢٦" · `| arDate:'short'` → "٢٠٢٦/٠٩/٠٦" */
@Pipe({ name: 'arDate', standalone: true })
export class ArDatePipe implements PipeTransform {
  transform(value: string | null | undefined, mode: 'long' | 'short' = 'long'): string {
    return mode === 'short' ? fmtDateShort(value) : fmtDate(value);
  }
}

export const FORMAT_PIPES = [EgpPipe, SarPipe, RatePipe, PctPipe, ArDatePipe] as const;
