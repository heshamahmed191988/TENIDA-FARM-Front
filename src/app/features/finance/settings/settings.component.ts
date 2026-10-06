import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { FinanceStateService } from '../../../core/services/finance-state.service';
import { FarmSettings, LOOKUP_KIND_LABEL, LookupBundle, LookupItem, LookupKind } from '../../../core/models/models';
import { apiError } from '../../../core/utils/format';
import { FORMAT_PIPES } from '../../../shared/components/pipes/formatting.pipe';

interface ListDef { kind: LookupKind; key: keyof Pick<LookupBundle, 'incomeItems' | 'expenseItems' | 'activities' | 'paymentMethods'>; icon: string; hint: string; }

/** «اعدادات» — editable lists + opening balance. Admin only. */
@Component({
  selector: 'app-finance-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ...FORMAT_PIPES],
  templateUrl: './settings.component.html',
  styles: [`
    .lists { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:1.1rem; }
    .lk-row { display:flex; align-items:center; gap:.5rem; padding:.45rem .25rem; border-bottom:1px solid var(--border-light); }
    .lk-row:last-child { border-bottom:none; }
    .lk-row.off .lk-name { opacity:.45; text-decoration:line-through; }
    .lk-name { flex:1; font-size:.86rem; }
    .lk-name input { width:100%; }
    .lk-add { display:flex; gap:.5rem; padding-top:.75rem; }
  `]
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private toastr = inject(ToastrService);
  private fb = inject(FormBuilder);
  private state = inject(FinanceStateService);

  bundle = signal<LookupBundle | null>(null);
  settings = signal<FarmSettings | null>(null);
  loading = signal(true);
  saving = signal(false);
  editingId = signal<string | null>(null);
  editName = '';
  newNames: Record<string, string> = {};

  kindLabel = LOOKUP_KIND_LABEL;
  lists: ListDef[] = [
    { kind: 'ExpenseItem', key: 'expenseItems', icon: '📉', hint: 'تظهر عند اختيار «منصرف» في دفتر اليومية' },
    { kind: 'IncomeItem', key: 'incomeItems', icon: '📈', hint: 'تظهر عند اختيار «وارد» في دفتر اليومية' },
    { kind: 'Activity', key: 'activities', icon: '🌾', hint: 'مركز التكلفة لكل حركة — أساس تقارير الأنشطة' },
    { kind: 'PaymentMethod', key: 'paymentMethods', icon: '💳', hint: 'نقدي / تحويل بنكي / شيك ...' },
  ];

  settingsForm = this.fb.group({
    projectName: ['', Validators.required],
    openingBalance: [0, Validators.required],
    ledgerStartDate: ['', Validators.required],
    requireAttachments: [true],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    forkJoin({ bundle: this.api.getLookups(true), settings: this.api.getSettings() }).subscribe({
      next: ({ bundle, settings }) => {
        this.bundle.set(bundle);
        this.settings.set(settings);
        this.settingsForm.reset({
          projectName: settings.projectName, openingBalance: settings.openingBalance,
          ledgerStartDate: settings.ledgerStartDate.slice(0, 10),
          requireAttachments: settings.requireAttachments,
        });
        this.loading.set(false);
      },
      error: e => { this.loading.set(false); this.toastr.error(apiError(e)); }
    });
  }

  saveSettings() {
    if (this.settingsForm.invalid) { this.settingsForm.markAllAsTouched(); return; }
    const v = this.settingsForm.getRawValue();
    this.saving.set(true);
    this.api.updateSettings({
      projectName: v.projectName!, openingBalance: Number(v.openingBalance),
      ledgerStartDate: v.ledgerStartDate!, requireAttachments: !!v.requireAttachments,
    })
      .subscribe({
        next: s => {
          this.saving.set(false);
          this.settings.set(s);
          this.state.settings.set(s);
          this.toastr.success('تم حفظ الإعدادات وإعادة احتساب الأرصدة');
          this.state.changed();
        },
        error: e => { this.saving.set(false); this.toastr.error(apiError(e)); }
      });
  }

  add(def: ListDef) {
    const name = (this.newNames[def.kind] ?? '').trim();
    if (!name) return;
    this.api.createLookup({ kind: def.kind, nameAr: name, isActive: true }).subscribe({
      next: () => { this.newNames[def.kind] = ''; this.toastr.success(`تمت إضافة «${name}»`); this.afterChange(); },
      error: e => this.toastr.error(apiError(e))
    });
  }

  startEdit(item: LookupItem) { this.editingId.set(item.id); this.editName = item.nameAr; }

  saveEdit(item: LookupItem) {
    const name = this.editName.trim();
    if (!name || name === item.nameAr) { this.editingId.set(null); return; }
    this.api.updateLookup(item.id, { kind: item.kind, nameAr: name, isActive: item.isActive, sortOrder: item.sortOrder }).subscribe({
      next: () => { this.editingId.set(null); this.toastr.success('تم تعديل الاسم — يظهر في كل الحركات المرتبطة'); this.afterChange(); },
      error: e => this.toastr.error(apiError(e))
    });
  }

  toggle(item: LookupItem) {
    this.api.updateLookup(item.id, { kind: item.kind, nameAr: item.nameAr, isActive: !item.isActive, sortOrder: item.sortOrder }).subscribe({
      next: () => { this.toastr.success(item.isActive ? `تم إيقاف «${item.nameAr}»` : `تم تفعيل «${item.nameAr}»`); this.afterChange(); },
      error: e => this.toastr.error(apiError(e))
    });
  }

  move(def: ListDef, item: LookupItem, dir: -1 | 1) {
    const list = this.bundle()?.[def.key] ?? [];
    const idx = list.findIndex(i => i.id === item.id);
    const other = list[idx + dir];
    if (!other) return;
    forkJoin([
      this.api.updateLookup(item.id, { kind: item.kind, nameAr: item.nameAr, isActive: item.isActive, sortOrder: other.sortOrder }),
      this.api.updateLookup(other.id, { kind: other.kind, nameAr: other.nameAr, isActive: other.isActive, sortOrder: item.sortOrder }),
    ]).subscribe({ next: () => this.afterChange(), error: e => this.toastr.error(apiError(e)) });
  }

  remove(item: LookupItem) {
    if (!confirm(`حذف «${item.nameAr}» نهائياً من القائمة؟`)) return;
    this.api.deleteLookup(item.id).subscribe({
      next: () => { this.toastr.success('تم الحذف'); this.afterChange(); },
      error: e => this.toastr.error(apiError(e))
    });
  }

  private afterChange() {
    this.load();
    this.state.loadLookups(true).subscribe();
  }
}
