import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Chart } from 'chart.js';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ActivityReport, ActivitySummaryRow, JournalEntryInput } from '../../../core/models/models';
import { apiError, yearLabel } from '../../../core/utils/format';
import { FORMAT_PIPES } from '../../../shared/components/pipes/formatting.pipe';
import { PALETTE, moneyChartOptions, renderChart } from '../../../shared/charts/chart-theme';
import { EntryFormComponent } from '../shared/entry-form.component';

/** «تقرير كل نشاط» — P&L of one activity / crop. */
@Component({
  selector: 'app-finance-activities',
  standalone: true,
  imports: [CommonModule, RouterLink, EntryFormComponent, ...FORMAT_PIPES],
  templateUrl: './activities.component.html',
  styles: [`
    .act-layout { display:grid; grid-template-columns:minmax(230px,280px) 1fr; gap:1.25rem; align-items:start; }
    .act-list { position:sticky; top:80px; }
    @media (max-width: 900px) { .act-layout { grid-template-columns:1fr; } .act-list { position:static; } }
  `]
})
export class ActivitiesComponent implements OnInit, OnDestroy {
  @ViewChild('yearCanvas') yearCanvas?: ElementRef<HTMLCanvasElement>;

  private api = inject(ApiService);
  private toastr = inject(ToastrService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(AuthService);

  activities = signal<ActivitySummaryRow[]>([]);
  report = signal<ActivityReport | null>(null);
  selectedId = signal<string | null>(null);
  loading = signal(true);
  loadingReport = signal(false);
  showAllMovements = signal(false);
  newEntryPreset = signal<Partial<JournalEntryInput> | null>(null);
  private chart: Chart | null = null;

  yearLabel = yearLabel;
  movements = computed(() => {
    const m = [...(this.report()?.movements ?? [])].reverse();
    return this.showAllMovements() ? m : m.slice(0, 25);
  });
  maxExpenseItem = computed(() => Math.max(1, ...(this.report()?.expenseByItem ?? []).map(x => x.amount)));

  ngOnInit() { this.loadList(this.route.snapshot.queryParamMap.get('id')); }
  ngOnDestroy() { this.chart?.destroy(); }

  loadList(selectId?: string | null) {
    this.loading.set(true);
    this.api.getActivities().subscribe({
      next: list => {
        const sorted = [...list].sort((a, b) => b.count - a.count);
        this.activities.set(sorted);
        this.loading.set(false);
        const pick = selectId && sorted.some(a => a.activityId === selectId)
          ? selectId
          : this.selectedId() ?? sorted.find(a => a.income > 0)?.activityId ?? sorted[0]?.activityId;
        if (pick) this.select(pick);
      },
      error: e => { this.loading.set(false); this.toastr.error(apiError(e, 'تعذر تحميل الأنشطة')); }
    });
  }

  select(id: string) {
    this.selectedId.set(id);
    this.showAllMovements.set(false);
    this.router.navigate([], { queryParams: { id }, replaceUrl: true });
    this.loadingReport.set(true);
    this.api.getActivityReport(id).subscribe({
      next: r => { this.report.set(r); this.loadingReport.set(false); setTimeout(() => this.drawChart()); },
      error: e => { this.loadingReport.set(false); this.toastr.error(apiError(e)); }
    });
  }

  addMovement() {
    const r = this.report();
    if (r) this.newEntryPreset.set({ activityId: r.activityId, type: 'Expense' });
  }

  onSaved() {
    this.newEntryPreset.set(null);
    this.loadList(this.selectedId());
  }

  private drawChart() {
    const r = this.report();
    if (!r) return;
    this.chart = renderChart(this.yearCanvas?.nativeElement, this.chart, {
      type: 'bar',
      data: {
        labels: r.byYear.map(y => yearLabel(y.year)),
        datasets: [
          { label: 'الإيرادات', data: r.byYear.map(y => y.income), backgroundColor: PALETTE.income + 'b3', borderColor: PALETTE.income, borderWidth: 1, borderRadius: 5 },
          { label: 'المصروفات', data: r.byYear.map(y => y.expense), backgroundColor: PALETTE.expense + 'b3', borderColor: PALETTE.expense, borderWidth: 1, borderRadius: 5 },
          { label: 'الصافي', data: r.byYear.map(y => y.net), type: 'line' as any, borderColor: PALETTE.balance, backgroundColor: PALETTE.balance, borderWidth: 2.5, pointRadius: 5, tension: .3 } as any,
        ],
      },
      options: moneyChartOptions(),
    });
  }
}
