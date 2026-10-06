import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart } from 'chart.js';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardData } from '../../core/models/models';
import { apiError, MONTHS_AR, yearLabel } from '../../core/utils/format';
import { FORMAT_PIPES } from '../../shared/components/pipes/formatting.pipe';
import { PALETTE, doughnutOptions, moneyChartOptions, renderChart } from '../../shared/charts/chart-theme';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ...FORMAT_PIPES],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('monthlyChartRef') monthlyChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('expenseChartRef') expenseChartRef?: ElementRef<HTMLCanvasElement>;

  private api = inject(ApiService);
  private toastr = inject(ToastrService);
  auth = inject(AuthService);

  data = signal<DashboardData | null>(null);
  loading = signal(true);
  private monthlyChart: Chart | null = null;
  private expenseChart: Chart | null = null;

  yearLabel = yearLabel;
  maxActivity = computed(() => Math.max(1, ...(this.data()?.activities ?? []).map(a => Math.max(a.income, a.expense))));

  ngOnInit() { this.load(); }

  /** Initial of the family name — «م/ محمود رجب» → «ر». */
  initial(name: string) {
    const parts = name.replace('م/', '').trim().split(/\s+/);
    return (parts[parts.length - 1] || name).charAt(0);
  }
  ngOnDestroy() { this.monthlyChart?.destroy(); this.expenseChart?.destroy(); }

  load(year?: number) {
    this.loading.set(true);
    this.api.getDashboard(year).subscribe({
      next: d => {
        this.data.set(d);
        this.loading.set(false);
        setTimeout(() => this.drawCharts());
      },
      error: e => { this.loading.set(false); this.toastr.error(apiError(e, 'تعذر تحميل لوحة التحكم')); }
    });
  }

  private drawCharts() {
    const d = this.data();
    if (!d) return;
    this.monthlyChart = renderChart(this.monthlyChartRef?.nativeElement, this.monthlyChart, {
      type: 'bar',
      data: {
        labels: d.monthly.map(m => MONTHS_AR[m.month - 1]),
        datasets: [
          { label: 'الوارد', data: d.monthly.map(m => m.income), backgroundColor: PALETTE.income + 'b3', borderColor: PALETTE.income, borderWidth: 1, borderRadius: 5 },
          { label: 'المنصرف', data: d.monthly.map(m => m.expense), backgroundColor: PALETTE.expense + 'b3', borderColor: PALETTE.expense, borderWidth: 1, borderRadius: 5 },
          { label: 'الرصيد آخر الشهر', data: d.monthly.map(m => m.closingBalance), type: 'line' as any, borderColor: PALETTE.balance,
            backgroundColor: PALETTE.balance + '22', borderWidth: 2.5, pointRadius: 3, tension: .35, fill: true, yAxisID: 'y1' } as any,
        ],
      },
      options: moneyChartOptions({ secondaryAxis: true }),
    });

    const top = d.topExpenseItems;
    this.expenseChart = renderChart(this.expenseChartRef?.nativeElement, this.expenseChart, {
      type: 'doughnut',
      data: {
        labels: top.map(e => e.name),
        datasets: [{ data: top.map(e => e.amount), backgroundColor: PALETTE.series.map(c => c + 'b3'), borderColor: PALETTE.series, borderWidth: 1.5, hoverOffset: 8 }],
      },
      options: doughnutOptions() as any,
    });
  }
}
