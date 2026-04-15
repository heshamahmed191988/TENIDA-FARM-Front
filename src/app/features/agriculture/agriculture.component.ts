import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastrService } from 'ngx-toastr';
import { Crop, CropCycle, Harvest } from '../../core/models/models';

@Component({
  selector: 'app-agriculture',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './agriculture.component.html',
  styleUrls: ['./agriculture.component.scss']
})
export class AgricultureComponent implements OnInit {
  private api    = inject(ApiService);
  private toastr = inject(ToastrService);
  private fb     = inject(FormBuilder);

  crops          = signal<Crop[]>([]);
  activeCycles   = signal<CropCycle[]>([]);
  revenue        = signal<any>(null);
  loading        = signal(true);
  selectedCrop   = signal<Crop | null>(null);
  showCycleModal = signal(false);
  showHarvestModal = signal(false);
  selectedCycle  = signal<CropCycle | null>(null);
  saving         = signal(false);

  cycleForm = this.fb.group({
    cycleName:           ['', Validators.required],
    plantingDate:        [new Date().toISOString().slice(0, 10), Validators.required],
    expectedHarvestDate: [''],
    areaFeddan:          [1, [Validators.required, Validators.min(0.1)]],
    seedCostSar:         [0],
    notes:               ['']
  });

  harvestForm = this.fb.group({
    harvestDate:   [new Date().toISOString().slice(0, 10), Validators.required],
    quantityKg:    [0, [Validators.required, Validators.min(1)]],
    pricePerKgSar: [10, [Validators.required, Validators.min(0)]],
    buyerName:     [''],
    notes:         ['']
  });

  cropIcons: Record<string, string> = {
    Alfalfa: '🌿', SeasonalCrop: '🌾', Lemon: '🍋', Mango: '🥭',
    SaidiDates: '🌴', Livestock: '🐄', FishFarm: '🐟'
  };

  cropColors: Record<string, string> = {
    Alfalfa: '#4caf50', SeasonalCrop: '#8bc34a', Lemon: '#ffeb3b',
    Mango: '#ff9800', SaidiDates: '#795548', Livestock: '#9e9e9e', FishFarm: '#03a9f4'
  };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getCrops().subscribe({
      next: crops => {
        this.crops.set(crops);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.api.getActiveCycles().subscribe(c => this.activeCycles.set(c));
    this.api.getCropRevenueSummary().subscribe(r => this.revenue.set(r));
  }

  openCropDetail(crop: Crop) {
    if (crop.id) {
      this.api.getCrop(crop.id).subscribe(c => {
        this.selectedCrop.set(c);
      });
    }
  }

  openCycleModal(crop: Crop) {
    this.selectedCrop.set(crop);
    this.cycleForm.reset({ plantingDate: new Date().toISOString().slice(0, 10), areaFeddan: 1, seedCostSar: 0 });
    this.showCycleModal.set(true);
  }

  saveCycle() {
    if (this.cycleForm.invalid) { this.cycleForm.markAllAsTouched(); return; }
    const crop = this.selectedCrop();
    if (!crop) return;
    this.saving.set(true);
    this.api.createCropCycle(crop.id, this.cycleForm.value as any).subscribe({
      next: () => {
        this.toastr.success('تمت إضافة دورة الزراعة');
        this.showCycleModal.set(false);
        this.saving.set(false);
        this.load();
      },
      error: (e) => { this.saving.set(false); this.toastr.error(e?.error?.message || 'فشلت الإضافة'); }
    });
  }

  openHarvestModal(cycle: CropCycle) {
    this.selectedCycle.set(cycle);
    this.harvestForm.reset({ harvestDate: new Date().toISOString().slice(0, 10), pricePerKgSar: 10 });
    this.showHarvestModal.set(true);
  }

  saveHarvest() {
    if (this.harvestForm.invalid) { this.harvestForm.markAllAsTouched(); return; }
    const cycle = this.selectedCycle();
    if (!cycle) return;
    this.saving.set(true);
    this.api.recordHarvest(cycle.id, this.harvestForm.value as any).subscribe({
      next: () => {
        this.toastr.success('تم تسجيل الحصاد');
        this.showHarvestModal.set(false);
        this.saving.set(false);
        this.load();
      },
      error: (e) => { this.saving.set(false); this.toastr.error(e?.error?.message || 'فشل التسجيل'); }
    });
  }

  totalRevenue = () => this.crops().reduce((a, c) => a + (c.totalRevenueSar || 0), 0);
  noCropRevenue = computed(() => this.crops().every(c => c.totalRevenueSar === 0));
  totalCost    = () => this.crops().reduce((a, c) => a + (c.totalCostSar || 0), 0);

  fmt(n: number) { return (n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 0 }); }
  fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('ar-SA') : '—'; }
  cropIcon(type: string) { return this.cropIcons[type] || '🌱'; }
  cropColor(type: string) { return this.cropColors[type] || '#4caf50'; }
}
