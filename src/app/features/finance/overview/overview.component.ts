import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart } from 'chart.js';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../../core/services/api.service';
import { FinanceSummary, ItemBreakdownRow, MonthlyRow } from '../../../core/models/models';
import { apiError, monthLabel, MONTHS_AR, yearLabel } from '../../../core/utils/format';
import { FORMAT_PIPES } from '../../../shared/components/pipes/formatting.pipe';
import { PALETTE, moneyChartOptions, renderChart } from '../../../shared/charts/chart-theme';

/** «الملخص» — treasury summary computed from the journal. */
@Component({
  selector: 'app-finance-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, ...FORMAT_PIPES],
  templateUrl: './overview.component.html',
})
export class OverviewComponent implements OnInit, OnDestroy {
  @ViewChild('monthlyCanvas') monthlyCanvas?: ElementRef<HTMLCanvasElement>;

  private api = inject(ApiService);
  private toastr = inject(ToastrService);

  data = signal<FinanceSummary | null>(null);
  loading = signal(true);
  chartYear = signal<number | 'all'>('all');
  hideZeroRows = signal(true);
  showMonthlyTable = signal(false);
  private chart: Chart | null = null;

  monthLabel = monthLabel;
  yearLabel = yearLabel;

  expenseRows = computed(() => this.filterRows(this.data()?.expenseByItem ?? []));
  incomeRows = computed(() => this.filterRows(this.data()?.incomeByItem ?? []));
  monthlyRows = computed(() => {
    const y = this.chartYear();
    const rows = this.data()?.monthly ?? [];
    return y === 'all' ? rows : rows.filter(r => r.year === y);
  });
  maxExpense = computed(() => Math.max(1, ...(this.data()?.expenseByItem ?? []).map(r => r.total)));
  maxIncome = computed(() => Math.max(1, ...(this.data()?.incomeByItem ?? []).map(r => r.total)));
  activities = computed(() => (this.data()?.activities ?? []).filter(a => a.count > 0));

  ngOnInit() { this.load(); }
  ngOnDestroy() { this.chart?.destroy(); }

  load() {
    this.loading.set(true);
    this.api.getSummary().subscribe({
      next: d => {
        this.data.set(d);
        this.loading.set(false);
        setTimeout(() => this.drawChart());
      },
      error: e => { this.loading.set(false); this.toastr.error(apiError(e, 'تعذر تحميل الملخص')); }
    });
  }

  selectYear(y: number | 'all') { this.chartYear.set(y); this.drawChart(); }

  private filterRows(rows: ItemBreakdownRow[]) {
    return this.hideZeroRows() ? rows.filter(r => r.total !== 0) : rows;
  }

  yearAmount(row: ItemBreakdownRow, year: number) {
    return row.byYear.find(y => y.year === year)?.amount ?? 0;
  }

  yearTotal(list: 'incomeByYear' | 'expenseByYear', year: number) {
    return this.data()?.[list].find(y => y.year === year)?.amount ?? 0;
  }

  monthTotals(rows: MonthlyRow[]) {
    return rows.reduce((a, r) => ({ income: a.income + r.income, expense: a.expense + r.expense }), { income: 0, expense: 0 });
  }

  private drawChart() {
    const rows = this.monthlyRows();
    const all = this.chartYear() === 'all';
    const labels = rows.map(r => all ? `${MONTHS_AR[r.month - 1].slice(0, 3)} ${String(r.year).slice(2)}` : MONTHS_AR[r.month - 1]);
    this.chart = renderChart(this.monthlyCanvas?.nativeElement, this.chart, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'الوارد', data: rows.map(r => r.income), backgroundColor: PALETTE.income + 'b3', borderColor: PALETTE.income, borderWidth: 1, borderRadius: 4 },
          { label: 'المنصرف', data: rows.map(r => r.expense), backgroundColor: PALETTE.expense + 'b3', borderColor: PALETTE.expense, borderWidth: 1, borderRadius: 4 },
          {
            label: 'الرصيد آخر الشهر', data: rows.map(r => r.closingBalance), type: 'line' as any,
            borderColor: PALETTE.balance, backgroundColor: PALETTE.balance + '22', borderWidth: 2.5,
            pointRadius: all ? 2 : 4, tension: .35, fill: true, yAxisID: 'y1',
          } as any,
        ],
      },
      options: moneyChartOptions({ secondaryAxis: true }),
    });
  }
}
