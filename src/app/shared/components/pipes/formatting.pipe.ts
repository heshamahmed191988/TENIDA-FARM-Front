import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'sar', standalone: true })
export class SarPipe implements PipeTransform {
  transform(value: number | null | undefined, compact = false): string {
    const n = value ?? 0;
    if (compact) {
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M ﷼';
      if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K ﷼';
    }
    return n.toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ﷼';
  }
}

@Pipe({ name: 'hijriDate', standalone: true })
export class HijriDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    return d.toLocaleDateString('ar-SA-u-ca-gregory', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}

@Pipe({ name: 'arabicNumber', standalone: true })
export class ArabicNumberPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return (value ?? 0).toLocaleString('ar-SA');
  }
}
