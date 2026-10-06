import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { CROP_COLOR, CROP_ICON, CropCycle, CropDetail, CropSummary, CropType } from '../../core/models/models';
import { apiError, todayIso, yearLabel } from '../../core/utils/format';
import { FORMAT_PIPES } from '../../shared/components/pipes/formatting.pipe';

@Component({
  selector: 'app-agriculture',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ...FORMAT_PIPES],
  templateUrl: './agriculture.component.html',
  styleUrls: ['./agriculture.component.scss']
})
export class AgricultureComponent implements OnInit {
  private api = inject(ApiService);
  private toastr = inject(ToastrService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);

  crops = signal<CropSummary[]>([]);
  activeCycles = signal<CropCycle[]>([]);
  loading = signal(true);
  saving = signal(false);
  detail = signal<CropDetail | null>(null);
  cycleFor = signal<CropSummary | null>(null);
  harvestFor = signal<CropCycle | null>(null);

  units = ['كجم', 'طن', 'أردب', 'بالة', 'قيراط', 'رأس', 'صندوق'];
  yearLabel = yearLabel;

  totalRevenue = computed(() => this.crops().reduce((a, c) => a + c.revenue, 0));
  totalCost = computed(() => this.crops().reduce((a, c) => a + c.cost, 0));
  maxRevenue = computed(() => Math.max(1, ...this.crops().map(c => c.revenue)));
  canEdit = computed(() => this.auth.hasRole('Admin', 'FieldSupervisor'));

  cycleForm = this.fb.group({
    cycleName: ['', Validators.required],
    plantingDate: [todayIso(), Validators.required],
    expectedHarvestDate: [''],
    areaFeddan: [1, [Validators.required, Validators.min(0.1)]],
    seedCost: [null as number | null],
    notes: [''],
  });

  harvestForm = this.fb.group({
    harvestDate: [todayIso(), Validators.required],
    quantity: [null as number | null, [Validators.required, Validators.min(0.001)]],
    unit: ['كجم', Validators.required],
    pricePerUnit: [null as number | null],
    buyerName: [''],
    notes: [''],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    forkJoin({ crops: this.api.getCrops(), cycles: this.api.getActiveCycles() }).subscribe({
      next: ({ crops, cycles }) => {
        this.crops.set(crops);
        this.activeCycles.set(cycles);
        this.loading.set(false);
      },
      error: e => { this.loading.set(false); this.toastr.error(apiError(e, 'تعذر تحميل بيانات الزراعة')); }
    });
  }

  cropIcon(t: CropType) { return CROP_ICON[t] ?? '🌱'; }
  cropColor(t: CropType) { return CROP_COLOR[t] ?? '#4caf50'; }
  harvestTotal(c: CropCycle) {
    const byUnit = new Map<string, number>();
    c.harvests.forEach(h => byUnit.set(h.unit, (byUnit.get(h.unit) ?? 0) + h.quantity));
    return [...byUnit.entries()].map(([u, q]) => ({ unit: u, quantity: q }));
  }

  openDetail(c: CropSummary) {
    this.api.getCrop(c.id).subscribe({ next: d => this.detail.set(d), error: e => this.toastr.error(apiError(e)) });
  }

  private refreshDetail() {
    const d = this.detail();
    if (d) this.api.getCrop(d.crop.id).subscribe(x => this.detail.set(x));
  }

  // ── Cycles ────────────────────────────────────────────────────
  openCycle(c: CropSummary) {
    this.cycleForm.reset({ cycleName: '', plantingDate: todayIso(), expectedHarvestDate: '', areaFeddan: 1, seedCost: null, notes: '' });
    this.cycleFor.set(c);
  }

  saveCycle() {
    const crop = this.cycleFor();
    if (!crop || this.cycleForm.invalid) { this.cycleForm.markAllAsTouched(); return; }
    const v = this.cycleForm.getRawValue();
    this.saving.set(true);
    this.api.createCycle(crop.id, {
      cycleName: v.cycleName!, plantingDate: v.plantingDate!, expectedHarvestDate: v.expectedHarvestDate || null,
      areaFeddan: Number(v.areaFeddan), seedCost: v.seedCost ?? null, notes: v.notes || null,
    }).subscribe({
      next: () => { this.saving.set(false); this.cycleFor.set(null); this.toastr.success('تمت إضافة دورة الزراعة'); this.load(); this.refreshDetail(); },
      error: e => { this.saving.set(false); this.toastr.error(apiError(e, 'تعذرت الإضافة')); }
    });
  }

  toggleComplete(c: CropCycle) {
    const req$ = c.isCompleted ? this.api.reopenCycle(c.id) : this.api.completeCycle(c.id);
    req$.subscribe({
      next: () => { this.toastr.success(c.isCompleted ? 'تمت إعادة فتح الدورة' : 'تم إنهاء الدورة'); this.load(); this.refreshDetail(); },
      error: e => this.toastr.error(apiError(e))
    });
  }

  // ── Harvests ──────────────────────────────────────────────────
  openHarvest(c: CropCycle) {
    this.harvestForm.reset({ harvestDate: todayIso(), quantity: null, unit: 'كجم', pricePerUnit: null, buyerName: '', notes: '' });
    this.harvestFor.set(c);
  }

  harvestValue() {
    const v = this.harvestForm.value;
    return (v.quantity || 0) * (v.pricePerUnit || 0);
  }

  saveHarvest() {
    const cycle = this.harvestFor();
    if (!cycle || this.harvestForm.invalid) { this.harvestForm.markAllAsTouched(); return; }
    const v = this.harvestForm.getRawValue();
    this.saving.set(true);
    this.api.addHarvest(cycle.id, {
      harvestDate: v.harvestDate!, quantity: Number(v.quantity), unit: v.unit!,
      pricePerUnit: v.pricePerUnit ?? null, buyerName: v.buyerName || null, notes: v.notes || null,
    }).subscribe({
      next: () => { this.saving.set(false); this.harvestFor.set(null); this.toastr.success('تم تسجيل الحصاد'); this.load(); this.refreshDetail(); },
      error: e => { this.saving.set(false); this.toastr.error(apiError(e, 'فشل التسجيل')); }
    });
  }

  deleteHarvest(id: string) {
    if (!confirm('حذف سجل الحصاد؟')) return;
    this.api.deleteHarvest(id).subscribe({
      next: () => { this.toastr.success('تم الحذف'); this.load(); this.refreshDetail(); },
      error: e => this.toastr.error(apiError(e))
    });
  }
}
