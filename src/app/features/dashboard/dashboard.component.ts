import { Component, OnInit, signal, computed, inject, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardStats, MonthlyChart } from '../../core/models/models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('monthlyChartRef') monthlyChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('expenseChartRef') expenseChartRef!: ElementRef<HTMLCanvasElement>;

  private api  = inject(ApiService);
  auth         = inject(AuthService);
  Math         = Math;

  stats        = signal<DashboardStats | null>(null);
  loading      = signal(true);
  selectedYear = signal(2025);
  private monthlyChart: Chart | null = null;
  private expenseChart: Chart | null = null;

  totalShContributions = computed(() => (this.stats()?.shareholders || []).reduce((a,s) => a + s.totalPaid, 0));

  kpis = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      { label: 'إجمالي الوارد',     value: s.summary.totalIncome,              icon: '📈', cls: 'green',  sub: 'منذ يناير 2024' },
      { label: 'إجمالي المصروف',    value: s.summary.totalExpense,             icon: '📉', cls: 'red',    sub: 'جميع البنود' },
      { label: 'الرصيد الحالي',     value: s.summary.currentBalance,           icon: '💰', cls: 'gold',   sub: 'رصيد الخزينة' },
      { label: 'متأخرات المساهمين', value: s.summary.totalOverdueInstallments, icon: '⚠️', cls: 'purple', sub: 'يحتاج متابعة' },
    ];
  });

  ngOnInit() { this.loadStats(); }
  ngAfterViewInit() { /* charts init after data */ }

  loadStats() {
    this.loading.set(true);
    this.api.getDashboardStats().subscribe({
      next: data => {
        this.stats.set(data);
        this.loading.set(false);
        setTimeout(() => {
          const months = this.selectedYear() === 2024 ? data.monthlyChart2024 : data.monthlyChart2025;
          this.initMonthlyChart(months || data.monthlyChart2025);
          this.initExpenseChart(data.expenseSummary || []);
        }, 150);
      },
      error: () => {
        this.loading.set(false);
        // Use fallback data from Excel
        this.stats.set(this.getFallbackStats());
        setTimeout(() => {
          const s = this.stats()!;
          this.initMonthlyChart(s.monthlyChart2025);
          this.initExpenseChart(s.expenseSummary);
        }, 150);
      }
    });
  }

  changeYear(year: number) {
    this.selectedYear.set(year);
    const s = this.stats();
    if (!s) return;
    const months = year === 2024 ? s.monthlyChart2024 : s.monthlyChart2025;
    if (months) this.updateMonthlyChart(months);
    else this.api.getMonthlyChart(year).subscribe(r => r.months && this.updateMonthlyChart(r.months));
  }

  private initMonthlyChart(months: MonthlyChart[]) {
    if (!this.monthlyChartRef?.nativeElement) return;
    if (this.monthlyChart) this.monthlyChart.destroy();
    const ctx = this.monthlyChartRef.nativeElement.getContext('2d')!;
    this.monthlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months.map(m => m.monthNameAr),
        datasets: [
          { label: 'الوارد',   data: months.map(m => m.totalIncome),  backgroundColor: 'rgba(76,175,80,.7)',   borderColor: '#4caf50', borderWidth: 1.5, borderRadius: 5 },
          { label: 'المصروف', data: months.map(m => m.totalExpense), backgroundColor: 'rgba(244,67,54,.7)',   borderColor: '#f44336', borderWidth: 1.5, borderRadius: 5 },
          { label: 'الرصيد',  data: months.map(m => m.balance), type: 'line' as any, borderColor: '#c8a84b', backgroundColor: 'rgba(200,168,75,.08)', borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#c8a84b', tension: 0.4, fill: true, yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { labels: { color: '#a5c8b0', font: { family: 'Cairo', size: 11 }, padding: 14 } },
          tooltip: { backgroundColor: 'rgba(9,20,38,.95)', borderColor: 'rgba(200,168,75,.3)', borderWidth: 1, titleColor: '#c8a84b', bodyColor: '#e8f5e9', padding: 10, callbacks: { label: ctx => `${ctx.dataset.label}: ${(+ctx.parsed.y).toLocaleString('ar-SA')} ﷼` } }
        },
        scales: {
          x:  { ticks: { color: '#6b8c7a', font: { family: 'Cairo', size: 10 } }, grid: { color: 'rgba(255,255,255,.04)' } },
          y:  { ticks: { color: '#6b8c7a', font: { family: 'Cairo', size: 10 }, callback: v => `${(+v/1000).toFixed(0)}K` }, grid: { color: 'rgba(255,255,255,.04)' } },
          y1: { position: 'left', ticks: { color: '#c8a84b', font: { family: 'Cairo', size: 9 }, callback: v => `${(+v/1000).toFixed(0)}K` }, grid: { display: false } }
        }
      }
    });
  }

  private updateMonthlyChart(months: MonthlyChart[]) {
    if (!this.monthlyChart) return;
    this.monthlyChart.data.labels = months.map(m => m.monthNameAr);
    this.monthlyChart.data.datasets[0].data = months.map(m => m.totalIncome);
    this.monthlyChart.data.datasets[1].data = months.map(m => m.totalExpense);
    (this.monthlyChart.data.datasets[2] as any).data = months.map(m => m.balance);
    this.monthlyChart.update('active');
  }

  private initExpenseChart(expenses: { category: string; amount: number }[]) {
    if (!this.expenseChartRef?.nativeElement) return;
    if (this.expenseChart) this.expenseChart.destroy();
    const top10 = [...expenses].sort((a,b) => b.amount - a.amount).slice(0, 10);
    const colors = ['#4caf50','#c8a84b','#2196f3','#9c27b0','#f44336','#ff9800','#00bcd4','#8bc34a','#e91e63','#607d8b'];
    const ctx = this.expenseChartRef.nativeElement.getContext('2d')!;
    this.expenseChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: top10.map(e => e.category),
        datasets: [{ data: top10.map(e => e.amount), backgroundColor: colors.map(c => c+'99'), borderColor: colors, borderWidth: 2, hoverOffset: 10 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
          legend: { position: 'left', labels: { color: '#a5c8b0', font: { family: 'Cairo', size: 10 }, padding: 8, boxWidth: 10 } },
          tooltip: { backgroundColor: 'rgba(9,20,38,.95)', borderColor: 'rgba(200,168,75,.3)', borderWidth: 1, bodyColor: '#e8f5e9', callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString('ar-SA')} ﷼` } }
        }
      }
    });
  }

  fmt(n: number): string { return (n||0).toLocaleString('ar-SA', { minimumFractionDigits: 0 }); }
  fmtCompact(n: number): string {
    if (n >= 1_000_000) return (n/1_000_000).toFixed(2)+'M';
    if (n >= 1_000)     return (n/1_000).toFixed(1)+'K';
    return n.toFixed(0);
  }

  // Fallback stats from real Excel data (used when backend is offline)
  private getFallbackStats(): DashboardStats {
    const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return {
      summary: { totalIncome: 14483724, totalExpense: 13793343, currentBalance: 690381, totalOverdueInstallments: 40000, netProfit: 690381 },
      shareholders: [
        { id:'1', nameAr:'م/ محمود رجب',        ownershipPercentage:25, totalRequired:270000, totalPaid:270000, balance:0,      paymentProgressPct:100 },
        { id:'2', nameAr:'م/ محمود حسين',       ownershipPercentage:25, totalRequired:270000, totalPaid:260000, balance:-10000, paymentProgressPct:96.3 },
        { id:'3', nameAr:'م/ محمد نجيب',        ownershipPercentage:25, totalRequired:270000, totalPaid:270000, balance:0,      paymentProgressPct:100 },
        { id:'4', nameAr:'م/ محمد عبد الهادي',  ownershipPercentage:25, totalRequired:270000, totalPaid:240000, balance:-30000, paymentProgressPct:88.9 },
      ],
      expenseSummary: [
        { category:'تجهيز وتصليح الأرض', amount:3042200 }, { category:'إيجار الأرض', amount:2998000 },
        { category:'الطاقة الشمسية', amount:1844500 },      { category:'البئر', amount:1653220 },
        { category:'شبكة الري', amount:1618155 },            { category:'رواتب', amount:585500 },
        { category:'أسمدة', amount:420650 },                 { category:'البرسيم الحجازي', amount:641100 },
        { category:'طرق', amount:315000 },                   { category:'الإنشاءات', amount:247003 },
      ],
      incomeSummary: [
        { source:'م/ محمود رجب', amount:3170995 }, { source:'م/ محمد نجيب', amount:3156580 },
        { source:'م/ محمود حسين', amount:3060440 },{ source:'م/ محمد عبد الهادي', amount:2777009 },
        { source:'البرسيم الحجازي', amount:1196700 }, { source:'زراعة موسمية', amount:1122000 },
      ],
      monthlyChart2024: monthNames.slice(0,12).map((n,i) => ({ month:i+1, monthNameAr:n, totalIncome: [2298440,160000,757810,630200,150000,320000,580000,350000,840000,852000,220000,690000][i]||0, totalExpense:[1500000,920000,600000,500000,350000,420000,380000,490000,960000,750000,280000,500000][i]||0, balance:0 })),
      monthlyChart2025: monthNames.slice(0,12).map((n,i) => ({ month:i+1, monthNameAr:n, totalIncome:[400000,250000,320000,1050000,200000,950000,850000,0,450000,1300000,300000,590000][i]||0, totalExpense:[300000,800000,400000,400000,850000,600000,500000,400000,800000,500000,380000,450000][i]||0, balance:0 })),
    };
  }
}
