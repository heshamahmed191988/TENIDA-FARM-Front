import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastrService } from 'ngx-toastr';
import { InfrastructureItem, MaintenanceRequest } from '../../core/models/models';

@Component({
  selector: 'app-infrastructure',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './infrastructure.component.html',
  styleUrls: ['./infrastructure.component.scss']
})
export class InfrastructureComponent implements OnInit {
  private api    = inject(ApiService);
  private toastr = inject(ToastrService);
  private fb     = inject(FormBuilder);

  items         = signal<InfrastructureItem[]>([]);
  pending       = signal<MaintenanceRequest[]>([]);
  summary       = signal<any>(null);
  loading       = signal(true);
  selected      = signal<InfrastructureItem | null>(null);
  showMaintModal = signal(false);
  showDetailModal = signal(false);
  saving        = signal(false);
  totalCost     = signal(0);

  maintForm = this.fb.group({
    title:            ['', Validators.required],
    description:      [''],
    priority:         ['Normal', Validators.required],
    estimatedCostSar: [0],
    assignedTo:       ['']
  });

  categoryIcons: Record<string, string> = {
    Well: '💧', SolarEnergy: '☀️', IrrigationNetwork: '🌊',
    LandPreparation: '🚜', Roads: '🛣️', Buildings: '🏠',
    Equipment: '⚙️', Windbreaks: '🌬️', WaterPond: '🏞️'
  };
  categoryColors: Record<string, string> = {
    Well: '#03a9f4', SolarEnergy: '#ffc107', IrrigationNetwork: '#00bcd4',
    LandPreparation: '#8d6e63', Roads: '#607d8b', Buildings: '#9c27b0',
    Equipment: '#ff5722', Windbreaks: '#4caf50', WaterPond: '#2196f3'
  };

  priorities = ['Low', 'Normal', 'High', 'Critical'];
  priorityLabels: Record<string, string> = { Low: 'منخفض', Normal: 'عادي', High: 'عالي', Critical: 'حرج' };
  priorityBadge: Record<string, string>  = { Low: 'badge-info', Normal: 'badge-success', High: 'badge-warning', Critical: 'badge-danger' };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getInfrastructure().subscribe({
      next: r => {
        this.items.set(r.data);
        this.summary.set(r.summary);
        this.totalCost.set(r.data.reduce((a, i) => a + i.totalCostSar, 0));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.api.getPendingMaintenance().subscribe(p => this.pending.set(p));
  }

  openDetail(item: InfrastructureItem) {
    this.api.getInfrastructureItem(item.id).subscribe(d => {
      this.selected.set(d);
      this.showDetailModal.set(true);
    });
  }

  openMaintModal(item: InfrastructureItem) {
    this.selected.set(item);
    this.maintForm.reset({ priority: 'Normal', estimatedCostSar: 0 });
    this.showMaintModal.set(true);
  }

  saveMaintenance() {
    if (this.maintForm.invalid) { this.maintForm.markAllAsTouched(); return; }
    const item = this.selected();
    if (!item) return;
    this.saving.set(true);
    this.api.createMaintenanceRequest(item.id, this.maintForm.value as any).subscribe({
      next: () => {
        this.toastr.success('تم تقديم طلب الصيانة');
        this.showMaintModal.set(false);
        this.saving.set(false);
        this.load();
      },
      error: (e) => { this.saving.set(false); this.toastr.error(e?.error?.message || 'فشل الطلب'); }
    });
  }

  depreciation(item: InfrastructureItem): number {
    if (!item.annualDepreciationSar) return 0;
    const years = (Date.now() - new Date(item.acquisitionDate).getTime()) / (365.25 * 24 * 3600 * 1000);
    return Math.min(item.annualDepreciationSar * years, item.totalCostSar);
  }

  fmt(n: number) { return (n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 0 }); }
  fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('ar-SA') : '—'; }
  icon(cat: string) { return this.categoryIcons[cat] || '🏗️'; }
  color(cat: string) { return this.categoryColors[cat] || '#607d8b'; }
}
