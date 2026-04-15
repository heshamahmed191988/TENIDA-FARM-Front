import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastrService } from 'ngx-toastr';
import { Transaction, EXPENSE_CATEGORY_AR, INCOME_CATEGORY_AR } from '../../core/models/models';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './finance.component.html',
  styleUrls: ['./finance.component.scss']
})
export class FinanceComponent implements OnInit {
  private api  = inject(ApiService);
  private toastr = inject(ToastrService);
  private fb   = inject(FormBuilder);

  transactions = signal<Transaction[]>([]);
  loading      = signal(true);
  currentBalance = signal(0);
  totalIncome  = signal(0);
  totalExpense = signal(0);
  totalItems   = signal(0);
  currentPage  = signal(1);
  pageSize     = signal(50);
  showModal    = signal(false);
  editMode     = signal(false);
  editId       = signal<string|null>(null);
  saving       = signal(false);
  filterType   = signal<string>('');
  filterCat    = signal<number>(0);
  deleteConfirmId = signal<string|null>(null);

  expenseCategories = Object.entries(EXPENSE_CATEGORY_AR).map(([k,v]) => ({ id: +k, label: v }));
  incomeCategories  = Object.entries(INCOME_CATEGORY_AR).map(([k,v]) =>  ({ id: +k, label: v }));

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  form = this.fb.group({
    transactionDate:    [new Date().toISOString().slice(0,10), Validators.required],
    description:        ['', [Validators.required, Validators.maxLength(500)]],
    expenseDescription: [''],
    receiptNumber:      [''],
    type:               [2, Validators.required],
    totalIncome:        [0],
    totalExpense:       [0],
    expenseCategory:    [null as number|null],
    incomeCategory:     [null as number|null],
    // Income columns
    incomeMahmoudRagab:     [null as number|null],
    incomeMahmoudHussein:   [null as number|null],
    incomeMohamedNaguib:    [null as number|null],
    incomeMohamedAbdelHadi: [null as number|null],
    incomeAlfalfa:          [null as number|null],
    incomeSeasonalCrop:     [null as number|null],
    // Expense columns
    expWell:            [null as number|null],
    expSolarEnergy:     [null as number|null],
    expIrrigationNetwork:[null as number|null],
    expLandPreparation: [null as number|null],
    expRoads:           [null as number|null],
    expBuildings:       [null as number|null],
    expEquipment:       [null as number|null],
    expFertilizers:     [null as number|null],
    expAlfalfaOps:      [null as number|null],
    expSeasonalOps:     [null as number|null],
    expLandRent:        [null as number|null],
    expSalaries:        [null as number|null],
    expMiscellaneous:   [null as number|null],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getTransactions({ page: this.currentPage(), pageSize: this.pageSize() }).subscribe({
      next: r => {
        this.transactions.set(r.data);
        this.currentBalance.set(r.currentBalanceSar);
        this.totalItems.set(r.pagination?.total ?? r.data.length);
        this.totalIncome.set(r.data.reduce((a,t) => a + t.totalIncome, 0));
        this.totalExpense.set(r.data.reduce((a,t) => a + t.totalExpense, 0));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openAdd() {
    this.form.reset({ transactionDate: new Date().toISOString().slice(0,10), type: 2, totalIncome: 0, totalExpense: 0 });
    this.editMode.set(false);
    this.editId.set(null);
    this.showModal.set(true);
  }

  openEdit(t: Transaction) {
    this.form.patchValue({
      transactionDate: t.transactionDate?.slice(0,10),
      description: t.description,
      expenseDescription: t.expenseDescription,
      receiptNumber: t.receiptNumber,
      type: t.type,
      totalIncome: t.totalIncome,
      totalExpense: t.totalExpense,
      expenseCategory: t.expenseCategory as any,
      incomeCategory: t.incomeCategory as any,
    });
    this.editMode.set(true);
    this.editId.set(t.id);
    this.showModal.set(true);
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const req = this.form.value as any;
    const obs = this.editMode()
      ? this.api.updateTransaction(this.editId()!, req)
      : this.api.createTransaction(req);

    obs.subscribe({
      next: () => {
        this.toastr.success(this.editMode() ? 'تم تحديث المعاملة' : 'تمت إضافة المعاملة بنجاح');
        this.showModal.set(false);
        this.saving.set(false);
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.toastr.error(e?.error?.message || 'حدث خطأ أثناء الحفظ');
      }
    });
  }

  confirmDelete(id: string) { this.deleteConfirmId.set(id); }

  doDelete() {
    const id = this.deleteConfirmId();
    if (!id) return;
    this.api.deleteTransaction(id).subscribe({
      next: () => {
        this.toastr.success('تم حذف المعاملة');
        this.deleteConfirmId.set(null);
        this.load();
      },
      error: () => this.toastr.error('فشل الحذف')
    });
  }

  recalculate() {
    this.api.recalculateBalances().subscribe({
      next: r => {
        this.toastr.success(`تمت إعادة الحساب. الرصيد النهائي: ${this.fmt(r.finalBalance)} ﷼`);
        this.load();
      },
      error: () => this.toastr.error('فشلت إعادة الحساب')
    });
  }

  goPage(p: number) { this.currentPage.set(p); this.load(); }

  getTypeBadge(t: Transaction) {
    return t.totalIncome > 0 ? 'badge-success' : 'badge-danger';
  }
  getTypeLabel(t: Transaction) { return t.totalIncome > 0 ? 'وارد' : 'مصروف'; }

  getCatLabel(t: Transaction): string {
    if (t.expenseCategory) return EXPENSE_CATEGORY_AR[t.expenseCategory as number] ?? '';
    if (t.incomeCategory)  return INCOME_CATEGORY_AR[t.incomeCategory as number] ?? '';
    return '';
  }

  fmt(n: number): string {
    return (n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  pages(): number[] {
    const tp = this.totalPages();
    const cp = this.currentPage();
    const range: number[] = [];
    const start = Math.max(1, cp - 2);
    const end   = Math.min(tp, cp + 2);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }
}
