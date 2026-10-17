import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { FinanceStateService } from '../../../core/services/finance-state.service';
import {
  INSTALLMENT_STATUS_BADGE, INSTALLMENT_STATUS_LABEL, InstallmentPosition, InstallmentStatus, JournalEntry,
  ShareholderPosition, ShareholdersOverview
} from '../../../core/models/models';
import { apiError, todayIso, yearLabel } from '../../../core/utils/format';
import { FORMAT_PIPES } from '../../../shared/components/pipes/formatting.pipe';
import { AttachmentUploaderComponent } from '../../../shared/components/attachments/attachment-uploader.component';

/**
 * «المساهمين» — in Saudi riyals. The SAR amount of each journal contribution is allocated to the SAR
 * installment schedule; the EGP actually received (journal) is shown alongside with the effective rate.
 */
@Component({
  selector: 'app-finance-shareholders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, AttachmentUploaderComponent, ...FORMAT_PIPES],
  templateUrl: './shareholders.component.html',
  styles: [`
    .sh-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:1.1rem; }
    .sh-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); padding:1.15rem 1.25rem; display:flex; flex-direction:column; gap:.85rem; transition:var(--tr); }
    .sh-card:hover { transform:translateY(-2px); box-shadow:var(--shadow); }
    .sh-card.deficit { border-color:rgba(244,67,54,.35); }
    .sh-top { display:flex; align-items:center; gap:.8rem; }
    .sh-top h3 { font-size:1rem; }
    .sh-figs { display:grid; grid-template-columns:repeat(3,1fr); gap:.5rem; }
    .sh-figs > div { background:rgba(255,255,255,.03); border:1px solid var(--border-light); border-radius:8px; padding:.5rem .6rem; }
    .sh-figs .l { font-size:.68rem; color:var(--text-muted); }
    .sh-figs .v { font-size:.88rem; font-weight:800; font-variant-numeric:tabular-nums; }
    .sh-figs .v .u { font-size:.62rem; font-weight:600; color:var(--text-muted); }
    .sch td .st { display:block; margin-top:.2rem; }
    .sh-egp { display:flex; justify-content:space-between; gap:.5rem; font-size:.75rem; color:var(--text-muted); }
    .sh-egp b { color:var(--text-secondary); font-variant-numeric:tabular-nums; }
    .rate-box { display:flex; justify-content:space-between; align-items:center; gap:.75rem; padding:.6rem .85rem; border-radius:8px;
      background:rgba(200,168,75,.08); border:1px solid rgba(200,168,75,.25); font-size:.85rem; }
    .rate-box b { color:var(--secondary-light); }
  `]
})
export class ShareholdersComponent implements OnInit {
  private api = inject(ApiService);
  private toastr = inject(ToastrService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);
  state = inject(FinanceStateService);

  data = signal<ShareholdersOverview | null>(null);
  loading = signal(true);
  saving = signal(false);
  attachmentIds: string[] = [];
  uploading = signal(false);
  submitted = signal(false);

  detail = signal<ShareholderPosition | null>(null);
  detailContributions = signal<JournalEntry[] | null>(null);
  contributeFor = signal<ShareholderPosition | null>(null);
  editProfile = signal<ShareholderPosition | null>(null);
  editInstallment = signal<{ sh: ShareholderPosition; inst: InstallmentPosition | null } | null>(null);

  statusLabel = INSTALLMENT_STATUS_LABEL;
  statusBadge = INSTALLMENT_STATUS_BADGE;
  yearLabel = yearLabel;
  today = todayIso();

  contributionForm = this.fb.group({
    date: [todayIso(), Validators.required],
    amountSar: [null as number | null, [Validators.required, Validators.min(1)]],
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    description: [''],
    paymentMethodId: [''],
    documentNumber: [''],
    notes: [''],
  });

  profileForm = this.fb.group({
    nameAr: ['', Validators.required],
    nameEn: [''],
    ownershipPercentage: [25, [Validators.required, Validators.min(0), Validators.max(100)]],
    phoneWhatsApp: [''],
    email: [''],
  });

  installmentForm = this.fb.group({
    installmentNumber: [1, [Validators.required, Validators.min(1)]],
    label: [''],
    dueDate: [''],
    amount: [0, [Validators.required, Validators.min(0)]],
    notes: [''],
  });

  /** Installment numbers across all shareholders (rows of the schedule matrix). */
  scheduleRows = computed(() => {
    const d = this.data();
    if (!d) return [];
    const nums = new Map<number, { number: number; label: string; dueDate?: string | null }>();
    d.shareholders.forEach(s => s.installments.forEach(i => {
      if (!nums.has(i.installmentNumber)) nums.set(i.installmentNumber, { number: i.installmentNumber, label: i.label, dueDate: i.dueDate });
    }));
    return [...nums.values()].sort((a, b) => a.number - b.number);
  });

  ngOnInit() {
    this.state.loadLookups().subscribe();
    this.state.loadSettings();
    this.load();
  }

  load(reopenId?: string) {
    this.loading.set(true);
    this.api.getShareholders().subscribe({
      next: d => {
        this.data.set(d);
        this.loading.set(false);
        if (reopenId) this.openDetail(d.shareholders.find(s => s.id === reopenId) ?? null);
      },
      error: e => { this.loading.set(false); this.toastr.error(apiError(e, 'تعذر تحميل بيانات المساهمين')); }
    });
  }

  /** Statement: position + the shareholder's contribution movements (SAR and EGP). */
  openDetail(sh: ShareholderPosition | null) {
    this.detail.set(sh);
    this.detailContributions.set(null);
    if (!sh) return;
    this.api.queryJournal({ shareholderId: sh.id, pageSize: 200, sort: 'asc' }).subscribe({
      next: r => { if (this.detail()?.id === sh.id) this.detailContributions.set(r.items); },
      error: () => this.detailContributions.set([]),
    });
  }

  /** EGP per SAR of one movement. */
  rateOf(e: JournalEntry) { return e.amountSar ? e.amount / e.amountSar : null; }

  /** Live rate in the contribution form. */
  formRate() {
    const v = this.contributionForm.getRawValue();
    const sar = Number(v.amountSar), egp = Number(v.amount);
    return sar > 0 && egp > 0 ? egp / sar : null;
  }

  installmentOf(sh: ShareholderPosition, num: number) {
    return sh.installments.find(i => i.installmentNumber === num);
  }

  scheduleTotal(sh: ShareholderPosition) { return sh.installments.reduce((a, i) => a + i.amount, 0); }

  paidIn(sh: ShareholderPosition, year: number) { return sh.paidByYear.find(y => y.year === year)?.amount ?? 0; }
  paidInYear(year: number) { return (this.data()?.shareholders ?? []).reduce((a, s) => a + this.paidIn(s, year), 0); }
  paidEgpIn(sh: ShareholderPosition, year: number) { return sh.paidEgpByYear.find(y => y.year === year)?.amount ?? 0; }
  paidEgpInYear(year: number) { return (this.data()?.shareholders ?? []).reduce((a, s) => a + this.paidEgpIn(s, year), 0); }

  initial(name: string) {
    const parts = name.replace('م/', '').trim().split(/\s+/);
    return (parts[parts.length - 1] || name).charAt(0);
  }

  badge(s: InstallmentStatus) { return this.statusBadge[s]; }

  // ── Contribution ──────────────────────────────────────────────
  openContribution(sh: ShareholderPosition) {
    const next = sh.installments.find(i => i.remaining > 0);
    this.contributionForm.reset({
      date: todayIso(), amountSar: next?.remaining ?? null, amount: null, description: '', paymentMethodId: '', documentNumber: '', notes: '',
    });
    this.attachmentIds = [];
    this.submitted.set(false);
    this.contributeFor.set(sh);
  }

  saveContribution() {
    const sh = this.contributeFor();
    this.submitted.set(true);
    if (!sh || this.contributionForm.invalid) { this.contributionForm.markAllAsTouched(); return; }
    if (this.uploading()) { this.toastr.info('انتظر حتى يكتمل رفع المستندات'); return; }
    if (this.state.requireAttachments() && !this.attachmentIds.length) { this.toastr.warning('أرفق إثبات التحويل / الإيصال'); return; }
    const v = this.contributionForm.getRawValue();
    this.saving.set(true);
    this.api.addContribution(sh.id, {
      date: v.date!, amountSar: Number(v.amountSar), amount: Number(v.amount), description: v.description || null,
      paymentMethodId: v.paymentMethodId || null, documentNumber: v.documentNumber || null, notes: v.notes || null,
      attachmentIds: this.attachmentIds,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.contributeFor.set(null);
        this.toastr.success(`تم تسجيل مساهمة ${sh.nameAr} في دفتر اليومية`);
        this.state.changed();
        this.load(this.detail()?.id);
      },
      error: e => { this.saving.set(false); this.toastr.error(apiError(e, 'تعذر تسجيل المساهمة')); }
    });
  }

  // ── Profile (admin) ───────────────────────────────────────────
  openProfile(sh: ShareholderPosition) {
    this.profileForm.reset({
      nameAr: sh.nameAr, nameEn: sh.nameEn, ownershipPercentage: sh.ownershipPercentage,
      phoneWhatsApp: sh.phoneWhatsApp ?? '', email: sh.email ?? '',
    });
    this.editProfile.set(sh);
  }

  saveProfile() {
    const sh = this.editProfile();
    if (!sh || this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    const v = this.profileForm.getRawValue();
    this.saving.set(true);
    this.api.updateShareholder(sh.id, {
      nameAr: v.nameAr!, nameEn: v.nameEn || null, ownershipPercentage: Number(v.ownershipPercentage),
      phoneWhatsApp: v.phoneWhatsApp || null, email: v.email || null,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editProfile.set(null);
        this.toastr.success('تم تحديث بيانات المساهم');
        this.state.changed({ lookups: true });
        this.load(this.detail()?.id);
      },
      error: e => { this.saving.set(false); this.toastr.error(apiError(e, 'تعذر الحفظ')); }
    });
  }

  // ── Installments (admin) ──────────────────────────────────────
  openInstallment(sh: ShareholderPosition, inst: InstallmentPosition | null) {
    const nextNo = Math.max(0, ...sh.installments.map(i => i.installmentNumber)) + 1;
    this.installmentForm.reset({
      installmentNumber: inst?.installmentNumber ?? nextNo,
      label: inst?.label ?? `القسط ${nextNo}`,
      dueDate: inst?.dueDate?.slice(0, 10) ?? '',
      amount: inst?.amount ?? 0,
      notes: inst?.notes ?? '',
    });
    this.editInstallment.set({ sh, inst });
  }

  saveInstallment() {
    const ctx = this.editInstallment();
    if (!ctx || this.installmentForm.invalid) { this.installmentForm.markAllAsTouched(); return; }
    const v = this.installmentForm.getRawValue();
    const input = {
      installmentNumber: Number(v.installmentNumber), label: v.label || `القسط ${v.installmentNumber}`,
      dueDate: v.dueDate || null, amount: Number(v.amount), notes: v.notes || null,
    };
    this.saving.set(true);
    const req$ = ctx.inst ? this.api.updateInstallment(ctx.inst.id, input) : this.api.addInstallment(ctx.sh.id, input);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.editInstallment.set(null);
        this.toastr.success(ctx.inst ? 'تم تعديل القسط' : 'تمت إضافة القسط');
        this.load(ctx.sh.id);
      },
      error: e => { this.saving.set(false); this.toastr.error(apiError(e, 'تعذر حفظ القسط')); }
    });
  }

  deleteInstallment(sh: ShareholderPosition, inst: InstallmentPosition) {
    if (!confirm(`حذف «${inst.label}» من جدول أقساط ${sh.nameAr}؟`)) return;
    this.api.deleteInstallment(inst.id).subscribe({
      next: () => { this.toastr.success('تم حذف القسط'); this.load(sh.id); },
      error: e => this.toastr.error(apiError(e, 'تعذر الحذف'))
    });
  }
}
