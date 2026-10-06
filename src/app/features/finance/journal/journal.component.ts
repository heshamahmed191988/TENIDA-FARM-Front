import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, debounceTime } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { FinanceStateService } from '../../../core/services/finance-state.service';
import { JournalEntry, JournalQuery, JournalQueryResult, LookupBundle, TransactionType } from '../../../core/models/models';
import { apiError, downloadBlob, todayIso } from '../../../core/utils/format';
import { FORMAT_PIPES } from '../../../shared/components/pipes/formatting.pipe';
import { EntryFormComponent } from '../shared/entry-form.component';
import { AttachmentViewerComponent } from '../../../shared/components/attachments/attachment-viewer.component';

interface Filters {
  search: string; from: string; to: string; type: TransactionType | '';
  itemId: string; activityId: string; party: string; paymentMethodId: string;
  proof: '' | 'with' | 'without';
}
const EMPTY: Filters = { search: '', from: '', to: '', type: '', itemId: '', activityId: '', party: '', paymentMethodId: '', proof: '' };

@Component({
  selector: 'app-journal',
  standalone: true,
  imports: [CommonModule, FormsModule, EntryFormComponent, AttachmentViewerComponent, ...FORMAT_PIPES],
  templateUrl: './journal.component.html',
})
export class JournalComponent implements OnInit {
  private api = inject(ApiService);
  private toastr = inject(ToastrService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(AuthService);
  state = inject(FinanceStateService);

  result = signal<JournalQueryResult | null>(null);
  loading = signal(true);
  exporting = signal(false);
  filters = signal<Filters>({ ...EMPTY });
  page = signal(1);
  pageSize = signal(25);
  sort = signal<'desc' | 'asc'>('desc');
  showFilters = signal(window.innerWidth > 900);
  /** Filters list every item/party, including deactivated ones (old rows still reference them). */
  filterLookups = signal<LookupBundle | null>(null);

  editing = signal<JournalEntry | null>(null);
  showForm = signal(false);
  deleting = signal<JournalEntry | null>(null);
  deleteReason = '';
  expanded = signal<string | null>(null);
  viewing = signal<JournalEntry | null>(null);

  private search$ = new Subject<void>();

  filterItems = computed(() => {
    const l = this.filterLookups();
    const t = this.filters().type;
    if (!l) return [];
    return t === 'Income' ? l.incomeItems : t === 'Expense' ? l.expenseItems : [...l.incomeItems, ...l.expenseItems];
  });
  activeFilterCount = computed(() => Object.values(this.filters()).filter(v => !!v).length);
  net = computed(() => (this.result()?.totalIncome ?? 0) - (this.result()?.totalExpense ?? 0));

  ngOnInit() {
    this.state.loadLookups().subscribe();
    this.api.getLookups(true).subscribe(b => this.filterLookups.set(b));
    const qp = this.route.snapshot.queryParamMap;
    this.filters.set({
      ...EMPTY,
      itemId: qp.get('itemId') ?? '',
      activityId: qp.get('activityId') ?? '',
      type: (qp.get('type') as TransactionType) ?? '',
      party: qp.get('shareholderId') ? `s:${qp.get('shareholderId')}` : qp.get('workerId') ? `w:${qp.get('workerId')}` : '',
      from: qp.get('from') ?? '',
      to: qp.get('to') ?? '',
    });
    this.search$.pipe(debounceTime(350)).subscribe(() => { this.page.set(1); this.load(); });
    this.load();
  }

  private query(): JournalQuery {
    const f = this.filters();
    return {
      page: this.page(), pageSize: this.pageSize(), sort: this.sort(),
      search: f.search || undefined, from: f.from || undefined, to: f.to || undefined,
      type: f.type || undefined, itemId: f.itemId || undefined, activityId: f.activityId || undefined,
      paymentMethodId: f.paymentMethodId || undefined,
      hasAttachments: f.proof === 'with' ? true : f.proof === 'without' ? false : undefined,
      shareholderId: f.party.startsWith('s:') ? f.party.slice(2) : undefined,
      workerId: f.party.startsWith('w:') ? f.party.slice(2) : undefined,
    };
  }

  load() {
    this.loading.set(true);
    this.api.queryJournal(this.query()).subscribe({
      next: r => { this.result.set(r); this.loading.set(false); },
      error: e => { this.loading.set(false); this.toastr.error(apiError(e, 'تعذر تحميل دفتر اليومية')); }
    });
  }

  setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    this.filters.update(f => {
      const next = { ...f, [key]: value };
      if (key === 'type' && next.itemId && !this.itemsFor(next.type).some(i => i.id === next.itemId)) next.itemId = '';
      return next;
    });
    if (key === 'search') { this.search$.next(); return; }
    this.page.set(1);
    this.load();
  }

  private itemsFor(t: TransactionType | '') {
    const l = this.filterLookups();
    if (!l) return [];
    return t === 'Income' ? l.incomeItems : t === 'Expense' ? l.expenseItems : [...l.incomeItems, ...l.expenseItems];
  }

  clearFilters() {
    this.filters.set({ ...EMPTY });
    this.router.navigate([], { queryParams: {} });
    this.page.set(1);
    this.load();
  }

  quickRange(kind: 'month' | 'year' | 'lastYear') {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    let from = '', to = todayIso();
    if (kind === 'month') from = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
    if (kind === 'year') from = `${d.getFullYear()}-01-01`;
    if (kind === 'lastYear') { from = `${d.getFullYear() - 1}-01-01`; to = `${d.getFullYear() - 1}-12-31`; }
    this.filters.update(f => ({ ...f, from, to }));
    this.page.set(1);
    this.load();
  }

  toggleSort() { this.sort.update(s => (s === 'desc' ? 'asc' : 'desc')); this.page.set(1); this.load(); }
  goPage(p: number) { this.page.set(p); this.load(); }
  changePageSize(n: number) { this.pageSize.set(+n); this.page.set(1); this.load(); }

  pages(): number[] {
    const total = this.result()?.totalPages ?? 1;
    const cur = this.page();
    const start = Math.max(1, Math.min(cur - 2, total - 4));
    return Array.from({ length: Math.min(5, total) }, (_, i) => start + i).filter(p => p <= total);
  }

  openNew() { this.editing.set(null); this.showForm.set(true); }
  openEdit(e: JournalEntry) { this.editing.set(e); this.showForm.set(true); }
  onSaved() { this.showForm.set(false); this.load(); }

  askDelete(e: JournalEntry) { this.deleteReason = ''; this.deleting.set(e); }
  confirmDelete() {
    const e = this.deleting();
    if (!e) return;
    this.api.deleteEntry(e.id, this.deleteReason || undefined).subscribe({
      next: () => {
        this.toastr.success('تم حذف الحركة وإعادة احتساب الأرصدة');
        this.deleting.set(null);
        this.state.changed();
        this.load();
      },
      error: err => this.toastr.error(apiError(err, 'تعذر الحذف'))
    });
  }

  exportCsv() {
    this.exporting.set(true);
    this.api.exportJournal(this.query()).subscribe({
      next: blob => { downloadBlob(blob, `دفتر-اليومية-${todayIso()}.csv`); this.exporting.set(false); },
      error: e => { this.exporting.set(false); this.toastr.error(apiError(e, 'تعذر التصدير')); }
    });
  }

  onAttachmentsChanged(count: number) {
    const v = this.viewing();
    if (!v) return;
    this.result.update(r => r ? { ...r, items: r.items.map(t => t.id === v.id ? { ...t, attachmentCount: count } : t) } : r);
  }

  rowNumber(i: number) { return (this.page() - 1) * this.pageSize() + i + 1; }
  toggleRow(id: string) { this.expanded.update(x => (x === id ? null : id)); }
  trackById = (_: number, e: JournalEntry) => e.id;
}
