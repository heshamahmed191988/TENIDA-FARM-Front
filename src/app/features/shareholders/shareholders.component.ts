import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Shareholder, Installment, InstallmentStatus } from '../../core/models/models';

@Component({
  selector: 'app-shareholders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './shareholders.component.html',
  styleUrls: ['./shareholders.component.scss']
})
export class ShareholdersComponent implements OnInit {
  private api    = inject(ApiService);
  private toastr = inject(ToastrService);
  private fb     = inject(FormBuilder);
  auth           = inject(AuthService);

  shareholders    = signal<Shareholder[]>([]);
  summary         = signal<any>(null);
  loading         = signal(true);
  selected        = signal<Shareholder | null>(null);
  showPayModal    = signal(false);
  showDetailModal = signal(false);
  saving          = signal(false);
  payInstallment  = signal<Installment | null>(null);

  payForm = this.fb.group({
    amount:           [0, [Validators.required, Validators.min(1)]],
    paymentDate:      [new Date().toISOString().slice(0, 10)],
    receiptReference: [''],
    notes:            ['']
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getShareholders().subscribe({
      next: r => {
        this.shareholders.set(r.data);
        this.summary.set(r.summary);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  selectShareholder(sh: Shareholder) {
    this.selected.set(sh);
    this.showDetailModal.set(true);
  }

  openPayModal(sh: Shareholder, inst: Installment) {
    if (inst.status === InstallmentStatus.Paid) {
      this.toastr.info('هذا القسط مسدد بالكامل');
      return;
    }
    this.selected.set(sh);
    this.payInstallment.set(inst);
    const remaining = inst.scheduledAmountSar - inst.paidAmountSar;
    this.payForm.patchValue({
      amount: remaining,
      paymentDate: new Date().toISOString().slice(0, 10),
      receiptReference: '',
      notes: ''
    });
    this.showPayModal.set(true);
  }

  recordPayment() {
    if (this.payForm.invalid) { this.payForm.markAllAsTouched(); return; }
    const sh   = this.selected();
    const inst = this.payInstallment();
    if (!sh || !inst) return;

    this.saving.set(true);
    const req = this.payForm.value as any;
    this.api.recordInstallmentPayment(sh.id, inst.id, req).subscribe({
      next: () => {
        this.toastr.success(`تم تسجيل دفعة ${this.fmt(req.amount)} ﷼ بنجاح`);
        this.showPayModal.set(false);
        this.saving.set(false);
        this.load();
        if (this.selected()) {
          this.api.getShareholder(sh.id).subscribe(s => this.selected.set(s));
        }
      },
      error: (e) => {
        this.saving.set(false);
        this.toastr.error(e?.error?.message || 'فشل تسجيل الدفعة');
      }
    });
  }

  statusBadge(s: InstallmentStatus): string {
    const map: Record<string, string> = {
      Paid: 'badge-success', Overdue: 'badge-danger',
      PartiallyPaid: 'badge-warning', Upcoming: 'badge-info'
    };
    return map[s] ?? 'badge-info';
  }

  statusLabel(s: InstallmentStatus): string {
    const map: Record<string, string> = {
      Paid: '✓ مسدد', Overdue: '⚠ متأخر',
      PartiallyPaid: '◑ جزئي', Upcoming: '○ قادم'
    };
    return map[s] ?? s;
  }

  monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                 'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  formatDate(d: string): string {
    if (!d) return '';
    const dt = new Date(d);
    return `${dt.getDate()} ${this.monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
  }

  fmt(n: number): string {
    return (n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 0 });
  }

  getProgressColor(sh: Shareholder): string {
    if (sh.balanceSar < 0) return 'linear-gradient(90deg,#c62828,#e53935)';
    if (sh.paymentProgressPct >= 100) return 'linear-gradient(90deg,#2e7d32,#4caf50)';
    return 'linear-gradient(90deg,var(--primary-light),var(--secondary))';
  }

  trackById = (_: number, item: any) => item.id;
}
