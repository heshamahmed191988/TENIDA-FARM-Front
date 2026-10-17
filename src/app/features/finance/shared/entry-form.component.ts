import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../../core/services/api.service';
import { FinanceStateService } from '../../../core/services/finance-state.service';
import { JournalEntry, JournalEntryInput, LOOKUP_CODES, TransactionType } from '../../../core/models/models';
import { apiError, fmtMoney, fmtRate, todayIso } from '../../../core/utils/format';
import { AttachmentUploaderComponent } from '../../../shared/components/attachments/attachment-uploader.component';

/**
 * Add / edit one journal movement (صف في دفتر اليومية).
 * Mirrors the Excel input columns: التاريخ · النوع · البند · النشاط · البيان · المبلغ · الطرف · طريقة الدفع · رقم المستند · ملاحظات.
 */
@Component({
  selector: 'app-entry-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AttachmentUploaderComponent],
  templateUrl: './entry-form.component.html',
})
export class EntryFormComponent implements OnInit {
  @Input() entry: JournalEntry | null = null;
  @Input() preset: Partial<JournalEntryInput> = {};
  @Output() saved = new EventEmitter<JournalEntry>();
  @Output() closed = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private toastr = inject(ToastrService);
  state = inject(FinanceStateService);

  saving = signal(false);
  attachmentIds: string[] = [];
  uploading = signal(false);
  submitted = signal(false);
  /** Proof is mandatory for new movements (rows already saved keep their files). */
  attachmentsRequired = computed(() => !this.entry && this.state.requireAttachments());
  type = signal<TransactionType>('Expense');
  itemId = signal<string>('');
  today = todayIso();

  form = this.fb.group({
    transactionDate: [todayIso(), Validators.required],
    type: ['Expense' as TransactionType, Validators.required],
    itemId: ['', Validators.required],
    activityId: ['', Validators.required],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    /** «مساهمة شريك» only: amount paid in SAR (counts against the installment schedule). */
    amountSar: [null as number | null],
    party: [''],
    paymentMethodId: [''],
    documentNumber: [''],
    notes: [''],
  });

  items = computed(() => this.state.itemsFor(this.type()));
  activities = computed(() => this.state.lookups()?.activities ?? []);
  paymentMethods = computed(() => this.state.lookups()?.paymentMethods ?? []);
  shareholders = computed(() => this.state.lookups()?.shareholders ?? []);
  workers = computed(() => this.state.lookups()?.workers ?? []);

  /** Which party list the selected item requires ('' = optional, any). */
  partyMode = computed<'shareholder' | 'worker' | 'any'>(() => {
    const code = this.items().find(i => i.id === this.itemId())?.code;
    if (code === LOOKUP_CODES.partnerContribution) return 'shareholder';
    if (code === LOOKUP_CODES.salaries) return 'worker';
    return 'any';
  });

  ngOnInit() {
    this.state.loadLookups().subscribe();
    this.state.loadSettings();

    const e = this.entry;
    const src: Partial<JournalEntryInput> = e ? {
      transactionDate: e.transactionDate.slice(0, 10), type: e.type, itemId: e.itemId, activityId: e.activityId,
      description: e.description, amount: e.amount, amountSar: e.amountSar, shareholderId: e.shareholderId, workerId: e.workerId,
      paymentMethodId: e.paymentMethodId, documentNumber: e.documentNumber, notes: e.notes,
    } : this.preset;

    this.form.patchValue({
      transactionDate: src.transactionDate ?? todayIso(),
      type: src.type ?? 'Expense',
      itemId: src.itemId ?? '',
      activityId: src.activityId ?? '',
      description: src.description ?? '',
      amount: src.amount ?? null,
      amountSar: src.amountSar ?? null,
      party: src.shareholderId ? `s:${src.shareholderId}` : src.workerId ? `w:${src.workerId}` : '',
      paymentMethodId: src.paymentMethodId ?? '',
      documentNumber: src.documentNumber ?? '',
      notes: src.notes ?? '',
    });
    this.type.set(this.form.value.type!);
    this.itemId.set(this.form.value.itemId!);

    this.form.controls.type.valueChanges.subscribe(t => {
      this.type.set(t!);
      if (!this.items().some(i => i.id === this.form.value.itemId)) this.form.controls.itemId.setValue('');
    });
    this.form.controls.itemId.valueChanges.subscribe(id => this.onItemChange(id ?? ''));
  }

  setType(t: TransactionType) { this.form.controls.type.setValue(t); }

  private onItemChange(id: string) {
    this.itemId.set(id);
    const mode = this.partyMode();
    const party = this.form.value.party ?? '';
    if (mode === 'shareholder' && !party.startsWith('s:')) this.form.controls.party.setValue('');
    if (mode === 'worker' && !party.startsWith('w:')) this.form.controls.party.setValue('');

    // Sensible default activity for system items (same as the Excel conventions)
    const acts = this.activities();
    if (!this.form.value.activityId) {
      const code = mode === 'worker' ? LOOKUP_CODES.payrollActivity : mode === 'shareholder' ? LOOKUP_CODES.generalActivity : null;
      const def = code ? acts.find(a => a.code === code) : null;
      if (def) this.form.controls.activityId.setValue(def.id);
    }
  }

  partyError(): string | null {
    const party = this.form.value.party ?? '';
    if (this.partyMode() === 'shareholder' && !party) return 'اختر المساهم';
    if (this.partyMode() === 'worker' && !party) return 'اختر الموظف / العامل';
    return null;
  }

  amountPreview(): string { return fmtMoney(this.form.value.amount || 0); }

  sarError(): string | null {
    if (this.partyMode() !== 'shareholder') return null;
    return Number(this.form.value.amountSar) > 0 ? null : 'أدخل المبلغ المدفوع بالريال السعودي';
  }

  /** EGP per SAR for the contribution being entered. */
  ratePreview(): string {
    const sar = Number(this.form.value.amountSar), egp = Number(this.form.value.amount);
    return sar > 0 && egp > 0 ? fmtRate(egp / sar) : '';
  }

  save() {
    this.submitted.set(true);
    if (this.uploading()) { this.toastr.info('انتظر حتى يكتمل رفع المستندات'); return; }
    if (this.attachmentsRequired() && !this.attachmentIds.length) {
      this.form.markAllAsTouched();
      this.toastr.warning('أرفق صورة أو ملف PDF يثبت الحركة');
      return;
    }
    if (this.form.invalid || this.partyError() || this.sarError()) {
      this.form.markAllAsTouched();
      this.toastr.warning(this.partyError() ?? this.sarError() ?? 'أكمل الحقول المطلوبة');
      return;
    }
    const v = this.form.getRawValue();
    const party = v.party ?? '';
    const input: JournalEntryInput = {
      transactionDate: v.transactionDate!,
      type: v.type!,
      itemId: v.itemId!,
      activityId: v.activityId!,
      description: v.description!.trim(),
      amount: Number(v.amount),
      amountSar: this.partyMode() === 'shareholder' ? Number(v.amountSar) : null,
      shareholderId: party.startsWith('s:') ? party.slice(2) : null,
      workerId: party.startsWith('w:') ? party.slice(2) : null,
      paymentMethodId: v.paymentMethodId || null,
      documentNumber: v.documentNumber || null,
      notes: v.notes || null,
      attachmentIds: this.attachmentIds,
    };

    this.saving.set(true);
    const req$ = this.entry ? this.api.updateEntry(this.entry.id, input) : this.api.createEntry(input);
    req$.subscribe({
      next: saved => {
        this.saving.set(false);
        this.toastr.success(this.entry ? 'تم تعديل الحركة' : 'تمت إضافة الحركة إلى دفتر اليومية');
        this.state.changed();
        this.saved.emit(saved);
      },
      error: e => {
        this.saving.set(false);
        this.toastr.error(apiError(e, 'تعذر حفظ الحركة'));
      }
    });
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
}
