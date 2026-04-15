import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ToastrService } from 'ngx-toastr';
import { EXPENSE_CATEGORY_AR, INCOME_CATEGORY_AR } from '../../core/models/models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  private api    = inject(ApiService);
  private toastr = inject(ToastrService);

  treasurySummary = signal<any>(null);
  loading         = signal(true);

  ngOnInit() { this.loadTreasury(); }

  loadTreasury() {
    this.loading.set(true);
    this.api.getTreasurySummary().subscribe({
      next: d => { this.treasurySummary.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  fmt(n: number) { return (n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 0 }); }
}
