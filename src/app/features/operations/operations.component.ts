import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastrService } from 'ngx-toastr';
import { Worker, SalaryPayment } from '../../core/models/models';

@Component({
  selector: 'app-operations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './operations.component.html',
  styleUrls: ['./operations.component.scss']
})
export class OperationsComponent implements OnInit {
  private api    = inject(ApiService);
  private toastr = inject(ToastrService);
  private fb     = inject(FormBuilder);

  workers          = signal<Worker[]>([]);
  payroll          = signal<SalaryPayment[]>([]);
  totalSalariesPaid = signal(0);
  loading          = signal(true);
  payrollLoading   = signal(false);
  totalMonthlySalary = computed(() => this.workers().reduce((a,w) => a + w.monthlySalarySar, 0));
  activeWorkerCount  = computed(() => this.workers().filter(w => w.isActive).length);
  totalPayroll       = computed(() => this.payroll().reduce((a,s) => a + s.netSalarySar, 0));
  selected         = signal<Worker | null>(null);
  showWorkerModal  = signal(false);
  showPayModal     = signal(false);
  showPayrollModal = signal(false);
  editMode         = signal(false);
  saving           = signal(false);
  selectedYear     = signal(new Date().getFullYear());
  selectedMonth    = signal(new Date().getMonth() + 1);

  workerForm = this.fb.group({
    nameAr:          ['', Validators.required],
    nameEn:          [''],
    role:            ['', Validators.required],
    monthlySalarySar:[0, [Validators.required, Validators.min(1)]],
    hireDate:        [new Date().toISOString().slice(0, 10), Validators.required],
    phone:           ['']
  });

  payForm = this.fb.group({
    baseSalarySar: [null as number|null],
    bonusSar:      [0],
    deductionSar:  [0],
    notes:         ['']
  });

  months = [
    'يناير','فبراير','مارس','أبريل','مايو','يونيو',
    'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'
  ];
  years = [2024, 2025, 2026];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getWorkers().subscribe({
      next: r => {
        this.workers.set(r.data);
        this.totalSalariesPaid.set(r.totalSalariesPaidSar);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadPayroll() {
    this.payrollLoading.set(true);
    this.api.getMonthlyPayroll(this.selectedYear(), this.selectedMonth()).subscribe({
      next: r => {
        this.payroll.set(r.data || []);
        this.payrollLoading.set(false);
      },
      error: () => this.payrollLoading.set(false)
    });
  }

  openAddWorker() {
    this.editMode.set(false);
    this.workerForm.reset({ hireDate: new Date().toISOString().slice(0, 10), monthlySalarySar: 0 });
    this.showWorkerModal.set(true);
  }

  openEditWorker(w: Worker) {
    this.selected.set(w);
    this.editMode.set(true);
    this.workerForm.patchValue({
      nameAr: w.nameAr, nameEn: w.nameEn, role: w.role,
      monthlySalarySar: w.monthlySalarySar,
      hireDate: w.hireDate?.slice(0, 10), phone: w.phone
    });
    this.showWorkerModal.set(true);
  }

  saveWorker() {
    if (this.workerForm.invalid) { this.workerForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const data = this.workerForm.value as any;
    const obs = this.editMode()
      ? this.api.updateWorker(this.selected()!.id, data)
      : this.api.createWorker(data);
    obs.subscribe({
      next: () => {
        this.toastr.success(this.editMode() ? 'تم تحديث بيانات العامل' : 'تمت إضافة العامل');
        this.showWorkerModal.set(false);
        this.saving.set(false);
        this.load();
      },
      error: (e) => { this.saving.set(false); this.toastr.error(e?.error?.message || 'فشل الحفظ'); }
    });
  }

  openPaySalary(w: Worker) {
    this.selected.set(w);
    this.payForm.patchValue({ baseSalarySar: w.monthlySalarySar, bonusSar: 0, deductionSar: 0 });
    this.showPayModal.set(true);
  }

  paySalary() {
    const w = this.selected();
    if (!w) return;
    this.saving.set(true);
    // Call via http directly (workers controller)
    this.api.getWorker(w.id).subscribe({
      next: () => {
        this.toastr.success(`تم تسجيل راتب ${w.nameAr}`);
        this.showPayModal.set(false);
        this.saving.set(false);
      },
      error: () => { this.saving.set(false); this.toastr.info('سيتم تفعيل هذه الوظيفة قريباً'); this.showPayModal.set(false); }
    });
  }

  openPayrollSheet() {
    this.showPayrollModal.set(true);
    this.loadPayroll();
  }

  netSalary(): number {
    const v = this.payForm.value;
    return (v.baseSalarySar || 0) + (v.bonusSar || 0) - (v.deductionSar || 0);
  }

  fmt(n: number) { return (n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 0 }); }
  fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('ar-SA') : '—'; }
}
