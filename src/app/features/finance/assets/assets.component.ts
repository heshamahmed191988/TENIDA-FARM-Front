import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { FinanceStateService } from '../../../core/services/finance-state.service';
import {
  ASSET_CATEGORY_ICON, ASSET_CATEGORY_LABEL, AssetDetail, AssetRow, AssetsOverview, InfrastructureCategory,
  MAINTENANCE_PRIORITY_BADGE, MAINTENANCE_PRIORITY_LABEL, MAINTENANCE_STATUS_LABEL,
  Maintenance, MaintenancePriority, MaintenanceStatus
} from '../../../core/models/models';
import { apiError, yearLabel } from '../../../core/utils/format';
import { FORMAT_PIPES } from '../../../shared/components/pipes/formatting.pipe';

/** Assets & infrastructure — cost from journal expense items, straight-line depreciation, maintenance. */
@Component({
  selector: 'app-finance-assets',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, ...FORMAT_PIPES],
  templateUrl: './assets.component.html',
  styles: [`
    .asset-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(290px,1fr)); gap:1rem; }
    .asset { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; display:flex; flex-direction:column; transition:var(--tr); }
    .asset:hover { transform:translateY(-2px); box-shadow:var(--shadow); }
    .asset-head { display:flex; gap:.8rem; align-items:center; padding:1rem 1.1rem; border-bottom:1px solid var(--border-light); }
    .asset-icon { font-size:1.6rem; width:46px; height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:rgba(200,168,75,.1); border:1px solid var(--border); }
    .asset-head h3 { font-size:.92rem; line-height:1.35; }
    .asset-body { padding:.9rem 1.1rem; display:flex; flex-direction:column; gap:.55rem; flex:1; }
    .asset-cost { font-size:1.3rem; font-weight:800; color:var(--secondary-light); font-variant-numeric:tabular-nums; }
    .asset-foot { display:flex; gap:.5rem; justify-content:flex-end; padding:.75rem 1.1rem; border-top:1px solid var(--border-light); }
    .yr-chips { display:flex; gap:.35rem; flex-wrap:wrap; }
  `]
})
export class AssetsComponent implements OnInit {
  private api = inject(ApiService);
  private toastr = inject(ToastrService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);
  state = inject(FinanceStateService);

  data = signal<AssetsOverview | null>(null);
  loading = signal(true);
  saving = signal(false);
  detail = signal<AssetDetail | null>(null);
  maintFor = signal<AssetRow | null>(null);
  updateMaint = signal<Maintenance | null>(null);
  assetModal = signal<{ asset: AssetRow | null } | null>(null);

  icon = ASSET_CATEGORY_ICON;
  catLabel = ASSET_CATEGORY_LABEL;
  categories = Object.keys(ASSET_CATEGORY_LABEL) as InfrastructureCategory[];
  priorities: MaintenancePriority[] = ['Low', 'Normal', 'High', 'Critical'];
  statuses: MaintenanceStatus[] = ['Pending', 'InProgress', 'Completed', 'Cancelled'];
  prLabel = MAINTENANCE_PRIORITY_LABEL;
  prBadge = MAINTENANCE_PRIORITY_BADGE;
  stLabel = MAINTENANCE_STATUS_LABEL;
  yearLabel = yearLabel;

  maintForm = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    priority: ['Normal' as MaintenancePriority],
    estimatedCost: [null as number | null],
    assignedTo: [''],
  });

  maintUpdateForm = this.fb.group({
    status: ['Pending' as MaintenanceStatus],
    actualCost: [null as number | null],
    completionDate: [''],
    assignedTo: [''],
    notes: [''],
  });

  assetForm = this.fb.group({
    category: ['Equipment' as InfrastructureCategory, Validators.required],
    nameAr: ['', Validators.required],
    nameEn: [''],
    expenseItemId: ['', Validators.required],
    usefulLifeYears: [null as number | null],
    isOperational: [true],
    location: [''],
    description: [''],
  });

  ngOnInit() {
    this.state.loadLookups().subscribe();
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getAssets().subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: e => { this.loading.set(false); this.toastr.error(apiError(e, 'تعذر تحميل الأصول')); }
    });
  }

  nbvPct(a: AssetRow) { return a.totalCost ? (a.netBookValue / a.totalCost) * 100 : 0; }

  openDetail(a: AssetRow) {
    this.api.getAsset(a.id).subscribe({
      next: d => this.detail.set(d),
      error: e => this.toastr.error(apiError(e))
    });
  }

  // ── Maintenance ───────────────────────────────────────────────
  openMaint(a: AssetRow) {
    this.maintForm.reset({ title: '', description: '', priority: 'Normal', estimatedCost: null, assignedTo: '' });
    this.maintFor.set(a);
  }

  saveMaint() {
    const a = this.maintFor();
    if (!a || this.maintForm.invalid) { this.maintForm.markAllAsTouched(); return; }
    const v = this.maintForm.getRawValue();
    this.saving.set(true);
    this.api.createMaintenance(a.id, {
      title: v.title!, description: v.description || null, priority: v.priority!,
      estimatedCost: v.estimatedCost ?? null, assignedTo: v.assignedTo || null,
    }).subscribe({
      next: () => { this.saving.set(false); this.maintFor.set(null); this.toastr.success('تم تسجيل طلب الصيانة'); this.load(); },
      error: e => { this.saving.set(false); this.toastr.error(apiError(e)); }
    });
  }

  openMaintUpdate(m: Maintenance) {
    this.maintUpdateForm.reset({
      status: m.status, actualCost: m.actualCost ?? null, completionDate: m.completionDate?.slice(0, 10) ?? '',
      assignedTo: m.assignedTo ?? '', notes: m.notes ?? '',
    });
    this.updateMaint.set(m);
  }

  saveMaintUpdate() {
    const m = this.updateMaint();
    if (!m) return;
    const v = this.maintUpdateForm.getRawValue();
    this.saving.set(true);
    this.api.updateMaintenance(m.id, {
      status: v.status!, actualCost: v.actualCost ?? null, completionDate: v.completionDate || null,
      assignedTo: v.assignedTo || null, notes: v.notes || null,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.updateMaint.set(null);
        this.toastr.success('تم تحديث طلب الصيانة');
        this.load();
        const d = this.detail();
        if (d) this.openDetail(d.asset);
      },
      error: e => { this.saving.set(false); this.toastr.error(apiError(e)); }
    });
  }

  // ── Asset add / edit (admin) ──────────────────────────────────
  openAsset(asset: AssetRow | null) {
    this.assetForm.reset({
      category: asset?.category ?? 'Equipment', nameAr: asset?.nameAr ?? '', nameEn: asset?.nameEn ?? '',
      expenseItemId: asset?.expenseItemId ?? '', usefulLifeYears: asset?.usefulLifeYears ?? null,
      isOperational: asset?.isOperational ?? true, location: asset?.location ?? '', description: asset?.description ?? '',
    });
    this.assetModal.set({ asset });
  }

  saveAsset() {
    const ctx = this.assetModal();
    if (!ctx || this.assetForm.invalid) { this.assetForm.markAllAsTouched(); return; }
    const v = this.assetForm.getRawValue();
    const input = {
      category: v.category!, nameAr: v.nameAr!, nameEn: v.nameEn || null, expenseItemId: v.expenseItemId!,
      usefulLifeYears: v.usefulLifeYears === null || (v.usefulLifeYears as any) === '' ? null : Number(v.usefulLifeYears),
      isOperational: !!v.isOperational, location: v.location || null, description: v.description || null, specifications: null,
    };
    this.saving.set(true);
    const req$ = ctx.asset ? this.api.updateAsset(ctx.asset.id, input) : this.api.createAsset(input);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.assetModal.set(null);
        this.detail.set(null);
        this.toastr.success(ctx.asset ? 'تم تحديث الأصل' : 'تمت إضافة الأصل');
        this.load();
      },
      error: e => { this.saving.set(false); this.toastr.error(apiError(e)); }
    });
  }
}
