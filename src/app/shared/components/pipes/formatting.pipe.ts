import { Pipe, PipeTransform } from '@angular/core';
import { fmtCompact, fmtDate, fmtDateShort, fmtMoney, fmtNum, fmtPct } from '../../../core/utils/format';

/** `{{ amount | egp }}` → "١٢٬٣٤٥ ج.م" · `| egp:'plain'` → number only · `| egp:'compact'` → "١٢٫٣ ألف" */
@Pipe({ name: 'egp', standalone: true })
export class EgpPipe implements PipeTransform {
  transform(value: number | null | undefined, mode: 'full' | 'plain' | 'compact' = 'full'): string {
    if (mode === 'plain') return fmtNum(value);
    if (mode === 'compact') return fmtCompact(value);
    return fmtMoney(value);
  }
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

export const FORMAT_PIPES = [EgpPipe, PctPipe, ArDatePipe] as const;
