import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Chart } from 'chart.js';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { FinanceStateService } from '../../../core/services/finance-state.service';
import { PayrollEmployeeRow, PayrollReport, Worker } from '../../../core/models/models';
import { apiError, MONTHS_AR, monthLabel, todayIso, yearLabel } from '../../../core/utils/format';
import { FORMAT_PIPES } from '../../../shared/components/pipes/formatting.pipe';
import { AttachmentUploaderComponent } from '../../../shared/components/attachments/attachment-uploader.component';
import { PALETTE, moneyChartOptions, renderChart } from '../../../shared/charts/chart-theme';

/** «الرواتب» + employees. Paying a salary books an expense on «رواتب» in the journal. */
@Component({
  selector: 'app-finance-payroll',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, AttachmentUploaderComponent, ...FORMAT_PIPES],
  templateUrl: './payroll.component.html',
})
export class PayrollComponent implements OnInit, OnDestroy {
  @ViewChild('monthCanvas') monthCanvas?: ElementRef<HTMLCanvasElement>;

  private api = inject(ApiService);
  private toastr = inject(ToastrService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);
  state = inject(FinanceStateService);

  report = signal<PayrollReport | null>(null);
  workers = signal<Worker[]>([]);
  loading = signal(true);
  saving = signal(false);
  attachmentIds: string[] = [];
  uploading = signal(false);
  submitted = signal(false);
  showInactive = signal(false);
  paymentsYear = signal<number | 'all'>('all');
  paymentsWorker = signal<string>('');
  chartYear = signal<number | 'all'>('all');

  payFor = signal<Worker | null>(null);
  workerModal = signal<{ worker: Worker | null } | null>(null);
  private chart: Chart | null = null;

  yearLabel = yearLabel;
  monthLabel = monthLabel;
  today = todayIso();

  payForm = this.fb.group({
    date: [todayIso(), Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    description: [''],
    paymentMethodId: [''],
    documentNumber: [''],
    notes: [''],
  });

  workerForm = this.fb.group({
    nameAr: ['', Validators.required],
    nameEn: [''],
    role: ['عامل', Validators.required],
    monthlySalary: [null as number | null, Validators.min(0)],
    hireDate: [''],
    phone: [''],
    nationalId: [''],
    notes: [''],
    isActive: [true],
  });

  visibleWorkers = computed(() => this.workers().filter(w => this.showInactive() || w.isActive));
  activeCount = computed(() => this.workers().filter(w => w.isActive).length);
  monthlyCommitment = computed(() => this.workers().filter(w => w.isActive).reduce((a, w) => a + (w.monthlySalary ?? 0), 0));
  employeeRows = computed(() => (this.report()?.employees ?? []).filter(e => e.total > 0 || e.isActive));
  payments = computed(() => {
    const y = this.paymentsYear(), w = this.paymentsWorker();
    return (this.report()?.payments ?? []).filter(p =>
      (y === 'all' || new Date(p.date).getFullYear() === y) && (!w || p.workerId === w));
  });
  paymentsTotal = computed(() => this.payments().reduce((a, p) => a + p.amount, 0));

  ngOnInit() {
    this.state.loadLookups().subscribe();
    this.state.loadSettings();
    this.load();
  }
  ngOnDestroy() { this.chart?.destroy(); }

  load() {
    this.loading.set(true);
    forkJoin({ report: this.api.getPayroll(), workers: this.api.getWorkers(true) }).subscribe({
      next: ({ report, workers }) => {
        this.report.set(report);
        this.workers.set(workers);
        this.loading.set(false);
        setTimeout(() => this.drawChart());
      },
      error: e => { this.loading.set(false); this.toastr.error(apiError(e, 'تعذر تحميل بيانات الرواتب')); }
    });
  }

  yearAmount(e: PayrollEmployeeRow, y: number) { return e.byYear.find(x => x.year === y)?.amount ?? 0; }
  yearTotal(y: number) { return (this.report()?.employees ?? []).reduce((a, e) => a + this.yearAmount(e, y), 0); }

  selectChartYear(y: number | 'all') { this.chartYear.set(y); this.drawChart(); }

  private drawChart() {
    const y = this.chartYear();
    const months = (this.report()?.months ?? []).filter(m => y === 'all' || m.year === y);
    this.chart = renderChart(this.monthCanvas?.nativeElement, this.chart, {
      type: 'bar',
      data: {
        labels: months.map(m => y === 'all' ? `${MONTHS_AR[m.month - 1].slice(0, 3)} ${String(m.year).slice(2)}` : MONTHS_AR[m.month - 1]),
        datasets: [{ label: 'إجمالي الرواتب', data: months.map(m => m.total), backgroundColor: PALETTE.balance + 'b3', borderColor: PALETTE.balance, borderWidth: 1, borderRadius: 4 }],
      },
      options: moneyChartOptions(),
    });
  }

  // ── Pay salary ────────────────────────────────────────────────
  openPay(w: Worker) {
    this.payForm.reset({
      date: todayIso(), amount: w.monthlySalary ?? w.lastPaymentAmount ?? null,
      description: `راتب ${w.nameAr}`, paymentMethodId: '', documentNumber: '', notes: '',
    });
    this.attachmentIds = [];
    this.submitted.set(false);
    this.payFor.set(w);
  }

  savePay() {
    const w = this.payFor();
    this.submitted.set(true);
    if (!w || this.payForm.invalid) { this.payForm.markAllAsTouched(); return; }
    if (this.uploading()) { this.toastr.info('انتظر حتى يكتمل رفع المستندات'); return; }
    if (this.state.requireAttachments() && !this.attachmentIds.length) { this.toastr.warning('أرفق إيصال استلام الراتب أو إثبات التحويل'); return; }
    const v = this.payForm.getRawValue();
    this.saving.set(true);
    this.api.paySalary(w.id, {
      date: v.date!, amount: Number(v.amount), description: v.description || null,
      paymentMethodId: v.paymentMethodId || null, documentNumber: v.documentNumber || null, notes: v.notes || null,
      attachmentIds: this.attachmentIds,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.payFor.set(null);
        this.toastr.success(`تم صرف راتب ${w.nameAr} وتسجيله في دفتر اليومية`);
        this.state.changed();
        this.load();
      },
      error: e => { this.saving.set(false); this.toastr.error(apiError(e, 'تعذر تسجيل الراتب')); }
    });
  }

  // ── Worker CRUD ───────────────────────────────────────────────
  openWorker(worker: Worker | null) {
    this.workerForm.reset({
      nameAr: worker?.nameAr ?? '', nameEn: worker?.nameEn ?? '', role: worker?.role ?? 'عامل',
      monthlySalary: worker?.monthlySalary ?? null, hireDate: worker?.hireDate?.slice(0, 10) ?? '',
      phone: worker?.phone ?? '', nationalId: worker?.nationalId ?? '', notes: worker?.notes ?? '',
      isActive: worker?.isActive ?? true,
    });
    this.workerModal.set({ worker });
  }

  saveWorker() {
    const ctx = this.workerModal();
    if (!ctx || this.workerForm.invalid) { this.workerForm.markAllAsTouched(); return; }
    const v = this.workerForm.getRawValue();
    const input = {
      nameAr: v.nameAr!.trim(), nameEn: v.nameEn || null, role: v.role!.trim(),
      monthlySalary: v.monthlySalary === null || (v.monthlySalary as any) === '' ? null : Number(v.monthlySalary),
      hireDate: v.hireDate || null, phone: v.phone || null, nationalId: v.nationalId || null,
      notes: v.notes || null, isActive: !!v.isActive,
    };
    this.saving.set(true);
    const req$ = ctx.worker ? this.api.updateWorker(ctx.worker.id, input) : this.api.createWorker(input);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.workerModal.set(null);
        this.toastr.success(ctx.worker ? 'تم تحديث بيانات الموظف' : 'تمت إضافة الموظف / العامل');
        this.state.changed({ lookups: true });
        this.load();
      },
      error: e => { this.saving.set(false); this.toastr.error(apiError(e, 'تعذر الحفظ')); }
    });
  }

  toggleActive(w: Worker) {
    this.api.setWorkerActive(w.id, !w.isActive).subscribe({
      next: () => {
        this.toastr.success(w.isActive ? `تم إيقاف ${w.nameAr}` : `تم تفعيل ${w.nameAr}`);
        this.state.changed({ lookups: true });
        this.load();
      },
      error: e => this.toastr.error(apiError(e))
    });
  }
}
